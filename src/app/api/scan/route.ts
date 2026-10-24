import { NextRequest, NextResponse } from 'next/server';
import { discoverContractsForWallet } from '@/server/explorer';
import { verifyOnChainPayment } from '@/server/paymentVerifier';
import { jobStore } from '@/server/jobStore';
import { ScanJobRecord } from '@/server/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, scanType, txHash, scanId: clientScanId } = body;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json({ error: 'Valid wallet address required.' }, { status: 400 });
    }

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Valid on-chain transaction hash required.' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimit = jobStore.checkRateLimit(userAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before initiating another scan.' },
        { status: 429 }
      );
    }

    // Server-side independent verification of on-chain registration & payment
    const expectedType = scanType === 'DEEP' ? 'Deep' : 'Free';
    const verification = await verifyOnChainPayment({
      txHash,
      expectedUser: userAddress,
      expectedScanType: expectedType,
    });

    if (!verification.isValid) {
      return NextResponse.json(
        { error: `Payment verification failed: ${verification.error}` },
        { status: 400 }
      );
    }

    const confirmedScanId = verification.scanId || clientScanId;

    // Execute discovery pipeline
    const { contracts, warnings } = await discoverContractsForWallet(userAddress);

    // Compute metrics
    const summary = {
      totalDiscovered: contracts.length,
      withNativeBalance: contracts.filter((c) => BigInt(c.nativeBalanceWei) > 0n).length,
      withTokenBalance: contracts.filter((c) =>
        c.tokenBalances.some((t) => BigInt(t.balanceRaw) > 0n)
      ).length,
      potentiallyRecoverable: contracts.filter(
        (c) => c.recoveryStatus === 'POTENTIALLY_RECOVERABLE'
      ).length,
      requiresManualReview: contracts.filter(
        (c) => c.recoveryStatus === 'REQUIRES_MANUAL_REVIEW'
      ).length,
      noPathFound: contracts.filter((c) => c.recoveryStatus === 'NO_PATH_FOUND').length,
    };

    const jobRecord: ScanJobRecord = {
      scanId: confirmedScanId,
      userAddress,
      scanType: scanType === 'DEEP' ? 'DEEP' : 'FREE',
      txHash,
      amountPaidWei: (verification.amountPaidWei || 0n).toString(),
      createdAt: Date.now(),
      completedAt: Date.now(),
      status: 'COMPLETED',
      contracts,
      summary,
      warnings,
    };

    jobStore.setJob(jobRecord);

    return NextResponse.json({ success: true, job: jobRecord });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal server error: ${err?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userAddress = searchParams.get('userAddress');
  const scanId = searchParams.get('scanId');

  if (scanId) {
    const job = jobStore.getJob(scanId);
    if (!job) {
      return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
    }
    // Prevent snooping: userAddress binding check
    if (userAddress && job.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized access to scan.' }, { status: 403 });
    }
    return NextResponse.json({ job });
  }

  if (userAddress) {
    const jobs = jobStore.getJobsForUser(userAddress);
    return NextResponse.json({ jobs });
  }

  return NextResponse.json({ error: 'Provide userAddress or scanId.' }, { status: 400 });
}
