import { useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { PreviewButton, PreviewPage, PreviewPanel, PreviewTable } from "./WireframePrimitives";

const money = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount) + " ₫";

function Facts({ facts }: { facts: [string, string][] }) {
  return <dl className="wf-detail">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function SampleModal({ title, subtitle, facts, onClose, children }: { title: string; subtitle?: string; facts?: [string, string][]; onClose: () => void; children?: React.ReactNode }) {
  return <AdminModal title={title} subtitle={subtitle ?? "Chi tiết minh họa"} onClose={onClose} maxWidth="lg">
    {facts && <Facts facts={facts} />}{children}
    <p className="wf-note" style={{ marginTop: 20 }}>Thông tin và thao tác trong hộp thoại chỉ để minh họa luồng quản trị.</p>
  </AdminModal>;
}

const transactions = [
  ["GD-250824-031", "DH-07124", "Nguyễn Minh Anh", money(1450000), "VNPay", "Thành công", "24/08/2025 14:32"],
  ["GD-250824-030", "DH-07123", "Trần Gia Bảo", money(890000), "MoMo", "Chờ đối soát", "24/08/2025 13:08"],
  ["GD-250824-029", "DH-07122", "Lê Hà Linh", money(2200000), "Thẻ quốc tế", "Thất bại", "24/08/2025 11:46"],
];

export function PaymentTransactionsPreview() {
  const [status, setStatus] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [detail, setDetail] = useState<string[] | null>(null);
  const rows = transactions.filter((row) => (status === "Tất cả" || row[5] === status) && (!date || row[6].split(" ")[0].split("/").reverse().join("-") === date) && row.join(" ").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  return <PreviewPage title="Giao dịch thanh toán" description="Tra cứu trạng thái, phương thức và đối soát từng giao dịch.">
    <div className="wf-metrics"><div className="wf-metric"><span>Tổng giá trị giao dịch</span><strong>{money(4540000)}</strong><small>3 giao dịch minh họa</small></div><div className="wf-metric"><span>Thành công</span><strong>{money(1450000)}</strong><small>1 giao dịch</small></div><div className="wf-metric"><span>Cần đối soát</span><strong>{money(890000)}</strong><small>1 giao dịch</small></div></div>
    <PreviewPanel title="Sổ giao dịch" description="Chọn mã giao dịch để xem dòng thời gian thanh toán.">
      <div className="wf-toolbar"><label className="wf-field">Tìm mã, đơn hàng hoặc người mua<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ GD-250824-031" /></label><label className="wf-field">Ngày giao dịch<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      <div className="wf-tabs" role="tablist" aria-label="Trạng thái giao dịch">{["Tất cả", "Thành công", "Chờ đối soát", "Thất bại"].map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} className="wf-tab" onClick={() => setStatus(item)}>{item}</button>)}</div>
      <PreviewTable columns={["Mã giao dịch", "Đơn hàng", "Người mua", "Số tiền", "Phương thức", "Trạng thái", "Thời gian"]} rows={rows} onSelect={setDetail} />
    </PreviewPanel>
    {detail && <SampleModal title={detail[0]} subtitle="Hành trình thanh toán minh họa" onClose={() => setDetail(null)} facts={[["Đơn hàng", detail[1]], ["Người mua", detail[2]], ["Số tiền", detail[3]], ["Cổng", detail[4]], ["Trạng thái", detail[5]]]}><ol className="wf-timeline"><li>Tạo yêu cầu thanh toán</li><li>Chuyển tới cổng {detail[4]}</li><li>Nhận trạng thái: {detail[5]}</li></ol></SampleModal>}
  </PreviewPage>;
}

const refunds = [
  { id: "HT-0042", order: "DH-07124", buyer: "Nguyễn Minh Anh", amount: 1450000, reason: "Sự kiện đổi lịch", status: "Cần xem xét", proof: "Email thông báo đổi lịch • 1 tệp" },
  { id: "HT-0041", order: "DH-07098", buyer: "Phạm Quốc Huy", amount: 690000, reason: "Thanh toán trùng", status: "Chờ bổ sung", proof: "Ảnh sao kê • 2 tệp" },
  { id: "HT-0040", order: "DH-07036", buyer: "Vũ Thu Trang", amount: 1200000, reason: "Không thể tham dự", status: "Đã duyệt", proof: "Lời giải trình • 1 tệp" },
];

export function RefundsPreview() {
  const [selected, setSelected] = useState(refunds[0]);
  const [step, setStep] = useState<"review" | "decision">("review");
  return <PreviewPage title="Yêu cầu hoàn tiền" description="Hàng chờ xem xét, hồ sơ chứng minh và bước ra quyết định.">
    <div className="wf-split">
      <PreviewPanel title="Hàng chờ yêu cầu" description="Chọn một hồ sơ để xem chi tiết."><div className="wf-list">{refunds.map((item) => <button key={item.id} type="button" className="wf-list-button" aria-current={selected.id === item.id} onClick={() => { setSelected(item); setStep("review"); }}><span><strong>{item.id} · {item.buyer}</strong><small>{item.reason} · {item.order}</small></span><span className="wf-chip">{item.status}</span></button>)}</div></PreviewPanel>
      <PreviewPanel title={`Hồ sơ ${selected.id}`} description="Bố cục kiểm tra trước khi xử lý.">
        <Facts facts={[["Đơn hàng", selected.order], ["Người mua", selected.buyer], ["Giá trị yêu cầu", money(selected.amount)], ["Lý do", selected.reason], ["Trạng thái", selected.status], ["Minh chứng", selected.proof]]} />
        <div className="wf-actions"><PreviewButton onClick={() => setStep("decision")}>Xem bước phê duyệt</PreviewButton><PreviewButton secondary onClick={() => setStep("decision")}>Yêu cầu bổ sung</PreviewButton></div>
      </PreviewPanel>
    </div>
    {step === "decision" && <SampleModal title={`Quyết định cho ${selected.id}`} subtitle="Màn hình phê duyệt minh họa" onClose={() => setStep("review")} facts={[["Giá trị", money(selected.amount)], ["Lý do", selected.reason]]}><label className="wf-field">Ghi chú đánh giá<textarea placeholder="Nêu căn cứ chấp thuận, từ chối hoặc yêu cầu bổ sung" /></label><div className="wf-actions" style={{ marginTop: 16 }}><PreviewButton>Phê duyệt</PreviewButton><PreviewButton secondary>Từ chối</PreviewButton></div></SampleModal>}
  </PreviewPage>;
}

const statements = [
  ["SK-2408-12", "Lễ hội Âm nhạc Mùa Hè", "Công ty Sao Mai", money(428000000), money(385200000), "Chờ thanh toán"],
  ["SK-2408-09", "Đêm Jazz Bên Sông", "Blue Note Events", money(126000000), money(113400000), "Đã thanh toán"],
  ["SK-2408-05", "Sân khấu Kịch Tháng Tám", "Nhà hát Mới", money(97000000), money(87300000), "Chờ thanh toán"],
];

export function OrganizerSettlementsPreview() {
  const [event, setEvent] = useState("Tất cả sự kiện");
  const [period, setPeriod] = useState("Tháng 8/2025");
  const [statement, setStatement] = useState<string[] | null>(null);
  const rows = event === "Tất cả sự kiện" ? statements : statements.filter((row) => row[1] === event);
  return <PreviewPage title="Đối soát ban tổ chức" description="Tổng hợp doanh thu theo kỳ và xem bản kê chi trả.">
    <PreviewPanel title="Kỳ đối soát" description="Bộ lọc dùng dữ liệu minh họa trong trang."><div className="wf-toolbar"><label className="wf-field">Kỳ<select value={period} onChange={(e) => setPeriod(e.target.value)}><option>Tháng 8/2025</option><option>Tháng 7/2025</option></select></label><label className="wf-field">Sự kiện<select value={event} onChange={(e) => setEvent(e.target.value)}><option>Tất cả sự kiện</option>{statements.map((row) => <option key={row[0]}>{row[1]}</option>)}</select></label></div></PreviewPanel>
    <div className="wf-metrics"><div className="wf-metric"><span>Doanh thu vé</span><strong>{money(651000000)}</strong><small>{period}</small></div><div className="wf-metric"><span>Dự kiến chi trả</span><strong>{money(585900000)}</strong><small>Sau phí minh họa</small></div><div className="wf-metric"><span>Đang chờ</span><strong>{money(472500000)}</strong><small>2 bản kê</small></div></div>
    <PreviewPanel title="Bản kê theo sự kiện" description="Chọn mã bản kê để xem cấu trúc chi tiết."><PreviewTable columns={["Mã bản kê", "Sự kiện", "Ban tổ chức", "Doanh thu", "Dự kiến chi trả", "Trạng thái"]} rows={rows} onSelect={setStatement} /></PreviewPanel>
    {statement && <SampleModal title={`Bản kê ${statement[0]}`} subtitle={statement[1]} onClose={() => setStatement(null)} facts={[["Ban tổ chức", statement[2]], ["Doanh thu vé", statement[3]], ["Dự kiến chi trả", statement[4]], ["Trạng thái", statement[5]]]}><p className="wf-copy">Các dòng phí nền tảng, hoàn tiền và điều chỉnh sẽ nằm trong bản kê thật. Số liệu ở đây chỉ minh họa bố cục.</p><PreviewButton secondary>Xem bản kê chi tiết</PreviewButton></SampleModal>}
  </PreviewPage>;
}

const listings = [
  ["VE-8842", "Lễ hội Âm nhạc Mùa Hè", "Nguyễn Tuấn", money(1200000), money(1320000), "+10%", "Đang bán"],
  ["VE-8841", "Đêm Jazz Bên Sông", "Trần Hà", money(850000), money(850000), "0%", "Đã bán"],
  ["VE-8838", "Lễ hội Âm nhạc Mùa Hè", "Phạm Thảo", money(1200000), money(1440000), "+20%", "Cần xem xét"],
];

export function ResaleTicketsPreview() {
  const [status, setStatus] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [listing, setListing] = useState<string[] | null>(null);
  const rows = listings.filter((row) => (status === "Tất cả" || row[6] === status) && row.join(" ").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  return <PreviewPage title="Vé bán lại" description="Theo dõi niêm yết, giá gốc và mức chênh lệch theo từng vé.">
    <PreviewPanel title="Bộ lọc kho vé" description="Tìm theo mã vé, sự kiện hoặc người bán."><div className="wf-toolbar"><label className="wf-field">Tìm kiếm<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mã vé, sự kiện, người bán" /></label><label className="wf-field">Trạng thái<select value={status} onChange={(e) => setStatus(e.target.value)}><option>Tất cả</option><option>Đang bán</option><option>Đã bán</option><option>Cần xem xét</option></select></label></div></PreviewPanel>
    <PreviewPanel title="Danh sách niêm yết" description="Giá trần cần được đối chiếu với chính sách của sự kiện."><PreviewTable columns={["Mã vé", "Sự kiện", "Người bán", "Giá gốc", "Giá hiện tại", "Chênh lệch", "Trạng thái"]} rows={rows} onSelect={setListing} /></PreviewPanel>
    {listing && <SampleModal title={`Vé ${listing[0]}`} subtitle="Chi tiết niêm yết minh họa" onClose={() => setListing(null)} facts={[["Sự kiện", listing[1]], ["Người bán", listing[2]], ["Giá gốc", listing[3]], ["Giá niêm yết", listing[4]], ["Chênh lệch", listing[5]], ["Trạng thái", listing[6]]]}><PreviewButton secondary>Xem lịch sử niêm yết</PreviewButton></SampleModal>}
  </PreviewPage>;
}

export function PricePolicyPreview() {
  const [event, setEvent] = useState("Lễ hội Âm nhạc Mùa Hè");
  const [cap, setCap] = useState(15);
  const [base, setBase] = useState(1200000);
  const [explain, setExplain] = useState(false);
  const safeCap = Math.max(0, Math.min(100, Number.isFinite(cap) ? cap : 0));
  const safeBase = Math.max(0, Number.isFinite(base) ? base : 0);
  return <PreviewPage title="Chính sách giá bán lại" description="Phác thảo quy tắc giá theo sự kiện và tác động lên vé mẫu.">
    <div className="wf-split"><PreviewPanel title="Thiết lập theo sự kiện" description="Các giá trị bên dưới chỉ thay đổi bản tính thử trong trình duyệt.">
      <div className="wf-stack"><label className="wf-field">Sự kiện<select value={event} onChange={(e) => setEvent(e.target.value)}><option>Lễ hội Âm nhạc Mùa Hè</option><option>Đêm Jazz Bên Sông</option></select></label><label className="wf-field">Mức cộng tối đa so với giá gốc (%)<input type="number" min="0" max="100" value={cap} onChange={(e) => setCap(Number(e.target.value))} /></label><label className="wf-field">Hạng vé áp dụng<select><option>Tất cả hạng vé</option><option>Phổ thông</option><option>VIP</option></select></label><label className="wf-field">Giá vé mẫu (₫)<input type="number" min="0" step="10000" value={base} onChange={(e) => setBase(Number(e.target.value))} /></label><div className="wf-actions"><PreviewButton onClick={() => setExplain(true)}>Xem bước lưu chính sách</PreviewButton></div></div>
    </PreviewPanel><PreviewPanel title="Tính thử giá trần" description={event}><Facts facts={[["Giá gốc mẫu", money(safeBase)], ["Mức cộng tối đa", `${safeCap}%`], ["Giá niêm yết tối đa", money(Math.round(safeBase * (1 + safeCap / 100)))]]} /><p className="wf-note">Mỗi sự kiện có chính sách riêng. Đây là phép tính minh họa, chưa xác nhận quy tắc trên máy chủ.</p></PreviewPanel></div>
    {explain && <SampleModal title="Xác nhận chính sách giá" subtitle="Bước lưu minh họa" onClose={() => setExplain(false)} facts={[["Sự kiện", event], ["Mức cộng", `${safeCap}%`], ["Giá trần mẫu", money(Math.round(safeBase * (1 + safeCap / 100)))]]}><p className="wf-copy">Bước triển khai thực tế sẽ kiểm tra quyền, phiên bản chính sách và ảnh hưởng đến các niêm yết hiện có trước khi lưu.</p></SampleModal>}
  </PreviewPage>;
}

const disputes = [
  { id: "TC-023", order: "DH-07122", category: "Bị trừ tiền, chưa có vé", priority: "Cao", status: "Đang xác minh", evidence: "Biên lai ngân hàng, email xác nhận" },
  { id: "TC-022", order: "DH-07091", category: "Sai số tiền hoàn", priority: "Trung bình", status: "Chờ phản hồi", evidence: "Ảnh sao kê, yêu cầu hoàn" },
  { id: "TC-021", order: "DH-07018", category: "Vé bán lại không hợp lệ", priority: "Cao", status: "Mới tiếp nhận", evidence: "Mã QR, lịch sử niêm yết" },
];

export function TransactionDisputesPreview() {
  const [selected, setSelected] = useState(disputes[0]);
  const [resolution, setResolution] = useState(false);
  return <PreviewPage title="Tranh chấp giao dịch" description="Ưu tiên hồ sơ, bằng chứng và dòng thời gian xử lý.">
    <div className="wf-split"><PreviewPanel title="Hàng chờ tranh chấp" description="Chọn hồ sơ cần kiểm tra."><div className="wf-list">{disputes.map((item) => <button key={item.id} type="button" className="wf-list-button" aria-current={selected.id === item.id} onClick={() => setSelected(item)}><span><strong>{item.id} · {item.category}</strong><small>{item.order} · {item.status}</small></span><span className="wf-chip">{item.priority}</span></button>)}</div></PreviewPanel><div className="wf-stack"><PreviewPanel title={`Hồ sơ ${selected.id}`} description="Đối chiếu trước khi kết luận."><Facts facts={[["Đơn hàng", selected.order], ["Vấn đề", selected.category], ["Ưu tiên", selected.priority], ["Trạng thái", selected.status], ["Bằng chứng", selected.evidence]]} /><PreviewButton onClick={() => setResolution(true)}>Xem bước giải quyết</PreviewButton></PreviewPanel><PreviewPanel title="Dòng thời gian" description="Các mốc xử lý trong hồ sơ mẫu."><ol className="wf-timeline"><li>Khách hàng gửi tranh chấp</li><li>Thu thập chứng từ giao dịch</li><li>Đối chiếu với cổng thanh toán</li><li>Gửi kết quả và lưu lịch sử</li></ol></PreviewPanel></div></div>
    {resolution && <SampleModal title={`Giải quyết ${selected.id}`} subtitle="Biên bản xử lý minh họa" onClose={() => setResolution(false)} facts={[["Vấn đề", selected.category], ["Bằng chứng", selected.evidence]]}><label className="wf-field">Kết luận dự kiến<select><option>Cần xác minh thêm</option><option>Chấp thuận yêu cầu</option><option>Không chấp thuận</option></select></label><label className="wf-field" style={{ marginTop: 14 }}>Căn cứ xử lý<textarea placeholder="Tóm tắt đối chiếu và các chứng từ" /></label><div className="wf-actions" style={{ marginTop: 16 }}><PreviewButton>Xem biên bản dự thảo</PreviewButton></div></SampleModal>}
  </PreviewPage>;
}
