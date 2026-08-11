// Cloudflare Images 接口（images.ts）
// ★新增：封装 Cloudflare Images 的 API 调用（自动压缩/格式转换/裁剪）
// 开发阶段先返回 R2 原始 URL 占位，开通 Images 后填入真实的 Account ID 即自动生效

const IMAGES_API = 'https://api.cloudflare.com/client/v4/accounts';

export function getCloudflareImagesConfig() {
  return {
    accountId: process.env.CF_ACCOUNT_ID || '',
    apiToken: process.env.CF_IMAGES_API_TOKEN || '',
    deliveryUrl: 'https://imagedelivery.net',
    apiBase: IMAGES_API, // 预留：后续如需主动调用 Images API 上传/变换时使用
  };
}

// 生成经过 Images 处理的图片 URL
// 在 Cloudflare Images 开通之前，直接返回 R2 原始 URL
export function getImageUrl(
  r2Key: string,
  options?: {
    width?: number;
    height?: number;
    format?: 'webp' | 'avif' | 'auto';
    fit?: 'scale-down' | 'contain' | 'cover' | 'pad';
  }
): string {
  const { accountId, deliveryUrl } = getCloudflareImagesConfig();

  // 开发阶段（未开通 Images）：直接返回 R2 URL
  if (!accountId) {
    return `${process.env.R2_PUBLIC_URL}/${r2Key}`;
  }

  // 线上阶段：构造带参数的 Images URL
  const params = new URLSearchParams();
  if (options?.width) params.set('width', String(options.width));
  if (options?.height) params.set('height', String(options.height));
  if (options?.format) params.set('format', options.format);
  if (options?.fit) params.set('fit', options.fit);

  return `${deliveryUrl}/${accountId}/${r2Key}/public${params.toString() ? '?' + params.toString() : ''}`;
}

// 获取图片的多种尺寸变体 URL（用于产品卡片、列表、详情等不同场景）
export function getImageVariants(r2Key: string) {
  return {
    thumbnail: getImageUrl(r2Key, { width: 200, height: 200, fit: 'cover', format: 'webp' }),
    card: getImageUrl(r2Key, { width: 400, height: 400, fit: 'cover', format: 'webp' }),
    detail: getImageUrl(r2Key, { width: 800, fit: 'scale-down', format: 'webp' }),
    original: getImageUrl(r2Key),
  };
}
