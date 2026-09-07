import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <select aria-label={t('Chọn ngôn ngữ')} value={i18n.resolvedLanguage === 'en' ? 'en' : 'vi'}
      onChange={event => void setLanguage(event.target.value === 'en' ? 'en' : 'vi')}
      className="min-h-11 rounded-lg border app-border app-bg-card app-text-main px-2 text-sm">
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
