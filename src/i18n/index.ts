import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import publicEnglish from './locales/public.en.json';
import managementEnglish from './locales/management.en.json';
import invitationEnglish from './locales/invitation.en.json';
import invitationVietnamese from './locales/invitation.vi.json';
import ticketsEnglish from './locales/tickets.en.json';
import ticketsVietnamese from './locales/tickets.vi.json';

export type Language = 'vi' | 'en';
export function getInitialLanguage(): Language {
  try { return localStorage.getItem('app_lang') === 'en' ? 'en' : 'vi'; }
  catch { return 'vi'; }
}

const english = { ...publicEnglish, ...managementEnglish, ...invitationEnglish, ...ticketsEnglish };
const vietnamese = {
  ...Object.fromEntries(Object.keys(english).map(key => [key, key])),
  ...invitationVietnamese,
  ...ticketsVietnamese,
};
void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vietnamese }, en: { translation: english } },
  lng: getInitialLanguage(), fallbackLng: 'vi', supportedLngs: ['vi', 'en'],
  keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false },
  initAsync: false,
});

function syncLanguage(language: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.title = i18n.t('HaloTicket - Nền tảng Đặt vé & Sự kiện Hàng đầu');
  }
  try { localStorage.setItem('app_lang', language); } catch { /* storage may be disabled. */ }
}
i18n.on('languageChanged', syncLanguage);
syncLanguage(i18n.language);
export async function setLanguage(language: Language) { await i18n.changeLanguage(language); }
export function getLocale() { return i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN'; }
// Unknown organizer content falls back to the original text.
export function t(text: string, options?: Record<string, unknown>) { return i18n.t(text, options); }
export { i18n };
export default i18n;
