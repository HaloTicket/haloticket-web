import { Outlet, Link } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { PATHS } from "@/routes/paths";

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <div className="auth-shell font-sans antialiased">
        <header className="auth-header">
          <Link
            to={PATHS.HOME}
            className="auth-brand-link"
            aria-label="Về trang chủ HaloTicket"
          >
            <div className="auth-mark" aria-hidden="true">
              H
            </div>
            <span className="auth-brand-name">
              HaloTicket
            </span>
          </Link>
        </header>

        <main className="auth-main">
          <Outlet />
        </main>

        <footer className="auth-footer">
          © {new Date().getFullYear()} HaloTicket. All rights reserved.
        </footer>
      </div>
    </ThemeProvider>
  );
}
