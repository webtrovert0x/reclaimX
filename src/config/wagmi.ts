import { cookieStorage, createStorage, http } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { botChainTestnet, botChainMainnet } from './chains';

export const networks = [botChainTestnet, botChainMainnet];

export function getWagmiAdapter(projectId: string) {
  return new WagmiAdapter({
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    projectId,
    networks,
    transports: {
      [botChainTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.bohr.life'),
      [botChainMainnet.id]: http('https://rpc.botchain.ai'),
    },
  });
}
