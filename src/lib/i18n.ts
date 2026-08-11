// 多语言 + IP 检测（i18n.ts）
// ★和老版的区别：老版用 geoip-lite 库查询 IP 地理位置，
// 新版直接用 Cloudflare Workers 自带的 request.cf.country 属性。
// 不需要额外安装任何库，Cloudflare 免费提供 IP 地理信息，永远准确。

// Cloudflare 附带的请求地理信息（线上由 request.cf 提供）
// ★不用 Request['cf'] 类型：Next.js 内置的 DOM 类型会和 Workers 类型冲突，
// 这里用本地最小接口解耦，两边 Runtime 都能编译
export interface CloudflareCfProperties {
  country?: string;
}

// 从 Cloudflare 请求对象中提取国家代码
export function getCountryFromCF(cf: CloudflareCfProperties | undefined | null): string | null {
  if (!cf?.country) return null;
  return cf.country; // 返回 'CN' 'HU' 'DE' 等 ISO 国家代码
}

// IP→语言映射表（中国→中文，俄罗斯→俄语，匈牙利→英语，其他→英语）
const COUNTRY_LANG_MAP: Record<string, string> = {
  CN: 'zh', // 中国 → 中文
  TW: 'zh', // 台湾 → 中文
  HK: 'zh', // 香港 → 中文
  MO: 'zh', // 澳门 → 中文
  RU: 'ru', // 俄罗斯 → 俄语
  DE: 'de', // 德国 → 德语
  ES: 'es', // 西班牙 → 西班牙语
  FR: 'fr', // 法国 → 法语
  AT: 'de', // 奥地利 → 德语
  CH: 'de', // 瑞士 → 德语
  BE: 'fr', // 比利时 → 法语
  // 其余国家默认使用英语
};

// 根据国家代码决定默认语言（手动切换后以 Cookie 记忆为准，见 middleware）
export function getLocaleFromCountry(country: string | null): string {
  if (!country) return 'en';
  return COUNTRY_LANG_MAP[country] || 'en';
}
