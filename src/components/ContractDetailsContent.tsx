'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { defaultTargetChain } from '@/config/chains';
import { RecoveryMethodCandidate } from '@/server/types';
import { RecoveryModal } from '@/components/RecoveryModal';
import {
  Shield,
  ArrowLeft,
  ExternalLink,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ContractDetailsContentProps {
  address: string;
}

export function ContractDetailsContent({ address: addressParam }: ContractDetailsContentProps) {
  const { address: userAddress } = useAccount();

  const [contractData, setContractData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Recovery modal
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethodCandidate | null>(null);

  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.botchain.ai';

  useEffect(() => {
    if (!addressParam) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const callerQuery = userAddress ? `?caller=${userAddress}` : '';
        const res = await fetch(`/api/contract/${addressParam}${callerQuery}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to inspect contract');
        }
        setContractData(data);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error inspecting contract');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [addressParam, userAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(addressParam);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenRecovery = (method: RecoveryMethodCandidate) => {
    setSelectedMethod(method);
    setIsRecoveryModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="border border-slate-200 rounded p-16 text-center text-slate-500">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
          <span className="text-sm">Inspecting contract bytecode and balances...</span>
        </div>
      ) : errorMsg ? (
        <div className="border border-red-200 bg-red-50 rounded p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-semibold text-slate-900">Contract Inspection Error</h3>
          <p className="text-xs text-red-600">{errorMsg}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Contract Address
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h1 className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                    {contractData.address}
                  </h1>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`${explorerUrl}/address/${contractData.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                    title="View on Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {contractData.recoveryStatus === 'POTENTIALLY_RECOVERABLE' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Potentially Recoverable</span>
                  </span>
                )}
                {contractData.recoveryStatus === 'REQUIRES_MANUAL_REVIEW' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Requires Manual Review</span>
                  </span>
                )}
                {contractData.recoveryStatus === 'NO_PATH_FOUND' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium">
                    <span>No Supported Path Found</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400">Bytecode Exists:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {contractData.hasBytecode ? 'Active Bytecode' : 'Self-destructed / None'}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Proxy Architecture:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {contractData.proxyInfo?.isProxy
                    ? `${contractData.proxyInfo.proxyType || 'Proxy'}`
                    : 'Standard (Non-proxy)'}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Detected Authority:</span>
                <div className="font-semibold font-mono text-slate-800 mt-0.5">
                  {contractData.ownerAddress
                    ? `${contractData.ownerAddress.slice(0, 6)}...${contractData.ownerAddress.slice(-4)}`
                    : 'Unknown / None'}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Caller Authorization:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {contractData.isCallerAuthorized ? (
                    <span className="text-emerald-700">Authorized Caller</span>
                  ) : (
                    <span className="text-slate-500">Not verified</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Proxy Information (if detected) */}
          {contractData.proxyInfo?.isProxy && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Detected {contractData.proxyInfo.proxyType} Upgradeable Proxy</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="font-sans text-slate-500">Implementation Address:</span>
                  <div className="text-slate-800 font-semibold mt-0.5">
                    {contractData.proxyInfo.implementationAddress || 'Unresolved slot'}
                  </div>
                </div>
                <div>
                  <span className="font-sans text-slate-500">Upgrade Admin Address:</span>
                  <div className="text-slate-800 font-semibold mt-0.5">
                    {contractData.proxyInfo.adminAddress || 'Default/Same as owner'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Balances Breakdown */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-600" />
              <span>Current On-Chain Balances</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded p-4 bg-slate-50">
                <span className="text-xs text-slate-500">Native BOT Token:</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {contractData.nativeBalanceFormatted} BOT
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {contractData.nativeBalanceWei} wei
                </span>
              </div>

              <div className="border border-slate-200 rounded p-4 bg-slate-50">
                <span className="text-xs text-slate-500">ERC-20 Tokens:</span>
                {contractData.tokenBalances?.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {contractData.tokenBalances.map((token: any) => (
                      <div key={token.address} className="text-sm font-semibold text-slate-800">
                        {token.balanceFormatted} {token.symbol}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-2">
                    No supported ERC-20 token balances discovered.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Candidate Recovery Methods */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Simulated Candidate Recovery Methods</span>
              </h2>
              <span className="text-xs text-slate-400">Simulated with eth_call</span>
            </div>

            {contractData.candidateMethods?.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-4">
                No standard withdrawal or recovery functions were recognized in this contract&apos;s interface.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
                {contractData.candidateMethods.map((method: RecoveryMethodCandidate) => (
                  <div
                    key={method.name}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {method.signature}
                        </span>
                        {method.simulationSuccess ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Pre-flight Passed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Simulation Reverted
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Estimated Target Asset:{' '}
                        <span className="font-semibold text-slate-800">
                          ~{method.estimatedAmount} {method.assetSymbol}
                        </span>
                      </div>
                      {method.simulationError && (
                        <div className="text-[11px] text-amber-700">
                          Revert reason: {method.simulationError}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        onClick={() => handleOpenRecovery(method)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${
                          method.simulationSuccess
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {method.simulationSuccess ? 'Execute Direct Recovery' : 'Review & Attempt'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analysis Notes */}
          {contractData.analysisNotes?.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm space-y-2">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                Analysis Engine Findings
              </h3>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {contractData.analysisNotes.map((note: string, i: number) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recovery Modal */}
      {selectedMethod && contractData && (
        <RecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={() => {
            setIsRecoveryModalOpen(false);
            setSelectedMethod(null);
          }}
          contract={{
            address: contractData.address,
            creator: contractData.creator || '0x0',
            hasBytecode: contractData.hasBytecode,
            nativeBalanceWei: contractData.nativeBalanceWei,
            nativeBalanceFormatted: contractData.nativeBalanceFormatted,
            tokenBalances: contractData.tokenBalances || [],
            isFactoryCreated: false,
            isVerified: false,
            proxyInfo: contractData.proxyInfo || { isProxy: false },
            recoveryStatus: contractData.recoveryStatus,
            candidateMethods: contractData.candidateMethods || [],
            analysisNotes: contractData.analysisNotes || [],
          }}
          method={selectedMethod}
        />
      )}
    </div>
  );
}
