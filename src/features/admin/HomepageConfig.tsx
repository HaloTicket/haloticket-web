import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function HomepageConfig() {
  return <AdminUnavailableScreen
    title="Cấu hình trang chủ"
    description="Quản lý nội dung quảng bá và vị trí hiển thị trên trang chủ."
    reason="Chưa có nơi lưu cấu hình, tải ảnh và API xuất bản dành cho quản trị viên."
    action="Xuất bản thay đổi"
    sections={[{"title":"Banner Hero","detail":"Banner cần dữ liệu được lưu và ảnh được tải lên máy chủ trước khi có thể xuất bản.","action":"Thêm banner"},{"title":"Các khu vực sự kiện","detail":"Thứ tự và tiêu chí chọn sự kiện cần được lưu, kiểm tra và nạp lại từ máy chủ.","action":"Sắp xếp khu vực"},{"title":"Vị trí quảng bá","detail":"Nội dung quảng bá chỉ có thể hiển thị sau khi có bản nháp, bản xuất bản và quyền chỉnh sửa.","action":"Thêm vị trí"},{"title":"Xem trước trang chủ","detail":"Chưa có bản nháp được lưu để xem trước; nút xuất bản sẽ mở khi có API cấu hình.","action":"Xem trước"}]}
  />;
}

export default HomepageConfig;