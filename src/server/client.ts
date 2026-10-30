import { createPublicClient, http } from 'viem';
import { defaultTargetChain } from '@/config/chains';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.botchain.ai';

export const botPublicClient = createPublicClient({
  chain: defaultTargetChain,
  transport: http(rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 15_000,
  }),
});
