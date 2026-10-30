import React from 'react';
import Link from 'next/link';
import { defaultTargetChain } from '@/config/chains';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Search,
  Zap,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function AboutPage() {
  const explorerUrl = defaultTargetChain.blockExplorers?.default.url || 'https://scan.botchain.ai';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          How ReclaimX Works &amp; Security Architecture
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          A transparent, non-custodial discovery and recovery platform engineered specifically for
          the BOT Chain ecosystem.
        </p>
      </div>

      {/* Non-Custodial Core Rule */}
      <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
          <Lock className="w-5 h-5 text-blue-600" />
          <span>Strictly Non-Custodial Protocol</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          The <span className="font-mono font-semibold">ContractRecoveryHub</span> smart contract is
          an on-chain registration and payment registry. It does <strong>not</strong> hold custody of
          user funds, cannot execute arbitrary calls on your behalf, and never routes recovered
          funds through our infrastructure.
        </p>
        <p className="text-xs text-slate-700 leading-relaxed">
          When you execute a recovery transaction, your connected wallet submits a transaction
          directly to your own contract. If the target contract&apos;s code transfers funds to{' '}
          <span className="font-mono">msg.sender</span>, the funds land directly in your wallet in
          that single atomic transaction.
        </p>
      </div>

      {/* 3 Steps */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Recovery Workflow</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
            <span className="text-xs font-bold text-blue-600">STEP 1</span>
            <h3 className="font-semibold text-slate-900 text-sm">On-Chain Registration</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Users register either a Free Scan (gas only) or a Deep Scan (exact BOT payment) on
              the ContractRecoveryHub contract.
            </p>
          </div>

          <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
            <span className="text-xs font-bold text-blue-600">STEP 2</span>
            <h3 className="font-semibold text-slate-900 text-sm">Discovery &amp; Simulation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our indexing engine queries the BOT Chain explorer, checks active bytecode, resolves
              proxy slots, and dry-runs call candidates via node simulation.
            </p>
          </div>

          <div className="border border-slate-200 rounded p-5 bg-white space-y-2">
            <span className="text-xs font-bold text-blue-600">STEP 3</span>
            <h3 className="font-semibold text-slate-900 text-sm">Direct Wallet Execution</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once verified, the dashboard displays candidate recovery methods. You review the exact
              selector, target, and estimated assets before signing directly with your wallet.
            </p>
          </div>
        </div>
      </div>

      {/* Known Limitations */}
      <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Known Limitations &amp; Transparency</span>
        </div>

        <ul className="list-disc list-inside text-xs text-slate-600 space-y-2 leading-relaxed">
          <li>
            <strong>Discovery Completeness:</strong> Automated discovery queries public explorer
            APIs. While direct deployments and recognized factory internal transactions are
            indexed, deeply nested multi-call factory deployments or unindexed transactions may
            require manual address lookup.
          </li>
          <li>
            <strong>Simulation as Diagnostic, Not Guarantee:</strong> Pre-flight simulations with{' '}
            <span className="font-mono">eth_call</span> verify whether a method would succeed at the
            exact current block. Changes in timestamp, gas price, or state between simulation and
            transaction inclusion can affect execution.
          </li>
          <li>
            <strong>Custom or Obfuscated Contracts:</strong> Unverified contracts without standard
            interfaces (<span className="font-mono">withdraw</span>,{' '}
            <span className="font-mono">owner</span>) will be marked as &quot;Requires Manual Review&quot;
            or &quot;No Path Found&quot;. ReclaimX will never guess arbitrary bytecode selectors to avoid
            triggering unintended logic.
          </li>
        </ul>
      </div>

      {/* Back CTA */}
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
