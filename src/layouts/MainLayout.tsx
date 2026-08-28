import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/context/ThemeContext";

export default function MainLayout() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans antialiased selection:bg-brand-500 selection:text-white">
        <Header />

        <main className="grow">
          <Outlet />
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
}
