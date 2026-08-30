// 前台客户订单页渲染组件（OrderPageView.tsx，订单模块第 3 期，需求文档 §4.1）
// 纯服务端组件：整页按订单 lang 字段渲染（页面在 [locale] 体系外）；
// 双主题通过 CSS 变量切换：brand 主站品牌色（默认）/ classic 深咖暖色（沿用 v1 订单模板）；
// 微信分享友好（§8.2）：正文第一张 <img> 即首件商品缩略图（品牌 header 用 SVG 图标，不占首图位）
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Leaf } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { isValidLocale, type AppLocale } from '@/i18n/config';
import type { PublicOrder, PublicOrderItem } from '@/lib/queries';

// 双主题色表（§4.1）：全局默认 brand，订单可用 theme 字段单独覆盖（后台第 2 期已支持）
const THEMES = {
  // 主站品牌色：深绿 + 暖金 + 奶油白（默认）
  brand: { primary: '#1a3a1a', accent: '#c9aa7b', bg: '#fdfbf7', line: '#c9aa7b55' },
  // 深咖暖色：深咖 + 金 + 米白（沿用 v1 订单模板配色）
  classic: { primary: '#4A2C2A', accent: '#B8860B', bg: '#FBF7F0', line: '#B8860B55' },
} as const;

// 赠品绿（两主题共用，沿用 v1 模板）
const GIFT_GREEN = '#07C160';

// 默认祝福语（§13.1）：订单未填时的兜底（后台表单默认已预填，此处再兜一层）
const DEFAULT_BLESSING_FOREIGN =
  'Thank you for your trust. May this tea bring you our most sincere blessings.';
const DEFAULT_BLESSING_CN = '感谢您的信任，愿这杯茶带去我们最诚挚的祝福。';

// 底部联系邮箱兜底（§4.1：以主站 site 配置为准，缺省用固定邮箱）
const FALLBACK_EMAIL = 'tea.yiquantea@gmail.com';

// 明细行：整行可点击跳商品详情页（§4.1），带来源参数（第 4 期详情页消费）
function ItemRow({
  item,
  locale,
  zh,
  primaryName,
  secondaryName,
  goneText,
}: {
  item: PublicOrderItem;
  locale: AppLocale;
  zh: boolean;
  primaryName: string;
  secondaryName: string | null;
  goneText: string;
}) {
  const subLine = [secondaryName, item.spec].filter(Boolean).join(' · ');

  // 商品已删除（productId 置 null，§6.3）：显示占位、不可点击，保留历史订单完整性
  if (!item.productId || !item.slug) {
    return (
      <li className="flex items-center gap-4 rounded-xl border border-dashed border-[var(--op-line)] p-3 opacity-70">
        <div className="h-16 w-16 flex-none rounded-lg bg-[var(--op-line)]" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm">{goneText}</p>
        <span className="flex-none font-medium">×{item.qty}</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/${locale}/products/${item.slug}?from=order&lang=${locale}`}
        className="flex items-center gap-4 rounded-xl border border-[var(--op-line)] bg-white p-3 transition hover:shadow-md"
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={primaryName}
            className="h-16 w-16 flex-none rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-lg bg-[var(--op-bg)]">
            <Leaf size={20} className="text-[var(--op-accent)]" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{primaryName}</p>
          {subLine && <p className="truncate text-sm opacity-70">{subLine}</p>}
        </div>
        <span className="flex-none font-medium text-[var(--op-accent)]">×{item.qty}</span>
      </Link>
    </li>
  );
}

// 区块标题（金色短横线 + 标题文字，可选徽标）
function SectionTitle({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="h-px w-8 bg-[var(--op-accent)]" aria-hidden="true" />
      <h2 className="text-base font-semibold tracking-wide">{title}</h2>
      {badge && (
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: GIFT_GREEN }}
        >
          {badge}
        </span>
      )}
      <span className="h-px flex-1 bg-[var(--op-line)]" aria-hidden="true" />
    </div>
  );
}

export async function OrderPageView({ order }: { order: PublicOrder }) {
  // 订单语言非法时回退 en（§7 回退规则）
  const locale: AppLocale = isValidLocale(order.lang) ? order.lang : 'en';
  const zh = locale === 'zh';
  const t = await getTranslations({ locale, namespace: 'orderPage' });

  const theme = THEMES[order.theme === 'classic' ? 'classic' : 'brand'];
  const vars = {
    '--op-primary': theme.primary,
    '--op-accent': theme.accent,
    '--op-bg': theme.bg,
    '--op-line': theme.line,
  } as CSSProperties;

  const items = order.items.filter((i) => i.type !== 'gift');
  const gifts = order.items.filter((i) => i.type === 'gift');
  const shipped = order.status === 'shipped';
  const blessingForeign = order.blessingForeign?.trim() || DEFAULT_BLESSING_FOREIGN;
  const blessingCn = order.blessingCn?.trim() || DEFAULT_BLESSING_CN;
  const email = order.contactEmail || FALLBACK_EMAIL;

  // 商品名按订单语言取：中文订单主显中文名，其余语言主显英文名；副行显示另一语言名 · 规格
  const namesOf = (item: PublicOrderItem) => {
    const primary = zh ? item.nameZh || item.nameEn : item.nameEn || item.nameZh;
    const secondary = zh ? item.nameEn : item.nameZh;
    return { primary: primary ?? '', secondary };
  };

  return (
    <div style={vars} className="min-h-screen bg-[var(--op-bg)] text-[var(--op-primary)]">
      {/* 顶部 header：品牌 + 订单状态徽标（SVG 图标，不占微信首图位） */}
      <header className="bg-[var(--op-primary)] text-[var(--op-bg)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Leaf size={22} className="text-[var(--op-accent)]" aria-hidden="true" />
            <div className="leading-tight">
              <p className="font-serif text-lg">YiQuanTea</p>
              <p className="text-xs opacity-80">懿泉茶业</p>
            </div>
          </div>
          <span
            className={
              shipped
                ? 'rounded-full px-3 py-1 text-sm font-semibold text-white'
                : 'rounded-full bg-[var(--op-accent)] px-3 py-1 text-sm font-semibold text-[var(--op-primary)]'
            }
            style={shipped ? { backgroundColor: GIFT_GREEN } : undefined}
          >
            {shipped ? t('statusShipped') : t('statusPending')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-12">
        {/* 客户信息：姓名 + 订单号 + 日期 */}
        <section className="mt-6 rounded-2xl border border-[var(--op-line)] bg-white p-5">
          <h1 className="text-xl font-semibold">{order.customerName ?? t('customerGone')}</h1>
          <dl className="mt-3 space-y-1 text-sm opacity-80">
            <div className="flex gap-2">
              <dt className="flex-none">{t('orderNoLabel')}</dt>
              <dd className="font-mono">{order.orderNo}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="flex-none">{t('dateLabel')}</dt>
              <dd>{order.date}</dd>
            </div>
          </dl>
        </section>

        {/* 您购买的商品（整行可点击跳商品详情页） */}
        <section className="mt-8">
          <SectionTitle title={t('itemsTitle')} />
          <ul className="space-y-3">
            {items.map((item) => {
              const { primary, secondary } = namesOf(item);
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  zh={zh}
                  primaryName={primary}
                  secondaryName={secondary}
                  goneText={t('productGone')}
                />
              );
            })}
          </ul>
        </section>

        {/* 您的赠品（绿色徽标，同样可点击看详情） */}
        {gifts.length > 0 && (
          <section className="mt-8">
            <SectionTitle title={t('giftsTitle')} badge={t('giftBadge')} />
            <ul className="space-y-3">
              {gifts.map((item) => {
                const { primary, secondary } = namesOf(item);
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    zh={zh}
                    primaryName={primary}
                    secondaryName={secondary}
                    goneText={t('productGone')}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {/* 祝福语：外文 + 中文两行 */}
        <section className="mt-8 rounded-2xl border border-[var(--op-line)] bg-white p-6 text-center">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--op-accent)]">
            {t('blessingTitle')}
          </p>
          <p className="font-serif text-base italic leading-relaxed">{blessingForeign}</p>
          <p className="mt-2 text-sm opacity-80">{blessingCn}</p>
        </section>

        {/* 底部联系方式 */}
        <footer className="mt-10 border-t border-[var(--op-line)] pt-6 text-center text-sm opacity-80">
          <p>{t('contactTitle')}</p>
          <a
            href={`mailto:${email}`}
            className="mt-1 inline-block font-medium text-[var(--op-accent)] underline underline-offset-4"
          >
            {email}
          </a>
          <p className="mt-3 text-xs opacity-70">{t('brand')}</p>
        </footer>
      </main>
    </div>
  );
}
