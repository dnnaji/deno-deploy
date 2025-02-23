// deno-kv-store.ts
class DenoKvStore {
  private kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  async increment(key: string, expireIn: number): Promise<number> {
    const kvKey = ["rate_limit", key]; // Prefix keys for organization

    // Try to set counter to 1 with expiration if key doesn't exist
    const setRes = await this.kv
      .atomic()
      .check({ key: kvKey, versionstamp: null })
      .set(kvKey, new Deno.KvU64(1n), { expireIn })
      .commit();

    if (setRes.ok) {
      // Key was newly set to 1
      return 1;
    } else {
      // Key exists, increment it atomically
      await this.kv.atomic().sum(kvKey, 1n).commit();
      const getRes = await this.kv.get<Deno.KvU64>(kvKey);
      return Number(getRes.value!.value); // Convert bigint to number
    }
  }

  async resetKey(key: string): Promise<void> {
    const kvKey = ["rate_limit", key];
    await this.kv.delete(kvKey);
  }
}

export { DenoKvStore };
