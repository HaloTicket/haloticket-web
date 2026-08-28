export default function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 border-t border-slate-800 py-12 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white font-bold">
              H
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              HaloTicket
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Nền tảng bán vé và quản lý sự kiện quy mô lớn, tốc độ cao, hỗ trợ
            thanh toán và check-in thông minh.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
            Về HaloTicket
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="#" className="hover:text-brand-400 transition-colors">
                Quy chế hoạt động
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-brand-400 transition-colors">
                Điều khoản dịch vụ
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-brand-400 transition-colors">
                Chính sách bảo mật & Quyền riêng tư
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
            Hỗ trợ & Liên hệ
          </h4>
          <p className="text-sm mb-2 text-slate-400">
            Email: <span className="text-slate-200">support@haloticket.vn</span>
          </p>
          <p className="text-sm mb-2 text-slate-400">
            Hotline: <span className="text-brand-400 font-semibold">1900 8888</span> (8:00 - 22:00)
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 border-t border-slate-800/80 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} HaloTicket Platform. Tất cả quyền được bảo lưu.</p>
        <p className="mt-2 md:mt-0">Built with React 19, Vite & Tailwind CSS v4</p>
      </div>
    </footer>
  );
}
