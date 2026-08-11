// 通用工具函数（utils.ts）

// 安全整数解析（防 NaN：非法输入返回 fallback 而不是 NaN）
export function safeInt(value: unknown, fallback: number = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}

// 生成 URL 友好的标识符（slug）：小写、非字母数字转连字符、去首尾连字符
// 保留中文字符（中文 slug 由 slugify 库转拼音后使用，这里处理英文场景）
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
}

// 截断文本（用于列表预览，超长加省略号）
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// HTML 转义（防 XSS 攻击：用户输入渲染前必须转义）
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// 格式化文件大小（字节 → B / KB / MB）
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
