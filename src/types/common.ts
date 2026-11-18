/** Vỏ phản hồi API chung: mã trạng thái, thông điệp và dữ liệu. */
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

/** Tham số phân trang và sắp xếp khi gọi API danh sách. */
export interface PaginationParams {
  page: number;
  size: number;
  sortBy?: string;
}

/** Phản hồi phân trang kiểu Spring: nội dung trang và tổng số phần tử, tổng số trang. */
export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}
