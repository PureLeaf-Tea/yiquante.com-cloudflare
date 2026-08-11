// B2B 展示区密码加密/解密（crypto.ts）
// ★和老版的区别：从 AES-256-CBC 升级为 AES-256-GCM。
// GCM 自带认证（防篡改），IV（初始化向量）内嵌在密文中，不需要额外的 password_iv 字段。
// 密文格式：iv(12字节) + 加密数据，整体 Base64 编码存入 showcase_categories.password。
// ★注意：这是"可逆加密"——admin 二次验证后需要解密查看明文密码，所以不能用哈希。

const SHOWCASE_KEY = process.env.SHOWCASE_PASSWORD_KEY ?? '';

// 把密钥字符串导入为 Web Crypto 可用的 CryptoKey 对象
async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SHOWCASE_KEY).slice(0, 32); // 确保 256-bit
  return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// ★加密（创建/修改 B2B 分类密码时调用）
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 每次随机 IV，同样密码每次密文不同
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  // IV + 密文拼接后 Base64 存储
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// ★解密（admin 查看明文 / 客户验证密码时调用）
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
