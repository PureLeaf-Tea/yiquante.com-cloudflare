// 哥伦比亚 14 种商品导入脚本（seed/import-colombia.ts，订单模块第 1 期）
// 用法：npm run db:import-colombia（幂等：按 slug 判断，已存在的商品整体跳过，只补不删不改）
// 内容：14 种商品（含真实图片上传 R2）+ 缺少的分类（熟普/柑普/生普/包装容器/赠品摆件）
// 需求来源：18-订单管理系统需求规格说明书 §2.2 / §6.5
import 'dotenv/config';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { categories, products, productImages, uploads } from '../drizzle/schema';
import { uploadFile, isR2Configured } from '../src/lib/r2';

// ==================== 配置 ====================

// 商品图片源目录（仓库内，14 个商品文件夹，每种 1~4 张图）
const BASE_DIR = join(process.cwd(), 'order-assets', 'colombia');

// 支持的图片扩展名 → MIME 类型
const IMAGE_MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// 英文名 → slug（kebab-case，与 seed.ts makeSlug 同规则）
function makeSlug(nameEn: string): string {
  return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// 分类定义：[中文名, 英文名, slug, 父级 slug（null=一级）]
// 茶叶类按 §2.2 建议分类映射；包装容器/赠品摆件为新增一级分类
const CATEGORY_DEFS: Array<[string, string, string, string | null]> = [
  ['熟普', 'Ripe Pu-erh', 'shou-puerh', 'puerh-tea'],
  ['柑普', 'Citrus Pu-erh', 'gan-pu', 'puerh-tea'],
  ['生普', 'Raw Pu-erh', 'sheng-puerh', 'puerh-tea'],
  ['包装容器', 'Packaging', 'packaging', null],
  ['赠品/摆件', 'Gifts & Decor', 'gifts-decor', null],
];

// 14 种商品：[源文件夹名, 英文名（起草，待审核）, 目标分类 slug, 是否官网前台显示]
// 非售卖品（包装罐/紫砂雕塑）设 showOnStorefront=false：前台隐藏，订单仍可选用
const PRODUCT_DEFS: Array<[string, string, string, boolean]> = [
  ['古树金芽熟普洱茶饼2012年', '2012 Ancient Tree Golden Bud Ripe Pu-erh Cake', 'shou-puerh', true],
  ['懿泉特级精品熟普', 'YiQuan Premium Fine Ripe Pu-erh', 'shou-puerh', true],
  ['懿泉天马果味小青柑', 'YiQuan Tianma Fruity Xiao Qing Gan', 'gan-pu', true],
  ['龙珠小冰岛', 'Dragon Pearl Xiao Bing Dao', 'sheng-puerh', true],
  ['懿泉茉莉特级飘雪', 'YiQuan Jasmine Premium Piao Xue', 'flower-tea', true],
  ['极品茉莉黑飘雪', 'Supreme Jasmine Black Piao Xue', 'flower-tea', true],
  ['明前龙井4100·a箱', 'Pre-Qingming Longjing 4100 Box A', 'longjing', true],
  ['金骏眉·早春花香梅占', 'Jin Jun Mei Early Spring Floral Mei Zhan', 'jin-jun-mei', true],
  ['正山小种·高山野茶', 'Lapsang Souchong High Mountain Wild Tea', 'lapsang-souchong', true],
  ['铁观音6号', 'Tie Guan Yin No. 6', 'oolong-tea', true],
  ['合金罐金色红色', 'Alloy Tea Caddy Gold Red', 'packaging', false],
  ['小茶仓金色红色', 'Mini Tea Caddy Gold Red', 'packaging', false],
  ['黑盖红色合金罐', 'Black Lid Red Alloy Caddy', 'packaging', false],
  ['紫砂雕塑·高枕无忧佛（赠送）', 'Zisha Sculpture Carefree Buddha (Gift)', 'gifts-decor', false],
];

// ==================== 统计 ====================

const stats = { categories: 0, products: 0, images: 0, skipped: 0 };

// ==================== 分类（幂等） ====================

// 返回 slug → category id 的映射；缺少的分类现场创建
async function ensureCategories(): Promise<Map<string, string>> {
  const all = await db.select().from(categories);
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  for (const [nameZh, nameEn, slug, parentSlug] of CATEGORY_DEFS) {
    if (bySlug.has(slug)) continue;
    const parent = parentSlug ? bySlug.get(parentSlug) : undefined;
    if (parentSlug && !parent) {
      throw new Error(`父分类不存在：${parentSlug}（创建 ${slug} 失败）`);
    }
    const rows = await db
      .insert(categories)
      .values({ nameZh, nameEn, slug, parentId: parent?.id ?? null, updatedAt: new Date() })
      .returning();
    bySlug.set(slug, rows[0]);
    stats.categories++;
    console.log(`[分类] 新增 ${nameZh}（${slug}）`);
  }

  return new Map([...bySlug.entries()].map(([slug, c]) => [slug, c.id]));
}

// ==================== 商品导入 ====================

// 文件夹内的图片文件（按文件名字典序，首图即封面）
function listImages(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => !!IMAGE_MIME[f.slice(f.lastIndexOf('.'))])
    .sort();
}

async function importProduct(
  dirName: string,
  nameEn: string,
  catSlug: string,
  showOnStorefront: boolean,
  catIdBySlug: Map<string, string>,
  usedSlugs: Set<string>
): Promise<void> {
  const nameZh = dirName;

  // 幂等：按中文名（=源文件夹名，导入唯一身份）判断，已存在则整体跳过；
  // 不能按 slug 判断——重跑时 slug 冲突回避会生成 -2 后缀导致重复导入
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.nameZh, nameZh)).limit(1);
  if (existing[0]) {
    stats.skipped++;
    console.log(`[skip] 已存在：${nameZh}`);
    return;
  }

  // slug 唯一：冲突则追加 -2 / -3 ...
  let slug = makeSlug(nameEn);
  if (usedSlugs.has(slug)) {
    let n = 2;
    while (usedSlugs.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }

  const categoryId = catIdBySlug.get(catSlug);
  if (!categoryId) throw new Error(`分类 ${catSlug} 未找到（商品 ${nameZh}）`);

  // 1. 产品主记录（价格 0 / 规格留空，后台可补）
  const productRows = await db
    .insert(products)
    .values({
      nameZh,
      nameEn,
      slug,
      categoryId,
      showOnStorefront,
      updatedAt: new Date(),
    })
    .returning();
  const product = productRows[0];
  usedSlugs.add(slug);
  stats.products++;
  console.log(`[商品] 导入 ${nameZh} -> ${slug}（前台显示：${showOnStorefront ? '是' : '否'}）`);

  // 2. 图片上传 R2 + 登记 product_images / uploads
  const dir = join(BASE_DIR, dirName);
  const files = listImages(dir);
  if (files.length === 0) {
    console.warn(`[warn] ${nameZh} 文件夹内无图片`);
    return;
  }
  let order = 0;
  for (const file of files) {
    const filePath = join(dir, file);
    const buf = readFileSync(filePath);
    // Buffer 复制为纯 ArrayBuffer（Buffer 底层可能是共享大缓冲区，不能直接取 .buffer）
    const body = new Uint8Array(buf).buffer as ArrayBuffer;
    const ext = file.slice(file.lastIndexOf('.'));
    const contentType = IMAGE_MIME[ext];
    const key = `products/${slug}/${file}`;
    // R2 上传失败直接抛错终止（不做本地降级，保证图片资产真实入库）
    const url = await uploadFile(key, body, contentType);
    await db.insert(productImages).values({ productId: product.id, url, alt: nameZh, sortOrder: order });
    await db.insert(uploads).values({
      type: 'image',
      filename: key,
      originalName: file,
      url,
      mimeType: contentType,
      size: statSync(filePath).size,
      uploadedBy: null,
    });
    stats.images++;
    order++;
  }
  console.log(`[图片] ${nameZh}：${files.length} 张已上传 R2`);
}

// ==================== 主流程 ====================

async function main() {
  if (!isR2Configured()) {
    console.error('[error] R2 凭据未配置（.env 需 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY），终止');
    process.exit(1);
  }

  const allProducts = await db.select({ slug: products.slug }).from(products);
  const usedSlugs = new Set(allProducts.map((p) => p.slug));

  const catIdBySlug = await ensureCategories();

  for (const [dirName, nameEn, catSlug, showOnStorefront] of PRODUCT_DEFS) {
    await importProduct(dirName, nameEn, catSlug, showOnStorefront, catIdBySlug, usedSlugs);
  }

  console.log('\n========== 导入汇总 ==========');
  console.log(`分类新增 ${stats.categories} 个`);
  console.log(`商品导入 ${stats.products} 个（跳过 ${stats.skipped} 个已存在）`);
  console.log(`图片上传 ${stats.images} 张（R2）`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[fatal]', e);
    process.exit(1);
  });
