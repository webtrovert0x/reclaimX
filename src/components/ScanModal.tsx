'use client';

import React, { useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import {
  CONTRACT_RECOVERY_HUB_ABI,
  DEFAULT_HUB_ADDRESS,
} from '@/contracts/contractRecoveryHub';
import { defaultTargetChain } from '@/config/chains';
import { decodeEventLog } from 'viem';
import {
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  ArrowRight,
} from 'lucide-react';
import { ScanJobRecord } from '@/server/types';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanType: 'FREE' | 'DEEP';
  deepScanPriceWei?: bigint;
  onScanCompleted: (job: ScanJobRecord) => void;
}

type ScanStep =
  | 'IDLE'
  | 'AWAITING_SIGNATURE'
  | 'CONFIRMING_TRANSACTION'
  | 'VERIFYING_AND_INDEXING'
  | 'SUCCESS'
  | 'ERROR';

export function ScanModal({
  isOpen,
  onClose,
  scanType,
  deepScanPriceWei = 50000000000000000n, // 0.05 BOT default
  onScanCompleted,
}: ScanModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<ScanStep>('IDLE');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleStartScan = async () => {
    if (!address || !publicClient) {
      setErrorMessage('Please connect your wallet first.');
      setStep('ERROR');
      return;
    }

    setErrorMessage(null);
    setStep('AWAITING_SIGNATURE');

    try {
      const hubAddress =
        (process.env.NEXT_PUBLIC_CONTRACT_RECOVERY_HUB_ADDRESS as `0x${string}`) ||
        DEFAULT_HUB_ADDRESS;

      // 1. Submit on-chain transaction
      let hash: `0x${string}`;
      if (scanType === 'FREE') {
        hash = await writeContractAsync({
          address: hubAddress,
          abi: CONTRACT_RECOVERY_HUB_ABI,
          functionName: 'requestFreeScan',
        });
      } else {
        hash = await writeContractAsync({
          address: hubAddress,
          abi: CONTRACT_RECOVERY_HUB_ABI,
          functionName: 'requestDeepScan',
          value: deepScanPriceWei,
        });
      }

      setTxHash(hash);
      setStep('CONFIRMING_TRANSACTION');

      // 2. Wait for confirmation receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error('On-chain scan request transaction reverted.');
      }

      // 3. Extract scanId from event
      let extractedScanId: `0x${string}` | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === hubAddress.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: CONTRACT_RECOVERY_HUB_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'ScanRequested') {
              extractedScanId = (decoded.args as any).scanId;
              break;
            }
          } catch {
            // continue
          }
        }
      }

      setScanId(extractedScanId);
      setStep('VERIFYING_AND_INDEXING');

      // 4. Send to backend for verification & discovery
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          scanType,
          txHash: hash,
          scanId: extractedScanId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server indexing error');
      }

      setDiscoveredCount(data.job.summary.totalDiscovered);
      setStep('SUCCESS');
      onScanCompleted(data.job);
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(
        err?.shortMessage || err?.message || 'Transaction was rejected or failed.'
      );
      setStep('ERROR');
    }
  };

  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.bohr.life';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white border border-slate-300 rounded-lg shadow-xl max-w-lg w-full p-6 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base text-slate-900">
              {scanType === 'FREE' ? 'Initiate Free Discovery Scan' : 'Initiate Deep Contract Scan'}
            </h3>
          </div>
          {step !== 'AWAITING_SIGNATURE' && step !== 'CONFIRMING_TRANSACTION' && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* State Content */}
        {step === 'IDLE' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Scan Type:</span>
                <span className="font-semibold text-slate-800">
                  {scanType === 'FREE' ? 'Standard Free Scan' : 'Deep Bytecode Analysis'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Fee:</span>
                <span className="font-semibold text-slate-800">
                  {scanType === 'FREE' ? '0.00 BOT (Free)' : '0.05 BOT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network:</span>
                <span className="font-medium text-slate-700">{defaultTargetChain.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {scanType === 'FREE'
                ? 'Free scan registers your request on-chain in ContractRecoveryHub. You pay network gas only to register and discover your contracts.'
                : 'Deep scan registers on-chain and triggers server-side simulation of withdrawal selectors, proxy resolution, and ERC-20 token scanning.'}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScan}
                className="flex-1 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                Sign & Scan
              </button>
            </div>
          </div>
        )}

        {step === 'AWAITING_SIGNATURE' && (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto" />
            <h4 className="font-medium text-slate-900">Waiting for Wallet Signature</h4>
            <p className="text-xs text-slate-500">
              Please confirm the transaction in your connected wallet.
            </p>
          </div>
        )}

        {step === 'CONFIRMING_TRANSACTION' && (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto" />
            <h4 className="font-medium text-slate-900">Confirming on BOT Chain</h4>
            <p className="text-xs text-slate-500">
              Transaction submitted. Waiting for block inclusion...
            </p>
            {txHash && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-2"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {step === 'VERIFYING_AND_INDEXING' && (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto" />
            <h4 className="font-medium text-slate-900">Verifying Payment & Discovering Contracts</h4>
            <p className="text-xs text-slate-500">
              Checking block confirmation, reading on-chain events, and querying explorer data...
            </p>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-semibold text-base text-slate-900">Discovery Scan Complete!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Discovered <span className="font-bold text-slate-800">{discoveredCount}</span>{' '}
                contracts associated with your wallet.
              </p>
            </div>
            {txHash && (
              <div className="text-xs text-slate-400">
                Tx:{' '}
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              View Results in Dashboard
            </button>
          </div>
        )}

        {step === 'ERROR' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-semibold text-base text-slate-900">Scan Failed</h4>
              <p className="text-xs text-red-600 mt-1 max-w-sm mx-auto break-words">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handleStartScan}
                className="flex-1 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
