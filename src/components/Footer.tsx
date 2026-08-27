
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-2xl font-bold text-white mb-4">HaloTicket</h3>
          <p className="text-sm leading-relaxed">
            Nền tảng phân phối vé sự kiện thông minh, mang đến trải nghiệm mua
            vé nhanh chóng, an toàn và tiện lợi nhất.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4">
            Về chúng tôi
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Quy chế hoạt động
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Điều khoản sử dụng
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Chính sách bảo mật
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4">
            Hỗ trợ khách hàng
          </h4>
          <p className="text-sm mb-2">Email: support@haloticket.com</p>
          <p className="text-sm mb-2">Hotline: 1900 xxxx (8:00 - 22:00)</p>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} HaloTicket. All rights reserved.
      </div>
    </footer>
  );
}
