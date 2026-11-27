// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import '@/i18n';
import { ChatLauncher } from '@/components/common/ChatLauncher';

afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });

it('follows the pointer, then docks left without accidentally opening chat', () => {
  const open = vi.fn();
  render(<ChatLauncher kind="admin" label="Chat" onOpen={open} />);
  const button = screen.getByRole('button', { name: 'Chat' });
  const wrapper = button.parentElement!;
  vi.spyOn(wrapper, 'getBoundingClientRect').mockImplementation(() => {
    const left = parseFloat(wrapper.style.left) || 800;
    const top = parseFloat(wrapper.style.top) || 600;
    return new DOMRect(left, top, 56, 56);
  });
  fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: 820, clientY: 620 });
  fireEvent.pointerMove(button, { pointerId: 1, clientX: 220, clientY: 180 });
  expect(wrapper.style.left).toBe('200px');
  fireEvent.pointerUp(button, { pointerId: 1, clientX: 220, clientY: 180 });
  fireEvent.click(button, { detail: 1 });
  expect(open).not.toHaveBeenCalled();
  expect(wrapper.style.left).toBe('8px');
  expect(wrapper.style.top).toBe('160px');

  fireEvent.pointerDown(button, { button: 0, pointerId: 2, clientX: 220, clientY: 180 });
  fireEvent.pointerUp(button, { pointerId: 2, clientX: 220, clientY: 180 });
  fireEvent.click(button, { detail: 1 });
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ x: 8, y: 160, horizontal: 'left', vertical: 'below' }));
});

it('docks right when the launcher is released on the right half', () => {
  render(<ChatLauncher kind="admin" label="Chat" onOpen={vi.fn()} />);
  const button = screen.getByRole('button', { name: 'Chat' });
  const wrapper = button.parentElement!;
  vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(new DOMRect(800, 600, 56, 56));
  fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: 820, clientY: 620 });
  fireEvent.pointerMove(button, { pointerId: 1, clientX: 620, clientY: 310 });
  fireEvent.pointerUp(button, { pointerId: 1, clientX: 620, clientY: 310 });
  expect(wrapper.style.left).toBe(`${window.innerWidth - 56 - 8}px`);
  expect(wrapper.style.top).toBe('290px');
});

it('remembers the dropped position when the widget remounts', () => {
  sessionStorage.setItem('halo.chat.launcher.admin', JSON.stringify({ x: -25, y: window.innerHeight + 15 }));
  render(<ChatLauncher kind="admin" label="Chat" onOpen={vi.fn()} />);
  const wrapper = screen.getByRole('button', { name: 'Chat' }).parentElement!;
  expect(wrapper.style.left).toBe('8px');
  expect(wrapper.style.top).toBe(`${window.innerHeight - 56}px`);
});
