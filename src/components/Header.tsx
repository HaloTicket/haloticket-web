import { Link } from "react-router-dom";
import { PATHS } from "../routes/paths";

export default function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link
          to={PATHS.HOME}
          className="text-2xl font-extrabold tracking-tight"
        >
          HaloTicket
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link
            to={PATHS.HOME}
            className="hover:text-blue-200 transition-colors font-medium"
          >
            Khám phá sự kiện
          </Link>
          <Link
            to="#"
            className="hover:text-blue-200 transition-colors font-medium"
          >
            Tra cứu vé
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-3">
          <Link
            to={PATHS.LOGIN}
            className="bg-white text-blue-600 px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-sm"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </header>
  );
}
