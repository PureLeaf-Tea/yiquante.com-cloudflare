// 种子数据脚本（seed/seed.ts，阶段 18 完善版）
// 用法：npm run db:seed（幂等：已存在的数据自动跳过，只补不删不改）
// 内容：管理员+员工 / 分类树（老版 V3.0 树迁移）/ 14 款产品（含 6 语言翻译）/ 2 个 B2B 分类 /
//       4 条评价 / 63 条搜索关键词 / 首页配置 / 导航 / 社交 / 页面内容 / SEO
import 'dotenv/config';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { eq, and } from 'drizzle-orm';
import { db } from '../src/lib/db';
import {
  users, categories, products, productImages, productTranslations, productPageLayouts,
  showcaseCategories, showcaseProducts, reviews, searchKeywords,
  siteConfig, homepageConfig, heroImages, sellingPoints, certifications, ctaButtons,
  navigationItems, pageContents, socialLinks, seoSettings,
} from '../drizzle/schema';
import { hashPassword } from '../src/lib/auth';
import { encrypt } from '../src/lib/crypto';

// ==================== 工具函数 ====================

const summary: Record<string, number> = {};
function count(key: string, n = 1) {
  summary[key] = (summary[key] || 0) + n;
}

// 阶段 18：每表新增/跳过统计，脚本末尾输出总表
const stats: Record<string, { added: number; skipped: number }> = {};
function track(table: string, wasAdded: boolean, n = 1) {
  if (!stats[table]) stats[table] = { added: 0, skipped: 0 };
  if (wasAdded) stats[table].added += n;
  else stats[table].skipped += n;
}

// 英文名 → slug（kebab-case，老版 makeSlug 同款规则）
function makeSlug(nameEn: string): string {
  return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// SVG 占位图生成（开发期方案：R2 开通后员工在后台替换真实图）
function svgPlaceholder(title: string, subtitle: string, c1: string, c2: string, w = 800, h = 800): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w / 2}" cy="${h / 2 - 90}" r="60" fill="none" stroke="#fdfbf7" stroke-width="3" opacity="0.6"/>
  <text x="${w / 2}" y="${h / 2 + 30}" font-size="${w >= 1200 ? 72 : 52}" fill="#fdfbf7" text-anchor="middle" font-family="serif">${title}</text>
  <text x="${w / 2}" y="${h / 2 + 85}" font-size="${w >= 1200 ? 30 : 22}" fill="#e9dcc3" text-anchor="middle">${subtitle}</text>
</svg>`;
}

function writeSvg(dir: string, filename: string, content: string): string {
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, filename);
  if (!existsSync(filePath)) writeFileSync(filePath, content, 'utf8');
  return `/images/${filename}`;
}

// ==================== 1. 管理员 ====================

async function seedAdmin() {
  const existing = await db.select().from(users).where(eq(users.username, '13333827003')).limit(1);
  if (existing[0]) {
    console.log('[skip] 管理员已存在');
    track('users', false);
    return existing[0].id;
  }
  // 密码：.env 的 ADMIN_PASSWORD 优先；为空用开发默认值（生产正式种子会拒绝默认密码）
  const password = process.env.ADMIN_PASSWORD || 'YqDev@2026';
  if (!process.env.ADMIN_PASSWORD) {
    console.log('[warn] ADMIN_PASSWORD 未配置，使用开发默认密码：YqDev@2026（上线前必须修改）');
  }
  const rows = await db
    .insert(users)
    .values({
      username: '13333827003',
      password: await hashPassword(password),
      name: '超级管理员',
      role: 'admin',
      updatedAt: new Date(),
    })
    .returning();
  count('管理员');
  return rows[0].id;
}

// ==================== 2. 分类树 ====================

// [中文名, 英文名, slug, 父级 slug(null=一级), isProtected]
const CATEGORY_DEFS: Array<[string, string, string, string | null, boolean]> = [
  ['00 未分类', '00 Uncategorized', 'uncategorized', null, true],
  ['绿茶', 'Green Tea', 'green-tea', null, false],
  ['红茶', 'Black Tea', 'black-tea', null, false],
  ['白茶', 'White Tea', 'white-tea', null, false],
  ['黄茶', 'Yellow Tea', 'yellow-tea', null, false],
  ['乌龙茶', 'Oolong Tea', 'oolong-tea', null, false],
  ['黑茶', 'Dark Tea', 'dark-tea', null, false],
  ['普洱茶', 'Pu-erh Tea', 'puerh-tea', null, false],
  ['花茶', 'Flower Tea', 'flower-tea', null, false],
  ['金骏眉', 'Jin Jun Mei', 'jin-jun-mei', 'black-tea', false],
  ['正山小种', 'Lapsang Souchong', 'lapsang-souchong', 'black-tea', false],
  ['梅占', 'Mei Zhan', 'mei-zhan', 'black-tea', false],
  ['龙井', 'Longjing', 'longjing', 'green-tea', false],
  ['白毫银针', 'Silver Needle', 'silver-needle', 'white-tea', false],
];

async function seedCategories() {
  const all = await db.select().from(categories);
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  for (const [nameZh, nameEn, slug, parentSlug, isProtected] of CATEGORY_DEFS) {
    if (bySlug.has(slug)) continue;
    const parent = parentSlug ? bySlug.get(parentSlug) : undefined;
    const rows = await db
      .insert(categories)
      .values({
        nameZh, nameEn, slug,
        parentId: parent?.id ?? null,
        isProtected,
        image: writeSvg(
          join(process.cwd(), 'public', 'images', 'categories'),
          `${slug}.svg`,
          svgPlaceholder(nameZh, nameEn, '#1a3a1a', '#3d5c3d'),
        ).replace('/images/', '/images/categories/'),
        sortOrder: CATEGORY_DEFS.findIndex((d) => d[2] === slug),
        updatedAt: new Date(),
      })
      .returning();
    bySlug.set(slug, rows[0]);
    count('分类');
    track('categories', true);
  }
  // 既有分类计入跳过（幂等统计）
  const existedDefs = all.filter((c) => CATEGORY_DEFS.some((d) => d[2] === c.slug)).length;
  track('categories', false, Math.max(0, existedDefs - (summary['分类'] || 0)));
  return bySlug;
}

// ==================== 2.5 老版 V3.0 分类树迁移（阶段 18，树结构照搬不改编）====================

interface OldCategory {
  nameZh: string;
  nameEn: string;
  children?: OldCategory[];
}

// 老项目 prisma/seed-categories.ts 的 CATEGORY_TREE 原样搬运
const OLD_CATEGORY_TREE: OldCategory[] = [
  {
    nameZh: '红茶', nameEn: 'Black Tea',
    children: [
      {
        nameZh: '金骏眉', nameEn: 'Jin Jun Mei',
        children: [
          { nameZh: '桐木关金骏眉', nameEn: 'Tongmuguan Jin Jun Mei' },
          { nameZh: '荒山金骏眉', nameEn: 'Wild Mountain Jin Jun Mei' },
          { nameZh: '特级金骏眉', nameEn: 'Premium Jin Jun Mei' },
        ],
      },
      {
        nameZh: '正山小种', nameEn: 'Lapsang Souchong',
        children: [
          { nameZh: '烟熏正山小种', nameEn: 'Smoked Lapsang Souchong' },
          { nameZh: '无烟正山小种', nameEn: 'Unsmoked Lapsang Souchong' },
        ],
      },
      { nameZh: '滇红', nameEn: 'Dianhong' },
      { nameZh: '祁门红茶', nameEn: 'Keemun' },
    ],
  },
  {
    nameZh: '绿茶', nameEn: 'Green Tea',
    children: [
      { nameZh: '西湖龙井', nameEn: 'West Lake Longjing' },
      { nameZh: '碧螺春', nameEn: 'Biluochun' },
      { nameZh: '黄山毛峰', nameEn: 'Huangshan Maofeng' },
      { nameZh: '信阳毛尖', nameEn: 'Xinyang Maojian' },
      { nameZh: '太平猴魁', nameEn: 'Taiping Houkui' },
    ],
  },
  {
    nameZh: '白茶', nameEn: 'White Tea',
    children: [
      { nameZh: '白毫银针', nameEn: 'Silver Needle' },
      { nameZh: '白牡丹', nameEn: 'White Peony' },
      { nameZh: '寿眉', nameEn: 'Shou Mei' },
      { nameZh: '贡眉', nameEn: 'Gong Mei' },
    ],
  },
  {
    nameZh: '乌龙茶', nameEn: 'Oolong Tea',
    children: [
      {
        nameZh: '铁观音', nameEn: 'Tieguanyin',
        children: [
          { nameZh: '清香型铁观音', nameEn: 'Light Aroma Tieguanyin' },
          { nameZh: '浓香型铁观音', nameEn: 'Rich Aroma Tieguanyin' },
        ],
      },
      { nameZh: '大红袍', nameEn: 'Da Hong Pao' },
      { nameZh: '凤凰单丛', nameEn: 'Fenghuang Dancong' },
      { nameZh: '冻顶乌龙', nameEn: 'Dongding Oolong' },
    ],
  },
  {
    nameZh: '黑茶', nameEn: 'Dark Tea',
    children: [
      { nameZh: '普洱生茶', nameEn: 'Raw Puerh' },
      { nameZh: '普洱熟茶', nameEn: 'Ripe Puerh' },
      { nameZh: '六堡茶', nameEn: 'Liubao Tea' },
      { nameZh: '安化黑茶', nameEn: 'Anhua Dark Tea' },
    ],
  },
  {
    nameZh: '黄茶', nameEn: 'Yellow Tea',
    children: [
      { nameZh: '君山银针', nameEn: 'Junshan Yinzhen' },
      { nameZh: '蒙顶黄芽', nameEn: 'Mengding Huangya' },
      { nameZh: '霍山黄芽', nameEn: 'Huoshan Huangya' },
    ],
  },
  {
    nameZh: '花茶', nameEn: 'Scented Tea',
    children: [
      { nameZh: '茉莉花茶', nameEn: 'Jasmine Tea' },
      { nameZh: '桂花茶', nameEn: 'Osmanthus Tea' },
      { nameZh: '玫瑰花茶', nameEn: 'Rose Tea' },
    ],
  },
  {
    nameZh: '茶具', nameEn: 'Teaware',
    children: [
      { nameZh: '紫砂壶', nameEn: 'Yixing Teapot' },
      { nameZh: '盖碗', nameEn: 'Gaiwan' },
      { nameZh: '茶杯', nameEn: 'Tea Cups' },
      { nameZh: '茶盘', nameEn: 'Tea Tray' },
    ],
  },
];

// 别名映射：老树节点中文名 → 现有分类 slug（避免语义重复建节点）
const CATEGORY_ALIAS: Record<string, string> = {
  '西湖龙井': 'longjing', // 现有「龙井」同义复用
  '花茶': 'flower-tea', // 老树英文名 Scented Tea，与现有 flower-tea 同名复用
};

// 递归迁移老树：按 slug 幂等，存在即跳过；父级用已建 id 关联
async function seedCategoryTree(bySlug: Map<string, typeof categories.$inferSelect>) {
  let sortBase = bySlug.size;

  const walk = async (nodes: OldCategory[], parentId: string | null) => {
    for (const node of nodes) {
      let row: typeof categories.$inferSelect | undefined;

      // 别名复用现有节点
      const aliasSlug = CATEGORY_ALIAS[node.nameZh];
      if (aliasSlug && bySlug.has(aliasSlug)) {
        row = bySlug.get(aliasSlug);
        track('categories', false);
      } else {
        const slug = makeSlug(node.nameEn);
        if (bySlug.has(slug)) {
          row = bySlug.get(slug);
          track('categories', false);
        } else {
          const rows = await db
            .insert(categories)
            .values({
              nameZh: node.nameZh, nameEn: node.nameEn, slug,
              parentId,
              isProtected: false,
              image: writeSvg(
                join(process.cwd(), 'public', 'images', 'categories'),
                `${slug}.svg`,
                svgPlaceholder(node.nameZh, node.nameEn, '#1a3a1a', '#3d5c3d'),
              ).replace('/images/', '/images/categories/'),
              sortOrder: sortBase++,
              updatedAt: new Date(),
            })
            .returning();
          row = rows[0];
          bySlug.set(slug, row);
          count('分类(老树迁移)');
          track('categories', true);
        }
      }
      if (node.children?.length) {
        await walk(node.children, row!.id);
      }
    }
  };

  await walk(OLD_CATEGORY_TREE, null);
}

// ==================== 3. 14 款产品 ====================

// [中文名, 英文名, slug, 分类 slug, 规格, 人民币, 美元, 描述(中), 描述(英)]
type ProductDef = [string, string, string, string, string, string, string, string, string];

const jinJunMeiDescZh = '精选嵩山原叶，传统工艺制作，汤色金黄透亮，蜜香馥郁，回甘持久。';
const jinJunMeiDescEn = 'Selected whole leaves from Mount Song, traditional craftsmanship, golden liquor with rich honey aroma and lasting sweetness.';
const brewingZh = '取茶 3-5g，90℃ 热水冲泡 5-8 秒，可连续冲泡 6-8 次。';
const brewingEn = 'Use 3-5g tea, brew with 90°C water for 5-8 seconds, re-brew 6-8 times.';

const PRODUCT_DEFS: ProductDef[] = [
  ['金骏眉·特级', 'Jin Jun Mei · Special Grade', 'jin-jun-mei-special', 'jin-jun-mei', '250g/罐', '699.00', '99.00', jinJunMeiDescZh + '特级芽尖，产量稀少。', jinJunMeiDescEn + ' Top-grade buds, limited yield.'],
  ['金骏眉·一级', 'Jin Jun Mei · First Grade', 'jin-jun-mei-first', 'jin-jun-mei', '250g/罐', '499.00', '72.00', jinJunMeiDescZh, jinJunMeiDescEn],
  ['金骏眉·二级', 'Jin Jun Mei · Second Grade', 'jin-jun-mei-second', 'jin-jun-mei', '250g/罐', '359.00', '52.00', jinJunMeiDescZh, jinJunMeiDescEn],
  ['金骏眉·贡尖', 'Jin Jun Mei · Tribute Tips', 'jin-jun-mei-tribute', 'jin-jun-mei', '125g/罐', '899.00', '129.00', jinJunMeiDescZh + '贡级原料，礼赠首选。', jinJunMeiDescEn + ' Tribute-grade material, ideal for gifting.'],
  ['金骏眉·金芽', 'Jin Jun Mei · Golden Buds', 'jin-jun-mei-golden-buds', 'jin-jun-mei', '250g/罐', '599.00', '86.00', jinJunMeiDescZh, jinJunMeiDescEn],
  ['金骏眉·荒野', 'Jin Jun Mei · Wild Craft', 'jin-jun-mei-wild', 'jin-jun-mei', '250g/罐', '799.00', '115.00', jinJunMeiDescZh + '荒野茶树，野韵独特。', jinJunMeiDescEn + ' Wild tea trees with unique character.'],
  ['金骏眉·古树', 'Jin Jun Mei · Ancient Tree', 'jin-jun-mei-ancient', 'jin-jun-mei', '250g/罐', '999.00', '145.00', jinJunMeiDescZh + '百年古树原料，醇厚饱满。', jinJunMeiDescEn + ' Century-old trees, mellow and full-bodied.'],
  ['金骏眉·蜜香', 'Jin Jun Mei · Honey Aroma', 'jin-jun-mei-honey', 'jin-jun-mei', '500g/罐', '899.00', '129.00', jinJunMeiDescZh + '蜜香突出，甜润顺滑。', jinJunMeiDescEn + ' Prominent honey aroma, sweet and smooth.'],
  ['金骏眉·甘韵', 'Jin Jun Mei · Sweet Rhyme', 'jin-jun-mei-sweet', 'jin-jun-mei', '500g/罐', '699.00', '99.00', jinJunMeiDescZh, jinJunMeiDescEn],
  ['金骏眉·花香', 'Jin Jun Mei · Floral Aroma', 'jin-jun-mei-floral', 'jin-jun-mei', '250g/罐', '459.00', '66.00', jinJunMeiDescZh + '花果香交融，清新雅致。', jinJunMeiDescEn + ' Floral and fruity notes, fresh and elegant.'],
  ['金骏眉·礼盒装', 'Jin Jun Mei · Gift Box', 'jin-jun-mei-gift', 'jin-jun-mei', '2×125g 礼盒', '1299.00', '189.00', jinJunMeiDescZh + '高端礼盒包装，商务馈赠佳品。', jinJunMeiDescEn + ' Premium gift box, perfect for business gifting.'],
  ['金骏眉·罐装经典', 'Jin Jun Mei · Classic Tin', 'jin-jun-mei-classic-tin', 'jin-jun-mei', '250g 锡罐', '559.00', '80.00', jinJunMeiDescZh, jinJunMeiDescEn],
  ['金骏眉·品鉴装', 'Jin Jun Mei · Sampler Pack', 'jin-jun-mei-sampler', 'jin-jun-mei', '5×20g 组合', '299.00', '43.00', '五款金骏眉组合品鉴，找到您的专属风味。', 'Sampler of five Jin Jun Mei styles to find your favorite.'],
  ['梅占·荒山金针', 'Mei Zhan · Wild Mountain Golden Needle', 'mei-zhan-wild-golden', 'mei-zhan', '250g/罐', '859.00', '124.00', '荒山梅占品种，金针满披，蜜韵兰香，为红茶中的稀缺珍品。', 'Wild mountain Mei Zhan cultivar, golden needles with honey rhythm and orchid aroma, a rare treasure among black teas.'],
];

async function seedProducts(bySlug: Map<string, typeof categories.$inferSelect>) {
  const existing = await db.select().from(products);
  const bySlugP = new Map(existing.map((p) => [p.slug, p]));
  const result: Array<typeof products.$inferSelect> = [];

  for (const [nameZh, nameEn, slug, catSlug, spec, cny, usd, descZh, descEn] of PRODUCT_DEFS) {
    let product = bySlugP.get(slug);
    if (!product) {
      const cat = bySlug.get(catSlug);
      if (!cat) throw new Error(`分类不存在：${catSlug}`);
      const rows = await db
        .insert(products)
        .values({
          nameZh, nameEn, slug, spec,
          categoryId: cat.id,
          priceCNY: cny,
          priceUSD: usd,
          status: 'active',
          updatedAt: new Date(),
        })
        .returning();
      product = rows[0];
      bySlugP.set(slug, product);
      count('产品');
      track('products', true);

      // 占位图（SVG 写入 public/images/products/）
      const imgUrl = writeSvg(
        join(process.cwd(), 'public', 'images', 'products'),
        `${slug}.svg`,
        svgPlaceholder(nameZh, nameEn, '#1a3a1a', '#c9aa7b'),
      ).replace('/images/', '/images/products/');
      await db.insert(productImages).values({ productId: product.id, url: imgUrl, alt: nameZh, sortOrder: 0 });
      track('product_images', true);

      // 中英翻译（其余 4 语言留空，员工后台填写）
      await db.insert(productTranslations).values([
        { productId: product.id, locale: 'zh', description: descZh, brewingGuide: brewingZh },
        { productId: product.id, locale: 'en', description: descEn, brewingGuide: brewingEn },
      ]);
      count('翻译', 2);
      track('product_translations', true, 2);
    } else {
      track('products', false);
      track('product_images', false);
      track('product_translations', false, 2);
    }
    result.push(product);
  }
  return result;
}

// ==================== 4. B2B 展示区 ====================

async function seedShowcase(productList: Array<typeof products.$inferSelect>) {
  const existing = await db.select().from(showcaseCategories);
  const bySlug = new Map(existing.map((c) => [c.slug, c]));

  const pwdSelf = process.env.SHOWCASE_PWD_SELF_PACKAGED || 'yiquan2026';
  const pwdBence = process.env.SHOWCASE_PWD_BENCE || 'bence2026';

  const defs = [
    {
      nameZh: '自包装成品礼盒', nameEn: 'Self-Packaged Gift Boxes', slug: 'self-packaged-gift-boxes',
      password: pwdSelf, sortOrder: 0,
      descriptionZh: '精选茶叶，定制礼盒包装，满足批发客户的多样化需求',
      descriptionEn: 'Premium teas with customized gift packaging for wholesale clients',
    },
    {
      nameZh: 'Bence Gombar匈牙利', nameEn: 'Bence Gombar Hungary', slug: 'bence-gombar-hungary',
      password: pwdBence, sortOrder: 1,
      descriptionZh: '匈牙利Bence Gombar专属产品线，精选高品质茶叶',
      descriptionEn: 'Exclusive product line for Bence Gombar Hungary',
    },
  ];

  for (const d of defs) {
    if (!bySlug.has(d.slug)) {
      const rows = await db
        .insert(showcaseCategories)
        .values({
          nameZh: d.nameZh, nameEn: d.nameEn, slug: d.slug,
          password: await encrypt(d.password),
          descriptionZh: d.descriptionZh, descriptionEn: d.descriptionEn,
          sortOrder: d.sortOrder, isActive: true,
          image: writeSvg(
            join(process.cwd(), 'public', 'images', 'categories'),
            `${d.slug}.svg`,
            svgPlaceholder(d.nameZh, d.nameEn, '#16213e', '#c9aa7b'),
          ).replace('/images/', '/images/categories/'),
          updatedAt: new Date(),
        })
        .returning();
      bySlug.set(d.slug, rows[0]);
      count('B2B分类');
      track('showcase_categories', true);
    } else {
      track('showcase_categories', false);
    }
  }

  // 4 条产品关联（10 号文档 §三：产品1/2/9 跨 2 分类）
  const catSelf = bySlug.get('self-packaged-gift-boxes')!;
  const catBence = bySlug.get('bence-gombar-hungary')!;
  const relations: Array<[string, string, string, number]> = [
    [productList[0].id, catSelf.id, 'zh', 0],
    [productList[0].id, catBence.id, 'en', 0],
    [productList[1].id, catSelf.id, 'zh', 1],
    [productList[8].id, catSelf.id, 'zh', 2],
  ];
  const existingRels = await db.select().from(showcaseProducts);
  for (const [productId, showcaseCategoryId, locale, order] of relations) {
    const dup = existingRels.find((r) => r.productId === productId && r.showcaseCategoryId === showcaseCategoryId);
    if (dup) {
      track('showcase_products', false);
      continue;
    }
    await db.insert(showcaseProducts).values({ productId, showcaseCategoryId, showcaseLocale: locale, sortOrder: order });
    count('B2B关联');
    track('showcase_products', true);
  }
}

// ==================== 5. 布局示例（梅占·荒山金针） ====================

async function seedLayout(productList: Array<typeof products.$inferSelect>) {
  const meizhan = productList[13];
  const existing = await db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, meizhan.id)).limit(1);
  if (existing[0]) {
    track('product_page_layouts', false);
    return;
  }
  const layout = ['gallery', 'specs', 'description', 'brewingGuide', 'video', 'reviews', 'recommendations'];
  await db.insert(productPageLayouts).values({
    productId: meizhan.id,
    layoutJson: JSON.stringify(layout),
    updatedAt: new Date(),
  });
  count('布局示例');
  track('product_page_layouts', true);
}

// ==================== 6. 客户评价 ====================

const REVIEW_DEFS = [
  { name: 'Bence', rating: 5, locale: 'en', content: 'Excellent tea quality and fast shipping. The Jin Jun Mei Special Grade is outstanding — rich honey aroma and beautiful golden liquor.' },
  { name: 'Anna Müller', rating: 5, locale: 'en', content: 'Very professional B2B service. The gift box packaging impressed our clients. Highly recommended for wholesale.' },
  { name: '陈先生', rating: 5, locale: 'zh', content: '金骏眉品质非常好，蜜香浓郁，回甘持久。合作两年了，供货一直稳定。' },
  { name: '王女士', rating: 4, locale: 'zh', content: '茶叶品质上乘，包装精美。样品申请响应很快，客服专业耐心。' },
];

async function seedReviews() {
  const existing = await db.select().from(reviews);
  if (existing.length > 0) {
    console.log('[skip] 评价已存在');
    track('reviews', false, existing.length);
    return;
  }
  for (const r of REVIEW_DEFS) {
    await db.insert(reviews).values({ ...r, status: 'published', updatedAt: new Date() });
    count('评价');
    track('reviews', true);
  }
}

// ==================== 7. 63 条搜索关键词 ====================

const KEYWORD_DEFS: Array<[string, string]> = [
  // 仪表盘
  ['仪表盘', '/admin/dashboard'], ['统计', '/admin/dashboard'], ['数据概览', '/admin/dashboard'],
  // 产品管理
  ['产品管理', '/admin/products'], ['产品', '/admin/products'], ['产品列表', '/admin/products'], ['添加产品', '/admin/products'],
  // B2B 展示区
  ['B2B', '/admin/showcase'], ['展示区', '/admin/showcase'], ['展示区管理', '/admin/showcase'], ['密码', '/admin/showcase'], ['B2B密码', '/admin/showcase'],
  // 询价
  ['询价', '/admin/inquiries'], ['询价管理', '/admin/inquiries'], ['聊天', '/admin/inquiries'], ['回复客户', '/admin/inquiries'], ['消息', '/admin/inquiries'],
  // 样品
  ['样品', '/admin/samples'], ['样品管理', '/admin/samples'], ['样品申请', '/admin/samples'], ['发货', '/admin/samples'],
  // 评论
  ['评论', '/admin/reviews'], ['评论管理', '/admin/reviews'], ['评价', '/admin/reviews'],
  // 首页编辑
  ['首页', '/admin/homepage'], ['首页编辑', '/admin/homepage'], ['轮播图', '/admin/homepage'], ['Hero', '/admin/homepage'],
  // 导航
  ['导航', '/admin/navigation'], ['导航编辑', '/admin/navigation'], ['菜单', '/admin/navigation'],
  // 社交
  ['社交媒体', '/admin/social'], ['微信', '/admin/social'], ['WhatsApp', '/admin/social'],
  // 页面内容
  ['页面内容', '/admin/pages'], ['关于我们', '/admin/pages'], ['隐私政策', '/admin/pages'], ['服务条款', '/admin/pages'],
  // 员工
  ['员工', '/admin/staff'], ['员工管理', '/admin/staff'], ['账号', '/admin/staff'], ['权限', '/admin/staff'],
  // 分析
  ['分析', '/admin/analytics'], ['客户行为', '/admin/analytics'], ['流量', '/admin/analytics'], ['国家分布', '/admin/analytics'],
  // 备份
  ['备份', '/admin/backup'], ['备份管理', '/admin/backup'], ['数据库备份', '/admin/backup'], ['恢复', '/admin/backup'],
  // 日志
  ['日志', '/admin/logs'], ['操作日志', '/admin/logs'], ['记录', '/admin/logs'],
  // 设置
  ['设置', '/admin/settings'], ['网站设置', '/admin/settings'], ['GDPR', '/admin/settings'],
  // SEO
  ['SEO', '/admin/seo'], ['SEO设置', '/admin/seo'], ['hreflang', '/admin/seo'],
  // 指南
  ['指南', '/admin/guide'], ['帮助', '/admin/guide'], ['操作手册', '/admin/guide'], ['教程', '/admin/guide'],
];

async function seedKeywords() {
  const existing = await db.select().from(searchKeywords);
  const byKw = new Set(existing.map((k) => k.keyword));
  let order = existing.length;
  for (const [keyword, targetPath] of KEYWORD_DEFS) {
    if (byKw.has(keyword)) {
      track('search_keywords', false);
      continue;
    }
    await db.insert(searchKeywords).values({ keyword, targetPath, sortOrder: order++, updatedAt: new Date() });
    count('搜索关键词');
    track('search_keywords', true);
  }
}

// ==================== 8. 首页渲染配套配置 ====================

async function seedHomepageConfig() {
  // 8.1 site_config 单例
  const site = await db.select().from(siteConfig).where(eq(siteConfig.id, 'main')).limit(1);
  if (!site[0]) {
    await db.insert(siteConfig).values({
      id: 'main',
      brandNameZh: '懿泉茶业', brandNameEn: 'YiQuanTea',
      sloganZh: '自然之味 · 嵩山', sloganEn: 'Whole Leaf · Pure Nature',
      brandColorPrimary: '#1a3a1a', brandColorSecondary: '#c9aa7b',
      contactEmail: 'yqtea.cn@gmail.com', contactPhone: '+86 15515928905',
      whatsapp: '+86 13333827003', wechat: 'ZenSongshanTea',
      addressZh: '中岳嵩山', addressEn: 'Mount Song, China',
      gdprEnabled: true, hcaptchaEnabled: false,
      updatedAt: new Date(),
    });
    count('网站设置');
    track('site_config', true);
  } else {
    track('site_config', false);
  }

  // 8.2 homepage_config 单例
  const hc = await db.select().from(homepageConfig).limit(1);
  if (!hc[0]) {
    await db.insert(homepageConfig).values({
      configJson: JSON.stringify({ showReviews: true, showCertifications: true, showB2bEntry: true }),
      updatedAt: new Date(),
    });
    count('首页配置');
    track('homepage_config', true);
  } else {
    track('homepage_config', false);
  }

  // 8.3 Hero 轮播图 ×3（SVG 渐变占位，1920×800）
  const heroes = await db.select().from(heroImages);
  if (heroes.length === 0) {
    const heroDefs = [
      { titleZh: '原叶 · 纯净自然', titleEn: 'Whole Leaf · Pure Nature', c1: '#1a3a1a', c2: '#2d5a2d' },
      { titleZh: '嵩山茶园 直供全球', titleEn: 'Mount Song Gardens, Delivered Worldwide', c1: '#16213e', c2: '#1a3a1a' },
      { titleZh: 'B2B 批发 专属定制', titleEn: 'B2B Wholesale, Tailored for You', c1: '#3d2b1f', c2: '#c9aa7b' },
    ];
    let order = 0;
    for (const h of heroDefs) {
      const url = writeSvg(
        join(process.cwd(), 'public', 'images'),
        `hero-${order + 1}.svg`,
        svgPlaceholder(h.titleZh, h.titleEn, h.c1, h.c2, 1920, 800),
      );
      await db.insert(heroImages).values({
        imageUrl: url,
        titleZh: h.titleZh, titleEn: h.titleEn,
        subtitleZh: '懿泉茶业 YiQuanTea', subtitleEn: 'YiQuanTea',
        sortOrder: order++, isActive: true, updatedAt: new Date(),
      });
      count('Hero图');
      track('hero_images', true);
    }
  } else {
    track('hero_images', false, heroes.length);
  }

  // 8.4 卖点 ×4（图标为 lucide-react 组件名）
  const sps = await db.select().from(sellingPoints);
  if (sps.length === 0) {
    const spDefs = [
      { icon: 'Leaf', titleZh: '嵩山原叶', titleEn: 'Mount Song Origin', descZh: '源自中岳嵩山生态茶园，高海拔云雾滋养。', descEn: 'From eco tea gardens on Mount Song, nurtured by misty high altitudes.' },
      { icon: 'ShieldCheck', titleZh: '品质认证', titleEn: 'Certified Quality', descZh: '多项国际质量认证，全程可追溯。', descEn: 'Internationally certified, fully traceable.' },
      { icon: 'Globe', titleZh: '全球配送', titleEn: 'Global Delivery', descZh: '服务六大洲客户，快速国际物流。', descEn: 'Serving clients across six continents with fast logistics.' },
      { icon: 'Award', titleZh: '匠心工艺', titleEn: 'Craftsmanship', descZh: '传统制茶技艺结合现代标准，层层精选。', descEn: 'Traditional craft meets modern standards, selected at every step.' },
    ];
    let order = 0;
    for (const s of spDefs) {
      await db.insert(sellingPoints).values({ ...s, sortOrder: order++, isActive: true, updatedAt: new Date() });
      count('卖点');
      track('selling_points', true);
    }
  } else {
    track('selling_points', false, sps.length);
  }

  // 8.5 认证 ×4（SVG 占位证书图）
  const certs = await db.select().from(certifications);
  if (certs.length === 0) {
    const certDefs = [
      { nameZh: '有机认证', nameEn: 'Organic Certified' },
      { nameZh: 'ISO 22000', nameEn: 'ISO 22000' },
      { nameZh: 'HACCP 认证', nameEn: 'HACCP Certified' },
      { nameZh: '出口食品备案', nameEn: 'Export Food Registration' },
    ];
    let order = 0;
    for (const c of certDefs) {
      const url = writeSvg(
        join(process.cwd(), 'public', 'images'),
        `cert-${order + 1}.svg`,
        svgPlaceholder(c.nameZh, c.nameEn, '#c9aa7b', '#1a3a1a', 600, 400),
      );
      await db.insert(certifications).values({ nameZh: c.nameZh, nameEn: c.nameEn, imageUrl: url, sortOrder: order++, isActive: true, updatedAt: new Date() });
      count('认证');
      track('certifications', true);
    }
  } else {
    track('certifications', false, certs.length);
  }

  // 8.6 CTA ×2
  const ctas = await db.select().from(ctaButtons);
  if (ctas.length === 0) {
    await db.insert(ctaButtons).values([
      { textZh: '立即询价', textEn: 'Send Inquiry', linkUrl: '/contact', variant: 'light', sortOrder: 0, isActive: true, updatedAt: new Date() },
      { textZh: '申请样品', textEn: 'Request Sample', linkUrl: '/sample', variant: 'light', sortOrder: 1, isActive: true, updatedAt: new Date() },
    ]);
    count('CTA', 2);
    track('cta_buttons', true, 2);
  } else {
    track('cta_buttons', false, ctas.length);
  }

  // 8.7 导航 ×6
  const navs = await db.select().from(navigationItems);
  if (navs.length === 0) {
    await db.insert(navigationItems).values([
      { labelZh: '首页', labelEn: 'Home', href: '/', sortOrder: 0, isActive: true, updatedAt: new Date() },
      { labelZh: '产品', labelEn: 'Products', href: '/products', sortOrder: 1, isActive: true, updatedAt: new Date() },
      { labelZh: 'B2B产品', labelEn: 'B2B Products', href: '/b2b', sortOrder: 2, isActive: true, updatedAt: new Date() },
      { labelZh: '关于我们', labelEn: 'About Us', href: '/about', sortOrder: 3, isActive: true, updatedAt: new Date() },
      { labelZh: '认证资质', labelEn: 'Certifications', href: '/certifications', sortOrder: 4, isActive: true, updatedAt: new Date() },
      { labelZh: '联系我们', labelEn: 'Contact', href: '/contact', sortOrder: 5, isActive: true, updatedAt: new Date() },
    ]);
    count('导航', 6);
    track('navigation_items', true, 6);
  } else {
    track('navigation_items', false, navs.length);
  }
}

// ==================== 9. 页面内容（辅助页文案，阶段 12） ====================

const PAGE_CONTENT_DEFS: Array<{ pageKey: string; titleZh: string; titleEn: string; contentZh: string; contentEn: string }> = [
  {
    pageKey: 'about',
    titleZh: '关于我们',
    titleEn: 'About Us',
    contentZh:
      '懿泉茶业坐落于中岳嵩山，专注原叶茶的制作与出口。\n\n我们坚持“Whole Leaf · Pure Nature”的理念，从茶园到茶杯全程可追溯，为全球客户提供高品质的中国茶。',
    contentEn:
      'YiQuanTea is located at Mount Song, dedicated to whole-leaf tea production and export.\n\nWe uphold the philosophy of "Whole Leaf · Pure Nature", ensuring full traceability from garden to cup, serving clients worldwide with premium Chinese tea.',
  },
  {
    pageKey: 'certifications',
    titleZh: '认证资质',
    titleEn: 'Certifications',
    contentZh: '我们持有多项国际质量与食品安全认证，包括有机认证、ISO 22000、HACCP 与出口食品备案。',
    contentEn:
      'We hold multiple international quality and food-safety certifications, including Organic, ISO 22000, HACCP and Export Food Registration.',
  },
  {
    pageKey: 'contact',
    titleZh: '联系我们',
    titleEn: 'Contact Us',
    contentZh: '欢迎通过邮箱、电话、WhatsApp 或微信与我们联系，我们将在 24 小时内回复。',
    contentEn: 'Reach us via email, phone, WhatsApp or WeChat. We will reply within 24 hours.',
  },
  {
    pageKey: 'privacy',
    titleZh: '隐私政策',
    titleEn: 'Privacy Policy',
    contentZh:
      '我们重视您的隐私。本站仅收集处理询价与样品申请所必需的联系方式。\n\nGDPR 数据权利：欧盟访客有权访问、更正或删除其个人数据，请通过邮箱 yqtea.cn@gmail.com 提出申请。\n\nCookie：仅使用必要的会话 Cookie；分析 Cookie 需您在弹窗中明确同意。',
    contentEn:
      'We value your privacy. This site only collects contact details necessary for processing inquiries and sample requests.\n\nGDPR rights: EU visitors may access, rectify or erase their personal data by emailing yqtea.cn@gmail.com.\n\nCookies: only necessary session cookies are used; analytics cookies require your explicit consent.',
  },
  {
    pageKey: 'terms',
    titleZh: '服务条款',
    titleEn: 'Terms of Service',
    contentZh:
      '本站展示价格仅供参考，实际批发价格以询价确认为准。样品免费，运费由买方承担。\n\n使用本站即表示您同意本条款。',
    contentEn:
      'Prices shown are for reference only; actual wholesale prices are subject to inquiry confirmation. Samples are free with shipping borne by the buyer.\n\nBy using this site you agree to these terms.',
  },
];

async function seedPageContents() {
  const existing = await db.select().from(pageContents);
  const byKey = new Set(existing.map((p) => p.pageKey));
  for (const p of PAGE_CONTENT_DEFS) {
    if (byKey.has(p.pageKey)) {
      track('page_contents', false);
      continue;
    }
    await db.insert(pageContents).values({ ...p, updatedAt: new Date() });
    count('页面内容');
    track('page_contents', true);
  }
}

// ==================== 10. 产品翻译补全（ru/de/es/fr，阶段 18） ====================

// 基础描述/冲泡的多语言底本（对应 jinJunMeiDescZh / brewingZh）
const BASE_DESC_T: Record<string, string> = {
  ru: 'Отборные цельные листья с горы Суншань, традиционная технология, золотистый настой с насыщенным медовым ароматом и долгим сладким послевкусием.',
  de: 'Ausgewählte ganze Blätter vom Berg Songshan, traditionelle Verarbeitung, goldfarbener Aufguss mit reichem Honigaroma und anhaltender Süße.',
  es: 'Hojas enteras seleccionadas del monte Songshan, elaboración tradicional, infusión dorada con rico aroma a miel y dulzor duradero.',
  fr: 'Feuilles entières sélectionnées du mont Songshan, savoir-faire traditionnel, liqueur dorée au riche arôme de miel et douceur persistante.',
};
const BASE_BREW_T: Record<string, string> = {
  ru: 'Возьмите 3-5 г чая, заваривайте водой 90°C 5-8 секунд, выдерживает 6-8 заварок.',
  de: '3-5g Tee mit 90°C heißem Wasser 5-8 Sekunden aufgießen, 6-8 Aufgüsse möglich.',
  es: 'Use 3-5g de té, infunda con agua a 90°C durante 5-8 segundos, permite 6-8 infusiones.',
  fr: 'Prenez 3-5g de thé, infusez à 90°C pendant 5-8 secondes, 6 à 8 infusions possibles.',
};

// 后缀短语的多语言对照（产品描述 = 基础描述 + 后缀）
const SUFFIX_T: Record<string, Record<string, string>> = {
  '特级芽尖，产量稀少。': {
    ru: 'Почки высшего сорта, ограниченный урожай.',
    de: 'Knospen der Spitzenklasse, begrenzte Ernte.',
    es: 'Yemas de grado superior, cosecha limitada.',
    fr: 'Bourgeons de qualité supérieure, récolte limitée.',
  },
  '贡级原料，礼赠首选。': {
    ru: 'Сырьё tributary-класса, идеальный подарок.',
    de: 'Tribut-Qualität, erste Wahl als Geschenk.',
    es: 'Materia prima de grado tributo, primera opción para regalar.',
    fr: 'Qualité tribut, premier choix pour offrir.',
  },
  '荒野茶树，野韵独特。': {
    ru: 'Дикие чайные деревья, уникальный характер.',
    de: 'Wilde Teebäume, einzigartiger Charakter.',
    es: 'Árboles de té silvestres, carácter único.',
    fr: 'Théiers sauvages, caractère unique.',
  },
  '百年古树原料，醇厚饱满。': {
    ru: 'Листья столетних деревьев, насыщенный вкус.',
    de: 'Jahrhundertalte Bäume, vollmundig und rund.',
    es: 'Árboles centenarios, sabor pleno y redondo.',
    fr: 'Arbres centenaires, corsé et ample.',
  },
  '蜜香突出，甜润顺滑。': {
    ru: 'Выраженный медовый аромат, сладкий и гладкий.',
    de: 'Betontes Honigaroma, süß und samtig.',
    es: 'Aroma a miel destacado, dulce y suave.',
    fr: 'Arôme de miel marqué, doux et soyeux.',
  },
  '花果香交融，清新雅致。': {
    ru: 'Сочетание цветочных и фруктовых нот, свежий и изящный.',
    de: 'Blumig-fruchtige Noten, frisch und elegant.',
    es: 'Notas florales y frutales, fresco y elegante.',
    fr: 'Notes florales et fruitées, frais et élégant.',
  },
  '高端礼盒包装，商务馈赠佳品。': {
    ru: 'Премиальная подарочная упаковка, идеальный деловой подарок.',
    de: 'Hochwertige Geschenkbox, ideales Business-Geschenk.',
    es: 'Caja regalo premium, ideal para obsequios de empresa.',
    fr: 'Coffret cadeau premium, idéal pour les affaires.',
  },
};

// 独立描述产品的多语言对照（非基础模板的两款）
const CUSTOM_DESC_T: Record<string, Record<string, string>> = {
  '五款金骏眉组合品鉴，找到您的专属风味。': {
    ru: 'Дегустационный набор из пяти видов Цзинь Цзюнь Мэй — найдите свой вкус.',
    de: 'Verkostungsset mit fünf Jin Jun Mei Sorten — finden Sie Ihren Favoriten.',
    es: 'Pack de cata con cinco Jin Jun Mei: encuentre su favorito.',
    fr: 'Coffret dégustation de cinq Jin Jun Mei — trouvez votre préféré.',
  },
  '荒山梅占品种，金针满披，蜜韵兰香，为红茶中的稀缺珍品。': {
    ru: 'Дикий сорт Мэй Чжань, золотые почки, медово-орхидейный аромат — редкая драгоценность среди чёрных чаёв.',
    de: 'Wilder Mei-Zhan-Kultivar, goldene Knospen, Honig-Orchideen-Aroma — eine Rarität unter den Schwarztees.',
    es: 'Cultivar silvestre Mei Zhan, yemas doradas, aroma a miel y orquídea: una rareza entre los tés negros.',
    fr: 'Cultivar sauvage Mei Zhan, bourgeons dorés, arôme miel-orchidée — une rareté parmi les thés noirs.',
  },
};
const EXTRA_LOCALES = ['ru', 'de', 'es', 'fr'];

async function seedExtraTranslations(productList: Array<typeof products.$inferSelect>) {
  // 已有翻译按 productId+locale 查重
  const existing = await db.select().from(productTranslations);
  const has = new Set(existing.map((t) => `${t.productId}|${t.locale}`));

  let idx = 0;
  for (const [nameZh, nameEn, slug, catSlug, spec, cny, usd, descZh] of PRODUCT_DEFS) {
    const product = productList[idx++];
    for (const locale of EXTRA_LOCALES) {
      if (has.has(`${product.id}|${locale}`)) {
        track('product_translations', false);
        continue;
      }
      let description: string;
      if (descZh === jinJunMeiDescZh) {
        description = BASE_DESC_T[locale];
      } else if (descZh.startsWith(jinJunMeiDescZh)) {
        const suffix = descZh.slice(jinJunMeiDescZh.length);
        description = `${BASE_DESC_T[locale]} ${SUFFIX_T[suffix]?.[locale] || ''}`.trim();
      } else {
        description = CUSTOM_DESC_T[descZh]?.[locale] || BASE_DESC_T[locale];
      }
      await db.insert(productTranslations).values({
        productId: product.id,
        locale,
        description,
        brewingGuide: BASE_BREW_T[locale],
      });
      track('product_translations', true);
    }
  }
}

// ==================== 11. 员工账号（editor + customer_service，阶段 18） ====================

async function seedStaff() {
  const password = process.env.ADMIN_PASSWORD || 'YqDev@2026';
  const defs = [
    { username: '13800000002', name: '内容编辑', role: 'editor' as const },
    { username: '13800000003', name: '客服专员', role: 'customer_service' as const },
  ];
  for (const d of defs) {
    const rows = await db.select().from(users).where(eq(users.username, d.username)).limit(1);
    if (rows[0]) {
      track('users', false);
      continue;
    }
    await db.insert(users).values({
      username: d.username,
      password: await hashPassword(password),
      name: d.name,
      role: d.role,
      updatedAt: new Date(),
    });
    track('users', true);
  }
}

// ==================== 12. 社交媒体链接（阶段 18） ====================

async function seedSocial() {
  const existing = await db.select().from(socialLinks);
  const byPlatform = new Set(existing.map((s) => s.platform));
  const defs = [
    { platform: 'whatsapp', labelZh: 'WhatsApp', labelEn: 'WhatsApp', url: '+86 13333827003' },
    { platform: 'wechat', labelZh: '微信', labelEn: 'WeChat', url: 'ZenSongshanTea' },
    { platform: 'facebook', labelZh: 'Facebook', labelEn: 'Facebook', url: 'https://facebook.com/yiquantea' },
    { platform: 'instagram', labelZh: 'Instagram', labelEn: 'Instagram', url: 'https://instagram.com/yiquantea' },
    { platform: 'youtube', labelZh: 'YouTube', labelEn: 'YouTube', url: 'https://youtube.com/@yiquantea' },
    { platform: 'x', labelZh: 'X（推特）', labelEn: 'X (Twitter)', url: 'https://x.com/yiquantea' },
  ];
  let order = existing.length;
  for (const d of defs) {
    if (byPlatform.has(d.platform)) {
      track('social_links', false);
      continue;
    }
    await db.insert(socialLinks).values({ ...d, sortOrder: order++, isActive: true, updatedAt: new Date() });
    track('social_links', true);
  }
}

// ==================== 13. SEO 初始配置（阶段 18） ====================

const SEO_DEFS: Array<{ pageKey: string; titleZh: string; titleEn: string; descriptionZh: string; descriptionEn: string; keywords: string }> = [
  { pageKey: 'home', titleZh: '懿泉茶业 - 嵩山原叶茶批发出口', titleEn: 'YiQuanTea - Mount Song Whole Leaf Tea Wholesale', descriptionZh: '懿泉茶业专注嵩山原叶茶批发与出口，金骏眉等名茶直供全球，欢迎 B2B 询价。', descriptionEn: 'YiQuanTea supplies Mount Song whole-leaf teas worldwide. Jin Jun Mei and premium teas for B2B wholesale.', keywords: '金骏眉,红茶,批发,whole leaf tea,wholesale,Jin Jun Mei' },
  { pageKey: 'products', titleZh: '产品目录 - 懿泉茶业', titleEn: 'Products - YiQuanTea', descriptionZh: '浏览懿泉茶业全线产品：金骏眉、绿茶、白茶、乌龙茶等，支持批发询价。', descriptionEn: 'Browse YiQuanTea products: Jin Jun Mei, green, white and oolong teas, wholesale inquiries welcome.', keywords: '茶叶产品,产品目录,tea products,catalog' },
  { pageKey: 'product-detail', titleZh: '产品详情 - 懿泉茶业', titleEn: 'Product Detail - YiQuanTea', descriptionZh: '查看产品详情：规格、冲泡指南、视频展示与批发询价入口。', descriptionEn: 'Product details: specifications, brewing guide, videos and wholesale inquiry.', keywords: '产品详情,product detail,规格,冲泡' },
  { pageKey: 'b2b', titleZh: 'B2B 产品展示区 - 懿泉茶业', titleEn: 'B2B Showcase - YiQuanTea', descriptionZh: 'B2B 批发客户专属产品展示区，凭密码访问，独立详情页支持多语言。', descriptionEn: 'Exclusive B2B showcase with password access and multilingual standalone product pages.', keywords: 'B2B,批发,wholesale,展示区,showcase' },
  { pageKey: 'sample', titleZh: '申请样品 - 懿泉茶业', titleEn: 'Request Sample - YiQuanTea', descriptionZh: '免费申请茶叶样品，样品免费、运费由买方承担，24 小时内回复。', descriptionEn: 'Request free tea samples. Samples are free, shipping borne by buyer, reply within 24 hours.', keywords: '样品,sample,免费样品,free sample' },
  { pageKey: 'about', titleZh: '关于我们 - 懿泉茶业', titleEn: 'About Us - YiQuanTea', descriptionZh: '懿泉茶业坐落于中岳嵩山，专注原叶茶制作与出口，从茶园到茶杯全程可追溯。', descriptionEn: 'YiQuanTea at Mount Song, dedicated to whole-leaf tea production and export, fully traceable.', keywords: '关于我们,about,嵩山,Mount Song' },
  { pageKey: 'certifications', titleZh: '认证资质 - 懿泉茶业', titleEn: 'Certifications - YiQuanTea', descriptionZh: '有机认证、ISO 22000、HACCP 与出口食品备案等多项国际认证。', descriptionEn: 'Organic, ISO 22000, HACCP and export food registration certifications.', keywords: '认证,certifications,有机,ISO,HACCP' },
  { pageKey: 'contact', titleZh: '联系我们 - 懿泉茶业', titleEn: 'Contact Us - YiQuanTea', descriptionZh: '通过邮箱、电话、WhatsApp 或微信联系懿泉茶业，24 小时内回复。', descriptionEn: 'Contact YiQuanTea via email, phone, WhatsApp or WeChat. Reply within 24 hours.', keywords: '联系我们,contact,WhatsApp,微信' },
  { pageKey: 'privacy', titleZh: '隐私政策 - 懿泉茶业', titleEn: 'Privacy Policy - YiQuanTea', descriptionZh: '我们重视您的隐私，仅收集必要的联系信息，GDPR 数据权利保障。', descriptionEn: 'We value your privacy, collecting only necessary contact details, with GDPR rights protected.', keywords: '隐私政策,privacy,GDPR' },
  { pageKey: 'terms', titleZh: '服务条款 - 懿泉茶业', titleEn: 'Terms of Service - YiQuanTea', descriptionZh: '展示价格仅供参考，实际批发价以询价确认为准；样品免费，运费买方承担。', descriptionEn: 'Prices are for reference; wholesale prices subject to inquiry. Samples free, shipping by buyer.', keywords: '服务条款,terms' },
];

async function seedSeo() {
  const existing = await db.select().from(seoSettings);
  const byKey = new Set(existing.map((s) => s.pageKey));
  for (const s of SEO_DEFS) {
    if (byKey.has(s.pageKey)) {
      track('seo_settings', false);
      continue;
    }
    await db.insert(seoSettings).values({ ...s, hreflangEnabled: true, updatedAt: new Date() });
    track('seo_settings', true);
  }
}

// ==================== 14. 导航补全（阶段 18：补「样品申请」） ====================

async function seedNavSample() {
  const navs = await db.select().from(navigationItems);
  if (navs.some((n) => n.href === '/sample')) {
    track('navigation_items', false);
    return;
  }
  const maxOrder = navs.reduce((m, n) => Math.max(m, n.sortOrder), -1);
  await db.insert(navigationItems).values({
    labelZh: '样品申请', labelEn: 'Sample Request', href: '/sample',
    sortOrder: maxOrder + 1, isActive: true, updatedAt: new Date(),
  });
  track('navigation_items', true);
}

// ==================== 主流程 ====================

async function main() {
  console.log('开始种子数据（阶段 18 完善版，幂等执行）...');
  await seedAdmin();
  const bySlug = await seedCategories();
  await seedCategoryTree(bySlug);
  const productList = await seedProducts(bySlug);
  await seedExtraTranslations(productList);
  await seedShowcase(productList);
  await seedLayout(productList);
  await seedReviews();
  await seedKeywords();
  await seedHomepageConfig();
  await seedPageContents();
  await seedStaff();
  await seedSocial();
  await seedSeo();
  await seedNavSample();

  console.log('\n种子数据汇总（本次执行）：');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);

  // 阶段 18：每表新增/跳过统计
  const tables = Object.keys(stats);
  const totalAdded = tables.reduce((s, t) => s + stats[t].added, 0);
  const totalSkipped = tables.reduce((s, t) => s + stats[t].skipped, 0);
  console.log('\n每表统计：');
  for (const t of tables) console.log(`  ${t}: 新增 ${stats[t].added} / 跳过 ${stats[t].skipped}`);
  console.log(`\n${tables.length} 张表，新增 ${totalAdded} 行，跳过 ${totalSkipped} 行（已存在）`);
  console.log('SEED DONE');
}

main().catch((e) => {
  console.error('SEED FAIL:', e);
  process.exit(1);
});
