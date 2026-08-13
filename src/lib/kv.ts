// Cloudflare KV 操作（kv.ts）
// KV：全球同步的 key-value 缓存（类似老版 Redis），用于存限流计数、B2B 24h token 等高频读写数据
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

// ★S3 安全修复：本地开发回退用的进程内存单例（不再对外导出，防止生产误用内存 Map）
const devFallbackKV: KVClient = createKVClient();

// ★按请求上下文惰性获取 KV（S3 修复，B1 适配 OpenNext）：
// 生产（Cloudflare Workers 运行时）：getCloudflareContext().env.YIQUANTEA_KV 拿到 wrangler.jsonc 绑定的真实 KV；
// 本地 next dev：无请求上下文/无绑定，回退进程内存 Map（限流计数仅单进程有效，不报错）。
// 注意：必须在请求处理链路中调用（路由 handler 内），不要在模块顶层调用。
export function getKV(): KVClient {
  try {
    const { env } = getCloudflareContext();
    const bound = (env as { YIQUANTEA_KV?: KVNamespace }).YIQUANTEA_KV;
    if (bound) return bound;
  } catch {
    // 非 Workers 运行时（本地 dev / Node）：回退内存模拟
  }
  return devFallbackKV;
}
