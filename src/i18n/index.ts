import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import publicEnglish from './locales/public.en.json';
import managementEnglish from './locales/management.en.json';
import invitationEnglish from './locales/invitation.en.json';
import invitationVietnamese from './locales/invitation.vi.json';
import ticketsEnglish from './locales/tickets.en.json';
import ticketsVietnamese from './locales/tickets.vi.json';
import aiEnglish from './locales/ai.en.json';
import aiVietnamese from './locales/ai.vi.json';
import financeEnglish from './locales/finance.en.json';

/** Ngôn ngữ giao diện được hỗ trợ. */
export type Language = 'vi' | 'en';
/** Đọc ngôn ngữ đã lưu ở `localStorage` (khóa `app_lang`); mặc định `vi`, và cũng dùng `vi` khi không đọc được kho lưu trữ. */
export function getInitialLanguage(): Language {
  try { return localStorage.getItem('app_lang') === 'en' ? 'en' : 'vi'; }
  catch { return 'vi'; }
}

const english = { ...publicEnglish, ...managementEnglish, ...invitationEnglish, ...ticketsEnglish, ...aiEnglish, ...financeEnglish };
const vietnamese = {
  ...Object.fromEntries(Object.keys(english).map(key => [key, key])),
  ...invitationVietnamese,
  ...ticketsVietnamese,
  ...aiVietnamese,
};
void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vietnamese }, en: { translation: english } },
  lng: getInitialLanguage(), fallbackLng: 'vi', supportedLngs: ['vi', 'en'],
  keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false },
  initAsync: false,
});

/** Đồng bộ ngôn ngữ mới ra thẻ `html`, tiêu đề tab và `localStorage` (bỏ qua nếu kho lưu trữ bị tắt). */
function syncLanguage(language: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.title = i18n.t('HaloTicket - Nền tảng Đặt vé & Sự kiện Hàng đầu');
  }
  try { localStorage.setItem('app_lang', language); } catch { /* storage may be disabled. */ }
}
i18n.on('languageChanged', syncLanguage);
syncLanguage(i18n.language);
/** Đổi ngôn ngữ của i18n. */
export async function setLanguage(language: Language) { await i18n.changeLanguage(language); }
/** Trả mã locale (`en-US` hoặc `vi-VN`) theo ngôn ngữ hiện tại, dùng để định dạng ngày giờ và số. */
export function getLocale() { return i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN'; }
// Nội dung do nhà tổ chức nhập mà chưa có bản dịch thì giữ nguyên văn bản gốc.
/** Dịch một chuỗi theo ngôn ngữ hiện tại; khóa chưa có bản dịch thì trả lại chính chuỗi gốc. */
export function t(text: string, options?: Record<string, unknown>) { return i18n.t(text, options); }
export { i18n };
export default i18n;
