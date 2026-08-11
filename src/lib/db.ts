// Neon 数据库连接（db.ts）
// Neon：云端托管的 Serverless PostgreSQL，通过 HTTP 协议连接（不是传统 TCP 长连接）
// Drizzle ORM：TypeScript 数据库操作框架（代替 Prisma），天生支持 Edge Runtime
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../../drizzle/schema';

// 导出类型：方便在其他文件里标注参数类型
export type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | null = null;

// ★懒初始化：首次使用时才创建连接
// 好处：DATABASE_URL 未填（Neon 未开通）时，import 本文件不会报错，只在真正查库时报错
function initDb(): DB {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[db] DATABASE_URL 未配置：请在 .env 中填入 Neon 连接字符串（见《01-启动手册》第三步）');
  }
  cached = drizzle(neon(url), { schema });
  return cached;
}

// ★和老版的区别：老版是 `import { PrismaClient } from '@prisma/client'` + TCP 连接；
// 新版是 Drizzle + Neon HTTP 连接。语法变了，但"查数据库"这个动作不变。
// 用法和常规 Drizzle 客户端完全一致：db.select() / db.insert() / db.update() / db.delete()
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    // 所有属性访问都转发到真实的懒初始化客户端
    return Reflect.get(initDb(), prop);
  },
});
