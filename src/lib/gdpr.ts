// GDPR 工具（gdpr.ts）
// GDPR：欧盟《通用数据保护条例》，欧盟访客首次访问必须弹 Cookie 同意弹窗
// ★和老版的区别：老版用 geoip-lite 判断 IP 是否在欧盟；新版用 Cloudflare 自带的 request.cf.country。
// ★存储裁定（04 号文档 §4.1 / 14 号文档）：同意记录存 Neon 的 gdpr_consents 表（不存 D1，
//   D1 只存分析快照，Neon 是唯一真实数据源）。
import { eq } from 'drizzle-orm';
import { db } from './db';
import { gdprConsents } from '../../drizzle/schema';

// 欧盟 + EEA（欧洲经济区）国家列表
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
];

// 判断是否需要弹 GDPR 同意弹窗（IP 在欧盟/EEA 才需要）
export function requiresGDPRConsent(country: string | null): boolean {
  if (!country) return false;
  return EU_COUNTRIES.includes(country);
}

// 记录用户同意（consent：同意的 Cookie 类型，如 ["necessary","analytics"]）
export async function recordConsent(sessionId: string, ip: string, country: string | null, consent: string[]) {
  await db.insert(gdprConsents).values({
    sessionId,
    ip,
    country,
    consent: JSON.stringify(consent),
  });
}

// 检查该会话是否已经同意过（同意过就不再弹窗）
export async function hasConsented(sessionId: string): Promise<boolean> {
  const rows = await db
    .select({ id: gdprConsents.id })
    .from(gdprConsents)
    .where(eq(gdprConsents.sessionId, sessionId))
    .limit(1);
  return rows.length > 0;
}
