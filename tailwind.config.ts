// Tailwind CSS 配置（tailwind.config.ts）
// Tailwind 是"原子化 CSS"工具：样式用 class 写在 HTML 里，这里定义自定义的类
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1a3a1a', // 品牌深绿（主色）
          gold: '#c9aa7b', // 品牌暖金（辅色）
          cream: '#fdfbf7', // 品牌奶油白（底色）
        },
        admin: {
          dark: '#1a1a2e', // 后台深色背景
          sidebar: '#16213e', // 后台侧边栏
          hover: '#0f3460', // 后台悬停色
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'], // 英文标题字体
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'], // 正文字体（中英文）
      },
      borderRadius: {
        btn: '30px', // 按钮圆角
      },
      minHeight: {
        touch: '48px', // 最小触摸尺寸（手机友好）
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};
export default config;
