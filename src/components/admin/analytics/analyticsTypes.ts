// 客户行为分析共享类型（R2 拆分自 AnalyticsAdmin.tsx）

export interface OverviewData {
  days: number;
  totalViews: number;
  uniqueCountries: number;
  uniqueProducts: number;
  avgDurationMs: number;
  daily: Array<{ date: string; views: number }>;
  sourceCounts: Array<{ source: string; views: number }>;
}

export interface CountryRow {
  country: string | null;
  views: number;
}

export interface ProductRankRow {
  productId: string;
  nameZh: string | null;
  nameEn: string | null;
  views: number;
  avgDurationMs: number;
  countries: number;
}

export interface ViewLogRow {
  productId: string;
  country: string | null;
  source: string;
}
