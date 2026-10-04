import React, { useState } from 'react';
import { FiSearch, FiCode, FiDatabase, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { aiApi } from '@/services/aiApi';

export const AdminAiAnalytics: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiApi.analyzeData(question);
      setResult(response);
    } catch (err: any) {
      console.error("AI Analytics error:", err);
      setError("Rất tiếc, AI không thể phân tích yêu cầu này. Vui lòng thử lại với một câu hỏi rõ ràng hơn hoặc kiểm tra kết nối CSDL.");
    } finally {
      setIsLoading(false);
    }
  };

  // helper to render table dynamically
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
          Nhập câu hỏi bằng tiếng Việt hoặc tiếng Anh, AI (Gemini Flash) sẽ tự động viết câu lệnh SQL để truy vấn cơ sở dữ liệu và trả về kết quả ngay lập tức!
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-3xl mx-auto relative z-10">
        <form onSubmit={handleSearch} className="relative group shadow-xs rounded-lg">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-[140px] min-h-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-xs app-text-main focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
            placeholder="Ví dụ: Lấy cho tôi tổng doanh thu của tất cả sự kiện..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="px-4 py-1.5 min-h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white text-xs font-bold rounded-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              {isLoading ? (
                <><FiLoader className="w-4 h-4 animate-spin" /> Đang phân tích</>
              ) : (
                <>Truy vấn ngay</>
              )}
            </button>
          </div>
        </form>
        
        {/* Helper tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onClick={() => setQuestion('Top 5 sự kiện có doanh thu cao nhất?')}>Top 5 sự kiện doanh thu cao</span>
          <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onClick={() => setQuestion('Hiển thị danh sách vé đã được bán trong tháng này')}>Vé đã bán tháng này</span>
          <span className="cursor-pointer hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onClick={() => setQuestion('Tổng số user đang có trong hệ thống')}>Tổng User hệ thống</span>
        </div>
      </div>

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
          
          {/* AI Response Text */}
          {result.reply && (
            <div className="p-5 rounded-lg shadow-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <p className="text-[15px] font-medium text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
                {result.reply}
              </p>
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

            {/* Data Table */}
            {result.data && Array.isArray(result.data) && (
              <div className="pb-10">
                <div className="flex items-center gap-2 mb-1 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                  <FiDatabase className="w-4 h-4 text-emerald-500" /> 
                  <span>Dữ liệu trích xuất từ DB</span>
                </div>
                {renderTable(result.data)}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAiAnalytics;
