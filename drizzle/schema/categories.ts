// 主产品分类树（categories.ts）—— 表 2/33
// 前台产品浏览用的分类树，无限层级（parentId 自引用）
import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 中文名 / 英文名（6 语言里分类只维护中英双语名，其余语言显示英文名）
    nameZh: varchar('name_zh', { length: 50 }).notNull(),
    nameEn: varchar('name_en', { length: 50 }).notNull(),
    // URL 友好标识（如 green-tea），全局唯一
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    // 分类卡片图片（R2 URL）
    image: varchar('image', { length: 500 }),
    // 同级排序值（越小越靠前，拖拽排序时批量更新）
    sortOrder: integer('sort_order').default(0).notNull(),
    // 自引用：parentId 指向另一条分类的 id（为空表示一级分类）
    parentId: uuid('parent_id'),
    // 受保护分类不可删除（"00 未分类" isProtected=true）
    isProtected: boolean('is_protected').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  // 索引（04 号文档 §8）：按父分类查询 + 父分类内排序
  (table) => ({
    parentIdx: index('idx_categories_parent').on(table.parentId),
    sortIdx: index('idx_categories_sort').on(table.parentId, table.sortOrder),
  })
);
