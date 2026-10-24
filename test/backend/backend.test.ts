import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { jobStore } from '../../src/server/jobStore';
import { analyzeContractRecovery } from '../../src/server/recoveryEngine';
import { ScanJobRecord } from '../../src/server/types';

describe('ReclaimX Backend Security & Processing Tests', () => {
  // Test 1: Deduplication & Replay Prevention
  test('Prevents replay attacks by deduplicating transaction hashes', () => {
    const dummyTx = '0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000';
    assert.equal(jobStore.isTxUsed(dummyTx), false);

    jobStore.markTxUsed(dummyTx);
    assert.equal(jobStore.isTxUsed(dummyTx), true);
    // Case insensitivity
    assert.equal(jobStore.isTxUsed(dummyTx.toUpperCase()), true);
  });

  // Test 2: Rate Limiting
  test('Enforces per-wallet rate limiting', () => {
    const testWallet = '0x9999999999999999999999999999999999999999';
    for (let i = 0; i < 10; i++) {
      const res = jobStore.checkRateLimit(testWallet);
      assert.equal(res.allowed, true);
    }
    // 11th request in same window should be rejected
    const blocked = jobStore.checkRateLimit(testWallet);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  // Test 3: User Wallet Binding
  test('Binds scan records strictly to the authentic caller wallet', () => {
    const userA = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as `0x${string}`;
    const userB = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' as `0x${string}`;

    const dummyJob: ScanJobRecord = {
      scanId: '0x123',
      userAddress: userA,
      scanType: 'FREE',
      amountPaidWei: '0',
      createdAt: Date.now(),
      status: 'COMPLETED',
      contracts: [],
      summary: {
        totalDiscovered: 0,
        withNativeBalance: 0,
        withTokenBalance: 0,
        potentiallyRecoverable: 0,
        requiresManualReview: 0,
        noPathFound: 0,
      },
      warnings: [],
    };

    jobStore.setJob(dummyJob);

    // User A can access
    const userAJobs = jobStore.getJobsForUser(userA);
    assert.equal(userAJobs.length, 1);
    assert.equal(userAJobs[0].scanId, '0x123');

    // User B cannot access User A's jobs
    const userBJobs = jobStore.getJobsForUser(userB);
    assert.equal(userBJobs.length, 0);
  });

  // Test 4: Empty Bytecode Contract Analysis
  test('Conservative analysis marks non-contract / self-destructed address as NO_PATH_FOUND', async () => {
    const res = await analyzeContractRecovery({
      contractAddress: '0x0000000000000000000000000000000000000001',
      callerAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      hasBytecode: false,
      nativeWei: BigInt(0),
      nativeFormatted: '0.0',
      tokenBalances: [],
      proxyInfo: { isProxy: false },
    });

    assert.equal(res.recoveryStatus, 'NO_PATH_FOUND');
    assert.equal(res.candidateMethods.length, 0);
    assert.match(res.analysisNotes[0], /No contract bytecode found/);
  });

  // Test 5: Zero Balance Contract Analysis
  test('Zero balance contracts are safely marked as NO_PATH_FOUND', async () => {
    const res = await analyzeContractRecovery({
      contractAddress: '0x0000000000000000000000000000000000000002',
      callerAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      hasBytecode: true,
      nativeWei: BigInt(0),
      nativeFormatted: '0.0',
      tokenBalances: [],
      proxyInfo: { isProxy: false },
    });

    assert.equal(res.recoveryStatus, 'NO_PATH_FOUND');
    assert.match(res.analysisNotes[0], /Zero native BOT/);
  });

  // Test 6: Proxy Detection with Missing Withdrawal Functions
  test('Contracts with funds and proxy architecture require manual review if standard calls fail', async () => {
    const res = await analyzeContractRecovery({
      contractAddress: '0x0000000000000000000000000000000000000003',
      callerAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      hasBytecode: true,
      nativeWei: BigInt('1000000000000000000'), // 1 BOT
      nativeFormatted: '1.0',
      tokenBalances: [],
      proxyInfo: {
        isProxy: true,
        proxyType: 'EIP-1967',
        implementationAddress: '0x1111111111111111111111111111111111111111',
      },
    });

    // Holds funds, has proxy architecture, but candidate calls revert -> REQUIRES_MANUAL_REVIEW
    assert.equal(res.recoveryStatus, 'REQUIRES_MANUAL_REVIEW');
    assert.ok(
      res.analysisNotes.some((n) => /Detected active EIP-1967 proxy/.test(n)),
      'Should contain proxy note in findings'
    );
  });
});
