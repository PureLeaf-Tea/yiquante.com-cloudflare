// 邮件发送（email.ts）
// ★用 Resend HTTP API 发邮件（纯 HTTP 接口，完美适配 Edge Runtime）。
// 做了抽象层，后面换邮件服务只改这一个文件。
import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string; // HTML 格式的邮件内容
}

// ★发送邮件
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // 开发阶段先打日志，不实际发送
    if (process.env.NODE_ENV !== 'production') {
      logger.dev('[EMAIL DEV] To:', options.to);
      logger.dev('[EMAIL DEV] Subject:', options.subject);
      logger.dev('[EMAIL DEV] Body:', options.html.substring(0, 200) + '...');
      return true;
    }

    // 生产环境：通过 Resend API 发送（纯 HTTP，Edge 兼容）
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'YiQuanTea <no-reply@yiquantea.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error('[EMAIL ERROR]', error);
    return false;
  }
}

// ★业务邮件模板
export const emailTemplates = {
  // 询价确认邮件
  inquiryConfirmation: (name: string, inquiryId: string) => ({
    subject: `YiQuanTea - Inquiry Received #${inquiryId}`,
    html: `
      <h2>Thank you, ${name}!</h2>
      <p>We have received your inquiry and will get back to you within 24 hours.</p>
      <p>Inquiry ID: <strong>${inquiryId}</strong></p>
    `,
  }),

  // 样品申请确认邮件
  sampleConfirmation: (name: string, sampleId: string) => ({
    subject: `YiQuanTea - Sample Request Received #${sampleId}`,
    html: `
      <h2>Thank you, ${name}!</h2>
      <p>Your sample request has been received. We will process it shortly.</p>
      <p>Request ID: <strong>${sampleId}</strong></p>
    `,
  }),
};
