import { supabase } from '../lib/supabase';

/** Message de la messagerie interne d'une réservation. */
export interface BookingMessage {
  id: string;
  bookingId: string;
  senderRole: 'locataire' | 'loueur';
  body: string;
  createdAt: string;
  /** true si le message a été envoyé par l'utilisateur courant. */
  mine?: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (err) {
    console.warn('⚠️ [Matik Messages] Session Supabase indisponible :', err);
    return {};
  }
}

const readError = (data: any, status: number): string => {
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  return `Erreur serveur (HTTP ${status})`;
};

/** Charge les messages d'une réservation payée. */
export async function fetchBookingMessages(bookingId: string): Promise<{
  success: boolean;
  messages: BookingMessage[];
  error?: string;
}> {
  if (!bookingId) return { success: false, messages: [], error: 'Réservation manquante.' };

  try {
    const response = await fetch(`/api/messages?bookingId=${encodeURIComponent(bookingId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(await getAuthHeaders()),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, messages: [], error: readError(data, response.status) };
    }

    return {
      success: true,
      messages: Array.isArray(data?.messages) ? (data.messages as BookingMessage[]) : [],
    };
  } catch (err) {
    console.error('❌ [Matik Messages] Chargement impossible :', err);
    return {
      success: false,
      messages: [],
      error: err instanceof Error ? err.message : 'Erreur réseau.',
    };
  }
}

/** Envoie un message à la contrepartie et déclenche sa notification e-mail. */
export async function sendBookingMessage(
  bookingId: string,
  body: string
): Promise<{ success: boolean; message?: BookingMessage; emailSent?: boolean; error?: string }> {
  if (!bookingId) return { success: false, error: 'Réservation manquante.' };

  const text = body.trim();
  if (!text) return { success: false, error: 'Le message est vide.' };
  if (text.length > 2000) return { success: false, error: 'Le message dépasse 2 000 caractères.' };

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ bookingId, body: text }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: readError(data, response.status) };
    }

    return {
      success: true,
      message: data?.message as BookingMessage | undefined,
      emailSent: Boolean(data?.emailSent),
    };
  } catch (err) {
    console.error('❌ [Matik Messages] Envoi impossible :', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur réseau.',
    };
  }
}
