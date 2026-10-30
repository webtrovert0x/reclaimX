'use client';

import React, { useState } from 'react';
import { useAccount, usePublicClient, useSendTransaction } from 'wagmi';
import { encodeFunctionData, parseAbi, toFunctionSelector } from 'viem';
import { ContractRecord, RecoveryMethodCandidate } from '@/server/types';
import { defaultTargetChain } from '@/config/chains';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractRecord;
  method: RecoveryMethodCandidate;
  onSuccess?: () => void;
}

export function RecoveryModal({
  isOpen,
  onClose,
  contract,
  method,
  onSuccess,
}: RecoveryModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.botchain.ai';

  // Resolve callData either from method candidate or by encoding signature
  let resolvedCallData = method.callData;
  if (!resolvedCallData && method.signature) {
    try {
      const cleanSig = method.signature.startsWith('function ')
        ? method.signature
        : `function ${method.signature}`;
      resolvedCallData = encodeFunctionData({
        abi: parseAbi([cleanSig]) as any,
        functionName: method.name as any,
      });
    } catch {
      try {
        const selectorSig = method.signature.replace(/^function\s+/, '');
        resolvedCallData = toFunctionSelector(selectorSig);
      } catch {
        // Fallback
      }
    }
  }

  const handleExecuteRecovery = async () => {
    if (!address || !publicClient) {
      setErrorMsg('Wallet disconnected.');
      return;
    }

    if (!resolvedCallData) {
      setErrorMsg('Call data not generated for this method.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Submit transaction directly to original contract
      const hash = await sendTransactionAsync({
        to: contract.address,
        data: resolvedCallData,
        value: BigInt(0),
      });

      setTxHash(hash);

      // 2. Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === 'success') {
        setIsConfirmed(true);
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Recovery call reverted on-chain.');
      }
    } catch (err: any) {
      console.error('Recovery execution error:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction rejected or execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white border border-slate-300 rounded-lg shadow-xl max-w-lg w-full p-6 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base text-slate-900">Review & Execute Recovery</h3>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Success State */}
        {isConfirmed ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-semibold text-base text-slate-900">Recovery Call Succeeded!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Transaction confirmed on BOT Chain. Recovered funds are sent directly according to the contract's code.
              </p>
            </div>
            {txHash && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-mono"
              >
                <span>View Receipt ({txHash.slice(0, 10)}...{txHash.slice(-8)})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Call Details Table */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2.5 font-mono">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans font-medium">Target Contract:</span>
                <a
                  href={`${explorerUrl}/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {contract.address.slice(0, 8)}...{contract.address.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans font-medium">Method to Call:</span>
                <span className="font-bold text-slate-800">{method.signature}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans font-medium">Asset & Amount:</span>
                <span className="font-bold text-emerald-700 font-sans">
                  ~{method.estimatedAmount} {method.assetSymbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans font-medium">Caller Wallet:</span>
                <span className="text-slate-700">
                  {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans font-medium">Simulation Pre-flight:</span>
                <span
                  className={`font-semibold font-sans px-1.5 py-0.5 rounded text-[11px] ${
                    method.simulationSuccess
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {method.simulationSuccess ? 'PASSED (0 errors)' : 'UNCONFIRMED / REVERTED'}
                </span>
              </div>
            </div>

            {/* Simulation Warning if not fully successful */}
            {!method.simulationSuccess && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Pre-flight call note:</span> The simulation reported: &quot;
                  {method.simulationError || 'Reverted'}&quot;. You may need specific authorization, state timing, or parameters.
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Non-custodial Note */}
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded p-2.5 border border-slate-200 leading-relaxed">
              <span className="font-semibold text-slate-700">Non-Custodial Guarantee:</span> ReclaimX never routes assets through any intermediary. Your wallet executes this call directly on the target contract.
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRecovery}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Sign Call</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
