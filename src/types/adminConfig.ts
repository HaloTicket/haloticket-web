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

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  active: boolean;
  sourceType?: "manual" | "auto_events";
  linkUrl?: string;
}

export interface EventSection {
  id: string;
  title: string;
  type: string;
  limit: number;
  
  // custom ads fields
  adsImageUrl?: string;
  adsSubtitle?: string;
  adsDescription?: string;
  adsButtonText?: string;
  adsButtonUrl?: string;
  
  // artists
  artistDisplayType?: "auto" | "manual";
}
