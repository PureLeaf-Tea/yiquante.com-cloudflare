// R2 文件操作（r2.ts）
// R2：Cloudflare 的对象存储（文件仓库），存产品图片、视频、360°资源、备份文件
// 双模访问（收尾任务 3）：
//   1. 生产 Workers：env.YIQUANTEA_R2 桶绑定（uploadToR2/deleteFromR2/getFromR2）
//   2. dev / 无绑定环境：S3 兼容 API（@aws-sdk/client-s3），凭据取 .env 的
//      R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME
// 统一入口：uploadFile / removeFile / readFile —— 有绑定走绑定，否则自动走 S3 API

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// ---------- 模式一：Workers R2 绑定（生产） ----------

// ★上传文件到 R2（绑定版），返回公开访问 URL
export async function uploadToR2(
  key: string, // 文件在 R2 里的路径，如 "products/abc123.jpg"
  body: ArrayBuffer, // 文件内容（二进制）
  contentType: string, // 文件类型，如 "image/jpeg"
  r2: R2Bucket // R2 绑定实例
): Promise<string> {
  await r2.put(key, body, {
    httpMetadata: { contentType },
  });
  return publicUrl(key);
}

// 从 R2 删除文件（绑定版）
export async function deleteFromR2(key: string, r2: R2Bucket): Promise<void> {
  await r2.delete(key);
}

// 读取 R2 文件内容（绑定版）
export async function getFromR2(key: string, r2: R2Bucket): Promise<ArrayBuffer | null> {
  const object = await r2.get(key);
  if (!object) return null;
  return object.arrayBuffer();
}

// ---------- 模式二：S3 兼容 API（dev / 无绑定环境） ----------

let s3Client: S3Client | null = null;

// S3 客户端懒加载单例（凭据未配置时返回 null，调用方降级占位）
function getS3Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

// S3 兼容上传
async function uploadViaS3(key: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const client = getS3Client();
  if (!client) throw new Error('R2 凭据未配置（R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY）');
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(body),
      ContentType: contentType,
    })
  );
  return publicUrl(key);
}

// S3 兼容删除
async function deleteViaS3(key: string): Promise<void> {
  const client = getS3Client();
  if (!client) return;
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

// S3 兼容读取
async function getViaS3(key: string): Promise<ArrayBuffer | null> {
  const client = getS3Client();
  if (!client) return null;
  const res = await client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
  if (!res.Body) return null;
  // Node 环境 Body 是 Readable；Workers 环境是 ReadableStream
  const body = res.Body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  return null;
}

// ---------- 统一入口（自动选择模式） ----------

// R2 是否可用（凭据配置齐全）
export function isR2Configured(): boolean {
  return getS3Client() !== null;
}

// ★统一上传：有绑定走绑定，否则走 S3 API；返回公开 URL（凭据缺失时抛错，调用方可降级）
export async function uploadFile(
  key: string,
  body: ArrayBuffer,
  contentType: string,
  r2?: R2Bucket
): Promise<string> {
  if (r2) return uploadToR2(key, body, contentType, r2);
  return uploadViaS3(key, body, contentType);
}

// 统一删除
export async function removeFile(key: string, r2?: R2Bucket): Promise<void> {
  if (r2) return deleteFromR2(key, r2);
  return deleteViaS3(key);
}

// 统一读取
export async function readFile(key: string, r2?: R2Bucket): Promise<ArrayBuffer | null> {
  if (r2) return getFromR2(key, r2);
  return getViaS3(key);
}

// 统一列举前缀下的文件（备份列表用）
export async function listFiles(
  prefix: string,
  r2?: R2Bucket
): Promise<Array<{ key: string; size: number; uploadedAt: Date | null }>> {
  if (r2) {
    const res = await r2.list({ prefix });
    return res.objects.map((o) => ({ key: o.key, size: o.size, uploadedAt: o.uploaded }));
  }
  const client = getS3Client();
  if (!client) return [];
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
    })
  );
  return (res.Contents || []).map((o) => ({
    key: o.Key || '',
    size: o.Size || 0,
    uploadedAt: o.LastModified || null,
  }));
}

// 公开访问 URL（R2_PUBLIC_URL 在 .env / wrangler vars 中配置，如自定义域或 pub-*.r2.dev）
export function publicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  return `${base}/${key}`;
}

// 从公开 URL 反解 R2 key（删除旧文件时用）
export function keyFromUrl(url: string): string | null {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base || !url.startsWith(base)) {
    // 非 R2 URL（占位图/外链）不可删
    return null;
  }
  return url.slice(base.length + 1) || null;
}
