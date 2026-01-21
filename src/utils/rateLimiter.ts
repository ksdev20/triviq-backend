type Bucket = { count: number; resetAt: number };
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(
    private windowMs: number,
    private maxEvents: number,
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(key, {
        count: 0,
        resetAt: this.windowMs,
      });
      return true;
    }

    if (bucket.count < this.maxEvents){
        bucket.count++;
        return true;
    }

    return false;
  }
}
