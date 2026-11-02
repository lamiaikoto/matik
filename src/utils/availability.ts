import { BookingRecord, Equipment } from '../types';

export interface EquipmentAvailability {
  isAvailable: boolean;
  isRented: boolean;
  activeBooking?: BookingRecord;
  endDate?: string;
  formattedEndDate?: string;
  badge: {
    label: string;
    variant: 'available' | 'rented' | 'inactive';
    subtext?: string;
  };
}

/**
 * Formate une date YYYY-MM-DD ou ISO en format français lisible (ex: "05/11/2026")
 */
export function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return dateStr;
}

/**
 * Vérifie si un équipement fait l'objet d'une réservation active :
 * - Statut en cours ou en attente de remise (status !== 'restitue')
 * - Date de fin supérieure ou égale à aujourd'hui (endDate >= today)
 *
 * Retourne les détails complets de disponibilité et les informations de badge.
 */
export function getEquipmentAvailability(
  equipment: Equipment,
  bookingList: BookingRecord[] = []
): EquipmentAvailability {
  // 1. Annonce suspendue / inactive par le loueur
  if (equipment.isActive === false) {
    return {
      isAvailable: false,
      isRented: false,
      badge: {
        label: 'Annonce suspendue',
        variant: 'inactive',
      },
    };
  }

  // 2. Vérification des réservations actives
  const today = new Date().toISOString().split('T')[0];

  // Trouve toutes les réservations actives pour cet équipement dont la date de fin est >= aujourd'hui
  const activeBookings = bookingList.filter((b) => {
    if (b.equipmentId !== equipment.id) return false;
    if (b.status === 'restitue') return false;
    if (!b.endDate) return false;
    const endStr = b.endDate.split('T')[0];
    return endStr >= today;
  });

  if (activeBookings.length > 0) {
    // Trier par date de fin la plus lointaine au cas où plusieurs réservations se succèdent
    activeBookings.sort((a, b) => {
      const aEnd = a.endDate.split('T')[0];
      const bEnd = b.endDate.split('T')[0];
      return bEnd.localeCompare(aEnd);
    });

    const currentBooking = activeBookings[0];
    const endClean = currentBooking.endDate.split('T')[0];
    const formattedDate = formatDateFr(endClean);

    return {
      isAvailable: false,
      isRented: true,
      activeBooking: currentBooking,
      endDate: endClean,
      formattedEndDate: formattedDate,
      badge: {
        label: 'Loué',
        variant: 'rented',
        subtext: `Jusqu'au ${formattedDate}`,
      },
    };
  }

  // 3. Hors stock manuel
  if (equipment.inStock === false) {
    return {
      isAvailable: false,
      isRented: false,
      badge: {
        label: 'Indisponible',
        variant: 'inactive',
      },
    };
  }

  // 4. Disponible
  return {
    isAvailable: true,
    isRented: false,
    badge: {
      label: 'Disponible',
      variant: 'available',
    },
  };
}

/**
 * Helper rapide pour vérifier l'état de location d'un équipement
 */
export function isEquipmentRented(
  equipmentId: string,
  bookingList: BookingRecord[] = []
): { isRented: boolean; activeBooking?: BookingRecord; formattedEndDate?: string } {
  const today = new Date().toISOString().split('T')[0];
  const active = bookingList.find((b) => {
    if (b.equipmentId !== equipmentId) return false;
    if (b.status === 'restitue') return false;
    if (!b.endDate) return false;
    return b.endDate.split('T')[0] >= today;
  });

  return {
    isRented: !!active,
    activeBooking: active,
    formattedEndDate: active?.endDate ? formatDateFr(active.endDate) : undefined,
  };
}
