import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function CategoryConfig() {
  return <AdminUnavailableScreen
    title="Danh mục và cấu hình hệ thống"
    description="Quản lý thể loại sự kiện và các quy tắc vận hành."
    reason="Chưa có API quản trị để lưu danh mục, phí nền tảng, thời hạn đối soát hoặc chế độ bảo trì."
    action="Lưu cấu hình"
    sections={[{"title":"Danh mục thể loại sự kiện","detail":"Danh mục cần API danh sách, thêm, sửa và xóa trước khi có thể quản lý tại đây.","action":"Thêm thể loại"},{"title":"Phí nền tảng","detail":"Chưa có giá trị hiện hành đáng tin cậy hoặc API lưu mức phí mới.","action":"Sửa mức phí"},{"title":"Thời hạn đối soát","detail":"Số ngày tạm giữ payout cần chính sách máy chủ và quyền quản trị tương ứng.","action":"Sửa thời hạn"},{"title":"Chế độ bảo trì","detail":"Bật hoặc tắt bảo trì chỉ có thể thực hiện sau khi có API trạng thái và xác nhận.","action":"Đổi trạng thái"}]}
  />;
}

export default CategoryConfig;