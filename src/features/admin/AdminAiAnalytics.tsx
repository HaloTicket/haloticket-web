import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiCode, FiDatabase, FiLoader, FiAlertCircle, FiDownload, FiBookmark, FiPieChart, FiBarChart2, FiRefreshCw, FiChevronDown, FiChevronUp, FiMessageSquare, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { pickChartColumns } from '@/utils/chartColumns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend as RechartsLegend } from 'recharts';
import { aiApi } from '@/services/aiApi';
import type { AiAnalyzeResponse, DashboardKpis } from '@/types/ai';
import { resolveAiError, aiErrorMessage } from '@/utils/aiErrors';
import { toast } from 'sonner';
import { DashboardKpiGrid } from '@/features/admin/components/DashboardKpiGrid';
import { AttentionFeed } from '@/features/admin/components/AttentionFeed';
import { PinnedReports } from '@/features/admin/components/PinnedReports';

/** Một mục lịch sử truy vấn AI: câu hỏi, kết quả phân tích (có thể null) và thời điểm hỏi (ISO). */
interface AiQueryHistoryItem {
  id: string;
  question: string;
  result: AiAnalyzeResponse | null;
  timestamp: string;
}

/**
 * Trang phân tích dữ liệu bằng AI cho admin: nhập câu hỏi tự nhiên, nhận bảng/biểu đồ và phần phân tích kèm SQL đã kiểm tra.
 * Có thẻ KPI hệ thống, lịch sử 20 truy vấn gần nhất (lưu `localStorage`), xuất CSV và ghim báo cáo.
 */
export const AdminAiAnalytics: React.FC = () => {
  const { t: translate, i18n } = useTranslation();
  /** Chọn nhãn theo ngôn ngữ hiện tại: bản tiếng Anh khi ngôn ngữ là `en`, còn lại bản tiếng Việt. */
  const label = (vi: string, en: string) => translate(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const [history, setHistory] = useState<AiQueryHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('admin_ai_query_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [question, setQuestion] = useState(() => {
    try {
      const last = localStorage.getItem('admin_ai_last_query');
      if (last) {
        const parsed = JSON.parse(last);
        return parsed.question || '';
      }
    } catch {
      // localStorage không dùng được hoặc JSON hỏng: bắt đầu với câu hỏi rỗng
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiAnalyzeResponse | null>(() => {
    try {
      const last = localStorage.getItem('admin_ai_last_query');
      if (last) {
        const parsed = JSON.parse(last);
        return parsed.result || null;
      }
    } catch {
      // localStorage không dùng được hoặc JSON hỏng: bắt đầu khi chưa có kết quả trước đó
    }
    return null;
  });

  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [showKpis, setShowKpis] = useState(true);
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar'|'pie'|'line'|null>(null);
  const [pinning, setPinning] = useState(false);

  // thẻ KPI của hệ thống (cùng nguồn với trang tổng quan admin); nguồn lỗi hiện "không có dữ liệu", không bao giờ hiện 0
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpiState, setKpiState] = useState<'loading' | 'ready' | 'error'>('loading');
  /** Tải các chỉ số KPI hệ thống và cập nhật trạng thái `loading`, `ready` hoặc `error`. */
  const loadKpis = useCallback(async () => {
    setKpiState('loading');
    try {
      setKpis(await aiApi.getDashboardKpis());
      setKpiState('ready');
    } catch {
      setKpiState('error');
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => { void loadKpis(); });
  }, [loadKpis]);

  /**
   * Thêm truy vấn vừa chạy lên đầu lịch sử (bỏ mục trùng câu hỏi, giữ tối đa 20) và lưu vào `localStorage`.
   * @param q câu hỏi
   * @param res kết quả phân tích
   */
  const saveToHistory = (q: string, res: AiAnalyzeResponse | null) => {
    const newItem: AiQueryHistoryItem = {
      id: String(Date.now()),
      question: q.trim(),
      result: res,
      timestamp: new Date().toISOString(),
    };
    const updated = [newItem, ...history.filter(h => h.question !== q.trim())].slice(0, 20);
    setHistory(updated);
    try {
      localStorage.setItem('admin_ai_query_history', JSON.stringify(updated));
      localStorage.setItem('admin_ai_last_query', JSON.stringify(newItem));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  };

  /** Mở lại một mục lịch sử: nạp câu hỏi và kết quả của nó, xóa lỗi và ghi nhận là truy vấn gần nhất. */
  const selectHistoryItem = (item: AiQueryHistoryItem) => {
    setQuestion(item.question);
    setResult(item.result);
    setError(null);
    setChartTypeOverride(null);
    try {
      localStorage.setItem('admin_ai_last_query', JSON.stringify(item));
    } catch {
      // localStorage không dùng được hoặc hết dung lượng: lưu truy vấn gần nhất chỉ là cố gắng tối đa
    }
  };

  /** Xóa một mục khỏi lịch sử (không kích hoạt chọn mục) và cập nhật `localStorage`. */
  const removeHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('admin_ai_query_history', JSON.stringify(updated));
  };

  /** Xóa toàn bộ lịch sử và truy vấn gần nhất, đồng thời xóa câu hỏi, kết quả, lỗi đang hiển thị. */
  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('admin_ai_query_history');
    localStorage.removeItem('admin_ai_last_query');
    setQuestion('');
    setResult(null);
    setError(null);
  };

  /** Gửi câu hỏi tới AI phân tích; thành công thì lưu kết quả vào lịch sử, thất bại thì hiện thông báo lỗi phù hợp. */
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setChartTypeOverride(null);

    try {
      const response = await aiApi.analyzeData(question);
      setResult(response);
      saveToHistory(question, response);
    } catch (err: unknown) {
      console.error("AI Analytics error:", err);
      // câu hỏi bị từ chối và lỗi hệ thống cần thông báo khác nhau và hướng xử lý tiếp theo khác nhau.
      const info = resolveAiError(err);
      setError(aiErrorMessage(info));
      setErrorRetryable(info.retryable);
    } finally {
      setIsLoading(false);
    }
  };

  /** Xuất dữ liệu kết quả hiện tại ra tệp CSV và tải về; không làm gì nếu không có dòng dữ liệu. */
  const exportToCSV = () => {
    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) return;
    const columns = Object.keys(result.data[0]);
    const csvContent = [
      columns.join(","),
      ...result.data.map((row: Record<string, unknown>) => columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ai_analytics_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** Xác định loại biểu đồ admin đang xem (cùng cách chọn với `renderChart`), hoặc `table` khi không vẽ được biểu đồ. */
  const currentChartType = (rows: Record<string, unknown>[]): string => {
    if (!rows.length) return 'table';
    const columns = Object.keys(rows[0]);
    if (columns.length < 2) return 'table';
    const labelCol = columns.find(col => typeof rows[0][col] === 'string') || columns[0];
    let numCols = columns.filter(col => typeof rows[0][col] === 'number');
    if (numCols.length === 0) numCols = columns.filter(col => col !== labelCol && !isNaN(Number(rows[0][col])));
    if (numCols.length === 0) return 'table';
    return chartTypeOverride ?? ((rows.length <= 6 && numCols.length === 1) ? 'pie' : 'bar');
  };

  /** Ghim câu hỏi, câu SQL đã được kiểm tra và ảnh chụp nhỏ (tối đa 50 dòng) cho admin này; máy chủ sẽ kiểm tra lại SQL. */
  const handlePinDashboard = async () => {
    if (!result?.generated_sql || pinning) {
      if (!result?.generated_sql) toast.error(translate('ai.pin.nothing'));
      return;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    setPinning(true);
    try {
      await aiApi.createPin({
        title: question.trim().slice(0, 80) || label('Báo cáo phân tích', 'Analysis report'),
        question: question.trim(),
        sql: result.generated_sql,
        chart_type: currentChartType(rows),
        snapshot: rows.slice(0, 50),
      });
      toast.success(translate('ai.pin.success'));
    } catch (err) {
      const info = resolveAiError(err);
      toast.error(info.code === 'PIN_LIMIT' ? translate('ai.pin.limit') : translate('ai.pin.failed'), info.code === 'PIN_LIMIT' ? undefined : { description: aiErrorMessage(info) });
    } finally {
      setPinning(false);
    }
  };

  /** Xóa câu hỏi, kết quả, lỗi và truy vấn gần nhất đã lưu để bắt đầu lại. */
  const handleReset = () => {
    setQuestion('');
    setResult(null);
    setError(null);
    setChartTypeOverride(null);
    localStorage.removeItem('admin_ai_last_query');
  };

  /** Dựng bảng dữ liệu kết quả; hiện thông báo khi không có dòng nào. */
  const renderTable = (data: Record<string, unknown>[]) => {
    if (!data || data.length === 0) return <p className="text-sm app-text-muted text-center py-8">{label("Không tìm thấy dữ liệu phù hợp với yêu cầu của bạn.", "No matching data found for your request.")}</p>;

    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto no-scrollbar max-h-[28rem] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[420px]">
          <thead className="sticky top-0 app-bg-card">
            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b app-border text-[11px] font-bold app-text-muted uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2.5 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium app-text-main">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map((col) => {
                  const val = row[col];
                  const displayVal = val === null || val === undefined ? '-' : String(val);
                  return <td key={col} className="px-3 py-2 whitespace-nowrap">{displayVal}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /** Dựng biểu đồ (cột, đường hoặc tròn) từ kết quả; trả về `null` nếu không có dữ liệu hoặc không chọn được cột vẽ. */
  const renderChart = (data: Record<string, unknown>[]) => {
    if (!data || data.length === 0) return null;
    const picked = pickChartColumns(data);
    if (!picked) return null;
    const { labelCol, numCols } = picked;
    const valueCol = numCols[0];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    // Tự nhận biết loại biểu đồ nếu chưa được chọn thủ công
    let activeChartType = chartTypeOverride;
    if (!activeChartType) {
      activeChartType = (data.length <= 6 && numCols.length === 1) ? 'pie' : 'bar';
    }

    const chartData = data.map(row => ({
      ...row,
      [valueCol]: Number(row[valueCol]) || 0
    }));

    return (
      <section className="app-bg-card border app-border rounded-lg shadow-xs p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 text-xs font-bold app-text-muted uppercase tracking-wider">
            {activeChartType === 'pie' ? <FiPieChart className="w-4 h-4 text-purple-500" /> : <FiBarChart2 className="w-4 h-4 text-blue-500" />}
            <span>{label("Biểu đồ trực quan", "Visual Chart")}</span>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button onClick={() => setChartTypeOverride('bar')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'bar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Bar</button>
            <button onClick={() => setChartTypeOverride('line')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'line' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Line</button>
            <button onClick={() => setChartTypeOverride('pie')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'pie' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Pie</button>
          </div>
        </div>
        {/* chiều cao linh hoạt: câu trả lời ngắn cho biểu đồ thấp, màn hình rộng cho biểu đồ cao hơn */}
        <div className="w-full h-[clamp(14rem,32vh,24rem)]">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartType === 'pie' ? (
              <PieChart>
                <Pie data={chartData} dataKey={valueCol} nameKey={labelCol} cx="50%" cy="45%" outerRadius="70%" label={(entry: { percent?: number }) => `${Math.round((entry.percent ?? 0) * 100)}%`}>
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsLegend />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            ) : activeChartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey={labelCol} tick={{fontSize: 12}} stroke="#94a3b8" tickFormatter={(value: unknown) => { const text = String(value ?? ''); return text.length > 16 ? `${text.slice(0, 15)}…` : text; }} />
                <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey={valueCol} stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey={labelCol} tick={{fontSize: 12}} stroke="#94a3b8" tickFormatter={(value: unknown) => { const text = String(value ?? ''); return text.length > 16 ? `${text.slice(0, 15)}…` : text; }} />
                <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey={valueCol} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>
    );
  };

  const suggestions = [
    { text: label('Top 5 sự kiện có doanh thu cao nhất?', 'Top 5 events with highest revenue?'), chip: label("Top 5 sự kiện doanh thu cao", "Top 5 revenue events") },
    { text: label('Thống kê số vé bán ra theo từng thể loại', 'Tickets sold by category'), chip: label("Vé bán theo thể loại", "Tickets by category") },
    { text: label('Tổng doanh thu theo từng tháng trong năm nay', 'Total revenue by month this year'), chip: label("Doanh thu theo tháng", "Revenue by month") },
  ];

  const rows = result && Array.isArray(result.data) ? result.data : null;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4">

      {/* Tiêu đề và ô tìm kiếm trên cùng một dải */}
      <div className="app-bg-card border app-border rounded-lg shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FiDatabase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-extrabold app-text-main tracking-tight">
                {label("Phân Tích Dữ Liệu AI", "AI Data Analytics")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">(Text-to-SQL)</span>
              </h1>
              <p className="text-xs app-text-muted">
                {label("Nhập câu hỏi bằng tiếng Việt hoặc tiếng Anh, AI viết câu lệnh SQL, truy vấn cơ sở dữ liệu và trả về kết quả kèm phân tích.", "Ask in Vietnamese or English; AI writes the SQL, queries the database and returns results with insights.")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKpis(v => !v)}
              aria-expanded={showKpis}
              className="inline-flex items-center min-h-9 gap-1.5 px-3 text-xs font-semibold rounded-lg app-bg-card border app-border app-text-main hover:brightness-95 dark:hover:brightness-110 transition-colors"
            >
              {showKpis ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
              {label("Chỉ số hệ thống", "System KPIs")}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center min-h-9 gap-1.5 px-3 text-xs font-semibold rounded-lg app-bg-card border app-border app-text-main hover:brightness-95 dark:hover:brightness-110 transition-colors"
              title={label("Xóa lịch sử và làm mới trang", "Clear history and refresh page")}
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label("Làm mới", "Reset")}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 text-blue-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-[150px] min-h-12 app-bg-card border app-border rounded-lg text-sm app-text-main focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none shadow-xs"
            placeholder={label("Ví dụ: Lấy cho tôi tổng doanh thu của tất cả sự kiện...", "E.g.: Give me total revenue across all events...")}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="px-4 py-2 min-h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white text-xs font-bold rounded-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              {isLoading ? (
                <><FiLoader className="w-4 h-4 motion-safe:animate-spin" /> {label("Đang phân tích", "Analyzing")}</>
              ) : (
                <>{label("Truy vấn ngay", "Query now")}</>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium app-text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wide">{label("Gợi ý", "Try")}:</span>
          {suggestions.map(s => (
            <button key={s.text} type="button" className="cursor-pointer hover:text-blue-500 hover:border-blue-300 transition-colors px-3 py-1 rounded-full app-bg-card border app-border" onClick={() => setQuestion(s.text)}>{s.chip}</button>
          ))}
          <button
            type="button"
            onClick={() => setShowSchema(!showSchema)}
            className="ml-auto text-[11px] font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 px-3 py-1 rounded-full border app-border"
          >
            <FiDatabase className="w-3.5 h-3.5" />
            {showSchema ? label('Ẩn Cấu Trúc DB', 'Hide DB Schema') : label('Xem Cấu Trúc Bảng (Schema)', 'View Table Schema')}
          </button>
        </div>
      </div>

      {/* Thẻ KPI hệ thống */}
      {showKpis && <DashboardKpiGrid kpis={kpis} state={kpiState} onRetry={() => void loadKpis()} />}

      {/* Ngăn/bảng lược đồ dữ liệu */}
      {showSchema && (
        <div className="app-bg-subnav border app-border rounded-lg p-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
          <h3 className="text-xs font-bold app-text-muted uppercase tracking-wider mb-3">
            {label("Từ điển dữ liệu (Data Dictionary)", "Data Dictionary (Database Schema)")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="app-bg-card border app-border rounded p-3">
              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-sm mb-1.5 flex items-center gap-1.5"><FiDatabase className="w-3 h-3"/> events</h4>
              <ul className="text-[11px] text-slate-500 space-y-1 font-mono">
                <li><span className="font-bold text-slate-700 dark:text-slate-300">id</span>: uuid (PK)</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">title</span>: varchar</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">category</span>: varchar</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">status</span>: varchar</li>
              </ul>
            </div>
            <div className="app-bg-card border app-border rounded p-3">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1.5 flex items-center gap-1.5"><FiDatabase className="w-3 h-3"/> bookings</h4>
              <ul className="text-[11px] text-slate-500 space-y-1 font-mono">
                <li><span className="font-bold text-slate-700 dark:text-slate-300">id</span>: uuid (PK)</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">event_id</span>: uuid (FK)</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">total_amount</span>: numeric</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">status</span>: varchar</li>
              </ul>
            </div>
            <div className="app-bg-card border app-border rounded p-3">
              <h4 className="font-bold text-purple-600 dark:text-purple-400 text-sm mb-1.5 flex items-center gap-1.5"><FiDatabase className="w-3 h-3"/> tickets</h4>
              <ul className="text-[11px] text-slate-500 space-y-1 font-mono">
                <li><span className="font-bold text-slate-700 dark:text-slate-300">id</span>: uuid (PK)</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">ticket_type_id</span>: uuid</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">price</span>: numeric</li>
                <li><span className="font-bold text-slate-700 dark:text-slate-300">buyer_id</span>: uuid</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div role="alert" className="p-4 rounded-lg shadow-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3 animate-in fade-in zoom-in-95">
          <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          {errorRetryable && (
            <button type="button" onClick={() => handleSearch()} disabled={isLoading} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-red-300 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 cursor-pointer">
              <FiRefreshCw className="w-3.5 h-3.5" /> {label("Thử lại", "Retry")}
            </button>
          )}
        </div>
      )}

      {/* Khu làm việc: lịch sử và mục hệ thống | dữ liệu | phân tích AI. Dưới màn hình lg xếp một cột, kết quả lên trước. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* Bên trái: lịch sử truy vấn, mục cần chú ý, báo cáo đã ghim */}
        <aside className="order-2 lg:order-1 lg:col-span-4 xl:col-span-3 space-y-4 min-w-0">
          <section className="app-bg-card border app-border rounded-lg shadow-xs p-4 space-y-3" aria-label={label("Lịch sử truy vấn", "Query history")}>
            <div className="flex items-center justify-between gap-2 border-b app-border pb-2">
              <h3 className="flex items-center gap-2 text-sm font-bold app-text-main">
                <FiBookmark className="w-4 h-4 text-blue-500" />
                {label("Lịch sử truy vấn", "Query history")} ({history.length})
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllHistory}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title={label("Xóa tất cả lịch sử truy vấn", "Clear all query history")}
                >
                  {label("Xóa tất cả", "Clear all")}
                </button>
              )}
            </div>
            {history.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto no-scrollbar space-y-1">
                {history.map((item) => (
                  <li key={item.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => selectHistoryItem(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectHistoryItem(item); } }}
                      className={`group cursor-pointer flex items-start gap-2 px-2.5 py-2 rounded-md border text-xs transition-colors hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        question === item.question ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-bold' : 'app-border app-text-main'
                      }`}
                      title={`${label("Nhấp để tải lại kết quả", "Click to reload result")}: "${item.question}"`}
                    >
                      <FiMessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="flex-1 min-w-0 break-words line-clamp-2">{item.question}</span>
                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(e, item.id)}
                        className="shrink-0 text-slate-400 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer"
                        title={label("Xóa mục này", "Delete this item")}
                        aria-label={label("Xóa mục này", "Delete this item")}
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs app-text-muted py-2">{label("Chưa có truy vấn nào. Các câu hỏi bạn đã hỏi sẽ lưu ở đây.", "No queries yet. Questions you ask are saved here.")}</p>
            )}
          </section>

          <AttentionFeed />
          <PinnedReports />
        </aside>

        {/* Giữa và phải: kết quả */}
        <div className="order-1 lg:order-2 lg:col-span-8 xl:col-span-9 grid grid-cols-1 xl:grid-cols-9 gap-4 items-start min-w-0">

          {isLoading ? (
            <div role="status" aria-busy="true" className="xl:col-span-9 space-y-4">
              <div className="h-24 animate-pulse rounded-lg border app-border bg-slate-100 dark:bg-slate-800/40" />
              <div className="h-72 animate-pulse rounded-lg border app-border bg-slate-100 dark:bg-slate-800/40" />
              <span className="sr-only">{label("Đang phân tích", "Analyzing")}</span>
            </div>
          ) : result ? (
            <>
              {/* Dữ liệu: biểu đồ và bảng */}
              <div className="order-2 xl:order-1 xl:col-span-5 space-y-4 min-w-0">
                {rows ? (
                  <>
                    {renderChart(rows)}
                    <section className="app-bg-card border app-border rounded-lg shadow-xs overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b app-border">
                        <div className="flex items-center gap-2 text-[11px] font-extrabold app-text-muted uppercase tracking-wider">
                          <FiDatabase className="w-4 h-4 text-emerald-500" />
                          <span>{label("Dữ liệu trích xuất từ DB", "Extracted Data from DB")} ({rows.length})</span>
                        </div>
                        <button
                          onClick={exportToCSV}
                          disabled={rows.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                        >
                          <FiDownload className="w-3.5 h-3.5" />
                          <span>{label("Xuất CSV", "Export CSV")}</span>
                        </button>
                      </div>
                      {renderTable(rows)}
                    </section>
                  </>
                ) : (
                  <p className="app-bg-card border app-border rounded-lg p-6 text-sm app-text-muted text-center">{label("Truy vấn này không trả về bảng dữ liệu.", "This query returned no data table.")}</p>
                )}
              </div>

              {/* Phân tích AI và SQL: dính cố định trên màn hình rộng */}
              <div className="order-1 xl:order-2 xl:col-span-4 space-y-4 min-w-0 xl:sticky xl:top-2">
                {result.reply && (
                  <section className="p-4 rounded-lg shadow-xs app-bg-card border app-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full app-bg-brand"></div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-sm font-bold app-text-main">
                        {label("Phân tích & Đề xuất từ AI", "AI Insights & Suggestions")}
                      </h3>
                      <button
                        type="button"
                        onClick={() => void handlePinDashboard()}
                        disabled={pinning || !result.generated_sql}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 gradient-btn rounded-md text-[11px] font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                        title={label("Ghim Báo Cáo Này Ra Dashboard", "Pin this report to Dashboard")}
                      >
                        {pinning ? <FiLoader className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <FiBookmark className="w-3.5 h-3.5" />}
                        <span>{label("Ghim Dashboard", "Pin Dashboard")}</span>
                      </button>
                    </div>
                    <div className="text-[13px] font-medium app-text-main leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{result.reply}</ReactMarkdown>
                    </div>
                  </section>
                )}

                {result.generated_sql && (
                  <section className="rounded-lg shadow-xs app-bg-card border app-border">
                    <button
                      type="button"
                      onClick={() => setShowSql(v => !v)}
                      aria-expanded={showSql}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-[11px] font-extrabold app-text-muted uppercase tracking-wider cursor-pointer"
                    >
                      <span className="flex items-center gap-2"><FiCode className="w-4 h-4 text-indigo-500" />{label("Truy vấn SQL (Tạo bởi AI)", "Generated SQL Query (by AI)")}</span>
                      {showSql ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                    </button>
                    {showSql && (
                      <div className="px-4 pb-4">
                        <pre className="p-3 app-bg-subnav rounded-lg text-[12px] font-mono text-indigo-700 dark:text-indigo-400 overflow-x-auto border app-border whitespace-pre-wrap break-words">
                          {result.generated_sql}
                        </pre>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </>
          ) : (
            <div className="xl:col-span-9 app-bg-card border app-border border-dashed rounded-lg p-8 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500">
                <FiSearch className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold app-text-main">{label("Chưa có kết quả", "No result yet")}</h3>
              <p className="text-xs app-text-muted max-w-md mx-auto">
                {label("Đặt một câu hỏi ở ô trên, hoặc chọn một gợi ý. Biểu đồ, bảng dữ liệu và phần phân tích của AI sẽ hiện ở đây.", "Ask a question above or pick a suggestion. The chart, the data table and the AI analysis appear here.")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {suggestions.map(s => (
                  <button key={s.text} type="button" className="cursor-pointer text-xs font-medium hover:text-blue-500 hover:border-blue-300 transition-colors px-3 py-1.5 rounded-full app-bg-card border app-border app-text-muted" onClick={() => setQuestion(s.text)}>{s.chip}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAiAnalytics;
