'use client';

import React, { ReactNode, useState } from 'react';
import { getWagmiAdapter, networks } from '@/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';

interface Web3ProviderProps {
  children: ReactNode;
  projectId: string;
}

export function Web3Provider({ children, projectId }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [adapter] = useState(() => {
    const wagmiAdapter = getWagmiAdapter(projectId);

    createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: networks as any,
      defaultNetwork: networks[0] as any,
      metadata: {
        name: 'ReclaimX',
        description: 'Smart Contract Recovery on BOT Chain',
        url: 'https://reclaimx.botchain.ai',
        icons: ['https://scan.botchain.ai/assets/favicon/favicon-32x32.png'],
      },
      features: {
        analytics: false,
        email: false,
        socials: [],
      },
      themeMode: 'light',
      themeVariables: {
        '--w3m-accent': '#2563eb',
        '--w3m-border-radius-master': '4px',
      },
    });

    return wagmiAdapter;
  });

  return (
    <WagmiProvider config={adapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
