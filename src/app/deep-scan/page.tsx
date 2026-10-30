'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import {
  CONTRACT_RECOVERY_HUB_ABI,
  DEFAULT_HUB_ADDRESS,
} from '@/contracts/contractRecoveryHub';
import { defaultTargetChain } from '@/config/chains';
import { ScanModal } from '@/components/ScanModal';
import { formatEther } from 'viem';
import {
  Zap,
  Shield,
  Layers,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function DeepScanPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hubAddress =
    (process.env.NEXT_PUBLIC_CONTRACT_RECOVERY_HUB_ADDRESS as `0x${string}`) ||
    DEFAULT_HUB_ADDRESS;

  const { data: priceData, isLoading: isLoadingPrice } = useReadContract({
    address: hubAddress,
    abi: CONTRACT_RECOVERY_HUB_ABI,
    functionName: 'deepScanPrice',
  });

  const deepScanPriceWei = (priceData as bigint) || 50000000000000000n;
  const formattedPrice = formatEther(deepScanPriceWei);

  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.botchain.ai';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" />
          <span>Deep Scan On-Chain Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          In-Depth Smart Contract & Proxy Analysis
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Deep Scan combines on-chain event registration with intensive server-side analysis:
          tracing internal factory deployments, resolving EIP-1967/EIP-1822 storage slots, and
          simulating withdrawal call data across all detected contracts.
        </p>
      </div>

      {/* Pricing & Terms Card */}
      <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Configured On-Chain Price</span>
            <div className="text-3xl font-bold text-slate-900 mt-0.5">
              {isLoadingPrice ? '...' : `${formattedPrice} BOT`}
            </div>
            <span className="text-xs text-slate-500">
              Paid directly to <span className="font-mono">ContractRecoveryHub</span>
            </span>
          </div>

          <div>
            {isConnected ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors"
              >
                <span>Initiate Deep Scan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-1">
                <appkit-button />
                <div className="text-[11px] text-slate-500">Connect wallet to begin</div>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="text-xs text-slate-600 space-y-1.5 pt-1">
          <div className="flex justify-between">
            <span>Platform Deep Scan Fee:</span>
            <span className="font-semibold text-slate-800">{formattedPrice} BOT</span>
          </div>
          <div className="flex justify-between">
            <span>BOT Chain Network Gas:</span>
            <span className="font-semibold text-slate-800">Paid by user at signing</span>
          </div>
          <div className="flex justify-between">
            <span>Contract Address:</span>
            <a
              href={`${explorerUrl}/address/${hubAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono"
            >
              {hubAddress.slice(0, 10)}...{hubAddress.slice(-8)}
            </a>
          </div>
        </div>
      </div>

      {/* Deep Scan Feature Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Factory & Clone Tracking</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Indexes internal creation calls (CREATE / CREATE2) to surface contracts spawned by
            factories or deployer utilities.
          </p>
        </div>

        <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Proxy Slot Inspection</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Queries EIP-1967 and EIP-1822 storage slots directly from the node to extract
            implementation and admin addresses.
          </p>
        </div>

        <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Multi-Method Dry-Runs</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Performs simulated calls for standard and emergency withdrawal functions with
            detailed revert diagnostics.
          </p>
        </div>
      </div>

      {/* Security & Verification Guarantee */}
      <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-3">
        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Server-Side Independent Verification</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          ReclaimX never trusts client claims. Every paid Deep Scan is independently validated by
          inspecting the confirmed transaction receipt, authenticating the event signature from the
          official <span className="font-mono">{hubAddress}</span> contract, and verifying exact payment
          against current contract state. Results are cryptographically bound to your wallet address.
        </p>
      </div>

      {/* Modal */}
      <ScanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        scanType="DEEP"
        deepScanPriceWei={deepScanPriceWei}
        onScanCompleted={() => {
          setIsModalOpen(false);
          router.push('/');
        }}
      />
    </div>
  );
}
