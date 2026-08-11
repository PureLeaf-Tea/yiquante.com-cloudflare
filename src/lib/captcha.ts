// 人机验证（captcha.ts）
// hCaptcha：询价/样品表单防垃圾提交（05 号文档 §7.1）
// ★开发阶段：未配置 HCAPTCHA_SECRET_KEY 时自动跳过验证（一行配置切换，上线前填密钥即生效）
export async function validateCaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;

  // 未配置密钥 = 开发阶段，直接放行
  if (!secret) return true;

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
    console.error('[CAPTCHA ERROR]', error);
    // 验证服务故障时放行，不阻断正常业务（可用性优先）
    return true;
  }
}
