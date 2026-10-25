import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ShieldCheck, Download, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Whitepaper | ReclaimX — Smart Contract Recovery on BOT Chain',
  description: 'Official whitepaper and technical specification for ReclaimX non-custodial smart contract recovery protocol on BOT Chain.',
};

export default function WhitepaperPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <a
          href="https://github.com/webtrovert0x/reclaimX/blob/main/WHITEPAPER.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <span>View on GitHub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <article className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 shadow-sm text-slate-800 space-y-8 leading-relaxed">
        {/* Header */}
        <div className="border-b border-slate-200 pb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Protocol Specification v1.0.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ReclaimX Whitepaper
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            Decentralized, Non-Custodial Smart Contract Discovery and Asset Recovery Protocol on BOT Chain
          </p>
          <div className="text-xs text-slate-500 pt-2 flex flex-wrap items-center justify-center gap-4">
            <span><strong>Network:</strong> BOT Chain (Bohr Testnet 968 / Mainnet 677)</span>
            <span>•</span>
            <span><strong>Hub Contract:</strong> <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">0x8baf...cba1</code></span>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Executive Summary
          </h2>
          <p className="text-sm text-slate-700">
            As smart contract deployments proliferate across EVM-compatible networks like BOT Chain, thousands of contracts become dormant, trapping native tokens (<code className="text-blue-700 font-semibold">BOT</code>), campaign giveaways, and token allocations.
          </p>
          <p className="text-sm text-slate-700">
            Traditional block explorers serve as ledger visualizers but offer zero semantic intelligence for contract authors seeking to decommission contracts or recover assets. <strong>ReclaimX</strong> bridges this gap through automated transaction graph indexing, bytecode static analysis, EIP-1967 proxy storage slot resolution, 4-byte selector matching, and local state dry-run simulations.
          </p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <strong>The Zero-Custody Invariant:</strong> The ReclaimX hub contract never takes custody of assets, never holds tokens in escrow, and never routes recovery calls through an intermediary. All reclamation calls occur directly between the user’s wallet and the target contract.
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            2. The Trapped Capital Dilemma
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
            <li>
              <strong>Selector Blindness:</strong> Developers rarely remember the exact withdrawal method signature (<code className="bg-slate-100 px-1 py-0.5 rounded">withdraw()</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">emergencyWithdraw()</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">recoverUnclaimedTokens(uint256)</code>) of contracts deployed months or years prior.
            </li>
            <li>
              <strong>The Revert Ambiguity:</strong> Blindly submitting transactions consumes gas and fails with empty revert data (<code className="bg-slate-100 px-1 py-0.5 rounded">0x</code>) or custom error hashes without explanation.
            </li>
            <li>
              <strong>The Timelock & Campaign Trap:</strong> Contracts like Merkle Giveaway Managers hold funds locked behind specific campaign parameters or future timestamps. ReclaimX decodes storage slots to display exact unlock schedules.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            3. Protocol Architecture & Invariants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">On-Chain Hub (0x8baf...cba1)</h3>
              <p className="text-slate-600">
                A lean registry implementing <code className="bg-slate-200 px-1 rounded">Ownable2Step</code>, <code className="bg-slate-200 px-1 rounded">Pausable</code>, and strict payment enforcement for paid Deep Scans. Holds zero arbitrary execution privileges.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Edge Intelligence Engine</h3>
              <p className="text-slate-600">
                Disassembles runtime bytecode to extract 4-byte selectors, probes EIP-1967/EIP-1822 storage slots, and simulates candidate executions in real-time via <code className="bg-slate-200 px-1 rounded">eth_call</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            4. Economic Model
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2 px-3 font-semibold text-slate-900">Scan Tier</th>
                  <th className="py-2 px-3 font-semibold text-slate-900">Fee</th>
                  <th className="py-2 px-3 font-semibold text-slate-900">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 font-medium text-slate-800">Free Scan</td>
                  <td className="py-2 px-3 text-emerald-600 font-bold">0.00 BOT</td>
                  <td className="py-2 px-3 text-slate-600">Direct contract deployments, native BOT balance, top 20 ERC-20 balances, basic Ownable check.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-slate-800">Deep Scan</td>
                  <td className="py-2 px-3 text-blue-700 font-bold">0.05 BOT</td>
                  <td className="py-2 px-3 text-slate-600">Recursive factory traversal, 4-byte bytecode selector parsing, EIP-1967 proxy resolution, simulation matrix, custom error & timelock decoding.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
            5. Empirical Case Study on BOT Chain
          </h2>
          <p className="text-sm text-slate-700">
            During testnet evaluation on Bohr Testnet (Chain ID 968), ReclaimX analyzed contract <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">0x63fe2ee7dbf45e7e178122c54cb4f5556ae0e380</code> holding <code className="font-semibold text-slate-900">0.4 BOT</code>:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>ReclaimX eliminated false withdrawal suggestions by confirming <code className="bg-slate-100 px-1 rounded">withdraw()</code> was absent from bytecode.</li>
            <li>Identified contract interface as a Merkle Giveaway Manager (<code className="bg-slate-100 px-1 rounded">recoverUnclaimedTokens(uint256)</code>).</li>
            <li>Resolved the user’s active campaign (Campaign ID 1) and parsed custom error <code className="bg-slate-100 px-1 rounded">0x857a6e90</code> to determine the exact unlock timelock date.</li>
          </ul>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>ReclaimX Protocol • Built for BOT Chain</span>
          <Link
            href="/deep-scan"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            Launch Deep Scan
          </Link>
        </div>
      </article>
    </div>
  );
}
