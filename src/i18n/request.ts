// next-intl 请求配置：每次页面请求时决定"用哪种语言 + 加载哪个翻译文件"
// 完整的多语言路由逻辑（IP 自动识别、语言切换记忆）在阶段 6/7 完善
import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale：由路由中间件或链接传入的语言；无效时回退英文（默认语言）
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    locale = 'en';
  }

  return {
    locale,
    // 动态加载对应语言的翻译文件（messages/*.json）
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
