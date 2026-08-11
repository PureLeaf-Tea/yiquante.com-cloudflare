// Cloudflare KV 操作（kv.ts）
// KV：全球同步的 key-value 缓存（类似老版 Redis），用于存会话缓存、限流计数、B2B 24h token 等高频读写数据

// 统一的 KV 客户端接口（线上真 KV 和本地模拟 KV 都实现这个接口）
export interface KVClient {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

// 在开发阶段（本地），用一个简单的 Map 模拟 KV
// 在线上，通过 env.YIQUANTEA_KV 访问真正的 Cloudflare KV（wrangler.toml 中绑定）
export function createKVClient(env?: { YIQUANTEA_KV?: KVNamespace }): KVClient {
  if (env?.YIQUANTEA_KV) {
    return env.YIQUANTEA_KV;
  }
  // 本地开发 fallback（进程内存模拟，支持 TTL 过期）
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key: string) {
      const entry = store.get(key);
      if (entry && entry.expiresAt > Date.now()) return entry.value;
      store.delete(key);
      return null;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      store.set(key, {
        value,
        // expirationTtl：过期时间（秒）；不传则永不过期
        expiresAt: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : Infinity,
      });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

// ★全局单例：本地开发全进程共享一个模拟 KV（限流计数、B2B token 才能在多次请求间保持）
export const kv: KVClient = createKVClient();
