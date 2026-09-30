import { AdminUnavailableScreen } from "./components/AdminUnavailableScreen";

export function PaymentMonitoring() {
  return <AdminUnavailableScreen
    title="Giám sát thanh toán"
    description="Theo dõi giao dịch thanh toán và đối soát."
    reason="Chưa có API quản trị để tìm giao dịch hoặc thử lại thanh toán với quy tắc an toàn chống xử lý trùng."
    action="Làm mới giao dịch"
    tableTitle="Lịch sử giao dịch"
    columns={["Mã giao dịch","Loại giao dịch","Sự kiện & đối tác","Số tiền (VNĐ)","Cổng thanh toán","Trạng thái","Thao tác"]}
    sections={[{"title":"Tra cứu giao dịch","detail":"Bộ lọc trạng thái, thời gian và cổng thanh toán cần tìm kiếm trên máy chủ.","action":"Tìm kiếm"},{"title":"Thử lại giao dịch","detail":"Chỉ có thể thử lại khi máy chủ xác nhận giao dịch đủ điều kiện và bảo đảm không xử lý trùng.","action":"Thử lại"}]}
  />;
}

export default PaymentMonitoring;