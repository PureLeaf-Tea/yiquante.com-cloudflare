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

export default async function LocaleHomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale;

  const heroRows = await getHeroSlides();
  const slides: HeroSlide[] = heroRows.map((h) => ({
    imageUrl: h.imageUrl,
    title: locale === 'zh' ? h.titleZh || '' : h.titleEn || '',
    subtitle: locale === 'zh' ? h.subtitleZh || '' : h.subtitleEn || '',
  }));

  return (
    <>
      <HeroCarousel slides={slides} />
      <CategoryCards locale={locale} />
      <SellingPoints locale={locale} />
      <Certifications locale={locale} />
      <B2BEntry locale={locale} />
      <ReviewsSection locale={locale} />
      <CtaSection locale={locale} />
    </>
  );
}
