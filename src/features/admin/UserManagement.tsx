import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function UserManagement() {
  return <AdminUnavailableScreen
    title="Quản lý người dùng"
    description="Tra cứu tài khoản, trạng thái và vai trò quản trị."
    reason="Chưa có API quản trị để liệt kê người dùng, đổi vai trò hoặc khóa tài khoản."
    action="Thêm người dùng"
    tableTitle="Danh sách người dùng"
    columns={["Mã ID","Họ và tên","Email & SĐT","Vai trò","Trạng thái","Ngày tham gia","Thao tác"]}
    sections={[{"title":"Tìm kiếm và lọc tài khoản","detail":"Tìm kiếm toàn bộ người dùng cần API danh sách có phân trang và bộ lọc phía máy chủ.","action":"Tìm kiếm"},{"title":"Phân quyền vai trò người dùng","detail":"Thay đổi vai trò cần kiểm tra quyền và lưu vào máy chủ trước khi hiển thị kết quả.","action":"Đổi vai trò"},{"title":"Trạng thái tài khoản","detail":"Khóa hoặc mở tài khoản cần quy tắc xử lý tài khoản quản trị và xác nhận thay đổi.","action":"Đổi trạng thái"}]}
  />;
}

export default UserManagement;