// 前台首页（阶段 9 正式版）
// 7 个模块按 06 号文档顺序：Hero → 分类卡片 → 卖点 → 认证 → B2B 入口 → 客户评价 → CTA
import { HeroCarousel, type HeroSlide } from '@/components/home/HeroCarousel';
import { CategoryCards } from '@/components/home/CategoryCards';
import { SellingPoints } from '@/components/home/SellingPoints';
import { Certifications } from '@/components/home/Certifications';
import { B2BEntry } from '@/components/home/B2BEntry';
import { ReviewsSection } from '@/components/home/ReviewsSection';
import { CtaSection } from '@/components/home/CtaSection';
import { getHeroSlides } from '@/lib/queries';

export default async function LocaleHomePage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const params = await paramsPromise;
  const locale = params.locale;

  const heroRows = await getHeroSlides();
  // N1：电脑端/手机端两套独立轮播列表；手机列表为空时手机端回退显示电脑列表（裁剪方式，不白屏）
  const toSlides = (rows: typeof heroRows): HeroSlide[] =>
    rows.map((h) => ({
      imageUrl: h.imageUrl,
      title: locale === 'zh' ? h.titleZh || '' : h.titleEn || '',
      subtitle: locale === 'zh' ? h.subtitleZh || '' : h.subtitleEn || '',
    }));
  const desktopSlides = toSlides(heroRows.filter((h) => h.device === 'desktop'));
  const mobileRows = heroRows.filter((h) => h.device === 'mobile');
  const mobileSlides = toSlides(mobileRows.length > 0 ? mobileRows : heroRows.filter((h) => h.device === 'desktop'));

  return (
    <>
      {/* 桌面端（md 及以上）渲染电脑列表 */}
      <div className="hidden md:block">
        <HeroCarousel slides={desktopSlides} variant="desktop" />
      </div>
      {/* 手机端（md 以下）渲染手机列表（空则回退电脑列表） */}
      <div className="md:hidden">
        <HeroCarousel slides={mobileSlides} variant="mobile" />
      </div>
      <CategoryCards locale={locale} />
      <SellingPoints locale={locale} />
      <Certifications locale={locale} />
      <B2BEntry locale={locale} />
      <ReviewsSection locale={locale} />
      <CtaSection locale={locale} />
    </>
  );
}
