import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function EkycApproval() {
  return <AdminUnavailableScreen
    title="Duyệt hồ sơ eKYC"
    description="Xem và quyết định hồ sơ xác thực của ban tổ chức."
    reason="Máy chủ hiện chỉ hỗ trợ hồ sơ eKYC của chính người dùng; chưa có hàng chờ và API quyết định dành cho quản trị viên."
    action="Làm mới hàng chờ"
    tableTitle="Hồ sơ chờ xác thực"
    columns={["Mã hồ sơ","Người gửi","Loại giấy tờ","Thời gian gửi","Trạng thái","Thao tác"]}
    sections={[{"title":"Đối chiếu giấy tờ và chân dung","detail":"Hình ảnh hồ sơ chỉ hiển thị khi máy chủ cấp quyền xem chi tiết cho quản trị viên.","action":"Xem hồ sơ"},{"title":"Quyết định xác thực","detail":"Duyệt hoặc từ chối cần được lưu trên máy chủ cùng lý do và nhật ký xử lý.","action":"Duyệt hồ sơ"}]}
  />;
}

export default EkycApproval;