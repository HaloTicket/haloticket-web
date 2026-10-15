import React, { useState } from 'react';
import { FiSearch, FiCode, FiDatabase, FiLoader, FiAlertCircle, FiDownload, FiBookmark, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { aiApi } from '@/services/aiApi';
import { FiRefreshCw } from 'react-icons/fi';

interface AiQueryHistoryItem {
  id: string;
  question: string;
  result: any;
  timestamp: string;
}

export const AdminAiAnalytics: React.FC = () => {
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
    } catch {}
    return '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => {
    try {
      const last = localStorage.getItem('admin_ai_last_query');
      if (last) {
        const parsed = JSON.parse(last);
        return parsed.result || null;
      }
    } catch {}
    return null;
  });

  const [error, setError] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar'|'pie'|'line'|null>(null);

  const saveToHistory = (q: string, res: any) => {
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

  const selectHistoryItem = (item: AiQueryHistoryItem) => {
    setQuestion(item.question);
    setResult(item.result);
    setError(null);
    setChartTypeOverride(null);
    try {
      localStorage.setItem('admin_ai_last_query', JSON.stringify(item));
    } catch {}
  };

  const removeHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('admin_ai_query_history', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('admin_ai_query_history');
    localStorage.removeItem('admin_ai_last_query');
    setQuestion('');
    setResult(null);
    setError(null);
  };

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
    } catch (err: any) {
      console.error("AI Analytics error:", err);
      setError("Rất tiếc, AI không thể phân tích yêu cầu này. Vui lòng thử lại với một câu hỏi rõ ràng hơn hoặc kiểm tra kết nối CSDL.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) return;
    const columns = Object.keys(result.data[0]);
    const csvContent = [
      columns.join(","),
      ...result.data.map((row: any) => columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(","))
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

  const handlePinDashboard = () => {
    const event = new CustomEvent('toast-notification', {
      detail: {
        id: `pin-${Date.now()}`,
        title: "Đã ghim thành công",
        message: "Biểu đồ này đã được ghim ra màn hình chính (Admin Dashboard).",
        type: "success",
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    setQuestion('');
    setResult(null);
    setError(null);
    setChartTypeOverride(null);
    localStorage.removeItem('admin_ai_last_query');
  };
  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <p className="text-sm app-text-muted mt-4 text-center py-8">Không tìm thấy dữ liệu phù hợp với yêu cầu của bạn.</p>;

    const columns = Object.keys(data[0]);

    return (
      <div className="w-full app-bg-card border app-border rounded-lg overflow-hidden shadow-xs mt-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b app-border text-[11px] font-bold app-text-muted uppercase tracking-wider">
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium app-text-main">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {columns.map((col) => {
                    const val = row[col];
                    // Render null safely, format numbers maybe?
                    const displayVal = val === null || val === undefined ? '-' : String(val);
                    return <td key={col} className="px-4 py-3 whitespace-nowrap">{displayVal}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChart = (data: any[]) => {
    if (!data || data.length === 0) return null;
    const columns = Object.keys(data[0]);
    if (columns.length < 2) return null; 

    // Try to find a string/categorical column and a numeric column
    let labelCol = columns.find(col => typeof data[0][col] === 'string') || columns[0];
    let numCols = columns.filter(col => typeof data[0][col] === 'number');

    if (numCols.length === 0) {
       // attempt to parse numbers
       numCols = columns.filter(col => col !== labelCol && !isNaN(Number(data[0][col])));
    }

    if (numCols.length === 0) return null; 

    const valueCol = numCols[0];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    // Auto detect chart type if not explicitly set
    let activeChartType = chartTypeOverride;
    if (!activeChartType) {
      activeChartType = (data.length <= 6 && numCols.length === 1) ? 'pie' : 'bar';
    }

    const chartData = data.map(row => ({
      ...row,
      [valueCol]: Number(row[valueCol]) || 0
    }));

    return (
      <div className="w-full h-80 app-bg-card border app-border rounded-lg shadow-xs mt-4 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-bold app-text-muted uppercase tracking-wider">
            {activeChartType === 'pie' ? <FiPieChart className="w-4 h-4 text-purple-500" /> : <FiBarChart2 className="w-4 h-4 text-blue-500" />}
            <span>Biểu đồ trực quan</span>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button onClick={() => setChartTypeOverride('bar')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'bar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Bar</button>
            <button onClick={() => setChartTypeOverride('line')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'line' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Line</button>
            <button onClick={() => setChartTypeOverride('pie')} className={`px-2 py-1 text-xs font-bold rounded ${activeChartType === 'pie' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Pie</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          {activeChartType === 'pie' ? (
            <PieChart>
              <Pie data={chartData} dataKey={valueCol} nameKey={labelCol} cx="50%" cy="50%" outerRadius={100} label>
                {chartData.map((index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          ) : activeChartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={labelCol} tick={{fontSize: 12}} stroke="#94a3b8" />
              <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Line type="monotone" dataKey={valueCol} stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={labelCol} tick={{fontSize: 12}} stroke="#94a3b8" />
              <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey={valueCol} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="mb-10 text-center max-w-2xl mx-auto pt-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-6 shadow-xl shadow-blue-500/20">
          <FiDatabase className="w-7 h-7" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold app-text-main tracking-tight mb-3">
          Phân Tích Dữ Liệu AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">(Text-to-SQL)</span>
        </h1>
        <p className="text-sm app-text-muted max-w-lg mx-auto">
          Nhập câu hỏi bằng tiếng Việt hoặc tiếng Anh, AI (Gemini Flash) sẽ tự động viết câu lệnh SQL để truy vấn cơ sở dữ liệu và trả về kết quả kèm phân tích ngay lập tức!
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-4xl mx-auto relative z-10 flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative shadow-sm rounded-lg flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 text-blue-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-[140px] min-h-12 app-bg-card border app-border rounded-lg text-sm app-text-main focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none shadow-xs"
            placeholder="Ví dụ: Lấy cho tôi tổng doanh thu của tất cả sự kiện..."
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
                <><FiLoader className="w-4 h-4 animate-spin" /> Đang phân tích</>
              ) : (
                <>Truy vấn ngay</>
              )}
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 inline-flex items-center min-h-12 gap-2 px-4 text-xs font-semibold rounded-lg app-bg-card border app-border app-text-main hover:brightness-95 dark:hover:brightness-110 transition-colors shadow-xs"
          title="Xóa lịch sử và làm mới trang"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>
      
      {/* Query History & Saved tags */}
      <div className="max-w-4xl mx-auto mt-4 flex flex-col items-center">
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
          <span className="flex items-center gap-1.5"><FiBookmark className="w-3.5 h-3.5" /> Lịch sử truy vấn ({history.length})</span>
          {history.length > 0 && (
            <button 
              onClick={clearAllHistory} 
              className="text-slate-400 hover:text-rose-500 transition-colors normal-case font-medium flex items-center gap-1 cursor-pointer"
              title="Xóa tất cả lịch sử truy vấn"
            >
              (Xóa tất cả)
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 max-h-36 overflow-y-auto no-scrollbar">
          {history.length > 0 ? (
            history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => selectHistoryItem(item)}
                className={`group cursor-pointer hover:text-blue-500 hover:border-blue-300 transition-colors px-3 py-1.5 rounded-full app-bg-card border app-border shadow-xs flex items-center gap-1.5 ${
                  question === item.question ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold' : ''
                }`}
                title={`Nhấp để tải lại kết quả: "${item.question}"`}
              >
                <span>{item.question.length > 40 ? item.question.substring(0, 40) + '...' : item.question}</span>
                <button
                  type="button"
                  onClick={(e) => removeHistoryItem(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 p-0.5 rounded-full transition-opacity cursor-pointer"
                  title="Xóa mục này"
                >
                  &times;
                </button>
              </div>
            ))
          ) : (
            <>
              <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full app-bg-card border app-border shadow-xs" onClick={() => setQuestion('Top 5 sự kiện có doanh thu cao nhất?')}>Top 5 sự kiện doanh thu cao</span>
              <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full app-bg-card border app-border shadow-xs" onClick={() => setQuestion('Thống kê số vé bán ra theo từng thể loại')}>Vé bán theo thể loại</span>
              <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full app-bg-card border app-border shadow-xs" onClick={() => setQuestion('Tổng doanh thu theo từng tháng trong năm nay')}>Doanh thu theo tháng</span>
            </>
          )}
        </div>
      </div>

      {/* Database Schema Explorer Toggle */}
      <div className="max-w-4xl mx-auto flex justify-end">
        <button 
          onClick={() => setShowSchema(!showSchema)}
          className="text-[11px] font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 app-bg-card px-3 py-1.5 rounded-full border app-border shadow-sm"
        >
          <FiDatabase className="w-3.5 h-3.5" /> 
          {showSchema ? 'Ẩn Cấu Trúc DB' : 'Xem Cấu Trúc Bảng (Schema)'}
        </button>
      </div>

      {/* Schema Drawer/Panel */}
      {showSchema && (
        <div className="max-w-4xl mx-auto app-bg-subnav border app-border rounded-lg p-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Từ điển dữ liệu (Data Dictionary)</h3>
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

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto mt-6 p-4 rounded-lg shadow-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3 animate-in fade-in zoom-in-95">
          <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results Area */}
      {result && !isLoading && (
        <div className="max-w-4xl mx-auto mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
          
          {/* AI Response Text (Insights & Explanations) */}
          {result.reply && (
            <div className="p-5 rounded-xl shadow-sm app-bg-card border app-border relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full app-bg-brand"></div>
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-bold app-text-main flex items-center gap-2 mb-3">
                    Phân tích & Đề xuất từ AI
                  </h3>
                  <div className="text-[13px] font-medium app-text-main leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{result.reply}</ReactMarkdown>
                  </div>
                </div>
                
                {/* Pin to Dashboard feature */}
                <button 
                  onClick={handlePinDashboard}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 gradient-btn rounded-md text-[11px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:-translate-y-0.5"
                  title="Ghim Báo Cáo Này Ra Dashboard"
                >
                  <FiBookmark className="w-3.5 h-3.5" />
                  <span>Ghim Dashboard</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {/* Generated SQL (For transparency) */}
            {result.generated_sql && (
              <div className="p-5 rounded-lg shadow-xs bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <FiCode className="w-4 h-4 text-indigo-500" /> 
                  <span>Truy vấn SQL (Tạo bởi AI)</span>
                </div>
                <pre className="p-4 bg-gray-50 dark:bg-[#09090b] rounded-lg text-[13px] font-mono text-indigo-700 dark:text-indigo-400 overflow-x-auto border border-gray-100 dark:border-gray-800">
                  {result.generated_sql}
                </pre>
              </div>
            )}

            {/* Data Table & Chart */}
            {result.data && Array.isArray(result.data) && (
              <div className="pb-10 space-y-6">
                
                {renderChart(result.data)}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                      <FiDatabase className="w-4 h-4 text-emerald-500" /> 
                      <span>Dữ liệu trích xuất từ DB</span>
                    </div>
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span>Xuất CSV</span>
                    </button>
                  </div>
                  {renderTable(result.data)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAiAnalytics;
