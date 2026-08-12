// Next.js 配置（next.config.mjs）
// next-intl（多语言插件）会把 Next.js 配置包一层，所以下面用 withNextIntl 导出
import createNextIntlPlugin from 'next-intl/plugin';

// 告诉 next-intl 插件：多语言请求配置文件在 src/i18n/request.ts
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ★改为 unoptimized：因为 Cloudflare Images 独立处理图片，不用 Next.js 内置的 sharp
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev', // R2 公开访问域名
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com', // R2 备用域名
      },
    ],
  },
  // ★关键配置：让 @cloudflare/next-on-pages 正确适配
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 允许上传最大 10MB（图片/视频）
    },
  },
  // 安全响应头（16 号文档 §七）
  async headers() {
    const baseHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    // CSP 仅生产启用：dev 模式的 webpack 热更新依赖 unsafe-eval 与 ws，加会破坏开发体验（上线前可按需收紧）
    if (process.env.NODE_ENV === 'production') {
      baseHeaders.push({
        key: 'Content-Security-Policy',
        value: "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' https://js.hcaptcha.com https://*.hcaptcha.com; frame-src https://*.hcaptcha.com; connect-src 'self' https://api.hcaptcha.com https://*.hcaptcha.com",
      });
    }
    return [
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
