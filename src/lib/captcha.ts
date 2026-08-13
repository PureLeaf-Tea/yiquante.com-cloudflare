// 人机验证（captcha.ts）
// hCaptcha：询价/样品表单防垃圾提交（05 号文档 §7.1）
// ★S4 安全修复：密钥缺失/验证服务故障时不再放行——
//   · 生产缺密钥：验证直接失败（表单不可提交），避免裸奔上线
//   · 本地缺密钥：放行但打印醒目警告（不影响开发）
//   · 验证服务故障：直接失败不放行（反爬优先于可用性）
export async function validateCaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;

  // 未配置密钥
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CAPTCHA] HCAPTCHA_SECRET_KEY 未配置（生产环境），拒绝放行表单提交');
      return false;
    }
    console.warn('[CAPTCHA][DEV] HCAPTCHA_SECRET_KEY 未配置，开发模式跳过人机验证（生产缺失将直接拒绝）');
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('[CAPTCHA ERROR] 验证服务故障，拒绝放行', error);
    // S4：故障时直接失败不放行（原实现为放行，存在反爬失效风险）
    return false;
  }
}
