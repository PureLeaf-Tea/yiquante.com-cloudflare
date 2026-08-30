// 订单管理共享类型与常量（订单模块第 2 期）

// 订单列表行（卡片墙/列表共用）
export interface OrderListRow {
  id: string;
  orderNo: string;
  date: string;
  status: 'pending' | 'shipped';
  lang: string;
  theme: string;
  createdAt: string;
  customerName: string | null;
  thumbnail: string | null;
  itemCount: number;
}

// 订单明细（编辑表单用）
export interface OrderItemForm {
  productId: string;
  type: 'item' | 'gift';
  qty: number;
  // 展示用（来自商品图库）
  nameZh: string;
  nameEn: string;
  spec: string | null;
  thumbnail: string | null;
}

// 客户下拉选项
export interface CustomerOption {
  id: string;
  name: string;
  country: string | null;
  defaultLang: string;
}

export const LANG_OPTIONS = [
  { value: 'zh', label: '中文（zh）' },
  { value: 'en', label: 'English（en）' },
  { value: 'ru', label: 'Русский（ru）' },
  { value: 'de', label: 'Deutsch（de）' },
  { value: 'es', label: 'Español（es）' },
  { value: 'fr', label: 'Français（fr）' },
];

export const LANG_LABEL: Record<string, string> = { zh: '中文', en: 'EN', ru: 'RU', de: 'DE', es: 'ES', fr: 'FR' };

// 默认祝福语（需求文档 §13.1）
export const DEFAULT_BLESSING_CN = '感谢您的信任，愿这杯茶带去我们最诚挚的祝福。';
export const DEFAULT_BLESSING_FOREIGN = 'Thank you for your trust. May this tea bring you our most sincere blessings.';

// 客户订单页链接：本地开发用当前 origin（手机同网可扫码测试），生产用正式域名
export function orderPageUrl(orderNo: string): string {
  if (typeof window === 'undefined') return `https://yiquantea.com/o/${orderNo}`;
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${window.location.host}/o/${orderNo}`;
  }
  return `https://yiquantea.com/o/${orderNo}`;
}
