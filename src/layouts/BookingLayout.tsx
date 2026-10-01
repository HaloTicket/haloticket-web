import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import AIChatWidget from "@/components/common/AIChatWidget/AIChatWidget";
import { ThemeProvider } from "@/context/ThemeContext";

export default function BookingLayout() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col app-bg-page font-sans antialiased selection:bg-brand-primary selection:text-white relative">
        <Header />
        <main className="grow flex flex-col">
          <Outlet />
        </main>
        
        {/* Customer AI Chatbot */}
        <AIChatWidget />
      </div>
    </ThemeProvider>
  );
}
