import React, { useState, useEffect } from "react";
import { FiArrowUp } from "react-icons/fi";

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        type="button"
        onClick={scrollToTop}
        className={`w-12 h-12 rounded-full gradient-btn text-white flex items-center justify-center shadow-2xl shadow-brand-primary/40 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) cursor-pointer group ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-75 translate-y-8 pointer-events-none"
        } hover:scale-110 active:scale-95`}
        aria-label="Cuộn lên đầu trang"
        title="Cuộn lên đầu trang"
      >
        <FiArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default ScrollToTop;
