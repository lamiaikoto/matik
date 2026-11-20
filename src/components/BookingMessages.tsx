import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Send } from 'lucide-react';
import {
  BookingMessage,
  fetchBookingMessages,
  sendBookingMessage,
} from '../services/messages';
import { resolvePublicDisplayName, anonymizeFullName } from '../lib/publicIdentity';

export interface BookingMessagesProps {
  bookingId: string;
  /** La messagerie n'est accessible qu'après confirmation du paiement. */
  enabled: boolean;
  counterpartName?: string;
  /** Rôle de l'utilisateur courant dans l'application. */
  currentUserRole?: string;
  className?: string;
}

const MESSAGE_MAX_LENGTH = 2000;

const formatDate = (value: string): string => {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Messagerie interne d'une réservation.
 *
 * - Réservée aux deux parties d'une réservation payée (vérifié côté serveur).
 * - Chaque message envoyé déclenche une notification e-mail à la contrepartie.
 * - Rafraîchissement périodique simple, sans exposer de coordonnées avant paiement.
 */
export const BookingMessages: React.FC<BookingMessagesProps> = ({
  bookingId,
  enabled,
  counterpartName,
  currentUserRole,
  className = '',
}) => {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const isTenant = currentUserRole === 'client';
  const myRole: BookingMessage['senderRole'] = isTenant ? 'locataire' : 'loueur';

  const loadMessages = useCallback(async () => {
    if (!enabled || !bookingId) return;

    const result = await fetchBookingMessages(bookingId);
    if (!mountedRef.current) return;

    if (result.success) {
      setMessages(result.messages);
      setError(null);
    } else {
      setError(result.error || 'Impossible de charger la messagerie.');
    }
  }, [bookingId, enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !bookingId) {
      setMessages([]);
      return () => {
        mountedRef.current = false;
      };
    }

    setLoading(true);
    void loadMessages().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    const interval = window.setInterval(() => {
      void loadMessages();
    }, 15000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [bookingId, enabled, loadMessages]);

  if (!enabled || !bookingId) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setNotice(null);

    const result = await sendBookingMessage(bookingId, text);

    if (!mountedRef.current) return;

    if (!result.success) {
      setError(result.error || "Le message n'a pas pu être envoyé.");
      setSending(false);
      return;
    }

    setDraft('');
    setNotice(
      result.emailSent
        ? 'Message envoyé. La contrepartie a reçu une notification par e-mail.'
        : 'Message envoyé.'
    );
    setSending(false);
    await loadMessages();
  };

  const rawLabel = counterpartName?.trim() || '';
  const counterpartLabel = rawLabel
    ? resolvePublicDisplayName(rawLabel, rawLabel) || anonymizeFullName(rawLabel) || rawLabel
    : (isTenant ? 'votre loueur' : 'votre locataire');

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50/60 ${className}`}>
      <div className="flex items-start gap-2.5 px-4 py-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Messagerie sécurisée
          </h4>
          <p className="text-[11px] text-slate-500 leading-snug">
            Échangez avec {counterpartLabel}. Chaque message envoie une notification par e-mail.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-xs text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement des messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-3">
            Aucun message pour le moment. Convenez ici de l&apos;heure et du lieu de remise.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {messages.map((message) => {
              const isMine = message.senderRole === myRole;
              return (
                <li
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                      isMine
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <span
                      className={`mt-1 block text-[10px] ${
                        isMine ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {isMine ? 'Vous' : counterpartLabel} · {formatDate(message.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <div className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && !error && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={2}
            placeholder="Écrivez votre message…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 tabular-nums">
              {draft.length}/{MESSAGE_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 transition-colors cursor-pointer"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{sending ? 'Envoi…' : 'Envoyer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
