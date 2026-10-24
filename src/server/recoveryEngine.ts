import { encodeFunctionData, parseAbi, toFunctionSelector } from 'viem';
import { botPublicClient } from './client';
import {
  ContractRecord,
  ProxyInfo,
  RecoveryMethodCandidate,
  RecoveryStatus,
  TokenBalance,
} from './types';

// Standard candidate withdrawal ABIs
const CANDIDATE_FUNCTION_SIGNATURES = [
  { name: 'withdraw', sig: 'function withdraw()', type: 'NATIVE' },
  { name: 'withdrawAll', sig: 'function withdrawAll()', type: 'NATIVE' },
  { name: 'claim', sig: 'function claim()', type: 'NATIVE' },
  { name: 'claimAll', sig: 'function claimAll()', type: 'NATIVE' },
  { name: 'emergencyWithdraw', sig: 'function emergencyWithdraw()', type: 'NATIVE' },
] as const;

const OWNERSHIP_ABI = parseAbi([
  'function owner() view returns (address)',
  'function admin() view returns (address)',
  'function getOwner() view returns (address)',
]);

const CAMPAIGN_RECOVERY_ABI = parseAbi([
  'function getCampaignsByCreator(address) view returns (uint256[])',
  'function getCampaign(uint256) view returns (uint256, address, address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool, bool)',
  'function recoverUnclaimedTokens(uint256)',
]);

export async function analyzeContractRecovery({
  contractAddress,
  callerAddress,
  hasBytecode,
  nativeWei,
  nativeFormatted,
  tokenBalances,
  proxyInfo,
  verifiedAbi,
}: {
  contractAddress: `0x${string}`;
  callerAddress: `0x${string}`;
  hasBytecode: boolean;
  nativeWei: bigint;
  nativeFormatted: string;
  tokenBalances: TokenBalance[];
  proxyInfo: ProxyInfo;
  verifiedAbi?: any[];
}): Promise<{
  recoveryStatus: RecoveryStatus;
  candidateMethods: RecoveryMethodCandidate[];
  analysisNotes: string[];
  ownerAddress?: `0x${string}`;
  isCallerAuthorized?: boolean;
}> {
  const analysisNotes: string[] = [];
  const candidateMethods: RecoveryMethodCandidate[] = [];

  // Check 1: Bytecode existence
  if (!hasBytecode) {
    analysisNotes.push('No contract bytecode found (contract may have been self-destructed or is an EOA).');
    return {
      recoveryStatus: 'NO_PATH_FOUND',
      candidateMethods: [],
      analysisNotes,
    };
  }

  // Check 2: Total balance presence
  const hasFunds =
    nativeWei > BigInt(0) || tokenBalances.some((t) => BigInt(t.balanceRaw) > BigInt(0));
  if (!hasFunds) {
    analysisNotes.push('Zero native BOT and zero supported ERC-20 balances detected on contract.');
  }

  // Read contract bytecode to verify function selector dispatch presence
  let bytecode: string | undefined = undefined;
  try {
    const rawCode = await botPublicClient.getBytecode({ address: contractAddress });
    bytecode = rawCode?.toLowerCase();
  } catch {
    // ignore
  }

  // Check 3: Ownership / Admin detection
  let detectedOwner: `0x${string}` | undefined = undefined;
  let isCallerAuthorized = false;

  for (const fnName of ['owner', 'admin', 'getOwner'] as const) {
    try {
      const ownerRes = (await botPublicClient.readContract({
        address: contractAddress,
        abi: OWNERSHIP_ABI,
        functionName: fnName,
      })) as `0x${string}`;

      if (ownerRes && ownerRes !== '0x0000000000000000000000000000000000000000') {
        detectedOwner = ownerRes.toLowerCase() as `0x${string}`;
        isCallerAuthorized = detectedOwner === callerAddress.toLowerCase();
        analysisNotes.push(
          `Detected contract authority via ${fnName}(): ${detectedOwner}. Caller is ${
            isCallerAuthorized ? 'AUTHORIZED' : 'NOT authorized'
          }.`
        );
        break;
      }
    } catch {
      // function does not exist
    }
  }

  // Check 4: Proxy details
  if (proxyInfo.isProxy) {
    analysisNotes.push(
      `Detected active ${proxyInfo.proxyType} proxy pointing to implementation: ${proxyInfo.implementationAddress}.`
    );
    if (proxyInfo.adminAddress) {
      const isProxyAdmin = proxyInfo.adminAddress.toLowerCase() === callerAddress.toLowerCase();
      analysisNotes.push(
        `Proxy admin is ${proxyInfo.adminAddress} (${isProxyAdmin ? 'Caller matches Admin' : 'Different from caller'}).`
      );
      if (isProxyAdmin) {
        isCallerAuthorized = true;
      }
    }
  }

  const targetForCalls = contractAddress;

  // Check 5: Check Standard Parameterless Withdrawal Methods (Only if selector exists in bytecode or is proxy)
  if (nativeWei > BigInt(0)) {
    for (const candidate of CANDIDATE_FUNCTION_SIGNATURES) {
      const selector = toFunctionSelector(candidate.sig).slice(2).toLowerCase();
      const selectorPresent = bytecode && bytecode.includes(selector);

      // Do not hallucinate methods whose 4-byte selector is absent from the bytecode
      if (!selectorPresent && !proxyInfo.isProxy) {
        continue;
      }

      const abi = parseAbi([candidate.sig]);
      let callData: `0x${string}` | undefined = undefined;
      try {
        callData = encodeFunctionData({
          abi,
          functionName: candidate.name as any,
        });

        // Pre-flight simulation
        await botPublicClient.call({
          account: callerAddress,
          to: targetForCalls,
          data: callData,
          value: BigInt(0),
        });

        // Simulation succeeded!
        candidateMethods.push({
          name: candidate.name,
          signature: candidate.sig,
          assetType: 'NATIVE',
          assetSymbol: 'BOT',
          estimatedAmount: nativeFormatted,
          simulationSuccess: true,
          callData,
        });
        analysisNotes.push(`Pre-flight simulation for ${candidate.name}() succeeded.`);
      } catch (simErr: any) {
        const errorMsg = simErr?.shortMessage || simErr?.message || 'Reverted during simulation';
        candidateMethods.push({
          name: candidate.name,
          signature: candidate.sig,
          assetType: 'NATIVE',
          assetSymbol: 'BOT',
          estimatedAmount: nativeFormatted,
          simulationSuccess: false,
          simulationError: errorMsg.slice(0, 120),
          callData,
        });
      }
    }
  }

  // Check 5b: Campaign / Airdrop Recovery Inspection (recoverUnclaimedTokens)
  try {
    const creatorCampaigns = (await botPublicClient.readContract({
      address: contractAddress,
      abi: CAMPAIGN_RECOVERY_ABI,
      functionName: 'getCampaignsByCreator',
      args: [callerAddress],
    })) as bigint[];

    if (creatorCampaigns && creatorCampaigns.length > 0) {
      analysisNotes.push(
        `Discovered ${creatorCampaigns.length} reward campaign(s) created by your wallet.`
      );
      isCallerAuthorized = true;

      for (const cId of creatorCampaigns) {
        try {
          const campaignData = (await botPublicClient.readContract({
            address: contractAddress,
            abi: CAMPAIGN_RECOVERY_ABI,
            functionName: 'getCampaign',
            args: [cId],
          })) as any;

          // Index 8 is endTime in unix seconds
          const endTime = Number(campaignData[8] || 0);
          const now = Math.floor(Date.now() / 1000);
          const isExpired = now >= endTime;

          const callData = encodeFunctionData({
            abi: CAMPAIGN_RECOVERY_ABI,
            functionName: 'recoverUnclaimedTokens',
            args: [cId],
          });

          let simOk = false;
          let simErr = '';

          try {
            await botPublicClient.call({
              account: callerAddress,
              to: targetForCalls,
              data: callData,
            });
            simOk = true;
          } catch (e: any) {
            simErr = !isExpired
              ? `Timelock active: Unlocks on ${new Date(endTime * 1000).toLocaleDateString()} at ${new Date(endTime * 1000).toLocaleTimeString()}`
              : (e?.shortMessage || 'Reverted during simulation');
          }

          candidateMethods.push({
            name: `recoverUnclaimedTokens(campaign #${cId})`,
            signature: `function recoverUnclaimedTokens(${cId})`,
            assetType: 'NATIVE',
            assetSymbol: 'BOT',
            estimatedAmount: nativeFormatted,
            simulationSuccess: simOk,
            simulationError: simErr,
            callData,
          });

          if (!isExpired) {
            analysisNotes.push(
              `Campaign #${cId} timelock active: unlock date is ${new Date(endTime * 1000).toLocaleString()}.`
            );
          }
        } catch {
          // continue
        }
      }
    }
  } catch {
    // Not a campaign manager
  }

  // Check 6: Check ERC-20 candidate withdrawals
  for (const token of tokenBalances) {
    const erc20WithdrawAbi = parseAbi([
      'function withdrawToken(address token)',
      'function sweep(address token)',
      'function recoverERC20(address token, uint256 amount)',
    ]);

    for (const fn of ['withdrawToken', 'sweep'] as const) {
      try {
        const callData = encodeFunctionData({
          abi: erc20WithdrawAbi,
          functionName: fn,
          args: [token.address],
        });

        await botPublicClient.call({
          account: callerAddress,
          to: targetForCalls,
          data: callData,
        });

        candidateMethods.push({
          name: `${fn}(${token.symbol})`,
          signature: `${fn}(address)`,
          assetType: 'ERC20',
          assetSymbol: token.symbol,
          assetAddress: token.address,
          estimatedAmount: token.balanceFormatted,
          simulationSuccess: true,
          callData,
        });
        analysisNotes.push(`Simulation for ${fn}(${token.symbol}) succeeded.`);
      } catch {
        // Not supported or reverted
      }
    }
  }

  // Determine conservative final status
  let recoveryStatus: RecoveryStatus = 'NO_PATH_FOUND';

  const hasSuccessfulSim = candidateMethods.some((m) => m.simulationSuccess);
  const hasFailedSim = candidateMethods.some((m) => !m.simulationSuccess);

  if (hasFunds && hasSuccessfulSim) {
    recoveryStatus = 'POTENTIALLY_RECOVERABLE';
  } else if (hasFunds && (hasFailedSim || proxyInfo.isProxy || detectedOwner || isCallerAuthorized)) {
    recoveryStatus = 'REQUIRES_MANUAL_REVIEW';
    if (!hasSuccessfulSim) {
      analysisNotes.push(
        'Contract holds funds with administrative methods, but standard automated withdrawals reverted or require specific parameters.'
      );
    }
  } else if (!hasFunds) {
    recoveryStatus = 'NO_PATH_FOUND';
  } else {
    recoveryStatus = 'NO_PATH_FOUND';
    analysisNotes.push('No recognized withdrawal interface detected.');
  }

  return {
    recoveryStatus,
    candidateMethods,
    analysisNotes,
    ownerAddress: detectedOwner,
    isCallerAuthorized,
  };
}
