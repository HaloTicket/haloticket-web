import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChatWindow, type ChatAnchor } from '@/components/common/ChatWindow';
import { ChatLauncher } from '@/components/common/ChatLauncher';
import { useChatWindowPresence } from '@/components/common/useChatWindowPresence';
import { extractSubjectFromToken } from '@/components/common/OrganizerAIChatWidget/organizerChatStorage';
import { getKeycloakSession } from '@/services/keycloakSession';
import AdminAiAssistant from './AdminAiAssistant';

export default function AdminAiChatWidget() {
  const { t } = useTranslation();
  const { isOpen, isPresent, openWindow, closeWindow, finishClose } = useChatWindowPresence();
  const [isExpanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState<ChatAnchor>();
  const [owner, setOwner] = useState(() => extractSubjectFromToken(getKeycloakSession().getCurrentToken()));
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let attempt = 0;
    const sync = () => {
      const request = ++attempt;
      const session = getKeycloakSession();
      const subject = extractSubjectFromToken(session.getCurrentToken());
      setOwner(subject);
      if (!subject && (session.hasKeycloakSession() || session.isAuthenticated())) {
        void session.getAccessToken().then(token => {
          if (attempt === request) setOwner(extractSubjectFromToken(token));
        }).catch(() => { /* leave the assistant unavailable until the session is valid */ });
      }
    };
    const expire = () => { attempt++; setOwner(null); closeWindow(); };
    sync();
    window.addEventListener('auth-changed', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('session-expired', expire);
    return () => {
      attempt++;
      window.removeEventListener('auth-changed', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('session-expired', expire);
    };
  }, [closeWindow]);

  useEffect(() => {
    if (!isOpen || !isExpanded || !owner) return;
    const style = document.documentElement.style;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = previous; };
  }, [isOpen, isExpanded, owner]);

  if (!owner) return null;

  return (
    <>
      {isPresent && createPortal(
        <ChatWindow label={t('ai.assist.adminTitle')} isOpen={isOpen} isExpanded={isExpanded} anchor={anchor} onExited={finishClose}>
          <AdminAiAssistant key={owner} owner={owner} isOpen={isOpen} isExpanded={isExpanded}
            onToggleExpand={() => setExpanded(value => !value)}
            onClose={() => { closeWindow(); requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true })); }} />
        </ChatWindow>, document.body)}
      <ChatLauncher kind="admin" label={t('ai.assist.adminTitle')} hidden={isOpen} buttonRef={launcher}
        onOpen={location => { setAnchor(location); openWindow(); }} />
    </>
  );
}
