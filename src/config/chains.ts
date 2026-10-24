import { defineChain } from 'viem';

export const botChainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet (Bohr)',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BohrScan',
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://scan.bohr.life',
    },
  },
  testnet: true,
});

export const botChainMainnet = defineChain({
  id: 677,
  name: 'BOT Chain Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.botchain.ai'],
    },
    public: {
      http: ['https://rpc.botchain.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOTScan',
      url: 'https://scan.botchain.ai',
    },
  },
  testnet: false,
});

export const supportedChains = [botChainTestnet, botChainMainnet] as const;

export const defaultTargetChain =
  process.env.NEXT_PUBLIC_CHAIN_ID === '677'
    ? botChainMainnet
    : botChainTestnet;
