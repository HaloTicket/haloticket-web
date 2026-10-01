import { useState } from "react";
import { FiBarChart2, FiFileText, FiShield, FiUser } from "react-icons/fi";

import { AdminModal } from "@/components/admin/AdminModal";

import { PreviewPage, PreviewPanel, PreviewTable } from "./WireframePrimitives";

const inputClass = "min-h-11 w-full rounded-xl border app-border app-bg-card px-3 text-sm app-text-main outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto";
const labelClass = "grid gap-1 text-xs font-semibold app-text-muted";
const noteClass = "text-xs app-text-muted";
const tabClass = "min-h-11 rounded-xl border app-border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary";

function SampleNotice() {
  return <p className={noteClass}>Dữ liệu minh họa cho bố cục. Không kết nối API và không phản ánh tài khoản, sự kiện hay giao dịch thực.</p>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b app-border py-3 text-sm last:border-b-0"><span className="app-text-muted">{label}</span><strong className="font-semibold app-text-main">{value}</strong></div>;
}

type Customer = { id: string; name: string; email: string; phone: string; status: string; joined: string; orders: string };
const customers: Customer[] = [
  { id: "KH-001", name: "Nguyễn Minh Anh", email: "minhanh@example.com", phone: "09•• ••• 184", status: "Hoạt động", joined: "12/08/2026", orders: "3" },
  { id: "KH-002", name: "Trần Quốc Bảo", email: "quocbao@example.com", phone: "09•• ••• 276", status: "Hoạt động", joined: "21/07/2026", orders: "1" },
  { id: "KH-003", name: "Lê Hoài Phương", email: "hoaiphuong@example.com", phone: "09•• ••• 359", status: "Tạm khóa", joined: "03/06/2026", orders: "2" },
];

export function CustomerUsersPreview() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "orders">("profile");
  const visible = customers.filter((customer) => (status === "all" || customer.status === status) && `${customer.name} ${customer.email} ${customer.id}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));

  return <PreviewPage title="Khách hàng" description="Tra cứu tài khoản khách hàng và xem cấu trúc hồ sơ, lịch sử mua vé.">
    <PreviewPanel title="Danh sách khách hàng" description="Chọn mã khách hàng để xem bản xem trước chi tiết.">
      <div className="flex flex-wrap items-end gap-3 pb-4">
        <label className={labelClass}>Tìm khách hàng<input className={`${inputClass} sm:min-w-64`} type="search" placeholder="Tên, email hoặc mã" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className={labelClass}>Trạng thái<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option>Hoạt động</option><option>Tạm khóa</option></select></label>
        <span className="pb-3 text-xs app-text-muted">{visible.length} tài khoản minh họa</span>
      </div>
      <SampleNotice />
      <PreviewTable columns={["Mã KH", "Khách hàng", "Email", "SĐT", "Đơn hàng", "Trạng thái", "Tham gia"]} rows={visible.map((customer) => [customer.id, customer.name, customer.email, customer.phone, customer.orders, customer.status, customer.joined])} onSelect={(row) => { setSelected(customers.find((customer) => customer.id === row[0]) ?? null); setDetailTab("profile"); }} />
      {visible.length === 0 && <p className="py-5 text-sm app-text-muted">Không có dòng minh họa phù hợp bộ lọc.</p>}
    </PreviewPanel>
    {selected && <AdminModal title={selected.name} subtitle="Bản xem trước hồ sơ khách hàng" icon={<FiUser />} maxWidth="xl" onClose={() => setSelected(null)}>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Chi tiết khách hàng">
        <button type="button" role="tab" aria-selected={detailTab === "profile"} className={`${tabClass} ${detailTab === "profile" ? "border-primary app-text-brand" : "app-text-muted"}`} onClick={() => setDetailTab("profile")}>Hồ sơ</button>
        <button type="button" role="tab" aria-selected={detailTab === "orders"} className={`${tabClass} ${detailTab === "orders" ? "border-primary app-text-brand" : "app-text-muted"}`} onClick={() => setDetailTab("orders")}>Lịch sử mua vé</button>
      </div>
      {detailTab === "profile" ? <div><DetailLine label="Mã khách hàng" value={selected.id} /><DetailLine label="Email" value={selected.email} /><DetailLine label="Số điện thoại" value={selected.phone} /><DetailLine label="Trạng thái" value={selected.status} /><DetailLine label="Ngày tham gia" value={selected.joined} /></div> : <div className="space-y-4"><p className={noteClass}>Khung lịch sử mua vé minh họa; chưa có dữ liệu đơn hàng.</p><div className="overflow-x-auto rounded-xl border app-border"><table className="min-w-[480px] w-full text-left text-sm"><thead className="app-bg-subnav"><tr><th className="p-3">Mã đơn</th><th className="p-3">Sự kiện</th><th className="p-3">Ngày mua</th><th className="p-3">Tổng tiền</th></tr></thead><tbody><tr><td colSpan={4} className="p-6 text-center app-text-muted">Dữ liệu đơn hàng sẽ xuất hiện tại đây khi có API.</td></tr></tbody></table></div></div>}
    </AdminModal>}
  </PreviewPage>;
}

type Organizer = { id: string; legalName: string; contact: string; email: string; events: string; verification: string; status: string };
const organizers: Organizer[] = [
  { id: "BTC-001", legalName: "Công ty TNHH Âm Thanh Xanh", contact: "Hà Gia Huy", email: "huy@example.com", events: "4", verification: "Đã xác minh tự động", status: "Hoạt động" },
  { id: "BTC-002", legalName: "Lumi Event Studio", contact: "Vũ Thanh Mai", email: "mai@example.com", events: "1", verification: "Đang xử lý tự động", status: "Chờ xác minh" },
  { id: "BTC-003", legalName: "Hộ kinh doanh Mây", contact: "Phạm Minh Tú", email: "tu@example.com", events: "2", verification: "Chưa có kết quả", status: "Chờ xác minh" },
];

export function OrganizerUsersPreview() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Organizer | null>(null);
  const visible = organizers.filter((organizer) => (status === "all" || organizer.status === status) && `${organizer.legalName} ${organizer.contact} ${organizer.id}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  return <PreviewPage title="Ban tổ chức" description="Danh sách pháp nhân, đầu mối liên hệ và trạng thái xác minh tự động.">
    <PreviewPanel title="Hàng đợi ban tổ chức" description="Trạng thái eKYC bên dưới chỉ là nhãn mẫu, không phải kết quả xác minh thực tế.">
      <div className="flex flex-wrap items-end gap-3 pb-4">
        <label className={labelClass}>Tìm ban tổ chức<input className={`${inputClass} sm:min-w-64`} type="search" placeholder="Tên pháp nhân hoặc liên hệ" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className={labelClass}>Trạng thái<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option>Hoạt động</option><option>Chờ xác minh</option></select></label>
      </div>
      <SampleNotice />
      <PreviewTable columns={["Mã BTC", "Pháp nhân", "Đầu mối", "Email", "Sự kiện", "eKYC tự động", "Trạng thái"]} rows={visible.map((organizer) => [organizer.id, organizer.legalName, organizer.contact, organizer.email, organizer.events, organizer.verification, organizer.status])} onSelect={(row) => setSelected(organizers.find((organizer) => organizer.id === row[0]) ?? null)} />
      {visible.length === 0 && <p className="py-5 text-sm app-text-muted">Không có dòng minh họa phù hợp bộ lọc.</p>}
    </PreviewPanel>
    {selected && <AdminModal title={selected.legalName} subtitle="Bản xem trước thông tin ban tổ chức" icon={<FiFileText />} maxWidth="xl" onClose={() => setSelected(null)}>
      <DetailLine label="Mã ban tổ chức" value={selected.id} /><DetailLine label="Người liên hệ" value={selected.contact} /><DetailLine label="Email liên hệ" value={selected.email} /><DetailLine label="Số sự kiện minh họa" value={selected.events} /><DetailLine label="Trạng thái eKYC mẫu" value={selected.verification} />
      <div className="mt-5 border-t app-border pt-4"><h3 className="text-sm font-bold app-text-main">Hồ sơ pháp lý · chỉ xem</h3><p className="mt-2 text-sm app-text-muted">Vị trí tài liệu đăng ký kinh doanh, giấy tờ đại diện và kết quả xác minh tự động. Chưa có tài liệu thật để hiển thị.</p></div>
    </AdminModal>}
  </PreviewPage>;
}

type Administrator = { id: string; name: string; email: string; role: string; status: string; lastSeen: string };
const administrators: Administrator[] = [
  { id: "QT-001", name: "Đỗ Khánh Linh", email: "linh.admin@example.com", role: "Quản trị hệ thống", status: "Hoạt động", lastSeen: "Hôm nay" },
  { id: "QT-002", name: "Bùi Hoàng Nam", email: "nam.ops@example.com", role: "Điều hành sự kiện", status: "Hoạt động", lastSeen: "Hôm qua" },
  { id: "QT-003", name: "Ngô Thảo Vy", email: "vy.support@example.com", role: "Hỗ trợ", status: "Tạm khóa", lastSeen: "28/09/2026" },
];
const permissionRows = [["Quản trị hệ thống", "Xem", "Xem", "Xem"], ["Điều hành sự kiện", "Xem", "Xem", "—"], ["Hỗ trợ", "Xem", "—", "—"]];

export function AdministratorUsersPreview() {
  const [selected, setSelected] = useState<Administrator | null>(null);
  const [previewRole, setPreviewRole] = useState("");
  return <PreviewPage title="Quản trị viên" description="Tra cứu quản trị viên và xem ma trận quyền ở mức phác thảo.">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
      <PreviewPanel title="Tài khoản quản trị" description="Chọn mã tài khoản để xem bản xem trước chỉnh vai trò."><SampleNotice /><PreviewTable columns={["Mã", "Họ tên", "Email", "Vai trò", "Trạng thái", "Truy cập gần nhất"]} rows={administrators.map((admin) => [admin.id, admin.name, admin.email, admin.role, admin.status, admin.lastSeen])} onSelect={(row) => { const admin = administrators.find((item) => item.id === row[0]) ?? null; setSelected(admin); setPreviewRole(admin?.role ?? ""); }} /></PreviewPanel>
      <PreviewPanel title="Ma trận quyền" description="Nhãn mô tả bố cục; chưa xác nhận quyền từ hệ thống."><div className="overflow-x-auto"><table className="min-w-[420px] w-full text-left text-xs"><thead><tr className="border-b app-border"><th className="p-3">Vai trò mẫu</th><th className="p-3">Sự kiện</th><th className="p-3">Đơn hàng</th><th className="p-3">Cấu hình</th></tr></thead><tbody>{permissionRows.map((row) => <tr key={row[0]} className="border-b app-border last:border-b-0">{row.map((cell, index) => <td key={index} className="p-3 app-text-main">{cell}</td>)}</tr>)}</tbody></table></div></PreviewPanel>
    </div>
    {selected && <AdminModal title={`Vai trò · ${selected.name}`} subtitle="Bản xem trước, không cấp hoặc lưu quyền" icon={<FiShield />} onClose={() => setSelected(null)}>
      <DetailLine label="Tài khoản" value={selected.email} /><DetailLine label="Vai trò hiện trên mẫu" value={selected.role} />
      <label className={`${labelClass} mt-5`}>Chọn vai trò để xem bố cục<select className={inputClass} value={previewRole} onChange={(event) => setPreviewRole(event.target.value)}><option>Quản trị hệ thống</option><option>Điều hành sự kiện</option><option>Hỗ trợ</option></select></label>
      <p className="mt-3 text-sm app-text-muted">Đang xem bố cục cho vai trò: <strong className="app-text-main">{previewRole}</strong>. Thay đổi này chỉ nằm trong bản xem trước.</p>
    </AdminModal>}
  </PreviewPage>;
}

type EventReport = { id: string; event: string; organizer: string; date: string; orders: string; tickets: string; checkins: string; revenue: string };
const reports: EventReport[] = [
  { id: "SK-001", event: "Đêm nhạc Thành phố sáng", organizer: "Âm Thanh Xanh", date: "12/09/2026", orders: "486", tickets: "612", checkins: "548", revenue: "428.400.000 đ" },
  { id: "SK-002", event: "Lễ hội Ẩm thực Cuối tuần", organizer: "Lumi Event Studio", date: "19/09/2026", orders: "315", tickets: "397", checkins: "352", revenue: "198.500.000 đ" },
  { id: "SK-003", event: "Sân khấu Mùa thu", organizer: "Hộ kinh doanh Mây", date: "26/09/2026", orders: "204", tickets: "281", checkins: "246", revenue: "112.400.000 đ" },
];
const chartHeights = [28, 42, 35, 59, 48, 75, 63, 84, 72, 93, 78, 100];

export function EventReportsPreview() {
  const [eventId, setEventId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<EventReport | null>(null);
  const visible = reports.filter((report) => {
    const date = report.date.split("/").reverse().join("-");
    return (eventId === "all" || report.id === eventId) && (!from || date >= from) && (!to || date <= to);
  });
  return <PreviewPage title="Báo cáo sự kiện" description="Bố cục phân tích doanh thu, đơn hàng và check-in theo sự kiện.">
    <PreviewPanel title="Bộ lọc báo cáo" description="Bộ lọc hoạt động trên các dòng minh họa trong trang này."><div className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>Từ ngày<input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className={labelClass}>Đến ngày<input className={inputClass} type="date" min={from || undefined} value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <label className={labelClass}>Sự kiện<select className={inputClass} value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="all">Tất cả sự kiện</option>{reports.map((report) => <option key={report.id} value={report.id}>{report.event}</option>)}</select></label>
      <button type="button" className="min-h-11 rounded-xl border app-border px-4 text-sm font-semibold app-text-main hover:app-bg-subnav focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { setFrom(""); setTo(""); setEventId("all"); }}>Đặt lại</button>
    </div></PreviewPanel>
    <SampleNotice />
    <div className="grid gap-4 sm:grid-cols-3"><PreviewPanel title="Doanh thu"><strong className="text-2xl app-text-main">—</strong><p className={noteClass}>Chờ dữ liệu tổng hợp</p></PreviewPanel><PreviewPanel title="Đơn hàng"><strong className="text-2xl app-text-main">—</strong><p className={noteClass}>Chờ dữ liệu tổng hợp</p></PreviewPanel><PreviewPanel title="Tỷ lệ check-in"><strong className="text-2xl app-text-main">—</strong><p className={noteClass}>Chờ dữ liệu tổng hợp</p></PreviewPanel></div>
    <PreviewPanel title="Xu hướng doanh thu" description="Biểu đồ cấu trúc minh họa, chưa có chuỗi số liệu thật."><div className="relative flex h-52 items-end gap-2 border-b app-border px-3 pb-1" role="img" aria-label="Biểu đồ cột minh họa xu hướng doanh thu, không chứa dữ liệu thực">{chartHeights.map((height, index) => <div key={index} className="min-w-0 flex-1 rounded-t-md bg-primary/20" style={{ height: `${height}%` }} />)}</div><div className="flex justify-between pt-2 text-xs app-text-muted"><span>Đầu kỳ</span><span>Cuối kỳ</span></div></PreviewPanel>
    <PreviewPanel title="So sánh sự kiện" description="Chọn mã sự kiện để xem cấu trúc báo cáo chi tiết."><PreviewTable columns={["Mã", "Sự kiện", "Ban tổ chức", "Ngày", "Đơn", "Vé", "Check-in", "Doanh thu mẫu"]} rows={visible.map((report) => [report.id, report.event, report.organizer, report.date, report.orders, report.tickets, report.checkins, report.revenue])} onSelect={(row) => setSelected(reports.find((report) => report.id === row[0]) ?? null)} />{visible.length === 0 && <p className="py-5 text-sm app-text-muted">Không có dòng minh họa trong khoảng ngày đã chọn.</p>}</PreviewPanel>
    {selected && <AdminModal title={selected.event} subtitle="Bản xem trước báo cáo chi tiết · số liệu minh họa" icon={<FiBarChart2 />} maxWidth="xl" onClose={() => setSelected(null)}><DetailLine label="Mã sự kiện" value={selected.id} /><DetailLine label="Ngày diễn ra" value={selected.date} /><DetailLine label="Ban tổ chức" value={selected.organizer} /><DetailLine label="Doanh thu mẫu" value={selected.revenue} /><DetailLine label="Đơn hàng mẫu" value={selected.orders} /><DetailLine label="Vé mẫu" value={selected.tickets} /><DetailLine label="Check-in mẫu" value={selected.checkins} /><p className="mt-4 text-sm app-text-muted">Chi tiết theo hạng vé, phương thức thanh toán và lượt vào cổng sẽ hiển thị khi dữ liệu báo cáo có sẵn.</p></AdminModal>}
  </PreviewPage>;
}
