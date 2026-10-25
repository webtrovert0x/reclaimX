'use client';

import React from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { defaultTargetChain } from '@/config/chains';
import { Shield, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Navbar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== defaultTargetChain.id;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-8 h-8 shrink-0" />
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">ReclaimX</span>
              <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                BOT Chain
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/deep-scan" className="hover:text-blue-600 transition-colors">
              Deep Scan
            </Link>
            <Link href="/whitepaper" className="hover:text-blue-600 transition-colors">
              Whitepaper
            </Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">
              How It Works
            </Link>
          </nav>
        </div>

        {/* Network & Wallet Controls */}
        <div className="flex items-center gap-3">
          {/* Wrong Network Banner */}
          {isWrongNetwork && (
            <button
              onClick={() => switchChain({ chainId: defaultTargetChain.id })}
              disabled={isSwitching}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Switch to {defaultTargetChain.name}</span>
              {isSwitching && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
            </button>
          )}

          {/* Network Badge */}
          {isConnected && !isWrongNetwork && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Chain ID {defaultTargetChain.id}</span>
            </div>
          )}

          {/* Reown AppKit Button */}
          <div className="reown-btn-wrapper">
            {/* Standard AppKit button web component */}
            <appkit-button balance="show" size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
