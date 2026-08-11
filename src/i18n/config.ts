// 多语言共享配置（config.ts）
// 全站统一的 6 语言清单：布局、中间件、语言切换组件都从这里引用，避免多处硬编码

// 本站支持的 6 种语言代码
export const locales = ['en', 'zh', 'ru', 'de', 'es', 'fr'] as const;

export type AppLocale = (typeof locales)[number];

// 默认语言（英文不加路径前缀的规则在中间件/路由层处理）
export const defaultLocale: AppLocale = 'en';

// 判断一个字符串是否是合法的语言代码
export function isValidLocale(value: string | undefined): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}
