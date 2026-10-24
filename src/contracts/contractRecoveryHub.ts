import { Abi } from 'viem';
import contractJson from './ContractRecoveryHub.json';

export const CONTRACT_RECOVERY_HUB_ABI = contractJson.abi as Abi;
export const CONTRACT_RECOVERY_HUB_BYTECODE = contractJson.bytecode as `0x${string}`;

export const DEFAULT_HUB_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_RECOVERY_HUB_ADDRESS ||
  '0x8baf11bb2f5c35d81fd21cd40eae0c205113cba1') as `0x${string}`;
