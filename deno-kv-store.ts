// deno-kv-store.ts
class DenoKvStore {
  private kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  async increment(key: string, expireIn: number): Promise<number> {
    const kvKey = ["rate_limit", key];
    const getRes = await this.kv.get<number | bigint>(kvKey);
    const currentCount = Number(getRes.value || 0);
    const newCount = currentCount + 1;
    const options = currentCount === 0 ? { expireIn } : {};
    await this.kv.set(kvKey, newCount, options);
    return newCount;
  }

  async resetKey(key: string): Promise<void> {
    const kvKey = ["rate_limit", key];
    await this.kv.delete(kvKey);
  }
}

export { DenoKvStore };
