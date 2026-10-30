import { cookieStorage, createStorage, http } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { botChainMainnet, botChainTestnet } from './chains';

export const networks = [botChainMainnet, botChainTestnet];

export function getWagmiAdapter(projectId: string) {
  return new WagmiAdapter({
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    projectId,
    networks,
    transports: {
      [botChainMainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.botchain.ai'),
      [botChainTestnet.id]: http('https://rpc.bohr.life'),
    },
  });
}
