import { checkContractBalances } from './balanceChecker';
import { detectProxy } from './proxyDetector';
import { analyzeContractRecovery } from './recoveryEngine';
import { ContractRecord } from './types';

const EXPLORER_API_URL =
  process.env.NEXT_PUBLIC_EXPLORER_API_URL || 'https://scan.botchain.ai/api';
const API_KEY = process.env.EXPLORER_API_KEY || '';

interface ExplorerTx {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  contractAddress: string;
  isError: string;
  txreceipt_status: string;
  input?: string;
  type?: string;
}

interface DiscoveredTarget {
  address: `0x${string}`;
  creator: `0x${string}`;
  creationTxHash: string;
  creationBlockNumber: number;
  timestamp: number;
  isFactoryCreated: boolean;
}

export async function fetchWithRetry(url: string, retries = 2, delayMs = 1000): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      if (i === retries) throw e;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

export async function discoverContractsForWallet(
  walletAddress: `0x${string}`,
  customTokens: `0x${string}`[] = []
): Promise<{
  contracts: ContractRecord[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const discoveredMap = new Map<string, DiscoveredTarget>();

  const lowerWallet = walletAddress.toLowerCase() as `0x${string}`;

  // 1. Query Normal Transactions (Direct Deployments)
  try {
    const txListUrl = `${EXPLORER_API_URL}?module=account&action=txlist&address=${lowerWallet}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc${
      API_KEY ? `&apikey=${API_KEY}` : ''
    }`;

    const data = await fetchWithRetry(txListUrl);
    if (data?.status === '1' && Array.isArray(data?.result)) {
      for (const tx of data.result as ExplorerTx[]) {
        const isSuccess = tx.txreceipt_status === '1' && tx.isError !== '1';
        const hasCreatedContract =
          Boolean(tx.contractAddress) &&
          tx.contractAddress !== '0x' &&
          tx.contractAddress !== '0x0000000000000000000000000000000000000000';

        const isDirectCreation = !tx.to || tx.to === '0x' || tx.to === '';

        if (isSuccess && (hasCreatedContract || isDirectCreation) && tx.contractAddress) {
          const cAddr = tx.contractAddress.toLowerCase() as `0x${string}`;
          if (!discoveredMap.has(cAddr)) {
            discoveredMap.set(cAddr, {
              address: cAddr,
              creator: lowerWallet,
              creationTxHash: tx.hash,
              creationBlockNumber: Number(tx.blockNumber) || 0,
              timestamp: Number(tx.timeStamp) || Math.floor(Date.now() / 1000),
              isFactoryCreated: false,
            });
          }
        }
      }
    } else if (data?.message && data.message !== 'No transactions found') {
      warnings.push(`Explorer note: ${data.message}`);
    }
  } catch (err: any) {
    warnings.push(`Direct transaction indexing warning: ${err?.message || 'Explorer timeout'}`);
  }

  // 2. Query Internal Transactions (Factory Deployments)
  try {
    const internalUrl = `${EXPLORER_API_URL}?module=account&action=txlistinternal&address=${lowerWallet}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc${
      API_KEY ? `&apikey=${API_KEY}` : ''
    }`;

    const internalData = await fetchWithRetry(internalUrl);
    if (internalData?.status === '1' && Array.isArray(internalData?.result)) {
      for (const itx of internalData.result as ExplorerTx[]) {
        const isCreationType =
          itx.type === 'create' || itx.type === 'create2' || !itx.to || itx.to === '0x';
        const hasCreatedContract =
          Boolean(itx.contractAddress) &&
          itx.contractAddress !== '0x' &&
          itx.contractAddress !== '0x0000000000000000000000000000000000000000';

        if (isCreationType && hasCreatedContract) {
          const cAddr = itx.contractAddress.toLowerCase() as `0x${string}`;
          if (!discoveredMap.has(cAddr)) {
            discoveredMap.set(cAddr, {
              address: cAddr,
              creator: lowerWallet,
              creationTxHash: itx.hash,
              creationBlockNumber: Number(itx.blockNumber) || 0,
              timestamp: Number(itx.timeStamp) || Math.floor(Date.now() / 1000),
              isFactoryCreated: true,
            });
          }
        }
      }
    }
  } catch (err: any) {
    warnings.push(`Internal factory indexing note: ${err?.message || 'Internal endpoint delay'}`);
  }

  const targets = Array.from(discoveredMap.values());
  const contractRecords: ContractRecord[] = [];

  // 3. Enrich each discovered contract
  for (const target of targets) {
    try {
      // Balance & Bytecode
      const { hasBytecode, nativeWei, nativeFormatted, tokenBalances } =
        await checkContractBalances(target.address, customTokens);

      // Proxy detection
      const proxyInfo = hasBytecode
        ? await detectProxy(target.address)
        : { isProxy: false };

      // Explorer verified source check
      let isVerified = false;
      let contractName: string | undefined = undefined;
      let verifiedAbi: any[] | undefined = undefined;

      try {
        const sourceUrl = `${EXPLORER_API_URL}?module=contract&action=getsourcecode&address=${target.address}${
          API_KEY ? `&apikey=${API_KEY}` : ''
        }`;
        const sourceRes = await fetchWithRetry(sourceUrl);
        if (sourceRes?.status === '1' && sourceRes?.result?.[0]) {
          const item = sourceRes.result[0];
          if (item.ABI && item.ABI !== 'Contract source code not verified') {
            isVerified = true;
            contractName = item.ContractName || undefined;
            try {
              verifiedAbi = JSON.parse(item.ABI);
            } catch {
              // ignore ABI json parse error
            }
          }
        }
      } catch {
        // Explorer source check non-fatal
      }

      // Recovery Analysis
      const recoveryAnalysis = await analyzeContractRecovery({
        contractAddress: target.address,
        callerAddress: lowerWallet,
        hasBytecode,
        nativeWei,
        nativeFormatted,
        tokenBalances,
        proxyInfo,
        verifiedAbi,
      });

      contractRecords.push({
        address: target.address,
        creator: target.creator,
        creationTxHash: target.creationTxHash,
        creationBlockNumber: target.creationBlockNumber,
        timestamp: target.timestamp,
        isFactoryCreated: target.isFactoryCreated,
        hasBytecode,
        nativeBalanceWei: nativeWei.toString(),
        nativeBalanceFormatted: nativeFormatted,
        tokenBalances,
        isVerified,
        contractName,
        proxyInfo,
        recoveryStatus: recoveryAnalysis.recoveryStatus,
        candidateMethods: recoveryAnalysis.candidateMethods,
        analysisNotes: recoveryAnalysis.analysisNotes,
        ownerAddress: recoveryAnalysis.ownerAddress,
        isCallerAuthorized: recoveryAnalysis.isCallerAuthorized,
      });
    } catch (e: any) {
      warnings.push(`Error processing contract ${target.address}: ${e?.message || 'Scan error'}`);
    }
  }

  return {
    contracts: contractRecords,
    warnings,
  };
}
