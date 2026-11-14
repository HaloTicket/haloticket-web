import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Ctrl + Z / Ctrl + Y', action: 'Hoàn tác / Làm lại' },
  { keys: 'Ctrl + C / Ctrl + V', action: 'Sao chép / Dán phần tử đang chọn' },
  { keys: 'Ctrl + D', action: 'Nhân bản phần tử đang chọn' },
  { keys: 'Ctrl + A', action: 'Chọn tất cả ghế' },
  { keys: 'Delete', action: 'Xóa phần tử đang chọn' },
  { keys: 'Esc', action: 'Bỏ chọn' },
  { keys: '← ↑ → ↓', action: 'Nhích phần tử đang chọn 1 ô lưới' },
  { keys: 'Shift + ← ↑ → ↓', action: 'Nhích 10 ô lưới' },
  { keys: 'Giữ Phím cách + kéo', action: 'Di chuyển khung nhìn' },
  { keys: 'Ctrl + cuộn chuột', action: 'Thu phóng quanh con trỏ' },
  { keys: 'Hai ngón tay', action: 'Thu phóng và di chuyển (màn hình cảm ứng)' },
  { keys: 'Tab, rồi ← ↑ → ↓', action: 'Di chuyển giữa các ghế bằng bàn phím' },
  { keys: 'Enter / Phím cách (trên ghế)', action: 'Chọn ghế (Shift để chọn thêm)' },
  { keys: '?', action: 'Mở bảng phím tắt này' },
];

// keyboard shortcut cheat sheet of the studio
export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="seat-studio-modal-backdrop" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Phím tắt')}
        className="seat-studio-modal max-w-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b app-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-black app-text-main">{t('Phím tắt')}</h3>
          <button type="button" onClick={onClose} className="seat-studio-icon-button" aria-label={t('Đóng')}>
            <FiX />
          </button>
        </div>
        <ul className="p-5 space-y-2 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((item) => (
            <li key={item.keys} className="flex items-center justify-between gap-4 text-xs">
              <span className="app-text-main">{t(item.action)}</span>
              <kbd className="px-2 py-1 rounded-lg app-bg-main border app-border font-mono text-[11px] font-bold app-text-muted whitespace-nowrap">
                {t(item.keys)}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
