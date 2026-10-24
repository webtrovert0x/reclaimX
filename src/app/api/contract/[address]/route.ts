import { NextRequest, NextResponse } from 'next/server';
import { checkContractBalances } from '@/server/balanceChecker';
import { detectProxy } from '@/server/proxyDetector';
import { analyzeContractRecovery } from '@/server/recoveryEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(req.url);
    const callerAddress = (searchParams.get('caller') ||
      '0x0000000000000000000000000000000000000000') as `0x${string}`;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Valid contract address required.' }, { status: 400 });
    }

    const targetAddress = address.toLowerCase() as `0x${string}`;

    const { hasBytecode, nativeWei, nativeFormatted, tokenBalances } =
      await checkContractBalances(targetAddress);

    const proxyInfo = hasBytecode ? await detectProxy(targetAddress) : { isProxy: false };

    const analysis = await analyzeContractRecovery({
      contractAddress: targetAddress,
      callerAddress,
      hasBytecode,
      nativeWei,
      nativeFormatted,
      tokenBalances,
      proxyInfo,
    });

    return NextResponse.json({
      address: targetAddress,
      hasBytecode,
      nativeBalanceWei: nativeWei.toString(),
      nativeBalanceFormatted: nativeFormatted,
      tokenBalances,
      proxyInfo,
      recoveryStatus: analysis.recoveryStatus,
      candidateMethods: analysis.candidateMethods,
      analysisNotes: analysis.analysisNotes,
      ownerAddress: analysis.ownerAddress,
      isCallerAuthorized: analysis.isCallerAuthorized,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to inspect contract' }, { status: 500 });
  }
}
