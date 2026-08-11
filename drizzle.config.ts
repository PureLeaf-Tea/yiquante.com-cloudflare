// Drizzle Kit 配置（drizzle.config.ts）
// drizzle-kit 是 Drizzle ORM 的命令行工具：
// - generate：根据 schema 变更生成 SQL 迁移文件
// - push：把 schema 直接同步到数据库（开发阶段用）
// - studio：打开网页版数据库管理界面
import 'dotenv/config'; // 加载 .env 文件里的 DATABASE_URL
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // 数据库表定义的位置（33 张表的总入口，阶段 2 编写）
  schema: './drizzle/schema/index.ts',
  // 迁移文件输出目录
  out: './drizzle/migrations',
  // 数据库方言：Neon 是 PostgreSQL
  dialect: 'postgresql',
  dbCredentials: {
    // Neon 数据库连接地址，从 .env 读取（postgresql:// 开头）
    url: process.env.DATABASE_URL!,
  },
});
