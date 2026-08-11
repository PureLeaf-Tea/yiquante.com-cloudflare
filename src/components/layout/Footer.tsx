'use client';

// 前台页脚（Footer.tsx）
// 06 号文档 §2：深绿背景页脚，仅首页显示（非首页返回 null）
// 内容：品牌信息 + 联系方式（02 号文档项目身份）+ 社交媒体占位
import { usePathname } from 'next/navigation';
import { Leaf, Mail, Phone, MessageCircle, MapPin } from 'lucide-react';
import { isValidLocale } from '@/i18n/config';

export function Footer({ locale }: { locale: string }) {
  const pathname = usePathname();

  // 判断是否首页：去掉语言前缀后路径为空
  const segments = pathname.split('/').filter(Boolean);
  const isHomepage =
    segments.length === 0 || (segments.length === 1 && isValidLocale(segments[0]));
  if (!isHomepage) return null;

  return (
    <footer className="bg-brand-green text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        {/* 品牌区 */}
        <div>
          <div className="flex items-center gap-2">
            <Leaf size={22} className="text-brand-gold" aria-hidden="true" />
            <span className="font-serif text-lg">YiQuanTea</span>
          </div>
          <p className="mt-3 text-sm text-white/70">Whole Leaf · Pure Nature</p>
          <p className="mt-1 text-sm text-white/70">懿泉茶叶有限公司</p>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-gold">联系我们</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <Mail size={15} aria-hidden="true" /> yqtea.cn@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <Phone size={15} aria-hidden="true" /> +86 15515928905
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle size={15} aria-hidden="true" /> WhatsApp +86 13333827003
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={15} aria-hidden="true" /> 中岳嵩山
            </li>
          </ul>
        </div>

        {/* 社交媒体占位（阶段 15 接 social_links 数据表） */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-gold">关注我们</h3>
          <p className="text-sm text-white/70">微信：ZenSongshanTea</p>
          <p className="mt-2 text-sm text-white/50">更多社交渠道即将上线</p>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} YiQuanTea · yiquantea.com
      </div>
    </footer>
  );
}
