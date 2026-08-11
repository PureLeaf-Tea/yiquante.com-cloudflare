// 最小种子数据脚本（seed/seed.ts）
// 用法：npm run db:seed（幂等：已存在的数据自动跳过）
// 内容：管理员 / 分类树 / 14 款产品（含占位图与中英翻译）/ 2 个 B2B 分类 /
//       4 条评价 / 63 条搜索关键词 / 首页渲染配套配置
import 'dotenv/config';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import {
  users, categories, products, productImages, productTranslations, productPageLayouts,
  showcaseCategories, showcaseProducts, reviews, searchKeywords,
  siteConfig, homepageConfig, heroImages, sellingPoints, certifications, ctaButtons,
  navigationItems,
} from '../drizzle/schema';
import { hashPassword } from '../src/lib/auth';
import { encrypt } from '../src/lib/crypto';

// ==================== 工具函数 ====================

const summary: Record<string, number> = {};
function count(key: string, n = 1) {
  summary[key] = (summary[key] || 0) + n;
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
  }
  return bySlug;
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

      // 占位图（SVG 写入 public/images/products/）
      const imgUrl = writeSvg(
        join(process.cwd(), 'public', 'images', 'products'),
        `${slug}.svg`,
        svgPlaceholder(nameZh, nameEn, '#1a3a1a', '#c9aa7b'),
      ).replace('/images/', '/images/products/');
      await db.insert(productImages).values({ productId: product.id, url: imgUrl, alt: nameZh, sortOrder: 0 });

      // 中英翻译（其余 4 语言留空，员工后台填写）
      await db.insert(productTranslations).values([
        { productId: product.id, locale: 'zh', description: descZh, brewingGuide: brewingZh },
        { productId: product.id, locale: 'en', description: descEn, brewingGuide: brewingEn },
      ]);
      count('翻译', 2);
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
    if (dup) continue;
    await db.insert(showcaseProducts).values({ productId, showcaseCategoryId, showcaseLocale: locale, sortOrder: order });
    count('B2B关联');
  }
}

// ==================== 5. 布局示例（梅占·荒山金针） ====================

async function seedLayout(productList: Array<typeof products.$inferSelect>) {
  const meizhan = productList[13];
  const existing = await db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, meizhan.id)).limit(1);
  if (existing[0]) return;
  const layout = ['gallery', 'specs', 'description', 'brewingGuide', 'video', 'reviews', 'recommendations'];
  await db.insert(productPageLayouts).values({
    productId: meizhan.id,
    layoutJson: JSON.stringify(layout),
    updatedAt: new Date(),
  });
  count('布局示例');
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
    return;
  }
  for (const r of REVIEW_DEFS) {
    await db.insert(reviews).values({ ...r, status: 'published', updatedAt: new Date() });
    count('评价');
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
    if (byKw.has(keyword)) continue;
    await db.insert(searchKeywords).values({ keyword, targetPath, sortOrder: order++, updatedAt: new Date() });
    count('搜索关键词');
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
  }

  // 8.2 homepage_config 单例
  const hc = await db.select().from(homepageConfig).limit(1);
  if (!hc[0]) {
    await db.insert(homepageConfig).values({
      configJson: JSON.stringify({ showReviews: true, showCertifications: true, showB2bEntry: true }),
      updatedAt: new Date(),
    });
    count('首页配置');
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
    }
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
    }
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
    }
  }

  // 8.6 CTA ×2
  const ctas = await db.select().from(ctaButtons);
  if (ctas.length === 0) {
    await db.insert(ctaButtons).values([
      { textZh: '立即询价', textEn: 'Send Inquiry', linkUrl: '/contact', variant: 'light', sortOrder: 0, isActive: true, updatedAt: new Date() },
      { textZh: '申请样品', textEn: 'Request Sample', linkUrl: '/sample', variant: 'light', sortOrder: 1, isActive: true, updatedAt: new Date() },
    ]);
    count('CTA', 2);
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
  }
}

// ==================== 主流程 ====================

async function main() {
  console.log('开始最小种子数据...');
  await seedAdmin();
  const bySlug = await seedCategories();
  const productList = await seedProducts(bySlug);
  await seedShowcase(productList);
  await seedLayout(productList);
  await seedReviews();
  await seedKeywords();
  await seedHomepageConfig();

  console.log('\n种子数据汇总：');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
  console.log('SEED DONE');
}

main().catch((e) => {
  console.error('SEED FAIL:', e);
  process.exit(1);
});
