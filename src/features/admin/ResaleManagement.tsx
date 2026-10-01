import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function ResaleManagement() {
  return <AdminUnavailableScreen
    title="Quản lý vé bán lại"
    description="Theo dõi niêm yết và chính sách giá bán lại."
    reason="Máy chủ chỉ có chính sách bán lại theo từng sự kiện; chưa có giá trần toàn hệ thống hoặc API khóa niêm yết cho quản trị viên."
    action="Làm mới niêm yết"
    tableTitle="Vé đang niêm yết"
    columns={["Mã vé","Tên sự kiện","Người bán","Giá gốc","Giá niêm yết","% chênh lệch","Trạng thái","Thao tác"]}
    sections={[{"title":"Chính sách giá theo sự kiện","detail":"Giới hạn giá phải được đọc từ chính sách của từng sự kiện; không có mức cộng chung cho mọi vé.","action":"Điều chỉnh chính sách"},{"title":"Kiểm soát niêm yết","detail":"Khóa niêm yết cần API quản trị, lý do xử lý và trạng thái được xác nhận từ máy chủ.","action":"Khóa niêm yết"}]}
  />;
}

export default ResaleManagement;