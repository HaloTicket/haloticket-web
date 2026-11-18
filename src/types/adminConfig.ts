/** Danh mục sự kiện do admin cấu hình, kèm số sự kiện thuộc danh mục. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  status?: string;
  eventCount: number;
  imageUrl: string;
  description?: string;
  sortOrder?: number;
}

/** Banner hiển thị ở trang chủ; có thể nhập thủ công hoặc tự sinh từ các sự kiện. */
export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  active: boolean;
  sourceType?: "manual" | "auto_events";
  linkUrl?: string;
}

/** Một khu vực (section) sự kiện ở trang chủ do admin cấu hình, gồm tiêu đề, loại và số lượng tối đa. */
export interface EventSection {
  id: string;
  title: string;
  type: string;
  limit: number;
  
  // trường cho section quảng cáo tùy chỉnh
  adsImageUrl?: string;
  adsSubtitle?: string;
  adsDescription?: string;
  adsButtonText?: string;
  adsButtonUrl?: string;
  
  // nghệ sĩ
  artistDisplayType?: "auto" | "manual";
}
