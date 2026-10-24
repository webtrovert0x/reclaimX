import React, { Suspense } from 'react';
import { ContractDetailsContent } from '@/components/ContractDetailsContent';
import { RefreshCw } from 'lucide-react';

export const instant = false;

export default async function ContractDetailsPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span className="text-sm">Loading contract...</span>
        </div>
      }
    >
      <ContractDetailsContent address={address} />
    </Suspense>
  );
}
