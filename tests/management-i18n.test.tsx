// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { i18n, setLanguage } from '@/i18n';
import { OrganizerTerms } from '@/features/organizer/OrganizerTerms';
import { AddTicketModal } from '@/features/organizer/components/create-event/AddTicketModal';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

afterEach(async () => { cleanup(); await setLanguage('vi'); });

describe('management translations', () => {
  it('provides English for every literal translation key on management screens', () => {
    const files = ['src/features/admin', 'src/features/organizer'].flatMap(dir =>
      readdirSync(resolve(dir), { recursive: true }).filter((file: string | Buffer) => String(file).endsWith('.tsx')).map((file: string | Buffer) => resolve(dir, String(file)))
    ).concat([resolve('src/layouts/AdminLayout.tsx'), resolve('src/layouts/OrganizerLayout.tsx')]);
    const missing: string[] = [];
    for (const file of files) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'translate' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text;
          if (!i18n.exists(key, { lng: 'en', fallbackLng: false })) missing.push(`${file}: ${key}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(missing).toEqual([]);
  });

  it('keeps shared public and management translations consistent', () => {
    const publicCatalog = JSON.parse(readFileSync(resolve('src/i18n/locales/public.en.json'), 'utf8')) as Record<string, string>;
    const managementCatalog = JSON.parse(readFileSync(resolve('src/i18n/locales/management.en.json'), 'utf8')) as Record<string, string>;
    const conflicts = Object.keys(publicCatalog).filter(key => key in managementCatalog && publicCatalog[key] !== managementCatalog[key]);
    expect(conflicts).toEqual([]);
  });

  it('updates expanded organizer terms while preserving the open section', async () => {
    render(<><LanguageSwitcher /><OrganizerTerms /></>);
    fireEvent.click(screen.getByRole('button', { name: /1\. Danh mục/ }));
    expect(screen.getByText('Dịch vụ tổ chức đánh bạc, cá độ trái phép dưới mọi hình thức.')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    await waitFor(() => expect(screen.getByText('Illegal gambling or betting services in any form.')).toBeTruthy());
  });

  it('translates ticket validation and retains a user-provided name when switching language', async () => {
    const onSave = vi.fn();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<><LanguageSwitcher /><AddTicketModal onClose={() => {}} onSave={onSave} /></>);
    const nameInput = screen.getByPlaceholderText('Ví dụ: Vé VVIP, Vé GA, Early Bird...');
    fireEvent.change(nameInput, { target: { value: 'Vé VIP' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    await waitFor(() => expect(screen.getByText('Ticket type name')).toBeTruthy());
    const translatedNameInput = screen.getByPlaceholderText('Example: VVIP, GA, Early Bird...');
    expect((translatedNameInput as HTMLInputElement).value).toBe('Vé VIP');

    fireEvent.change(translatedNameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save|create|add ticket/i }));
    expect(alert).toHaveBeenCalled();
    expect(String(alert.mock.calls[0][0])).not.toMatch(/[\u00c0-\u1ef9]/);
    expect(onSave).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
