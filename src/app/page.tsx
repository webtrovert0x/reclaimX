'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import {
  CONTRACT_RECOVERY_HUB_ABI,
  DEFAULT_HUB_ADDRESS,
} from '@/contracts/contractRecoveryHub';
import { defaultTargetChain } from '@/config/chains';
import { ContractRecord, RecoveryMethodCandidate, ScanJobRecord } from '@/server/types';
import { ScanModal } from '@/components/ScanModal';
import { RecoveryModal } from '@/components/RecoveryModal';
import {
  Shield,
  Search,
  Coins,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Zap,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { formatEther } from 'viem';

export default function HomePage() {
  const { address, isConnected } = useAccount();

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanModalType, setScanModalType] = useState<'FREE' | 'DEEP'>('FREE');

  // Recovery modal state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethodCandidate | null>(null);

  // Dashboard data state
  const [activeJob, setActiveJob] = useState<ScanJobRecord | null>(null);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'RECOVERABLE' | 'WITH_BALANCE' | 'FACTORY' | 'MANUAL'
  >('ALL');

  // Read current deepScanPrice from deployed hub
  const hubAddress =
    (process.env.NEXT_PUBLIC_CONTRACT_RECOVERY_HUB_ADDRESS as `0x${string}`) ||
    DEFAULT_HUB_ADDRESS;

  const { data: deepScanPriceData } = useReadContract({
    address: hubAddress,
    abi: CONTRACT_RECOVERY_HUB_ABI,
    functionName: 'deepScanPrice',
  });

  const deepScanPriceWei = (deepScanPriceData as bigint) || 50000000000000000n;
  const formattedDeepScanPrice = formatEther(deepScanPriceWei);

  // Load existing scans for connected wallet
  useEffect(() => {
    if (!address) {
      setActiveJob(null);
      return;
    }

    const fetchUserScans = async () => {
      setIsLoadingScans(true);
      try {
        const res = await fetch(`/api/scan?userAddress=${address}`);
        const data = await res.json();
        if (data?.jobs && data.jobs.length > 0) {
          setActiveJob(data.jobs[0]);
        }
      } catch (err) {
        console.error('Failed to load user scans:', err);
      } finally {
        setIsLoadingScans(false);
      }
    };

    fetchUserScans();
  }, [address]);

  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.botchain.ai';

  // Contracts list filtering
  const contracts = activeJob?.contracts || [];
  const filteredContracts = contracts.filter((c) => {
    if (activeFilter === 'RECOVERABLE') return c.recoveryStatus === 'POTENTIALLY_RECOVERABLE';
    if (activeFilter === 'WITH_BALANCE')
      return BigInt(c.nativeBalanceWei) > 0n || c.tokenBalances.length > 0;
    if (activeFilter === 'FACTORY') return c.isFactoryCreated;
    if (activeFilter === 'MANUAL') return c.recoveryStatus === 'REQUIRES_MANUAL_REVIEW';
    return true;
  });

  const triggerScan = (type: 'FREE' | 'DEEP') => {
    setScanModalType(type);
    setIsScanModalOpen(true);
  };

  const handleOpenRecovery = (contract: ContractRecord, method: RecoveryMethodCandidate) => {
    setSelectedContract(contract);
    setSelectedMethod(method);
    setIsRecoveryModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
      {/* 1. DISCONNECTED VIEW - Minimalist Landing */}
      {!isConnected && (
        <div className="py-12 md:py-16 space-y-12">
          {/* Hero */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>BOT Chain Smart Contract Recovery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Find your contracts. Discover your funds. Reclaim what’s recoverable.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              ReclaimX scans BOT Chain for contracts deployed by your wallet, inspects native BOT
              and ERC-20 balances, checks EIP-1967 proxies, simulates candidate withdrawal methods,
              and allows you to recover funds directly with non-custodial safety.
            </p>
            <div className="pt-2 flex items-center gap-4">
              <appkit-button />
              <Link
                href="/about"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1"
              >
                <span>Learn about security & simulation</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Value Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Direct & Factory Discovery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Indexes direct contract creations and factory-deployed clones/proxies created by
                your wallet on BOT Chain.
              </p>
            </div>

            <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Pre-flight Call Simulation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Performs dry-run simulations of withdrawal methods to verify authorization and
                execution before you sign any transaction.
              </p>
            </div>

            <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Strictly Non-Custodial</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assets are never routed through our contract. Your wallet calls the target contract
                directly to receive your funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONNECTED VIEW - Full Recovery Dashboard */}
      {isConnected && (
        <div className="space-y-6">
          {/* Top Bar with Status & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Recovery Dashboard</h1>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Wallet:</span>
                <span className="font-mono text-slate-700 font-medium">
                  {address}
                </span>
                {activeJob && (
                  <>
                    <span>•</span>
                    <span>
                      Last scan:{' '}
                      {new Date(activeJob.completedAt || activeJob.createdAt).toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerScan('FREE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Rescan (Free)</span>
              </button>

              <button
                onClick={() => triggerScan('DEEP')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>Deep Scan ({formattedDeepScanPrice} BOT)</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border border-slate-200 rounded p-4 bg-white">
              <span className="text-xs font-medium text-slate-500">Discovered</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {activeJob?.summary.totalDiscovered ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Total contracts</span>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-white">
              <span className="text-xs font-medium text-slate-500">Holding BOT</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {activeJob?.summary.withNativeBalance ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Native balance &gt; 0</span>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-white">
              <span className="text-xs font-medium text-slate-500">Token Balances</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {activeJob?.summary.withTokenBalance ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">ERC-20 holders</span>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-emerald-50/50 border-emerald-200">
              <span className="text-xs font-medium text-emerald-700">Recoverable</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {activeJob?.summary.potentiallyRecoverable ?? 0}
              </div>
              <span className="text-[11px] text-emerald-600">Simulated & ready</span>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-amber-50/50 border-amber-200 col-span-2 md:col-span-1">
              <span className="text-xs font-medium text-amber-700">Manual Review</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {activeJob?.summary.requiresManualReview ?? 0}
              </div>
              <span className="text-[11px] text-amber-600">Complex / Auth</span>
            </div>
          </div>

          {/* Warnings Banner if partial results */}
          {activeJob?.warnings && activeJob.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Discovery note: </span>
                {activeJob.warnings.join(' ')}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({contracts.length})
              </button>
              <button
                onClick={() => setActiveFilter('RECOVERABLE')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeFilter === 'RECOVERABLE'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Potentially Recoverable ({activeJob?.summary.potentiallyRecoverable ?? 0})
              </button>
              <button
                onClick={() => setActiveFilter('WITH_BALANCE')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeFilter === 'WITH_BALANCE'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                With Balances ({activeJob?.summary.withNativeBalance ?? 0})
              </button>
              <button
                onClick={() => setActiveFilter('FACTORY')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeFilter === 'FACTORY'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Factory Deployed
              </button>
              <button
                onClick={() => setActiveFilter('MANUAL')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeFilter === 'MANUAL'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Manual Review ({activeJob?.summary.requiresManualReview ?? 0})
              </button>
            </div>
          </div>

          {/* Contracts Table */}
          {isLoadingScans ? (
            <div className="border border-slate-200 rounded p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <span>Loading scan history...</span>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="border border-slate-200 rounded p-12 text-center bg-white space-y-3">
              <FileCode2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-800 text-base">
                {activeJob ? 'No contracts match this filter' : 'No scans registered yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeJob
                  ? 'Try selecting a different filter above to view all discovered contracts.'
                  : 'Start a Free Scan or Deep Scan to register on-chain and discover contracts deployed by your wallet on BOT Chain.'}
              </p>
              {!activeJob && (
                <div className="pt-2">
                  <button
                    onClick={() => triggerScan('FREE')}
                    className="px-4 py-2 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  >
                    Run Free Discovery Scan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="py-3 px-4">Contract Address</th>
                      <th className="py-3 px-4">Origin Type</th>
                      <th className="py-3 px-4">Native Balance</th>
                      <th className="py-3 px-4">Tokens</th>
                      <th className="py-3 px-4">Proxy</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredContracts.map((contract) => {
                      const candidate = contract.candidateMethods.find(
                        (m) => m.simulationSuccess
                      ) || contract.candidateMethods[0];

                      return (
                        <tr key={contract.address} className="hover:bg-slate-50/80 transition-colors">
                          {/* Address & Verified Name */}
                          <td className="py-3 px-4 font-sans">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Link
                                href={`/contract/${contract.address}`}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {contract.address.slice(0, 8)}...{contract.address.slice(-6)}
                              </Link>
                              <a
                                href={`${explorerUrl}/address/${contract.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {contract.contractName && (
                              <div className="text-[11px] text-slate-500 font-sans">
                                {contract.contractName}
                              </div>
                            )}
                          </td>

                          {/* Origin Type */}
                          <td className="py-3 px-4 font-sans">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                contract.isFactoryCreated
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {contract.isFactoryCreated ? 'Factory Cloned' : 'Direct Deploy'}
                            </span>
                          </td>

                          {/* Native Balance */}
                          <td className="py-3 px-4 font-sans">
                            <span
                              className={`font-semibold ${
                                BigInt(contract.nativeBalanceWei) > 0n
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {contract.nativeBalanceFormatted} BOT
                            </span>
                          </td>

                          {/* Tokens */}
                          <td className="py-3 px-4 font-sans">
                            {contract.tokenBalances.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {contract.tokenBalances.map((t) => (
                                  <span
                                    key={t.address}
                                    className="px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                                  >
                                    {t.balanceFormatted} {t.symbol}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">None</span>
                            )}
                          </td>

                          {/* Proxy */}
                          <td className="py-3 px-4 font-sans">
                            {contract.proxyInfo.isProxy ? (
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                {contract.proxyInfo.proxyType || 'Proxy'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Standard</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 font-sans">
                            {contract.recoveryStatus === 'POTENTIALLY_RECOVERABLE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Recoverable</span>
                              </span>
                            )}
                            {contract.recoveryStatus === 'REQUIRES_MANUAL_REVIEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Manual Review</span>
                              </span>
                            )}
                            {contract.recoveryStatus === 'NO_PATH_FOUND' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                No Path Found
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              {contract.recoveryStatus === 'POTENTIALLY_RECOVERABLE' && candidate && (
                                <button
                                  onClick={() => handleOpenRecovery(contract, candidate)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                  Recover
                                </button>
                              )}
                              <Link
                                href={`/contract/${contract.address}`}
                                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Details
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* On-Chain Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        scanType={scanModalType}
        deepScanPriceWei={deepScanPriceWei}
        onScanCompleted={(job) => {
          setActiveJob(job);
        }}
      />

      {/* Recovery Execution Modal */}
      {selectedContract && selectedMethod && (
        <RecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={() => {
            setIsRecoveryModalOpen(false);
            setSelectedContract(null);
            setSelectedMethod(null);
          }}
          contract={selectedContract}
          method={selectedMethod}
          onSuccess={() => {
            // Can trigger a refresh of balances
          }}
        />
      )}
    </div>
  );
}
