// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationDropdown } from './NotificationDropdown';
import { adminNotificationTarget } from './adminNotificationTarget';
const item = {id:'n1', userId:'ADMIN', type:'GENERAL', title:'Thông báo thử', message:'Nội dung', readStatus:false};
describe('notification dropdown', () => {
  it('opening and Escape do not mark messages read and restore bell focus', () => {
    const mark = vi.fn();
    render(<MemoryRouter><NotificationDropdown notifications={[item]} unreadCount={120} onMarkAllAsRead={mark} onNotificationClick={vi.fn()} viewAllLink='/admin/notifications' /></MemoryRouter>);
    const bell = screen.getByRole('button', {name:/Thông báo, 120/});
    expect(screen.getByText('99+')).toBeTruthy();
    fireEvent.click(bell);
    expect(bell.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, {key:'Escape'});
    expect(bell.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(bell);
    expect(mark).not.toHaveBeenCalled();
  });
  it('leaves unknown types in the inbox and links event messages without guessing IDs', () => {
    expect(adminNotificationTarget(item)).toBeNull();
    expect(adminNotificationTarget({...item, type:'EVENT_UPDATED', message:'Sự kiện "Tên bất kỳ"'})).toBe('/admin/events-approval');
  });
});

