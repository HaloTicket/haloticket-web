import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function SystemHealth() {
  return <AdminUnavailableScreen
    title="Sức khỏe hệ thống"
    description="Theo dõi trạng thái dịch vụ và nhật ký vận hành."
    reason="Chưa có nguồn tổng hợp trạng thái nhiều dịch vụ hoặc nhật ký quản trị; một endpoint health đơn lẻ không đại diện cho toàn hệ thống."
    action="Kiểm tra lại"
    tableTitle="Trạng thái dịch vụ"
    columns={["Dịch vụ","Trạng thái","Phản hồi","Lần kiểm tra"]}
    sections={[{"title":"Nhật ký vận hành","detail":"Sự kiện hệ thống cần nguồn nhật ký đã phân quyền với thời gian và trạng thái xác thực.","action":"Xem nhật ký"},{"title":"Cảnh báo dịch vụ","detail":"Chỉ tạo cảnh báo sau khi có nguồn kiểm tra và ngưỡng đo được xác nhận.","action":"Cấu hình cảnh báo"}]}
  />;
}

export default SystemHealth;