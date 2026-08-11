'use client';

// B2B 分类产品视图（B2BCategoryProducts.tsx）
// 客户端流程：本地 token → verify-token 校验 → 失败弹密码弹窗 → X-B2B-Token 拉产品列表
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { useB2BAccess } from '@/hooks/useB2BAccess';
import { B2BPasswordModal } from './B2BPasswordModal';

interface ShowcaseProduct {
  id: string;
  nameZh: string;
  nameEn: string;
  displayName: string;
  slug: string;
  thumbnail: string | null;
  priceCNY: string | null;
  priceUSD: string | null;
  spec: string | null;
}

const PAGE_SIZE = 25;

export function B2BCategoryProducts({
  category,
  locale,
}: {
  category: { id: string; slug: string; nameZh: string; nameEn: string };
  locale: string;
}) {
  const zh = locale === 'zh';
  const { checkAccess, grantAccess } = useB2BAccess(category.id);

  const [verified, setVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');

  // 初始：本地有 token 则先校验有效性
  useEffect(() => {
    const localToken = (() => {
      try {
        const raw = localStorage.getItem('b2b_access_tokens');
        const list = raw ? (JSON.parse(raw) as Array<{ categoryId: string; token: string }>) : [];
        return list.find((t) => t.categoryId === category.id)?.token || '';
      } catch {
        return '';
      }
    })();

    if (!localToken || !checkAccess(category.id)) {
      setLoading(false);
      setShowModal(true);
      return;
    }

    // 服务端二次校验 token
    fetch('/api/showcase/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorySlug: category.slug, token: localToken }),
    })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { valid: boolean } }>)
      .then((data) => {
        if (data.success && data.data?.valid) {
          setToken(localToken);
          setVerified(true);
        } else {
          setShowModal(true);
          setLoading(false);
        }
      })
      .catch(() => {
        setShowModal(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id, category.slug]);

  // 拉产品列表（token 就绪后 / 翻页时）
  const fetchProducts = useCallback(async (t: string, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/showcase/categories/${category.slug}/products?locale=${locale}&page=${p}&pageSize=${PAGE_SIZE}`,
        { headers: { 'X-B2B-Token': t } }
      );
      const data = (await res.json()) as { success?: boolean; data?: ShowcaseProduct[]; total?: number };
      if (data.success && data.data) {
        setProducts(data.data);
        setTotal(data.total || 0);
      }
    } catch {
      // 网络错误时展示空列表
    } finally {
      setLoading(false);
    }
  }, [category.slug, locale]);

  useEffect(() => {
    if (verified && token) fetchProducts(token, page);
  }, [verified, token, page, fetchProducts]);

  const handleSuccess = (newToken: string) => {
    grantAccess(category.id, newToken);
    setToken(newToken);
    setVerified(true);
    setShowModal(false);
    setPage(1);
  };

  const name = zh ? category.nameZh : category.nameEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 顶部：返回 + 标题 + 数量 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/${locale}/b2b`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-btn border border-gray-200 px-4 text-sm text-gray-600 hover:border-brand-gold hover:text-brand-gold"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {zh ? '返回B2B分类' : 'Back to B2B'}
        </Link>
        <h1 className="font-serif text-xl text-brand-green md:text-2xl">{name}</h1>
        {verified && (
          <span className="text-sm text-gray-400">
            {zh ? `共 ${total} 款` : `${total} products`}
          </span>
        )}
      </div>

      {/* 未验证：显示锁定提示 */}
      {!verified && !loading && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-white py-16">
          <Lock size={40} className="text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-400">
            {zh ? '该分类需要密码访问' : 'This category requires a password'}
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex min-h-touch items-center rounded-btn bg-brand-green px-6 text-sm font-medium text-white hover:bg-brand-green/90"
          >
            {zh ? '输入密码' : 'Enter Password'}
          </button>
        </div>
      )}

      {/* 加载中骨架 */}
      {verified && loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} shape="card" />
          ))}
        </div>
      )}

      {/* 产品网格（桌面 3 列 / 手机 2 列，06 §4.3） */}
      {verified && !loading && products.length === 0 && (
        <p className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">
          {zh ? '该分类暂无产品' : 'No products in this category yet'}
        </p>
      )}
      {verified && !loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/showcase/${p.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="overflow-hidden">
                  <LazyImage
                    src={p.thumbnail || ''}
                    alt={p.displayName}
                    width={400}
                    height={400}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-brand-green">{p.displayName}</h3>
                  {p.spec && <p className="mt-0.5 text-xs text-gray-400">{p.spec}</p>}
                  {/* 价格按 showPriceInShowcase 决定显隐（API 已处理：隐藏时返回 null） */}
                  {p.priceCNY !== null && p.priceUSD !== null && (
                    <p className="mt-1.5 text-sm font-semibold text-brand-gold">
                      ¥{p.priceCNY} / ${p.priceUSD}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {total > PAGE_SIZE && (
            <div className="mt-8 flex justify-center">
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </>
      )}

      <B2BPasswordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        categorySlug={category.slug}
        categoryName={name}
        locale={locale}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
