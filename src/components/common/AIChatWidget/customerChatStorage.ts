import { getCachedUserProfile, parseJwt } from '@/services/userApi';
import type { CustomerChatHistoryItem, CustomerChatOwner } from '@/types/ai';

const guestKey = 'ai_chat_guest';
const historyPrefix = 'ai_chat_history:v2:';
const legacyGlobalKey = 'ai_chat_history';
let temporaryGuest: string | undefined;

export function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export interface CustomerChatIdentity {
  key: string;
  owner: CustomerChatOwner;
  legacyAccounts: string[];
}

export function getCustomerChatIdentity(token: string | null): CustomerChatIdentity {
  const claims = token ? parseJwt(token) : null;
  if (claims?.sub) {
    const profile = getCachedUserProfile();
    const verifiedProfileKey = profile?.keycloakId === claims.sub ? profile.id : undefined;
    const legacyAccounts = verifiedProfileKey && verifiedProfileKey !== claims.sub ? [verifiedProfileKey, claims.sub] : [claims.sub];
    return { key: JSON.stringify([claims.iss, claims.sub]), owner: { subject: claims.sub }, legacyAccounts };
  }
  let guest: string;
  try {
    const saved = localStorage.getItem(guestKey);
    guest = saved && /^[a-f0-9]{64}$/.test(saved) ? saved : randomHex(32);
    if (guest !== saved) localStorage.setItem(guestKey, guest);
  } catch {
    temporaryGuest ??= randomHex(32);
    guest = temporaryGuest;
  }
  return { key: guest, owner: { guest }, legacyAccounts: ['anon'] };
}

export function readLegacyHistory(accounts: string[]): { key: string; messages: CustomerChatHistoryItem[]; complete: boolean } | undefined {
  for (const account of accounts) {
    const key = historyPrefix + account;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) continue;
      let complete = true;
      const messages = parsed.flatMap((entry: unknown): CustomerChatHistoryItem[] => {
        if (!entry || typeof entry !== 'object') return [];
        const { id, sender, text, timestamp, hiddenContext } = entry as Record<string, unknown>;
        if (id === '1' || (sender !== 'user' && sender !== 'ai') || typeof text !== 'string' || !text.trim() || typeof timestamp !== 'string') return [];
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return [];
        const characters = Array.from(text);
        if (characters.length > 2000) complete = false;
        const message: CustomerChatHistoryItem = {
          role: sender === 'user' ? 'user' : 'assistant',
          content: characters.slice(0, 2000).join(''),
          created_at: date.toISOString(),
        };
        if (sender === 'user' && typeof hiddenContext === 'string' && /^\(Mã: [\w-]{1,64}\)$/.test(hiddenContext)) {
          const prompt = text + ' ' + hiddenContext;
          if (Array.from(prompt).length <= 500) message.prompt = prompt;
        }
        return [message];
      });
      if (messages.length) return { key, messages: messages.slice(-500), complete: complete && messages.length <= 500 };
    } catch {
      // An unreadable legacy entry cannot be attributed to this conversation.
    }
  }
}

export function removeLegacyHistory(key: string = legacyGlobalKey) {
  try { localStorage.removeItem(key); } catch { /* The browser may block storage access. */ }
}

export function clearLegacyHistory(accounts: string[]) {
  for (const account of accounts) removeLegacyHistory(historyPrefix + account);
}
