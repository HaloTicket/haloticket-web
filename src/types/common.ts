export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page: number;
  size: number;
  sortBy?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}
