// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n, setLanguage, getInitialLanguage } from '@/i18n';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import Login from '@/features/auth/Login';
import { EventCard } from '@/components/common/EventCard';
import EventHero from '@/features/events/components/detail/EventHero';
import EventDescription from '@/features/events/components/detail/EventDescription';
import EventSchedule from '@/features/events/components/detail/EventSchedule';
import type { EventDetailData } from '@/mock/eventData';
import { formatCurrency, formatDate, formatLegacyVietnameseDate, parseVndAmount } from '@/utils/formatters';

afterEach(async () => { cleanup(); await setLanguage('vi'); localStorage.clear(); });

describe('Vietnamese and English interface', () => {
  it('switches an existing login screen without discarding user input and persists preference', async () => {
    render(<MemoryRouter><LanguageSwitcher /><Login onSubmit={async () => {}} onGoogleLogin={async () => {}} /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Nhập email của bạn'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy());
    expect((screen.getByPlaceholderText('Enter your email') as HTMLInputElement).value).toBe('customer@example.com');
    expect(localStorage.getItem('app_lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(getInitialLanguage()).toBe('en');
  });

  it('defaults unsupported preferences to Vietnamese and preserves unknown event content', async () => {
    localStorage.setItem('app_lang', 'fr');
    expect(getInitialLanguage()).toBe('vi');
    await setLanguage('en');
    expect(i18n.t('Tên sự kiện do nhà tổ chức cung cấp')).toBe('Tên sự kiện do nhà tổ chức cung cấp');
  });

  it('formats dates and VND in the selected locale without converting the currency', async () => {
    await setLanguage('en');
    expect(formatCurrency(150000)).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(150000));
    expect(formatDate('2026-09-05T12:30:00')).toBe(new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date('2026-09-05T12:30:00')));
    expect(formatLegacyVietnameseDate('14 tháng 08, 2026')).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(2026, 7, 14)));
    expect(document.title).toBe('HaloTicket – Event ticketing platform');
  });

  it('renders partial event API data safely and localizes known category labels', async () => {
    await setLanguage('en');
    const partialEvent = { id: 'partial', title: 'Organizer supplied event', minPrice: '150000', startTime: '2026-09-05T12:30:00' } as EventDetailData;

    render(
      <MemoryRouter>
        <EventCard event={{ id: 'card', title: 'Organizer supplied event', categoryName: 'Thể Thao', minPrice: '250.000đ', startTime: '2026-09-05T12:30:00' }} />
        <EventHero event={partialEvent} onBuyTicketsClick={() => {}} />
        <EventDescription event={partialEvent} />
        <EventSchedule event={partialEvent} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sports')).toBeTruthy();
    expect(screen.getByText('No description yet.')).toBeTruthy();
    expect(screen.getAllByText(formatCurrency(150000)).length).toBeGreaterThan(0);
    expect(parseVndAmount('250.000đ')).toBe(250000);
    expect(parseVndAmount('Từ 800.000đ')).toBe(800000);
    expect(parseVndAmount('not a price')).toBeUndefined();
  });
});
