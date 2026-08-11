// 产品规格表区块（ProductSpecs.tsx）
export function ProductSpecs({
  spec,
  sku,
  priceCNY,
  priceUSD,
  locale,
  showPrice,
}: {
  spec: string | null;
  sku: string | null;
  priceCNY: string;
  priceUSD: string;
  locale: string;
  showPrice: boolean;
}) {
  const zh = locale === 'zh';
  const rows: Array<[string, string]> = [];
  if (sku) rows.push([zh ? 'SKU' : 'SKU', sku]);
  if (showPrice) {
    rows.push([zh ? '人民币价格' : 'Price (CNY)', `¥${priceCNY}`]);
    rows.push([zh ? '美元价格' : 'Price (USD)', `$${priceUSD}`]);
  }
  if (spec) rows.push([zh ? '规格' : 'Specification', spec]);

  if (rows.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-serif text-xl text-brand-green">{zh ? '产品规格' : 'Specifications'}</h2>
      <table className="w-full max-w-xl overflow-hidden rounded-xl border border-gray-100 text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 last:border-b-0">
              <th className="w-36 bg-gray-50 px-4 py-2.5 text-left font-medium text-gray-500">{label}</th>
              <td className="px-4 py-2.5 text-gray-700">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
