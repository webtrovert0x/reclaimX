import { decodeEventLog } from 'viem';
import { botPublicClient } from './client';
import { CONTRACT_RECOVERY_HUB_ABI } from '@/contracts/contractRecoveryHub';
import { jobStore } from './jobStore';

const HUB_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_RECOVERY_HUB_ADDRESS ||
  '0x8baf11bb2f5c35d81fd21cd40eae0c205113cba1'
).toLowerCase() as `0x${string}`;

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  scanId?: `0x${string}`;
  userAddress?: `0x${string}`;
  amountPaidWei?: bigint;
  scanType?: 'Free' | 'Deep';
  blockNumber?: bigint;
}

export async function verifyOnChainPayment({
  txHash,
  expectedUser,
  expectedScanType = 'Deep',
}: {
  txHash: `0x${string}`;
  expectedUser: `0x${string}`;
  expectedScanType?: 'Free' | 'Deep';
}): Promise<VerificationResult> {
  const cleanTxHash = txHash.toLowerCase() as `0x${string}`;
  const cleanUser = expectedUser.toLowerCase() as `0x${string}`;

  // 1. Deduplication check: Has this txHash already been redeemed?
  if (jobStore.isTxUsed(cleanTxHash)) {
    return {
      isValid: false,
      error: 'Transaction hash has already been used for a previous scan.',
    };
  }

  // 2. Fetch transaction receipt from RPC
  let receipt;
  try {
    receipt = await botPublicClient.getTransactionReceipt({ hash: cleanTxHash });
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to fetch transaction receipt: ${err?.message || 'RPC error'}`,
    };
  }

  if (!receipt) {
    return {
      isValid: false,
      error: 'Transaction receipt not found or still pending.',
    };
  }

  if (receipt.status !== 'success') {
    return {
      isValid: false,
      error: 'Transaction failed (reverted on-chain).',
    };
  }

  // 3. Confirm target contract address matches deployed Hub
  const targetContract = receipt.to?.toLowerCase();
  if (targetContract !== HUB_ADDRESS) {
    return {
      isValid: false,
      error: `Transaction was sent to unexpected address (${targetContract}). Expected Hub (${HUB_ADDRESS}).`,
    };
  }

  // 4. Decode ScanRequested event log
  let scanEvent: any = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === HUB_ADDRESS) {
      try {
        const decoded = decodeEventLog({
          abi: CONTRACT_RECOVERY_HUB_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'ScanRequested') {
          scanEvent = decoded.args;
          break;
        }
      } catch {
        // Not a matching event in this log
      }
    }
  }

  if (!scanEvent) {
    return {
      isValid: false,
      error: 'No ScanRequested event emitted by ContractRecoveryHub in transaction logs.',
    };
  }

  const { scanId, user, scanType, amountPaid } = scanEvent;

  // 5. Verify User
  if (user.toLowerCase() !== cleanUser) {
    return {
      isValid: false,
      error: `Transaction caller (${user}) does not match authenticated user (${cleanUser}).`,
    };
  }

  // 6. Verify Scan Type (0 = Free, 1 = Deep)
  const isDeep = scanType === 1;
  const isFree = scanType === 0;

  if (expectedScanType === 'Deep' && !isDeep) {
    return {
      isValid: false,
      error: 'Transaction event is for a Free scan, not a Deep scan.',
    };
  }

  if (expectedScanType === 'Free' && !isFree) {
    return {
      isValid: false,
      error: 'Transaction event is for a Deep scan, not a Free scan.',
    };
  }

  // 7. Verify Amount and on-chain contract state
  if (expectedScanType === 'Deep') {
    const configuredPrice = (await botPublicClient.readContract({
      address: HUB_ADDRESS,
      abi: CONTRACT_RECOVERY_HUB_ABI,
      functionName: 'deepScanPrice',
    })) as bigint;

    if (amountPaid < configuredPrice) {
      return {
        isValid: false,
        error: `Paid amount (${amountPaid.toString()} wei) is less than required price (${configuredPrice.toString()} wei).`,
      };
    }
  }

  // 8. Verify getScanRequest on contract
  try {
    const onChainReq = (await botPublicClient.readContract({
      address: HUB_ADDRESS,
      abi: CONTRACT_RECOVERY_HUB_ABI,
      functionName: 'getScanRequest',
      args: [scanId],
    })) as [string, number, bigint, bigint, boolean];

    const [reqUser, , , , reqExists] = onChainReq;

    if (!reqExists || reqUser.toLowerCase() !== cleanUser) {
      return {
        isValid: false,
        error: 'On-chain scan request record does not exist or user mismatch.',
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to query getScanRequest from Hub: ${err?.message}`,
    };
  }

  // Mark transaction as used
  jobStore.markTxUsed(cleanTxHash);

  return {
    isValid: true,
    scanId,
    userAddress: cleanUser,
    amountPaidWei: amountPaid,
    scanType: isDeep ? 'Deep' : 'Free',
    blockNumber: receipt.blockNumber,
  };
}
