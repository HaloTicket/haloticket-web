import { useTranslation } from "react-i18next";

/** Trả hàm chọn chuỗi song ngữ: dùng bản dịch trong i18n nếu có, nếu không thì chọn bản tiếng Anh/Việt theo ngôn ngữ hiện tại. */
export function useLabel() {
  const { t, i18n } = useTranslation();
  const language = i18n?.language ?? "vi";
  const english = language.startsWith("en");
  return {
    label: (vi: string, en: string) => t(vi, { defaultValue: english ? en : vi }),
    locale: english ? "en-US" : "vi-VN",
  };
}

export type Label = ReturnType<typeof useLabel>["label"];

/** Mô tả thời điểm tương đối theo ngôn ngữ hiện tại. */
export function relativeTime(date: Date, locale: string) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1],
  ];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
}
