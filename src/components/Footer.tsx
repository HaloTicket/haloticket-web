import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
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
  useTranslation();
  return (
    <footer className="app-bg-footer border-t app-border pt-12 pb-8 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Contact Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-bold app-text-main mb-2">Hotline</h4>
              <p className="text-xs app-text-muted flex items-center gap-1.5 mb-1">
                <FiPhone className="w-3.5 h-3.5 app-text-brand" />
                <span>{translate("Thứ 2 - Chủ Nhật (8:00 - 23:00)")}</span>
              </p>
              <a
                href="tel:19006408"
                className="app-text-brand font-black text-xl hover:opacity-80 transition-opacity cursor-pointer"
              >
                1900.6408
              </a>
            </div>

            <div>
              <h4 className="font-bold app-text-main mb-1">Email</h4>
              <p className="text-xs app-text-muted flex items-center gap-1.5">
                <FiMail className="w-3.5 h-3.5 app-text-brand" />
                <a
                  href="mailto:support@haloticket.vn"
                  className="app-hover-text-brand transition-colors cursor-pointer"
                >
                  support@haloticket.vn
                </a>
              </p>
            </div>

            <div>
              <h4 className="font-bold app-text-main mb-1">{translate("Văn phòng chính")}</h4>
              <p className="text-xs app-text-muted leading-relaxed flex items-start gap-1.5">
                <FiMapPin className="w-4 h-4 app-text-brand shrink-0 mt-0.5" />
                <span>
                  {translate("Tầng 12, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường Hòa Hưng, TP. Hồ Chí Minh")}</span>
              </p>
            </div>
          </div>

          {/* Column 2: Customer & Organizer Terms */}
          <div className="space-y-6">
            <div>
              <h4 className="font-bold app-text-main mb-3">{translate("Dành cho Khách hàng")}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                    {translate("Điều khoản sử dụng cho khách hàng")}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold app-text-main mb-3">{translate("Dành cho Ban Tổ chức")}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                    {translate("Điều khoản sử dụng cho ban tổ chức")}</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 3: About Company & Policies */}
          <div>
            <h4 className="font-bold app-text-main mb-3">{translate("Về công ty chúng tôi")}</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Quy chế hoạt động")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Chính sách bảo mật thông tin")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Cơ chế giải quyết tranh chấp/ khiếu nại")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Chính sách bảo mật thanh toán")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Chính sách đổi trả và kiểm hàng")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Điều kiện vận chuyển và giao nhận")}</Link>
              </li>
              <li>
                <Link to="#" className="app-hover-text-brand transition-colors cursor-pointer">
                  {translate("Phương thức thanh toán")}</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: App Download & Social Links */}
          <div className="space-y-6">
            {/* App HaloTicket */}
            <div>
              <h4 className="font-bold app-text-main mb-2.5 text-xs">
                {translate("Ứng dụng HaloTicket")}</h4>
              <div className="flex flex-col gap-2">
                <a
                  href="#"
                  className="flex items-center gap-2 app-bg-card border app-border app-hover-border-brand px-3 py-2 rounded-lg text-xs font-semibold app-text-main transition-all w-44 cursor-pointer shadow-xs"
                >
                  <FaGooglePlay className="w-5 h-5 app-text-brand shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] app-text-muted font-normal">{translate("Tải nội dung trên")}</div>
                    <div className="font-bold leading-tight">Google Play</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 app-bg-card border app-border app-hover-border-brand px-3 py-2 rounded-lg text-xs font-semibold app-text-main transition-all w-44 cursor-pointer shadow-xs"
                >
                  <FaAppStoreIos className="w-5 h-5 app-text-brand shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] app-text-muted font-normal">{translate("Tải về trên")}</div>
                    <div className="font-bold leading-tight">App Store</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Check-in App for Organizers */}
            <div>
              <h4 className="font-bold app-text-main mb-2.5 text-xs">
                {translate("Ứng dụng check-in cho Ban tổ chức")}</h4>
              <div className="flex flex-col gap-2">
                <a
                  href="#"
                  className="flex items-center gap-2 app-bg-card border app-border app-hover-border-brand px-3 py-2 rounded-lg text-xs font-semibold app-text-main transition-all w-44 cursor-pointer shadow-xs"
                >
                  <FaGooglePlay className="w-5 h-5 app-text-brand shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] app-text-muted font-normal">{translate("Tải nội dung trên")}</div>
                    <div className="font-bold leading-tight">Google Play</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 app-bg-card border app-border app-hover-border-brand px-3 py-2 rounded-lg text-xs font-semibold app-text-main transition-all w-44 cursor-pointer shadow-xs"
                >
                  <FaAppStoreIos className="w-5 h-5 app-text-brand shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] app-text-muted font-normal">{translate("Tải về trên")}</div>
                    <div className="font-bold leading-tight">App Store</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Links & Language */}
            <div>
              <h4 className="font-bold app-text-main mb-2 text-xs">{translate("Theo dõi chúng tôi")}</h4>
              <div className="flex items-center gap-3 app-text-muted mb-4">
                <a href="#" className="app-hover-text-brand text-lg transition-colors cursor-pointer">
                  <FaFacebook />
                </a>
                <a href="#" className="app-hover-text-brand text-lg transition-colors cursor-pointer">
                  <FaInstagram />
                </a>
                <a href="#" className="app-hover-text-brand text-lg transition-colors cursor-pointer">
                  <FaTiktok />
                </a>
                <a href="#" className="app-hover-text-brand text-lg transition-colors cursor-pointer">
                  <FaLinkedin />
                </a>
              </div>

              <h4 className="font-bold app-text-main mb-2 text-xs">{translate("Ngôn ngữ")}</h4>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 border-t app-border text-center text-xs app-text-muted flex flex-col md:flex-row items-center justify-between gap-3">
          <p>{translate("© 2026 HaloTicket Platform. Tất cả quyền được bảo lưu.")}</p>
          <div className="flex items-center gap-4 app-text-muted">
            <Link to="#" className="app-hover-text-brand cursor-pointer">{translate("Bảo mật")}</Link>
            <span>•</span>
            <Link to="#" className="app-hover-text-brand cursor-pointer">{translate("Điều khoản")}</Link>
            <span>•</span>
            <Link to="#" className="app-hover-text-brand cursor-pointer">{translate("Sơ đồ trang")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
