export type ScanType = 'FREE' | 'DEEP';

export type RecoveryStatus =
  | 'POTENTIALLY_RECOVERABLE'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'NO_PATH_FOUND';

export interface TokenBalance {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
}

export interface ProxyInfo {
  isProxy: boolean;
  proxyType?: 'EIP-1967' | 'EIP-1822' | 'Custom';
  implementationAddress?: `0x${string}`;
  adminAddress?: `0x${string}`;
}

export interface RecoveryMethodCandidate {
  name: string;
  signature: string;
  assetType: 'NATIVE' | 'ERC20';
  assetSymbol: string;
  assetAddress?: `0x${string}`;
  estimatedAmount: string;
  simulationSuccess: boolean;
  simulationError?: string;
  callData?: `0x${string}`;
  needsParameters?: boolean;
}

export interface ContractRecord {
  address: `0x${string}`;
  creator: `0x${string}`;
  creationTxHash?: string;
  creationBlockNumber?: number;
  timestamp?: number;
  isFactoryCreated: boolean;
  hasBytecode: boolean;
  nativeBalanceWei: string;
  nativeBalanceFormatted: string;
  tokenBalances: TokenBalance[];
  isVerified: boolean;
  contractName?: string;
  proxyInfo: ProxyInfo;
  recoveryStatus: RecoveryStatus;
  candidateMethods: RecoveryMethodCandidate[];
  analysisNotes: string[];
  ownerAddress?: `0x${string}`;
  isCallerAuthorized?: boolean;
}

export interface ScanJobRecord {
  scanId: string;
  userAddress: `0x${string}`;
  scanType: ScanType;
  txHash?: string;
  amountPaidWei: string;
  createdAt: number;
  completedAt?: number;
  status: 'PENDING' | 'VERIFYING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  contracts: ContractRecord[];
  summary: {
    totalDiscovered: number;
    withNativeBalance: number;
    withTokenBalance: number;
    potentiallyRecoverable: number;
    requiresManualReview: number;
    noPathFound: number;
  };
  warnings: string[];
}
