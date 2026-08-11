// 联系我们页（/[locale]/contact）
// 联系方式从 site_config 单例读取
import { Mail, Phone, MessageCircle, MapPin } from 'lucide-react';
import { getPageContent, getSiteConfig } from '@/lib/queries';

export default async function ContactPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const content = await getPageContent('contact');
  const site = await getSiteConfig();

  const items = [
    { icon: Mail, label: zh ? '邮箱' : 'Email', value: site?.contactEmail || 'yqtea.cn@gmail.com', href: `mailto:${site?.contactEmail || 'yqtea.cn@gmail.com'}` },
    { icon: Phone, label: zh ? '电话' : 'Phone', value: site?.contactPhone || '+86 15515928905', href: `tel:${(site?.contactPhone || '').replace(/\s/g, '')}` },
    { icon: MessageCircle, label: 'WhatsApp', value: site?.whatsapp || '+86 13333827003', href: `https://wa.me/${(site?.whatsapp || '').replace(/[^\d]/g, '')}` },
    { icon: MapPin, label: zh ? '地址' : 'Address', value: zh ? site?.addressZh || '中岳嵩山' : site?.addressEn || 'Mount Song, China', href: '' },
    { icon: MessageCircle, label: zh ? '微信' : 'WeChat', value: site?.wechat || 'ZenSongshanTea', href: '' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-4 font-serif text-2xl text-brand-green md:text-3xl">
        {content ? (zh ? content.titleZh : content.titleEn) : zh ? '联系我们' : 'Contact Us'}
      </h1>
      <p className="mb-8 text-sm text-gray-600">
        {content ? (zh ? content.contentZh : content.contentEn) : ''}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          const inner = (
            <>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <Icon size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-brand-green">{item.value}</p>
              </div>
            </>
          );
          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              {inner}
            </a>
          ) : (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
