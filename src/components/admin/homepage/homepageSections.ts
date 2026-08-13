// 首页编辑区块定义（R2 拆分自 HomepageAdmin.tsx：四区块 CRUD 的字段配置）

export type Row = Record<string, unknown> & { id: string; sortOrder: number; isActive: boolean };

export interface SectionDef {
  key: string;
  title: string;
  endpoint: string;
  // 表单字段定义
  fields: Array<{ name: string; label: string; type: 'text' | 'select'; options?: Array<{ value: string; label: string }>; required?: boolean }>;
  // 列表行摘要显示
  summary: (row: Row) => string;
  // 是否支持图片上传字段
  imageField?: string;
}

export const SECTIONS: SectionDef[] = [
  {
    key: 'hero',
    title: 'Hero 轮播图',
    endpoint: '/api/config/hero',
    imageField: 'imageUrl',
    fields: [
      { name: 'titleZh', label: '标题（中文）', type: 'text' },
      { name: 'titleEn', label: '标题（英文）', type: 'text' },
      { name: 'subtitleZh', label: '副标题（中文）', type: 'text' },
      { name: 'subtitleEn', label: '副标题（英文）', type: 'text' },
      { name: 'linkUrl', label: '跳转链接（选填）', type: 'text' },
    ],
    summary: (r) => String(r.titleZh || r.titleEn || r.imageUrl || ''),
  },
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
