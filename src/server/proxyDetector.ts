import { botPublicClient } from './client';
import { ProxyInfo } from './types';

const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const EIP1967_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
const EIP1822_PROXIABLE_SLOT =
  '0xc5f16836638894259e169c1725784b167a73ba577b836419273fe4fb49712e2d';

function extractAddressFromStorage(slotValue: string | undefined): `0x${string}` | undefined {
  if (!slotValue || slotValue === '0x' || slotValue === '0x0') return undefined;
  // Storage slot is 32 bytes (64 hex characters). An address is the rightmost 20 bytes (40 hex chars).
  const clean = slotValue.replace('0x', '').padStart(64, '0');
  const addressHex = '0x' + clean.slice(24);
  if (addressHex === '0x0000000000000000000000000000000000000000') {
    return undefined;
  }
  return addressHex.toLowerCase() as `0x${string}`;
}

export async function detectProxy(contractAddress: `0x${string}`): Promise<ProxyInfo> {
  try {
    const [impl1967Raw, admin1967Raw, uupsRaw] = await Promise.all([
      botPublicClient.getStorageAt({
        address: contractAddress,
        slot: EIP1967_IMPLEMENTATION_SLOT,
      }),
      botPublicClient.getStorageAt({
        address: contractAddress,
        slot: EIP1967_ADMIN_SLOT,
      }),
      botPublicClient.getStorageAt({
        address: contractAddress,
        slot: EIP1822_PROXIABLE_SLOT,
      }),
    ]);

    const impl1967 = extractAddressFromStorage(impl1967Raw);
    const admin1967 = extractAddressFromStorage(admin1967Raw);
    const uupsImpl = extractAddressFromStorage(uupsRaw);

    if (impl1967) {
      return {
        isProxy: true,
        proxyType: 'EIP-1967',
        implementationAddress: impl1967,
        adminAddress: admin1967,
      };
    }

    if (uupsImpl) {
      return {
        isProxy: true,
        proxyType: 'EIP-1822',
        implementationAddress: uupsImpl,
        adminAddress: admin1967,
      };
    }

    return {
      isProxy: false,
    };
  } catch (error) {
    // If contract does not support reading or RPC fails
    return {
      isProxy: false,
    };
  }
}
