import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/common/ScrollToTop";
import { ThemeProvider } from "@/context/ThemeContext";

export default function MainLayout() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col app-bg-page transition-colors duration-300 font-sans antialiased selection:bg-brand-primary selection:text-white relative">
        <Header />

        <main className="grow">
          <Outlet />
        </main>

        <Footer />

        {/* Floating Scroll To Top Button */}
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}
