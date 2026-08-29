import React, { useState, useEffect, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export interface CarouselSlide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  link?: string;
}

interface ImageCarouselProps {
  slides: CarouselSlide[];
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  aspectRatio?: string;
  renderCustomSlide?: (slide: CarouselSlide, index: number) => React.ReactNode;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  slides,
  autoPlayInterval = 4000,
  showArrows = true,
  showDots = true,
  className = "",
  aspectRatio = "aspect-[21/9]",
  renderCustomSlide
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isHovered || autoPlayInterval <= 0 || slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [nextSlide, autoPlayInterval, isHovered, slides.length]);

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className={`relative group overflow-hidden rounded-2xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div className={`relative w-full ${aspectRatio} overflow-hidden rounded-2xl bg-slate-900`}>
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                isActive
                  ? "opacity-100 scale-100 z-10 pointer-events-auto"
                  : "opacity-0 scale-105 z-0 pointer-events-none"
              }`}
            >
              {renderCustomSlide ? (
                renderCustomSlide(slide, index)
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={slide.image}
                    alt={slide.title || `Slide ${index + 1}`}
                    className="w-full h-full object-cover rounded-2xl brightness-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-6 md:p-8">
                    {slide.badge && (
                      <span className="self-start px-3 py-1 bg-emerald-500 text-slate-950 text-xs font-bold rounded-md mb-2 shadow-lg shadow-emerald-500/30">
                        {slide.badge}
                      </span>
                    )}
                    {slide.title && (
                      <h3 className="text-xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
                        {slide.title}
                      </h3>
                    )}
                    {slide.subtitle && (
                      <p className="text-sm md:text-base text-slate-300 font-medium">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prev / Next Arrows */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-emerald-500 text-white hover:text-slate-950 backdrop-blur-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 focus:outline-none shadow-lg"
          >
            <FiChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-emerald-500 text-white hover:text-slate-950 backdrop-blur-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 focus:outline-none shadow-lg"
          >
            <FiChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination Indicators */}
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-6 h-2 bg-emerald-500 shadow-md shadow-emerald-500/50"
                  : "w-2 h-2 bg-slate-400/60 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
