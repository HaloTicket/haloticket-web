import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { NotFoundBackground } from "./NotFoundBackground";
import { SpaceOrbit } from "./SpaceOrbit";
import { SpaceParticles } from "./SpaceParticles";
import { LostHaloBot, type HaloBotPhase } from "./LostHaloBot";
import { NotFoundActions, type NotFoundVariant } from "./NotFoundActions";
import "./notFound.css";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface NotFoundPageProps {
  variant?: NotFoundVariant;
}

/**
 * Trang 404 (Not Found) theo concept "HaloBoo Lost in Space".
 * Trình tự animation: đi bộ -> vấp té -> hiện thông báo 404 "lạc đường" cùng mascot ngồi ngơ ngác.
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({ variant = "public" }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const sectionRef = useRef<HTMLElement>(null);

  const [prefersReducedMotion] = useState(getPrefersReducedMotion);
  const [phase, setPhase] = useState<HaloBotPhase>(() =>
    prefersReducedMotion ? "lost" : "walking"
  );

  // Schedule walk -> trip -> lost choreography and preload the target sitting bot asset
  useEffect(() => {
    const targetBotSrc = isDark ? "/assets/404/404-bot-dark.png" : "/assets/404/404-bot-light.png";
    const preload = new Image();
    preload.src = targetBotSrc;
  }, [isDark]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const tripTimer = window.setTimeout(() => {
      setPhase("tripping");
    }, 1150);

    const lostTimer = window.setTimeout(() => {
      setPhase("lost");
    }, 1750);

    return () => {
      window.clearTimeout(tripTimer);
      window.clearTimeout(lostTimer);
    };
  }, [prefersReducedMotion]);

  // Measure sticky header height dynamically to fill remaining viewport height cleanly
  useEffect(() => {
    if (variant === "admin") return;

    const header = document.getElementById("site-header");
    const section = sectionRef.current;
    if (!header || !section) return;

    const updateHeaderOffset = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height > 0) {
        section.style.setProperty("--notfound-header-height", `${height}px`);
      }
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeaderOffset) : null;
    observer?.observe(header);

    return () => {
      window.removeEventListener("resize", updateHeaderOffset);
      observer?.disconnect();
    };
  }, [variant]);

  const isLost = phase === "lost";
  const showEntranceMotion = !prefersReducedMotion;
  const [descBeforeName, descAfterName] = t("Có vẻ {{name}} cũng đã mất phương hướng!", {
    name: "__HALOBOO__",
  }).split("__HALOBOO__");

  return (
    <section
      ref={sectionRef}
      aria-labelledby="not-found-heading"
      className={`${
        variant === "admin" ? "min-h-[100dvh]" : "notfound-page"
      } relative isolate flex w-full flex-col items-center justify-center overflow-hidden bg-[#dbe8fe] dark:bg-[#050f36] px-4 py-8 sm:px-6 sm:py-10 lg:py-12`}
    >
      <NotFoundBackground isDark={isDark} />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* Illustration Cluster: Orbits + Particles + 404 + HaloBot */}
        <div className="relative flex w-full max-w-[340px] sm:max-w-[460px] lg:max-w-[540px] flex-col items-center justify-center">
          <SpaceOrbit isDark={isDark} />
          <SpaceParticles isDark={isDark} />

          {/* Large 404 placed behind HaloBot's shoulders so face & star remain unobstructed */}
          <div
            aria-hidden="true"
            className={`relative z-10 -mb-10 sm:-mb-14 md:-mb-16 lg:-mb-20 select-none pointer-events-none transition-opacity duration-300 ${isLost ? "opacity-100" : "opacity-0 scale-95"
              }`}
          >
            <div className={isLost && showEntranceMotion ? "notfound-code-enter" : ""}>
              <div className={isLost ? "notfound-code-float" : ""}>
                <span
                  className={`block text-[96px] sm:text-[136px] md:text-[164px] lg:text-[188px] font-extrabold leading-[0.88] tracking-[-0.04em] bg-clip-text text-transparent ${isDark
                    ? "bg-gradient-to-b from-[#93c5fd]/85 via-[#60a5fa]/75 to-[#6366f1]/50"
                    : "bg-gradient-to-b from-[#1d4ed8] via-[#2563eb] to-[#6366f1]/80"
                    }`}
                >
                  404
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-20">
            <LostHaloBot
              isDark={isDark}
              phase={phase}
              showImpact={showEntranceMotion}
              walkingAlt={t("HaloBoo đang bước đi xem bản đồ")}
              alt={t("HaloBoo đang ngồi cầm bản đồ với biểu cảm ngơ ngác vì bị lạc đường")}
            />
          </div>
        </div>

        {/* Error Heading */}
        <h1
          id="not-found-heading"
          className={`mt-4 sm:mt-5 text-2xl sm:text-3xl lg:text-[2.125rem] font-extrabold tracking-tight leading-snug text-slate-900 dark:text-slate-50 ${isLost
            ? showEntranceMotion
              ? "notfound-fade-up"
              : "opacity-100"
            : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          style={isLost && showEntranceMotion ? { animationDelay: "60ms" } : undefined}
        >
          <span className="sr-only">{t("Lỗi 404 - Không tìm thấy trang")}: </span>
          {t("Oops! Bạn đã")}{" "}
          <span className={isDark ? "text-blue-400" : "text-primary"}>
            {t("lạc đường")}
          </span>
          .
        </h1>

        {/* Description */}
        <p
          className={`mt-3 max-w-md sm:max-w-lg text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 ${isLost
            ? showEntranceMotion
              ? "notfound-fade-up"
              : "opacity-100"
            : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          style={isLost && showEntranceMotion ? { animationDelay: "160ms" } : undefined}
        >
          <span className="block">
            {descBeforeName}
            <strong
              className={`mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 font-extrabold tracking-tight ${isDark
                ? " text-blue-300 text-xl"
                : " text-blue-700 text-xl"
                }`}
            >
              HaloBoo
            </strong>
            {descAfterName}
          </span>
          <span className="block">
            {t("Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.")}
          </span>
        </p>

        {/* Navigation Actions */}
        <div
          className={`w-full flex justify-center ${isLost
            ? showEntranceMotion
              ? "notfound-fade-up"
              : "opacity-100"
            : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          style={isLost && showEntranceMotion ? { animationDelay: "260ms" } : undefined}
        >
          <NotFoundActions variant={variant} />
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;
