// 首页编辑区块定义（R2 拆分自 HomepageAdmin.tsx：四区块 CRUD 的字段配置；N1：hero 拆为电脑/手机双定义）

export type Row = Record<string, unknown> & { id: string; sortOrder: number; isActive: boolean; device?: string };

export interface SectionDef {
  key: string;
  title: string;
  endpoint: string;
  // 表单字段定义
  fields: Array<{ name: string; label: string; type: 'text' | 'select'; options?: Array<{ value: string; label: string }>; required?: boolean; hint?: string }>;
  // 列表行摘要显示
  summary: (row: Row) => string;
  // 是否支持图片上传字段
  imageField?: string;
  // N1：上传比例提示（显示在上传区旁）
  aspectHint?: string;
}

// N1 双列表共用字段：标题/副标题留空则不显示文字层
const HERO_FIELDS: SectionDef['fields'] = [
  { name: 'titleZh', label: '标题（中文）', type: 'text', hint: '留空则不显示文字' },
  { name: 'titleEn', label: '标题（英文）', type: 'text', hint: '留空则不显示文字' },
  { name: 'subtitleZh', label: '副标题（中文）', type: 'text', hint: '留空则不显示文字' },
  { name: 'subtitleEn', label: '副标题（英文）', type: 'text', hint: '留空则不显示文字' },
  { name: 'linkUrl', label: '跳转链接（选填）', type: 'text' },
];

// N1：电脑端轮播定义（12:5 横图）
export const heroDesktopDef: SectionDef = {
  key: 'heroDesktop',
  title: 'Hero 轮播图（电脑端）',
  endpoint: '/api/config/hero',
  imageField: 'imageUrl',
  aspectHint: '建议 12:5 横图（电脑），如 1920×800、2400×1000 均可，像素不限，请先裁好比例再上传',
  fields: HERO_FIELDS,
  summary: (r) => String(r.titleZh || r.titleEn || r.imageUrl || ''),
};

// N1：手机端轮播定义（5:6 竖图；列表为空时前台回退电脑列表）
export const heroMobileDef: SectionDef = {
  key: 'heroMobile',
  title: 'Hero 轮播图（手机端）',
  endpoint: '/api/config/hero',
  imageField: 'imageUrl',
  aspectHint: '建议 5:6 竖图（手机），如 750×900、900×1080 均可，像素不限，请先裁好比例再上传；列表为空时手机端自动显示电脑端图片',
  fields: HERO_FIELDS,
  summary: (r) => String(r.titleZh || r.titleEn || r.imageUrl || ''),
};

export const SECTIONS: SectionDef[] = [
  {
    key: 'sellingPoints',
    title: '卖点列表',
    endpoint: '/api/config/selling-points',
    fields: [
      {
        name: 'icon',
        label: '图标（lucide 名）',
        type: 'select',
        options: [
          { value: 'Leaf', label: 'Leaf（茶叶）' },
          { value: 'ShieldCheck', label: 'ShieldCheck（盾牌）' },
          { value: 'Globe', label: 'Globe（全球）' },
          { value: 'Award', label: 'Award（奖章）' },
        ],
      },
      { name: 'titleZh', label: '标题（中文）', type: 'text', required: true },
      { name: 'titleEn', label: '标题（英文）', type: 'text', required: true },
      { name: 'descriptionZh', label: '描述（中文）', type: 'text' },
      { name: 'descriptionEn', label: '描述（英文）', type: 'text' },
    ],
    summary: (r) => String(r.titleZh || ''),
  },
  {
    key: 'certifications',
    title: '认证展示',
    endpoint: '/api/config/certifications',
    imageField: 'imageUrl',
    fields: [
      { name: 'nameZh', label: '名称（中文）', type: 'text', required: true },
      { name: 'nameEn', label: '名称（英文）', type: 'text', required: true },
      { name: 'linkUrl', label: '跳转链接（选填）', type: 'text' },
    ],
    summary: (r) => String(r.nameZh || ''),
  },
  {
    key: 'cta',
    title: 'CTA 按钮',
    endpoint: '/api/config/cta',
    fields: [
      { name: 'textZh', label: '文案（中文）', type: 'text', required: true },
      { name: 'textEn', label: '文案（英文）', type: 'text', required: true },
      { name: 'linkUrl', label: '跳转链接', type: 'text', required: true },
      {
        name: 'variant',
        label: '样式',
        type: 'select',
        options: [
          { value: 'light', label: '浅色（深绿底白字）' },
          { value: 'outline', label: '描边' },
        ],
      },
    ],
    summary: (r) => String(r.textZh || ''),
  },
];
