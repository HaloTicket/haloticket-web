import React from "react";
import { Link } from "react-router-dom";
import { FiPhone, FiMail, FiMapPin } from "react-icons/fi";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border mt-20 pt-16 pb-8 text-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Info */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="font-heading font-bold text-3xl text-primary tracking-tight hover:opacity-80 transition-opacity">
              HaloTicket
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              Nền tảng quản lý và phân phối vé sự kiện uy tín tại Việt Nam © 2026
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FiPhone className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Hotline:{" "}
                  <a href="tel:19006408" className="font-bold text-primary hover:underline">
                    1900.6408
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FiMail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:support@haloticket.vn" className="hover:text-primary transition-colors">
                  support@haloticket.vn
                </a>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FiMapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span>Văn phòng chính: Tầng 12, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh</span>
              </div>
            </div>
          </div>

          {/* Column 2: Khách hàng & BTC */}
          <div className="flex flex-col gap-4">
            <h4 className="font-heading font-bold text-lg text-foreground">Dành cho Khách hàng</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Điều khoản sử dụng cho khách hàng
                </Link>
              </li>
            </ul>
            <h4 className="font-heading font-bold text-lg text-foreground mt-4">Dành cho Ban Tổ chức</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Điều khoản sử dụng cho ban tổ chức
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Về chúng tôi */}
          <div className="flex flex-col gap-4">
            <h4 className="font-heading font-bold text-lg text-foreground">Về chúng tôi</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Quy chế hoạt động
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Chính sách bảo mật thông tin
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cơ chế giải quyết tranh chấp/ khiếu nại
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Chính sách bảo mật thanh toán
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Chính sách đổi trả và kiểm hàng
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Điều kiện vận chuyển và giao nhận
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: App & Social */}
          <div className="flex flex-col gap-4">
            <h4 className="font-heading font-bold text-lg text-foreground">Ứng dụng HaloTicket</h4>
            <div className="flex gap-2">
              <div className="w-32 h-10 bg-muted rounded-md border border-border flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                App Store
              </div>
              <div className="w-32 h-10 bg-muted rounded-md border border-border flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                Google Play
              </div>
            </div>

            <h4 className="font-heading font-bold text-lg text-foreground mt-4">Follow us</h4>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-muted-foreground"
                aria-label="Facebook"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-muted-foreground"
                aria-label="Instagram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-muted-foreground"
                aria-label="YouTube"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p className="leading-relaxed">
            Công ty TNHH HaloTicket<br />
            Đại diện theo pháp luật: Phạm Thị Hường<br />
            Giấy chứng nhận đăng ký doanh nghiệp số: 0313605444, cấp lần đầu ngày 07/01/2026 bởi Sở Kế Hoạch và Đầu Tư TP. Hồ Chí Minh
          </p>
          <div className="flex gap-4">
            <div className="w-24 h-8 bg-muted rounded-md border border-border flex items-center justify-center font-medium">
              Đã Đăng Ký
            </div>
            <div className="w-24 h-8 bg-muted rounded-md border border-border flex items-center justify-center font-medium">
              Đã Thông Báo
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
