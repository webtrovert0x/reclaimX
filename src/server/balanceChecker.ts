import { formatEther, formatUnits, parseAbi } from 'viem';
import { botPublicClient } from './client';
import { TokenBalance } from './types';

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);

// Known token list on BOT Chain (testnet / common mocks)
export const KNOWN_TOKENS: Array<{ address: `0x${string}`; symbol: string; name: string; decimals: number }> = [
  // Can be extended via config
];

export async function checkContractBalances(
  contractAddress: `0x${string}`,
  customTokens: `0x${string}`[] = []
): Promise<{
  hasBytecode: boolean;
  nativeWei: bigint;
  nativeFormatted: string;
  tokenBalances: TokenBalance[];
}> {
  // 1. Check bytecode
  const bytecode = await botPublicClient.getBytecode({ address: contractAddress });
  const hasBytecode = Boolean(bytecode && bytecode !== '0x');

  if (!hasBytecode) {
    return {
      hasBytecode: false,
      nativeWei: BigInt(0),
      nativeFormatted: '0.0000',
      tokenBalances: [],
    };
  }

  // 2. Check native BOT balance
  const nativeWei = await botPublicClient.getBalance({ address: contractAddress });
  const nativeFormatted = formatEther(nativeWei);

  // 3. Check known and custom tokens
  const tokensToCheck = [
    ...KNOWN_TOKENS.map((t) => t.address),
    ...customTokens,
  ];

  const uniqueTokens = Array.from(new Set(tokensToCheck.map((a) => a.toLowerCase()))) as `0x${string}`[];
  const tokenBalances: TokenBalance[] = [];

  for (const tokenAddr of uniqueTokens) {
    try {
      const [balanceRaw, decimals, symbol, name] = await Promise.all([
        botPublicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [contractAddress],
        }),
        botPublicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        botPublicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        botPublicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
      ]);

      if (balanceRaw > BigInt(0)) {
        tokenBalances.push({
          address: tokenAddr,
          name: String(name),
          symbol: String(symbol),
          decimals: Number(decimals),
          balanceRaw: balanceRaw.toString(),
          balanceFormatted: formatUnits(balanceRaw, Number(decimals)),
        });
      }
    } catch (e) {
      // Token call failed or token not deployed on this chain
      continue;
    }
  }

  return {
    hasBytecode,
    nativeWei,
    nativeFormatted,
    tokenBalances,
  };
}
