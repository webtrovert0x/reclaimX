import React from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { defaultTargetChain } from '@/config/chains';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-auto text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-700">ReclaimX</span>
          <span>— Non-custodial smart contract discovery & recovery for BOT Chain</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href={defaultTargetChain.blockExplorers?.default.url || 'https://scan.bohr.life'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <span>Explorer ({defaultTargetChain.blockExplorers?.default.name})</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <Link href="/whitepaper" className="hover:text-blue-600 transition-colors">
            Whitepaper
          </Link>
          <a
            href="https://rpc.bohr.life"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            RPC Status
          </a>
          <span className="text-slate-400">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
