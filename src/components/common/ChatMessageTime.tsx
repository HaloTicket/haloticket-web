import { formatMessageTime } from '@/utils/formatters';

export function ChatMessageTime({ timestamp, outgoing = true }: { timestamp: Date; outgoing?: boolean }) {
  const time = formatMessageTime(timestamp);
  if (!time) return null;

  return (
    <time dateTime={timestamp.toISOString()} className={`mt-1 block text-[11px] leading-none tabular-nums ${outgoing ? 'text-right text-blue-100' : 'text-text-muted'}`}>
      {time}
    </time>
  );
}
