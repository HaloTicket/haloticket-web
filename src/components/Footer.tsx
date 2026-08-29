import React from "react";
import { Link } from "react-router-dom";
import {
  FiPhone,
  FiMail,
  FiMapPin
} from "react-icons/fi";
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaLinkedin,
  FaGooglePlay,
  FaAppStoreIos
} from "react-icons/fa";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 dark:bg-[#0F172A] text-slate-300 text-xs md:text-sm border-t border-slate-800 pt-12 pb-8 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Contact Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-white mb-2">Hotline</h4>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <FiPhone className="w-3.5 h-3.5 text-brand-400" />
                <span>Thứ 2 - Chủ Nhật (8:00 - 23:00)</span>
              </p>
              <a
                href="tel:19006408"
                className="text-brand-400 dark:text-brand-400 font-black text-xl hover:text-accent-cyan transition-colors cursor-pointer"
              >
                1900.6408
              </a>
            </div>

            <div>
              <h4 className="font-bold text-white mb-1">Email</h4>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <FiMail className="w-3.5 h-3.5 text-brand-400" />
                <a
                  href="mailto:support@haloticket.vn"
                  className="hover:text-brand-400 transition-colors cursor-pointer"
                >
                  support@haloticket.vn
                </a>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-1">Văn phòng chính</h4>
              <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-1.5">
                <FiMapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>
                  Tầng 12, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường Hòa
                  Hưng, TP. Hồ Chí Minh
                </span>
              </p>
            </div>
          </div>

          {/* Column 2: Customer & Organizer Terms */}
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-white mb-3">Dành cho Khách hàng</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                    Điều khoản sử dụng cho khách hàng
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-3">Dành cho Ban Tổ chức</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                    Điều khoản sử dụng cho ban tổ chức
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 3: About Company & Policies */}
          <div>
            <h4 className="font-bold text-white mb-3">Về công ty chúng tôi</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Quy chế hoạt động
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Chính sách bảo mật thông tin
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Cơ chế giải quyết tranh chấp/ khiếu nại
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Chính sách bảo mật thanh toán
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Chính sách đổi trả và kiểm hàng
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Điều kiện vận chuyển và giao nhận
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-brand-400 transition-colors cursor-pointer">
                  Phương thức thanh toán
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: App Download & Social Links */}
          <div className="space-y-6">
            {/* App HaloTicket */}
            <div>
              <h4 className="font-bold text-white mb-2.5 text-xs">
                Ứng dụng HaloTicket
              </h4>
              <div className="flex flex-col gap-2">
                <a
                  href="#"
                  className="flex items-center gap-2 bg-slate-950/80 border border-slate-700 hover:border-brand-500 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all w-44 cursor-pointer"
                >
                  <FaGooglePlay className="w-5 h-5 text-brand-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-normal">Tải nội dung trên</div>
                    <div className="font-bold leading-tight">Google Play</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 bg-slate-950/80 border border-slate-700 hover:border-brand-500 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all w-44 cursor-pointer"
                >
                  <FaAppStoreIos className="w-5 h-5 text-brand-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-normal">Tải về trên</div>
                    <div className="font-bold leading-tight">App Store</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Check-in App for Organizers */}
            <div>
              <h4 className="font-bold text-white mb-2.5 text-xs">
                Ứng dụng check-in cho Ban tổ chức
              </h4>
              <div className="flex flex-col gap-2">
                <a
                  href="#"
                  className="flex items-center gap-2 bg-slate-950/80 border border-slate-700 hover:border-brand-500 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all w-44 cursor-pointer"
                >
                  <FaGooglePlay className="w-5 h-5 text-brand-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-normal">Tải nội dung trên</div>
                    <div className="font-bold leading-tight">Google Play</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 bg-slate-950/80 border border-slate-700 hover:border-brand-500 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all w-44 cursor-pointer"
                >
                  <FaAppStoreIos className="w-5 h-5 text-brand-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-normal">Tải về trên</div>
                    <div className="font-bold leading-tight">App Store</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Links & Language */}
            <div>
              <h4 className="font-bold text-white mb-2 text-xs">Follow us</h4>
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <a href="#" className="hover:text-brand-400 text-lg transition-colors cursor-pointer">
                  <FaFacebook />
                </a>
                <a href="#" className="hover:text-brand-400 text-lg transition-colors cursor-pointer">
                  <FaInstagram />
                </a>
                <a href="#" className="hover:text-brand-400 text-lg transition-colors cursor-pointer">
                  <FaTiktok />
                </a>
                <a href="#" className="hover:text-brand-400 text-lg transition-colors cursor-pointer">
                  <FaLinkedin />
                </a>
              </div>

              <h4 className="font-bold text-white mb-2 text-xs">Ngôn ngữ</h4>
              <div className="flex items-center gap-2">
                <span className="text-xl cursor-pointer" title="Tiếng Việt">🇻🇳</span>
                <span className="text-xl cursor-pointer" title="English">🇬🇧</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© 2026 HaloTicket Platform. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="#" className="hover:text-brand-400 cursor-pointer">Bảo mật</Link>
            <span>•</span>
            <Link to="#" className="hover:text-brand-400 cursor-pointer">Điều khoản</Link>
            <span>•</span>
            <Link to="#" className="hover:text-brand-400 cursor-pointer">Sơ đồ trang</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
