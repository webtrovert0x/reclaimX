import React from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-auto text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Network & Platform Info */}
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-700">ReclaimX</span>
          <span>— Non-custodial smart contract recovery for</span>
          <span className="font-bold text-slate-900">BOT Chain</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            Mainnet 677
          </span>
        </div>

        {/* Footer Navigation & BOT Chain Official Links */}
        <div className="flex items-center flex-wrap justify-center gap-5 sm:gap-6">
          {/* Clickable https://botchain.ai with original logo in front */}
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/botchain-logo.png"
              alt="BOT Chain"
              width={16}
              height={16}
              className="w-4 h-4 rounded-full object-contain shrink-0"
            />
            <span>https://botchain.ai</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          {/* Clickable https://scan.botchain.ai with original logo in front */}
          <a
            href="https://scan.botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/botchain-logo.png"
              alt="BOT Chain"
              width={16}
              height={16}
              className="w-4 h-4 rounded-full object-contain shrink-0"
            />
            <span>https://scan.botchain.ai</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          <Link href="/whitepaper" className="hover:text-blue-600 transition-colors">
            Whitepaper
          </Link>
          <span className="text-slate-400">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
