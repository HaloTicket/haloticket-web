import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FiArrowDown, FiArrowUp, FiCalendar, FiChevronRight, FiEdit2, FiImage, FiPlus, FiSearch, FiSend } from "react-icons/fi";

import { AdminModal } from "@/components/admin/AdminModal";
import { PreviewPage, PreviewPanel, PreviewTable } from "./WireframePrimitives";

const field = "min-h-11 w-full rounded-xl border app-border app-bg-card px-3 text-sm app-text-main outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border app-border app-bg-card px-4 text-sm font-semibold app-text-main hover:app-bg-subnav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border app-border px-2.5 py-1 text-xs font-semibold app-text-muted">{children}</span>;
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 app-text-muted">{children}</p>;
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-semibold app-text-main">{children}</span>;
}

const initialBlocks = [
  { id: "hero", title: "Banner chính", detail: "Thông điệp nổi bật và sự kiện tiêu điểm", kind: "Hero" },
  { id: "featured", title: "Sự kiện nổi bật", detail: "Tuyển chọn do biên tập viên quản lý", kind: "Bộ sưu tập" },
  { id: "weekend", title: "Cuối tuần này", detail: "Sự kiện theo thời gian và địa điểm", kind: "Danh sách" },
  { id: "resale", title: "Vé bán lại", detail: "Vé đang được niêm yết", kind: "Danh sách" },
];

export function HomepageContentPreview() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selected, setSelected] = useState("hero");
  const [notice, setNotice] = useState("");
  const move = (index: number, direction: number) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    setNotice("Thứ tự chỉ thay đổi trong bản xem trước.");
  };
  return <PreviewPage title="Nội dung trang chủ" description="Sắp xếp các vùng nội dung và kiểm tra bố cục cửa hàng trước khi xuất bản.">
    <div className="grid gap-5 xl:grid-cols-[minmax(310px,0.85fr)_minmax(0,1.15fr)]">
      <PreviewPanel title="Thứ tự hiển thị" description="Chọn một vùng để xem vị trí tương ứng trong bản dựng.">
        <div className="space-y-2">
          {blocks.map((block, index) => <div key={block.id} className={`flex items-center gap-3 rounded-xl border p-3 ${selected === block.id ? "border-blue-500 app-bg-subnav" : "app-border"}`}>
            <button type="button" onClick={() => setSelected(block.id)} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-blue-500" aria-pressed={selected === block.id}>
              <span className="block text-sm font-semibold app-text-main">{String(index + 1).padStart(2, "0")} · {block.title}</span>
              <span className="block text-xs app-text-muted">{block.detail}</span>
            </button>
            <div className="flex shrink-0 gap-1">
              <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg border app-border" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Đưa ${block.title} lên`}><FiArrowUp /></button>
              <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg border app-border" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label={`Đưa ${block.title} xuống`}><FiArrowDown /></button>
            </div>
          </div>)}
        </div>
        {notice && <Hint>{notice}</Hint>}
      </PreviewPanel>
      <PreviewPanel title="Bản dựng trang chủ" description="Sơ đồ cấu trúc trên máy tính. Nội dung và hình ảnh là vị trí minh họa.">
        <div className="overflow-hidden rounded-xl border app-border">
          <div className="flex items-center justify-between border-b app-border app-bg-subnav px-4 py-3 text-xs font-semibold app-text-muted"><span>HALOTICKET · KHÁM PHÁ</span><Badge>WIREFRAME</Badge></div>
          <div className="space-y-2 p-3 sm:p-4">
            {blocks.map((block) => <button key={block.id} type="button" onClick={() => setSelected(block.id)} className={`block w-full rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-blue-500 ${selected === block.id ? "border-blue-500 app-bg-subnav" : "app-border"}`}>
              <span className="text-xs font-semibold app-text-muted">{block.kind}</span>
              <span className="mt-1 block text-sm font-semibold app-text-main">{block.title}</span>
              {block.id === "hero" ? <span className="mt-3 grid min-h-28 place-items-center rounded-lg border border-dashed app-border app-text-muted"><FiImage className="mr-2 inline" />Vị trí ảnh và lời kêu gọi hành động</span> : <span className="mt-3 grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <span key={item} className="h-14 rounded-lg border border-dashed app-border app-bg-subnav" />)}</span>}
            </button>)}
          </div>
        </div>
      </PreviewPanel>
    </div>
  </PreviewPage>;
}

type Category = { name: string; parent: string; slug: string; count: string };
const startingCategories: Category[] = [
  { name: "Âm nhạc", parent: "Gốc", slug: "am-nhac", count: "12" },
  { name: "Nhạc sống", parent: "Âm nhạc", slug: "nhac-song", count: "5" },
  { name: "Sân khấu", parent: "Gốc", slug: "san-khau", count: "8" },
  { name: "Thể thao", parent: "Gốc", slug: "the-thao", count: "4" },
];

export function EventCategoriesPreview() {
  const [categories, setCategories] = useState(startingCategories);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Âm nhạc");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("Gốc");
  const [notice, setNotice] = useState("");
  const current = categories.find((category) => category.name === selected);
  const visible = categories.filter((category) => `${category.name} ${category.parent}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const openEdit = (category?: Category) => { setSelected(category?.name ?? ""); setName(category?.name ?? ""); setParent(category?.parent ?? "Gốc"); setEditing(true); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const next = { name: clean, parent, slug: clean.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), count: current?.count ?? "0" };
    setCategories((items) => current ? items.map((item) => item.name === current.name ? next : item) : [...items, next]);
    setSelected(clean);
    setEditing(false);
    setNotice("Danh mục chỉ được cập nhật trong bản xem trước.");
  };
  return <PreviewPage title="Danh mục sự kiện" description="Tìm, xem cấu trúc cha con và phác thảo thao tác quản lý danh mục.">
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
      <PreviewPanel title="Cây danh mục"><nav aria-label="Cây danh mục" className="space-y-1">
        {categories.filter((item) => item.parent === "Gốc").map((item) => <div key={item.name}><button type="button" className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${selected === item.name ? "app-bg-subnav font-semibold app-text-main" : "app-text-muted"}`} onClick={() => setSelected(item.name)}><FiChevronRight aria-hidden="true" />{item.name}</button>
          {categories.filter((child) => child.parent === item.name).map((child) => <button key={child.name} type="button" className={`ml-6 min-h-11 w-[calc(100%-1.5rem)] rounded-lg px-2 text-left text-sm ${selected === child.name ? "app-bg-subnav font-semibold app-text-main" : "app-text-muted"}`} onClick={() => setSelected(child.name)}>{child.name}</button>)}
        </div>)}
      </nav></PreviewPanel>
      <PreviewPanel title="Danh sách danh mục"><div className="mb-4 flex flex-wrap gap-2"><label className="flex min-h-11 min-w-48 flex-1 items-center gap-2 rounded-xl border app-border px-3"><FiSearch className="app-text-muted" /><input aria-label="Tìm danh mục" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm danh mục" className="min-w-0 flex-1 bg-transparent text-sm outline-none app-text-main" /></label><button type="button" className={primary} onClick={() => openEdit()}><FiPlus />Thêm danh mục</button></div>
        {visible.length ? <PreviewTable columns={["Tên", "Danh mục cha", "Đường dẫn", "Sự kiện mẫu"]} rows={visible.map((item) => [item.name, item.parent, item.slug, item.count])} onSelect={(row) => setSelected(row[0])} /> : <p className="py-8 text-center text-sm app-text-muted">Không có danh mục phù hợp.</p>}
      </PreviewPanel>
      <PreviewPanel title="Chi tiết"><div className="space-y-4 text-sm">
        {current ? <><div><Hint>Tên danh mục</Hint><p className="font-semibold app-text-main">{current.name}</p></div><div><Hint>Danh mục cha</Hint><p className="app-text-main">{current.parent}</p></div><div><Hint>Đường dẫn xem trước</Hint><p className="break-all app-text-main">/{current.slug}</p></div><button type="button" className={button} onClick={() => openEdit(current)}><FiEdit2 />Chỉnh sửa</button></> : <Hint>Chọn một danh mục để xem chi tiết.</Hint>}
        {notice && <Hint>{notice}</Hint>}
      </div></PreviewPanel>
    </div>
    {editing && <AdminModal title={current ? "Sửa danh mục" : "Thêm danh mục"} subtitle="Thay đổi này chỉ tồn tại trong bản xem trước." onClose={() => setEditing(false)} maxWidth="md"><form onSubmit={submit} className="space-y-4"><label className="block"><Label>Tên danh mục</Label><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className={field} /></label><label className="block"><Label>Danh mục cha</Label><select value={parent} onChange={(event) => setParent(event.target.value)} className={field}><option value="Gốc">Gốc</option>{categories.filter((item) => item.parent === "Gốc" && item.name !== selected).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setEditing(false)}>Hủy</button><button type="submit" className={primary}>Lưu bản xem trước</button></div></form></AdminModal>}
  </PreviewPage>;
}

const bannerSamples = [
  { title: "Điểm nhấn mùa hè", slot: "Hero trang chủ", period: "01/06 - 30/06", state: "Bản nháp" },
  { title: "Khám phá cuối tuần", slot: "Giữa trang chủ", period: "10/06 - 24/06", state: "Đã lên lịch" },
  { title: "Nghệ thuật thành phố", slot: "Trang khám phá", period: "20/06 - 30/06", state: "Bản nháp" },
];

export function AdvertisingBannersPreview() {
  const [selected, setSelected] = useState(bannerSamples[0].title);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  return <PreviewPage title="Banner quảng cáo" description="Xem vị trí, lịch hiển thị và phác thảo một chiến dịch trước khi kết nối hệ thống xuất bản.">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <div className="space-y-5"><PreviewPanel title="Vị trí quảng cáo"><div className="grid gap-3 sm:grid-cols-3">{["Hero trang chủ", "Giữa trang chủ", "Trang khám phá"].map((slot) => <button type="button" key={slot} onClick={() => setSelected(bannerSamples.find((item) => item.slot === slot)?.title ?? selected)} className="min-h-32 rounded-xl border border-dashed app-border p-4 text-left"><FiImage className="mb-4 app-text-muted" /><span className="block text-sm font-semibold app-text-main">{slot}</span><Hint>Khu vực hình ảnh</Hint></button>)}</div></PreviewPanel>
        <PreviewPanel title="Danh sách chiến dịch"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Hint>Chọn một hàng để xem lịch và vị trí.</Hint><button type="button" className={primary} onClick={() => setCreating(true)}><FiPlus />Tạo banner</button></div><PreviewTable columns={["Chiến dịch", "Vị trí", "Thời gian", "Trạng thái"]} rows={bannerSamples.map((item) => [item.title, item.slot, item.period, item.state])} onSelect={(row) => setSelected(row[0])} /></PreviewPanel></div>
      <PreviewPanel title="Lịch và bản xem trước"><div className="space-y-4"><div className="flex items-center gap-2 text-sm font-semibold app-text-main"><FiCalendar />Lịch tháng 6 · minh họa</div><div className="grid grid-cols-7 gap-1 text-center text-xs app-text-muted">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}{Array.from({ length: 28 }, (_, index) => <span key={index} className={`grid min-h-9 place-items-center rounded-lg ${index > 8 && index < 24 ? "app-bg-subnav app-text-main" : ""}`}>{index + 1}</span>)}</div><div className="rounded-xl border border-dashed app-border p-5"><div className="grid min-h-36 place-items-center rounded-lg app-bg-subnav app-text-muted"><FiImage size={28} aria-hidden="true" /></div><p className="mt-3 text-sm font-semibold app-text-main">{selected}</p><Hint>{bannerSamples.find((item) => item.title === selected)?.slot} · ảnh chỉ là vị trí minh họa</Hint></div>{notice && <Hint>{notice}</Hint>}</div></PreviewPanel>
    </div>
    {creating && <AdminModal title="Tạo banner · bản xem trước" subtitle="Chưa có dịch vụ tải ảnh hoặc xuất bản." onClose={() => setCreating(false)} maxWidth="lg"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setCreating(false); setNotice("Bản nháp minh họa đã được nhập. Chưa tải ảnh hoặc lưu chiến dịch."); }}><label className="block"><Label>Tên chiến dịch</Label><input required className={field} placeholder="Ví dụ: Điểm nhấn tháng 7" /></label><label className="block"><Label>Vị trí</Label><select className={field}>{["Hero trang chủ", "Giữa trang chủ", "Trang khám phá"].map((slot) => <option key={slot}>{slot}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label><Label>Ngày bắt đầu</Label><input required type="date" className={field} /></label><label><Label>Ngày kết thúc</Label><input required type="date" className={field} /></label></div><label className="block"><Label>Lời kêu gọi hành động</Label><input className={field} placeholder="Khám phá sự kiện" /></label><div className="rounded-xl border border-dashed app-border p-4 text-sm app-text-muted"><FiImage className="mr-2 inline" />Vị trí tải ảnh khi có dịch vụ lưu trữ</div><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setCreating(false)}>Hủy</button><button type="submit" className={primary}>Xem bản nháp</button></div></form></AdminModal>}
  </PreviewPage>;
}

type ChatMessage = { role: "admin" | "demo"; content: string };
export function AiAssistantPreview() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const ask = (question: string) => { if (!question.trim()) return; setMessages((items) => [...items, { role: "admin", content: question.trim() }, { role: "demo", content: "Câu trả lời minh họa: trợ lý sẽ tóm tắt dữ liệu trong phạm vi được cấp quyền, nêu nguồn từng nhận định và gợi ý bước tiếp theo. Chưa có mô hình hoặc nguồn dữ liệu được kết nối." }]); setDraft(""); };
  return <PreviewPage title="Trợ lý AI" description="Không gian đặt câu hỏi về vận hành; câu trả lời trong màn hình này chỉ là bản minh họa.">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><PreviewPanel title="Hội thoại" description="Đặt câu hỏi và xem bố cục phản hồi dự kiến."><div className="space-y-4"><div className="flex flex-wrap gap-2">{["Tóm tắt đơn hàng hôm nay", "Sự kiện nào cần theo dõi?", "Giải thích xu hướng hoàn tiền"].map((prompt) => <button key={prompt} type="button" className={button} onClick={() => ask(prompt)}>{prompt}</button>)}</div><div aria-live="polite" className="min-h-72 space-y-3 rounded-xl border app-border app-bg-subnav p-4">{messages.length ? messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-xl border app-border app-bg-card p-3 text-sm ${message.role === "admin" ? "ml-auto" : ""}`}><p className="mb-1 text-xs font-semibold app-text-muted">{message.role === "admin" ? "Bạn" : "DEMO · phản hồi minh họa"}</p><p className="app-text-main">{message.content}</p>{message.role === "demo" && <p className="mt-2 text-xs app-text-muted">Nguồn: chưa kết nối · Cần xác minh trước khi hành động</p>}</div>) : <div className="grid min-h-64 place-items-center text-center text-sm app-text-muted">Chọn một câu hỏi gợi ý hoặc nhập câu hỏi của bạn.</div>}</div><form onSubmit={(event) => { event.preventDefault(); ask(draft); }} className="flex gap-2"><input aria-label="Nhập câu hỏi cho trợ lý" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Đặt câu hỏi về hoạt động..." className={field} /><button type="submit" className={primary} aria-label="Gửi câu hỏi"><FiSend /></button></form></div></PreviewPanel>
      <PreviewPanel title="Phạm vi và nguồn"><div className="space-y-5"><div><Label>Phạm vi câu hỏi</Label><select className={field} defaultValue="Vận hành sự kiện"><option>Vận hành sự kiện</option><option>Đơn hàng</option><option>Người dùng</option></select></div><div><Label>Nguồn dự kiến</Label><Hint>Báo cáo quản trị và dữ liệu được cấp quyền. Màn hình này chưa truy vấn dữ liệu thật.</Hint></div><div className="rounded-xl border app-border p-4"><p className="text-sm font-semibold app-text-main">Hành động cần phê duyệt</p><Hint>Hoàn tiền, khóa tài khoản, thay đổi quyền và xuất bản nội dung luôn cần người quản trị kiểm tra và xác nhận trong quy trình riêng.</Hint></div></div></PreviewPanel>
    </div>
  </PreviewPage>;
}

const anomalySamples = [
  { id: "AN-101", subject: "Đơn hàng trùng thông tin", severity: "Cao", signal: "Hai đơn minh họa dùng cùng email trong khoảng ngắn", status: "Chờ xem xét" },
  { id: "AN-102", subject: "Lượng hoàn tiền thay đổi", severity: "Trung bình", signal: "Tỷ lệ trong tập dữ liệu mẫu tăng so với tuần trước", status: "Đang xem xét" },
  { id: "AN-103", subject: "Lượt đặt vé bất thường", severity: "Thấp", signal: "Số lượt đặt mẫu tăng trong một khung giờ", status: "Chờ xem xét" },
];
export function AiAnomaliesPreview() {
  const [severity, setSeverity] = useState("Tất cả");
  const [selected, setSelected] = useState(anomalySamples[0].id);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const current = anomalySamples.find((item) => item.id === selected) ?? anomalySamples[0];
  const visible = anomalySamples.filter((item) => severity === "Tất cả" || item.severity === severity);
  return <PreviewPage title="Theo dõi bất thường" description="Hàng đợi tình huống minh họa để thiết kế quy trình giải thích và xem xét thủ công.">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><PreviewPanel title="Hàng đợi xem xét"><div className="mb-4 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold app-text-main" htmlFor="severity-filter">Mức độ</label><select id="severity-filter" className={`${field} sm:w-48`} value={severity} onChange={(event) => setSeverity(event.target.value)}>{["Tất cả", "Cao", "Trung bình", "Thấp"].map((value) => <option key={value}>{value}</option>)}</select><Badge>DEMO DATA</Badge></div><PreviewTable columns={["Mã", "Tín hiệu", "Mức độ", "Trạng thái"]} rows={visible.map((item) => [item.id, item.subject, item.severity, reviewed.includes(item.id) ? "Đã xem trong bản mẫu" : item.status])} onSelect={(row) => setSelected(row[0])} /></PreviewPanel>
      <PreviewPanel title="Giải thích và bằng chứng"><div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Badge>{current.id}</Badge><Badge>{current.severity}</Badge></div><h3 className="text-base font-bold app-text-main">{current.subject}</h3><div><Label>Tín hiệu trong dữ liệu mẫu</Label><p className="text-sm app-text-main">{current.signal}</p></div><div><Label>Bằng chứng cần kiểm tra</Label><ul className="list-inside list-disc space-y-2 text-sm app-text-muted"><li>Chuỗi sự kiện và thời gian liên quan</li><li>Giao dịch gốc có thể đối chiếu</li><li>Quy tắc phát hiện và giới hạn của dữ liệu</li></ul></div><Hint>Không có dự đoán gian lận hoặc kết luận tự động trên màn hình này.</Hint><button type="button" className={button} onClick={() => setReviewed((items) => items.includes(current.id) ? items : [...items, current.id])}>Đánh dấu đã xem · bản mẫu</button></div></PreviewPanel>
    </div>
  </PreviewPage>;
}

export function AiAnalyticsPreview() {
  const [scope, setScope] = useState("Đơn hàng");
  const [period, setPeriod] = useState("30 ngày");
  const [question, setQuestion] = useState("Doanh thu thay đổi theo tuần như thế nào?");
  const [applied, setApplied] = useState("");
  return <PreviewPage title="Phân tích AI" description="Phác thảo câu hỏi, phạm vi dữ liệu, biểu đồ và nguồn cần kiểm chứng.">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-5"><PreviewPanel title="Tạo câu hỏi"><form onSubmit={(event) => { event.preventDefault(); setApplied(question.trim()); }} className="space-y-4"><label className="block"><Label>Câu hỏi phân tích</Label><input value={question} onChange={(event) => setQuestion(event.target.value)} className={field} /></label><div className="grid gap-3 sm:grid-cols-2"><label><Label>Phạm vi</Label><select value={scope} onChange={(event) => setScope(event.target.value)} className={field}><option>Đơn hàng</option><option>Sự kiện</option><option>Vé bán lại</option></select></label><label><Label>Khoảng thời gian</Label><select value={period} onChange={(event) => setPeriod(event.target.value)} className={field}><option>7 ngày</option><option>30 ngày</option><option>90 ngày</option></select></label></div><button type="submit" className={primary}>Xem bố cục phân tích</button></form></PreviewPanel><PreviewPanel title="Biểu đồ dự kiến" description="Cột minh họa bố cục; không phản ánh số liệu thực."><div className="flex min-h-52 items-end gap-3 border-b app-border px-3 pb-3" role="img" aria-label="Biểu đồ cột minh họa bốn tuần, không có số liệu thực">{[40, 58, 51, 72].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-24 rounded-t-lg app-bg-subnav" style={{ height: `${height * 2}px` }} /><span className="text-xs app-text-muted">Tuần {index + 1}</span></div>)}</div>{applied && <p className="mt-3 text-sm app-text-main">Câu hỏi đang xem: {applied}</p>}</PreviewPanel></div><PreviewPanel title="Diễn giải và nguồn"><div className="space-y-5"><div><Label>Thông tin cần làm rõ</Label><Hint>Phần diễn giải sẽ so sánh các giai đoạn và nêu giới hạn dữ liệu khi tích hợp phân tích.</Hint></div><div><Label>Nguồn và bộ lọc</Label><p className="text-sm app-text-main">{scope} · {period}</p><Hint>Chưa kết nối truy vấn hoặc nguồn tham chiếu.</Hint></div><div className="rounded-xl border app-border p-4"><p className="text-sm font-semibold app-text-main">Kiểm chứng trước quyết định</p><Hint>Chỉ đưa ra quyết định vận hành sau khi đối chiếu báo cáo gốc và nguồn dữ liệu.</Hint></div></div></PreviewPanel></div>
  </PreviewPage>;
}

const systemSections = [
  { id: "general", label: "Chung", description: "Thông tin và vùng hoạt động của nền tảng" },
  { id: "permissions", label: "Quyền hệ thống", description: "Vai trò và phạm vi phê duyệt" },
  { id: "notifications", label: "Thông báo", description: "Quy tắc gửi thông báo vận hành" },
  { id: "integrations", label: "Tích hợp", description: "Kết nối dịch vụ bên ngoài" },
  { id: "audit", label: "Nhật ký kiểm toán", description: "Lưu vết thay đổi bắt buộc" },
  { id: "health", label: "Tình trạng dịch vụ", description: "Nguồn giám sát và cảnh báo" },
] as const;
type SystemSection = typeof systemSections[number]["id"];

export function SystemSettingsPreview() {
  const [section, setSection] = useState<SystemSection>("general");
  const [notice, setNotice] = useState("");
  const save = (event: FormEvent) => { event.preventDefault(); setNotice("Giá trị chỉ thay đổi trong bản xem trước. Chưa gửi đến máy chủ."); };
  return <PreviewPage title="Cài đặt hệ thống" description="Bố cục quản trị cấp nền tảng, tách biệt với cài đặt tài khoản cá nhân.">
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]"><PreviewPanel title="Khu vực cài đặt"><nav aria-label="Khu vực cài đặt hệ thống" className="space-y-1">{systemSections.map((item) => <button key={item.id} type="button" onClick={() => { setSection(item.id); setNotice(""); }} aria-current={section === item.id ? "page" : undefined} className={`min-h-14 w-full rounded-xl px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-500 ${section === item.id ? "app-bg-subnav app-text-main" : "app-text-muted"}`}><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs">{item.description}</span></button>)}</nav></PreviewPanel>
      <PreviewPanel title={systemSections.find((item) => item.id === section)?.label ?? "Cài đặt"} description="Các trường dưới đây minh họa cấu trúc quản trị; không phản ánh cấu hình hiện hành."><form onSubmit={save} className="max-w-2xl space-y-5">
        {section === "general" && <><label className="block"><Label>Tên nền tảng hiển thị</Label><input className={field} defaultValue="HaloTicket" /></label><label className="block"><Label>Múi giờ mặc định</Label><select className={field} defaultValue="Asia/Ho_Chi_Minh"><option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option><option value="UTC">UTC</option></select></label><label className="block"><Label>Địa chỉ hỗ trợ</Label><input type="email" className={field} placeholder="support@example.com" /></label></>}
        {section === "permissions" && <><div className="rounded-xl border app-border p-4"><p className="text-sm font-semibold app-text-main">Vai trò quản trị</p><Hint>Quyền thật phải được kiểm tra phía máy chủ. Bản mẫu chỉ cho thấy điểm đặt chính sách.</Hint></div><label className="block"><Label>Vai trò xem báo cáo</Label><select className={field}><option>Quản trị viên và phân tích viên</option><option>Chỉ quản trị viên</option></select></label><div className="rounded-xl border app-border p-4 text-sm app-text-main">Thay đổi quyền, hoàn tiền và xuất bản luôn cần xác nhận trong quy trình tương ứng.</div></>}
        {section === "notifications" && <><label className="block"><Label>Kênh thông báo vận hành</Label><select className={field}><option>Trong ứng dụng và email</option><option>Trong ứng dụng</option></select></label><label className="block"><Label>Nhóm nhận thông báo duyệt sự kiện</Label><input className={field} defaultValue="Nhóm kiểm duyệt" /></label><Hint>Cảnh báo giao dịch và thông báo bắt buộc không thể tắt tại đây.</Hint></>}
        {section === "integrations" && <><label className="block"><Label>Dịch vụ gửi email</Label><select className={field}><option>Chưa kết nối</option><option>Nhà cung cấp được cấu hình</option></select></label><label className="block"><Label>Webhook báo cáo</Label><input className={field} type="url" placeholder="https://example.com/webhook" /></label><Hint>Trạng thái kết nối cần được tải từ nguồn thật trước khi hiển thị.</Hint></>}
        {section === "audit" && <><div className="rounded-xl border app-border p-4"><p className="text-sm font-semibold app-text-main">Nhật ký bắt buộc</p><Hint>Mọi thao tác quản trị quan trọng phải được ghi trên máy chủ. Không có điều khiển tắt nhật ký.</Hint></div><label className="block"><Label>Bộ lọc sự kiện</Label><select className={field}><option>Tất cả thay đổi</option><option>Quyền truy cập</option><option>Cấu hình</option></select></label><div className="rounded-xl border border-dashed app-border p-4 text-sm app-text-muted">Bảng nhật ký sẽ xuất hiện khi có nguồn kiểm toán được cấp quyền.</div></>}
        {section === "health" && <><div className="rounded-xl border border-dashed app-border p-5"><p className="text-sm font-semibold app-text-main">Chưa có nguồn tình trạng dịch vụ</p><Hint>Chỉ hiển thị trạng thái, thời gian kiểm tra và chỉ số khi dịch vụ giám sát trả dữ liệu thành công.</Hint></div><label className="block"><Label>Đầu mối nhận cảnh báo</Label><input className={field} placeholder="Nhóm vận hành" /></label></>}
        {notice && <p role="status" className="rounded-xl border app-border app-bg-subnav p-3 text-sm app-text-main">{notice}</p>}
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className={primary}>Lưu bản xem trước</button><Badge>WIREFRAME</Badge></div>
      </form></PreviewPanel></div>
  </PreviewPage>;
}
