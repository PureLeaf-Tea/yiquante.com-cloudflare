// OpenNext Cloudflare 适配器配置（B1 迁移，官方 get-started 步骤 4）
// 未启用 R2 增量缓存（NEXT_INC_CACHE_R2_BUCKET 未配置，ISR 缓存为可选项，上线后可按官方 Caching 文档开启）
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
