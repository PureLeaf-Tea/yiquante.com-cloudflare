'use client';

// 前台页脚（Footer.tsx）
// 06 号文档 §2：深绿背景页脚，仅首页显示（非首页返回 null）
// 内容：品牌信息 + 联系方式（02 号文档项目身份）+ 社交媒体；文案全部走 footer.* 翻译键（收尾任务 2）
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Leaf, Mail, Phone, MessageCircle, MapPin } from 'lucide-react';
import { isValidLocale } from '@/i18n/config';

export function Footer({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations('footer');

  // ★M5/R8 修复：联系方式改读 site_config（后台可改），配置为空时回退原硬编码兜底值
  const [contact, setContact] = useState({ email: 'yqtea.cn@gmail.com', phone: '+86 15515928905', whatsapp: '+86 13333827003' });
  useEffect(() => {
    fetch('/api/config/site')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { contactEmail?: string; contactPhone?: string; whatsapp?: string } }>)
      .then((d) => {
        if (d.success && d.data) {
          setContact({
            email: d.data.contactEmail || 'yqtea.cn@gmail.com',
            phone: d.data.contactPhone || '+86 15515928905',
            whatsapp: d.data.whatsapp || '+86 13333827003',
          });
        }
      })
      .catch(() => {
        // 拉取失败保持兜底值，不影响页脚渲染
      });
  }, []);

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
          <p className="mt-3 text-sm text-white/70">{t('slogan')}</p>
          <p className="mt-1 text-sm text-white/70">{t('companyName')}</p>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-gold">{t('contactUs')}</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <Mail size={15} aria-hidden="true" /> {contact.email}
            </li>
            <li className="flex items-center gap-2">
              <Phone size={15} aria-hidden="true" /> {contact.phone}
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle size={15} aria-hidden="true" /> WhatsApp {contact.whatsapp}
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={15} aria-hidden="true" /> {t('location')}
            </li>
          </ul>
        </div>

        {/* 社交媒体（真实链接由 social_links 数据表提供） */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-gold">{t('followUs')}</h3>
          <p className="text-sm text-white/70">{t('wechat')}: ZenSongshanTea</p>
          <p className="mt-2 text-sm text-white/50">{t('moreSoon')}</p>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} YiQuanTea · yiquantea.com · {t('rights')}
      </div>
    </footer>
  );
}
