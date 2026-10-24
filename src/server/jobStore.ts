import { ScanJobRecord } from './types';

// In-memory persistent job and deduplication store
class JobStore {
  private jobs: Map<string, ScanJobRecord> = new Map();
  private usedTxHashes: Set<string> = new Set();
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();

  // Deduplication check
  public isTxUsed(txHash: string): boolean {
    return this.usedTxHashes.has(txHash.toLowerCase());
  }

  public markTxUsed(txHash: string): void {
    this.usedTxHashes.add(txHash.toLowerCase());
  }

  // Rate limiting (max 10 scan requests per minute per wallet)
  public checkRateLimit(walletAddress: string): { allowed: boolean; remaining: number } {
    const key = walletAddress.toLowerCase();
    const now = Date.now();
    const record = this.rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      this.rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
      return { allowed: true, remaining: 9 };
    }

    if (record.count >= 10) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: 10 - record.count };
  }

  // Job management
  public setJob(job: ScanJobRecord): void {
    this.jobs.set(job.scanId.toLowerCase(), job);
  }

  public getJob(scanId: string): ScanJobRecord | undefined {
    return this.jobs.get(scanId.toLowerCase());
  }

  public getJobsForUser(userAddress: string): ScanJobRecord[] {
    const lower = userAddress.toLowerCase();
    const results: ScanJobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (job.userAddress.toLowerCase() === lower) {
        results.push(job);
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const jobStore = new JobStore();
