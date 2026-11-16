/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { BookingForm } from './components/BookingForm';
import { StripeCautionSection } from './components/StripeCautionSection';
import { ConfirmationModal } from './components/ConfirmationModal';
import { EquipmentEditorModal } from './components/EquipmentEditorModal';
import { LoueurDashboard } from './components/LoueurDashboard';
import { GarantiesPage } from './components/GarantiesPage';
import { LegalPage } from './components/LegalPage';
import { AuthModal } from './components/AuthModal';
import { AppDownloadBanner } from './components/AppDownloadBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { ProfitSimulator } from './components/ProfitSimulator';
import { PassportQRModal } from './components/PassportQRModal';
import { DigitalInspectionModal } from './components/DigitalInspectionModal';
import { EquipmentDetails } from './components/EquipmentDetails';
import { Footer } from './components/Footer';
import { EQUIPMENT_LIST } from './data/equipment';
import { CatalogFilters, EMPTY_CATALOG_FILTERS } from './data/catalogFilters';
import { supabase, mapSupabaseUserToMatikProfile } from './lib/supabase';
import {
  fetchEquipmentsFromSupabase,
  fetchUserEquipmentsFromSupabase,
  saveEquipmentToSupabase,
  updateEquipmentStatusInSupabase,
  deleteEquipmentFromSupabase,
  subscribeToEquipments,
  generateUUID,
} from './lib/equipmentService';
import { sendConfirmationEmailAfterValidation, releaseStripeCautionApi, syncCautionSessionDetailsApi } from './services/booking';
import {
  fetchBookingsForUser,
  fetchBookingById,
  insertBookingRecord,
  updateBookingRecord,
  deleteBookingRecord,
  subscribeToBookings,
  type BookingUpdate,
} from './lib/bookingService';
import {
  Equipment,
  BookingPayload,
  PageType,
  CurrentUser,
  LoueurProProfile,
  LoueurParticulierProfile,
  BookingRecord,
  InspectionReport,
} from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('accueil');
  // Filtres partagés entre la recherche de l'accueil et le catalogue (état unique)
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => {
    // Initialisation optimiste immédiate à partir du cache local
    try {
      const cached = localStorage.getItem('matik_equipment_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [isEquipmentsLoading, setIsEquipmentsLoading] = useState(false);
  const [bookingList, setBookingList] = useState<BookingRecord[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);

  // Innovation Modals State
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [passportModalEquipment, setPassportModalEquipment] = useState<Equipment | null>(null);
  const [detailsEquipment, setDetailsEquipment] = useState<Equipment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fonction centrale pour charger les équipements depuis Supabase (table equipments)
  const loadEquipmentsData = async (user?: CurrentUser) => {
    setIsEquipmentsLoading(true);
    try {
      // 1. Récupération des annonces publiques (is_published = true) depuis la table Supabase
      const publicEqs = await fetchEquipmentsFromSupabase();

      // 2. Si l'utilisateur est connecté, récupérer également ses annonces spécifiques (brouillons ou inactives)
      let combined = [...publicEqs];
      if (user?.id) {
        const userEqs = await fetchUserEquipmentsFromSupabase(user.id);
        userEqs.forEach((uEq) => {
          const index = combined.findIndex((e) => e.id === uEq.id);
          if (index >= 0) {
            combined[index] = uEq;
          } else {
            combined.unshift(uEq);
          }
        });
      }

      // 3. Mise à jour de l'état
      if (combined.length > 0) {
        setEquipmentList(combined);
        setSelectedEquipment((prev) => (prev ? (combined.find((c) => c.id === prev.id) || combined[0]) : combined[0]));
        try {
          localStorage.setItem('matik_equipment_list', JSON.stringify(combined));
        } catch {}
      } else {
        // Repli local si la base de données distante est vide
        const savedEqStr = localStorage.getItem('matik_equipment_list');
        if (savedEqStr) {
          const parsedEq = JSON.parse(savedEqStr);
          if (Array.isArray(parsedEq) && parsedEq.length > 0) {
            setEquipmentList(parsedEq);
            setSelectedEquipment((prev) => prev || parsedEq[0]);
          }
        }
      }
    } catch (err) {
      console.warn('[App loadEquipmentsData Warning]', err);
    } finally {
      setIsEquipmentsLoading(false);
    }
  };

  // Fonction d'extraction des paramètres d'URL (supporte les query params classiques et les routes /# hash)
  const extractUrlParam = (paramName: string): string | null => {
    // 1. Recherche dans window.location.search (?key=val)
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get(paramName);
    if (fromSearch) return fromSearch;

    // 2. Recherche dans window.location.hash (#/?key=val ou #key=val ou #...&key=val)
    const hash = window.location.hash || '';
    if (hash.includes('?')) {
      const hashQuery = hash.substring(hash.indexOf('?') + 1);
      const hashParams = new URLSearchParams(hashQuery);
      const fromHash = hashParams.get(paramName);
      if (fromHash) return fromHash;
    } else if (hash.includes('=')) {
      // Cas où les query params sont placés directement après le hash sans ? (ex: /#stripe_status=...)
      const cleanedHash = hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(cleanedHash);
      const fromHash = hashParams.get(paramName);
      if (fromHash) return fromHash;
    }

    return null;
  };

  const [lastPayload, setLastPayload] = useState<BookingPayload | null>(null);
  const [lastDetails, setLastDetails] = useState<{
    equipment: Equipment;
    clientPrenom: string;
    clientNom: string;
    clientEmail: string;
    startDate: string;
    endDate: string;
    sousTotal?: number;
    fraisService?: number;
    totalLocation: number;
    montantCaution: number;
    dureeJours: number;
    networkStatus: 'success' | 'cors_fallback' | 'simulated';
    stripeCheckoutUrl?: string | null;
    stripePaymentUrl?: string | null;
    stripeCautionUrl?: string | null;
  } | null>(null);

  // Nettoyage de l'URL de retour Stripe (sans rechargement de page)
  const clearStripeReturnUrl = () => {
    try {
      const cleanPath = window.location.pathname.includes('booking-success') ? '/' : window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);
    } catch {}
  };

  /**
   * Traite le retour de Stripe. Les réservations vivent désormais dans Supabase :
   *   payment_ok → le paiement location est encaissé, on redirige vers l'empreinte de caution ;
   *   caution_ok → la réservation passe en « en_attente_remise » et l'e-mail récapitulatif part ;
   *   cancel     → la réservation n'est supprimée que si aucun paiement n'a été encaissé.
   */
  const applyStripeReturn = async (stripeStatus: string, bookingRef: string | null) => {
    // ── CAS 1 : paiement de la location validé → empreinte de caution ──
    if (stripeStatus === 'payment_ok') {
      if (bookingRef) {
        // Trace le paiement : une annulation de la caution ne doit jamais effacer une location payée.
        await updateBookingRecord(bookingRef, { paymentConfirmedAt: new Date().toISOString() });
      }

      let cautionUrl = bookingRef ? sessionStorage.getItem(`matik_caution_url_${bookingRef}`) : null;
      if (!cautionUrl) cautionUrl = sessionStorage.getItem('matik_last_caution_url');
      if (!cautionUrl && bookingRef) {
        const row = await fetchBookingById(bookingRef);
        if (row?.stripeCautionUrl) cautionUrl = row.stripeCautionUrl;
      }

      if (cautionUrl) {
        console.log('🔗 [Stripe Flow] Redirection automatique vers la caution.');
        window.location.href = cautionUrl;
        return;
      }

      console.warn('⚠️ [Stripe Flow] URL de caution introuvable, ouverture de la confirmation.');
      setCurrentPage('accueil');
      setIsConfirmationModalOpen(true);
      return;
    }

    // ── CAS 2 : caution validée → réservation confirmée ──
    if (stripeStatus === 'caution_ok') {
      const sessionId = extractUrlParam('session_id');
      let found = bookingRef ? await fetchBookingById(bookingRef) : null;

      if (!found && !bookingRef) {
        const mine = await fetchBookingsForUser();
        found = mine.find((b) => b.status === 'pending_payment') || mine[0] || null;
      }

      const patch: BookingUpdate = {};
      if (sessionId) {
        try {
          const details = await syncCautionSessionDetailsApi(sessionId);
          if (details.success) {
            patch.stripeCautionPaymentIntentId = details.paymentIntentId;
            patch.stripeCustomerId = details.customerId;
            patch.stripePaymentMethodId = details.paymentMethodId;
            patch.cautionAuthorizedAt = details.cautionAuthorizedAt || new Date().toISOString();
          }
        } catch (err) {
          console.warn('⚠️ [Stripe Details] Récupération des détails impossible :', err);
        }
      }

      if (found && found.status === 'pending_payment') {
        patch.status = 'en_attente_remise';
      }

      if (found && Object.keys(patch).length > 0) {
        const updated = await updateBookingRecord(found.id, patch);
        found = updated.booking || ({ ...found, ...patch } as BookingRecord);
      }

      if (found) {
        const confirmed: BookingRecord = found;

        setBookingList((prev) => [confirmed, ...prev.filter((b) => b.id !== confirmed.id)]);

        // E-mail récapitulatif : envoyé une seule fois par réservation
        if (!confirmed.confirmationEmailSentAt) {
          sendConfirmationEmailAfterValidation({
            bookingId: confirmed.id,
            clientPrenom: confirmed.clientName.split(' ')[0] || confirmed.clientName,
            clientNom: confirmed.clientName.split(' ').slice(1).join(' ') || '',
            clientEmail: confirmed.clientEmail,
            clientTelephone: confirmed.clientPhone,
            loueurNom: confirmed.ownerName,
            loueurEmail: confirmed.ownerEmail,
            loueurTelephone: confirmed.ownerPhone,
            equipmentName: confirmed.equipmentName,
            equipmentCategory: confirmed.equipmentCategory,
            startDate: confirmed.startDate,
            endDate: confirmed.endDate,
            dureeJours: confirmed.days,
            sousTotal: confirmed.sousTotal || 0,
            fraisService: confirmed.fraisService || 0,
            totalLocation: confirmed.totalPrice,
            montantCaution: confirmed.cautionAmount,
          })
            .then(() => updateBookingRecord(confirmed.id, { confirmationEmailSentAt: new Date().toISOString() }))
            .catch((e) => console.warn('Erreur envoi email récapitulatif :', e));
        }

        // Restitution des détails pour la modale de confirmation
        setLastDetails({
          equipment: {
            id: confirmed.equipmentId,
            name: confirmed.equipmentName,
            category: confirmed.equipmentCategory,
            dailyRate: 0,
            depositAmount: confirmed.cautionAmount,
            image: confirmed.equipmentImage,
            description: '',
            specs: [],
            partnerArtisan: confirmed.ownerName || 'Loueur Matik',
            inStock: true,
          },
          clientPrenom: confirmed.clientName.split(' ')[0] || confirmed.clientName,
          clientNom: confirmed.clientName.split(' ').slice(1).join(' ') || '',
          clientEmail: confirmed.clientEmail,
          startDate: confirmed.startDate,
          endDate: confirmed.endDate,
          sousTotal: confirmed.sousTotal,
          fraisService: confirmed.fraisService,
          totalLocation: confirmed.totalPrice,
          montantCaution: confirmed.cautionAmount,
          dureeJours: confirmed.days,
          networkStatus: 'success',
        });
        setLastPayload({
          client_nom: confirmed.clientName,
          client_email: confirmed.clientEmail,
          artisan_nom: confirmed.ownerName || 'Loueur Matik',
          nom_matiere: confirmed.equipmentName,
          duree_jours: confirmed.days,
          total_location: confirmed.totalPrice,
          montant_caution: confirmed.cautionAmount,
        });
      }

      setCurrentPage('accueil');
      setIsConfirmationModalOpen(true);
      return;
    }

    // ── CAS 3 : annulation / retour arrière ──
    if (stripeStatus === 'cancel') {
      if (bookingRef) {
        const row = await fetchBookingById(bookingRef);
        if (!row?.paymentConfirmedAt) {
          await deleteBookingRecord(bookingRef);
          setBookingList((prev) => prev.filter((b) => b.id !== bookingRef));
        } else {
          console.warn('⚠️ [Stripe Flow] Caution annulée mais location déjà payée : réservation conservée.');
        }
      }
      try {
        if (bookingRef) sessionStorage.removeItem(`matik_caution_url_${bookingRef}`);
        sessionStorage.removeItem('matik_last_caution_url');
      } catch {}
      setCurrentPage('accueil');
      return;
    }

    setCurrentPage('accueil');
  };

  /**
   * Recherche lancée depuis l'accueil : applique les filtres puis ouvre le catalogue
   * et fait défiler jusqu'à la section des résultats.
   */
  const handleSearchFromHome = (filters: CatalogFilters) => {
    setCatalogFilters(filters);
    setCurrentPage('catalogue');
    window.setTimeout(() => {
      document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // Charge les données sauvegardées ou réinitialise les données de test préchargées
  useEffect(() => {
    try {
      // Nettoyage immédiat du hash résiduel (# ou #/) si présent
      if (window.location.hash === '#' || window.location.hash === '#/' || window.location.hash === '') {
        if (window.location.hash) {
          try {
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
          } catch {}
        }
      }

      // ─── LE RETOUR STRIPE EST TRAITÉ APRÈS L'INITIALISATION DE LA SESSION (voir plus bas) ───

      const hasResetDemo = localStorage.getItem('matik_clean_virgin_state_prod_v1');
      if (!hasResetDemo) {
        localStorage.removeItem('matik_equipment_list');
        localStorage.removeItem('matik_bookings');
        localStorage.setItem('matik_clean_virgin_state_prod_v1', 'true');
      }

      // Chargement de la session utilisateur durable (clé matik_user_session)
      let initialUser: CurrentUser = null;
      const savedUserStr = localStorage.getItem('matik_user_session') || localStorage.getItem('matik_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && typeof parsed === 'object') {
          initialUser = parsed;
          setCurrentUser(parsed);
          localStorage.setItem('matik_user_session', JSON.stringify(parsed));
        }
      }

      // Chargement initial des annonces depuis Supabase
      loadEquipmentsData(initialUser);

      // Synchronisation de la session active Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const profile = mapSupabaseUserToMatikProfile(session.user);
          setCurrentUser(profile);
          loadEquipmentsData(profile);
          try {
            localStorage.setItem('matik_user_session', JSON.stringify(profile));
            localStorage.setItem('matik_user', JSON.stringify(profile));
          } catch {}
        }
      });

      // Écoute en temps réel des changements d'état d'authentification Supabase (Login, Logout, OAuth redirect)
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.info('[Supabase Auth Event]', event);
        if (session?.user) {
          const profile = mapSupabaseUserToMatikProfile(session.user);

          // Si l'utilisateur revient d'un OAuth après avoir accepté les CGU,
          // on enregistre la preuve de consentement dans ses métadonnées.
          if (!session.user.user_metadata?.terms_accepted_at) {
            try {
              const pendingRaw = localStorage.getItem('matik_terms_pending');
              if (pendingRaw) {
                const pending = JSON.parse(pendingRaw);
                const acceptedAt = Date.parse(pending.terms_accepted_at || '');
                const isFresh =
                  Number.isFinite(acceptedAt) && Date.now() - acceptedAt < 30 * 60 * 1000;

                if (isFresh) {
                  void supabase.auth
                    .updateUser({
                      data: {
                        terms_accepted_at: pending.terms_accepted_at,
                        terms_version: pending.terms_version,
                      },
                    })
                    .then(() => localStorage.removeItem('matik_terms_pending'))
                    .catch(() => {});
                } else {
                  localStorage.removeItem('matik_terms_pending');
                }
              }
            } catch {}
          }

          setCurrentUser(profile);
          loadEquipmentsData(profile);
          try {
            localStorage.setItem('matik_user_session', JSON.stringify(profile));
            localStorage.setItem('matik_user', JSON.stringify(profile));
          } catch {}
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          loadEquipmentsData(null);
          try {
            localStorage.removeItem('matik_user_session');
            localStorage.removeItem('matik_user');
          } catch {}
        }
      });

      // Écoute temps réel des changements sur la table equipments de Supabase
      const unsubscribeRealtime = subscribeToEquipments(() => {
        loadEquipmentsData(currentUser);
      });

      // Traitement du retour Stripe (paiement location puis empreinte de caution)
      const stripeStatus = extractUrlParam('stripe_status');
      const bookingRef = extractUrlParam('booking_id');
      if (stripeStatus) {
        console.log(`💳 [Stripe Redirect] Statut détecté : ${stripeStatus}, bookingId : ${bookingRef || 'inconnu'}`);
        void applyStripeReturn(stripeStatus, bookingRef)
          .catch((err) => console.warn('⚠️ [Stripe Flow] Traitement du retour impossible :', err))
          .finally(() => clearStripeReturnUrl());
      }

      return () => {
        authListener.subscription.unsubscribe();
        unsubscribeRealtime();
      };
    } catch {}
  }, []);

  // Chargement initial + synchronisation temps réel des réservations de l'utilisateur.
  // La RLS ne renvoie que les réservations où il est locataire ou loueur : une réservation
  // passée sur mobile apparaît donc immédiatement dans le dashboard du propriétaire.
  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      if (!currentUser?.id) {
        if (!cancelled) setBookingList([]);
        return;
      }
      const bookings = await fetchBookingsForUser();
      if (!cancelled) setBookingList(bookings);
    };

    void loadBookings();
    const unsubscribe = subscribeToBookings(() => {
      void loadBookings();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser?.id]);
  const [inspectionModalData, setInspectionModalData] = useState<{
    isOpen: boolean;
    equipment: Equipment | null;
    booking: BookingRecord | null;
    type: 'check_in' | 'check_out';
    isTenantSignaling?: boolean;
  }>({
    isOpen: false,
    equipment: null,
    booking: null,
    type: 'check_in',
    isTenantSignaling: false,
  });

  // Loueur Equipment Management
  const handleAddNewEquipment = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setEquipmentToEdit(null);
    setIsEditorModalOpen(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setEquipmentToEdit(equipment);
    setIsEditorModalOpen(true);
  };

  const handleSaveEquipment = async (saved: Equipment) => {
    // Statut de publication : TOUJOURS true par défaut pour visibilité dans le catalogue public
    const equipmentToSave: Equipment = {
      ...saved,
      isActive: saved.isActive !== false,
      is_published: true,
      ownerId: saved.ownerId || currentUser?.id,
    };

    // 1. Mise à jour immédiate optimiste locale
    setEquipmentList((prev) => {
      const exists = prev.some((item) => item.id === equipmentToSave.id);
      const updated = exists
        ? prev.map((item) => (item.id === equipmentToSave.id ? equipmentToSave : item))
        : [equipmentToSave, ...prev];
      try {
        localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (!selectedEquipment || selectedEquipment.id === equipmentToSave.id) {
      setSelectedEquipment(equipmentToSave);
    }

    // 2. Persistance dans la table 'equipments' de Supabase
    const res = await saveEquipmentToSupabase(equipmentToSave, currentUser?.id);
    if (res.success && res.data) {
      const savedFromServer = res.data;
      setEquipmentList((prev) => {
        const updated = prev.map((item) => (item.id === equipmentToSave.id ? savedFromServer : item));
        try {
          localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      if (selectedEquipment?.id === equipmentToSave.id) {
        setSelectedEquipment(savedFromServer);
      }
    } else if (res.error) {
      console.warn('[handleSaveEquipment] Notice Supabase save:', res.error);
    }
  };

  const handleToggleActive = async (id: string) => {
    const item = equipmentList.find((e) => e.id === id);
    const newStatus = item ? item.isActive === false : true;

    setEquipmentList((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, isActive: newStatus, is_published: newStatus } : e
      );
      try {
        localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await updateEquipmentStatusInSupabase(id, newStatus);
  };

  const handleDeleteEquipment = async (id: string) => {
    setEquipmentList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
      } catch {}
      if (selectedEquipment?.id === id) {
        setSelectedEquipment(updated.length > 0 ? updated[0] : null);
      }
      return updated;
    });

    await deleteEquipmentFromSupabase(id);
  };

  // Profit Simulator action
  const handleStartDepotFromSimulator = (
    suggestedCategory?: string,
    suggestedName?: string,
    suggestedPrice?: number
  ) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const draft: Equipment = {
      id: generateUUID(),
      name: suggestedName || '',
      category: suggestedCategory || 'High-Tech & Audiovisuel',
      dailyRate: suggestedPrice || 25,
      depositAmount: suggestedPrice ? Math.round(suggestedPrice * 10) : 250,
      image: '',
      description: '',
      specs: [],
      partnerArtisan:
        currentUser?.role === 'loueur_pro'
          ? currentUser.companyName || currentUser.name
          : currentUser?.role === 'loueur_particulier'
          ? `${currentUser.prenom} ${currentUser.nom}`.trim()
          : currentUser && 'prenom' in currentUser && currentUser.prenom
          ? `${currentUser.prenom} ${currentUser.nom || ''}`.trim()
          : currentUser?.name || '',
      inStock: true,
      isActive: true,
      is_published: true,
      ownerType: currentUser?.role === 'loueur_pro' ? 'pro' : 'particulier',
      ownerId: currentUser?.id,
    };
    setEquipmentToEdit(draft);
    setIsEditorModalOpen(true);
  };

  // Passport QR Modal Handlers
  const handleOpenPassportModal = (equipment: Equipment) => {
    setPassportModalEquipment(equipment);
    setIsPassportModalOpen(true);
  };

  // Equipment Details & Review System Modal Handlers
  const handleOpenDetails = (equipment: Equipment) => {
    setDetailsEquipment(equipment);
    setIsDetailsOpen(true);
  };

  // Digital Inspection Modal Handlers
  const handleOpenInspectionModal = (
    equipment: Equipment | null,
    booking: BookingRecord | null,
    type: 'check_in' | 'check_out',
    isTenantSignaling?: boolean
  ) => {
    setInspectionModalData({
      isOpen: true,
      equipment,
      booking,
      type,
      isTenantSignaling: Boolean(isTenantSignaling),
    });
  };

  const handleSaveInspectionReport = async (report: InspectionReport, releaseCaution?: boolean) => {
    if (!report.bookingId) return;

    const isTenantSignal = report.submittedBy === 'client' || inspectionModalData.isTenantSignaling;
    const bookingId = report.bookingId;

    // Calcule le nouveau statut et les champs à persister dans Supabase
    const patch: BookingUpdate = {
      checkInReport: report.type === 'check_in' ? report : undefined,
      checkOutReport: report.type === 'check_out' ? report : undefined,
      restitutionSignaledAt: isTenantSignal ? report.timestamp : undefined,
    };

    if (report.type === 'check_in') {
      patch.status = 'en_cours';
    } else if (report.type === 'check_out') {
      if (isTenantSignal) {
        patch.status = 'restitution_signalee';
      } else if (releaseCaution) {
        patch.status = 'restitue';
        patch.stripeCautionStatus = 'caution_liberee';
      }
    }

    // Mise à jour optimiste de l'interface
    setBookingList((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: patch.status || b.status,
              restitutionSignaledAt: patch.restitutionSignaledAt || b.restitutionSignaledAt,
              stripeCautionStatus: patch.stripeCautionStatus || b.stripeCautionStatus,
              checkInReport: patch.checkInReport || b.checkInReport,
              checkOutReport: patch.checkOutReport || b.checkOutReport,
            }
          : b
      )
    );

    // Persistance de l'état des lieux dans Supabase
    const result = await updateBookingRecord(bookingId, patch);
    if (!result.success) {
      console.warn('[Inspection] Enregistrement Supabase impossible :', result.error);
    }

    // Libération réelle de l'empreinte Stripe (check-out validé par le loueur)
    if (releaseCaution && !isTenantSignal) {
      const targetBooking = bookingList.find((b) => b.id === bookingId);
      try {
        const res = await releaseStripeCautionApi({
          bookingId,
          paymentIntentId: targetBooking?.stripeCautionPaymentIntentId,
          sessionId: targetBooking?.stripeCautionSessionId,
        });
        if (res.success) {
          console.log(`✅ [Stripe Caution Automatique] Caution libérée pour ${bookingId}`);
        } else {
          console.warn('⚠️ [Stripe Caution Automatique] Problème libération Stripe :', res.error);
        }
      } catch (err) {
        console.error('❌ [Stripe Caution Automatique] Erreur :', err);
      }
    }
  };

  const handleReleaseCaution = async (bookingId: string) => {
    const targetBooking = bookingList.find((b) => b.id === bookingId);

    setBookingList((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'restitue' as const, stripeCautionStatus: 'caution_liberee' as const }
          : b
      )
    );

    const result = await updateBookingRecord(bookingId, {
      status: 'restitue',
      stripeCautionStatus: 'caution_liberee',
    });
    if (!result.success) {
      console.warn('[Caution] Libération non persistée :', result.error);
    }

    try {
      await releaseStripeCautionApi({
        bookingId,
        paymentIntentId: targetBooking?.stripeCautionPaymentIntentId,
        sessionId: targetBooking?.stripeCautionSessionId,
      });
    } catch (e) {
      console.warn('Erreur libération Stripe :', e);
    }
  };

  const handleDisputeCaution = async (bookingId: string, reason: string) => {
    const disputedAt = new Date().toISOString();

    setBookingList((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, stripeCautionStatus: 'litige_bloque' as const, disputeReason: reason, disputedAt }
          : b
      )
    );

    const result = await updateBookingRecord(bookingId, {
      stripeCautionStatus: 'litige_bloque',
      disputeReason: reason,
      disputedAt,
    });
    if (!result.success) {
      console.warn('[Caution] Litige non persisté :', result.error);
    }
  };

  /**
   * Action post-restitution loueur : Rendre disponible (réactiver), Masquer (désactiver), ou Supprimer l'annonce
   */
  const handlePostRestitutionEquipmentAction = async (
    equipmentId: string,
    action: 'available' | 'hide' | 'delete'
  ) => {
    if (action === 'available') {
      // 1. Rendre à nouveau disponible : réactive et publie sur le catalogue public
      setEquipmentList((prev) => {
        const updated = prev.map((e) =>
          e.id === equipmentId ? { ...e, isActive: true, is_published: true, inStock: true } : e
        );
        try {
          localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      await updateEquipmentStatusInSupabase(equipmentId, true);
    } else if (action === 'hide') {
      // 2. Désactiver / Masquer : conserve dans l'espace personnel mais passe en is_published = false (brouillon)
      setEquipmentList((prev) => {
        const updated = prev.map((e) =>
          e.id === equipmentId ? { ...e, isActive: false, is_published: false } : e
        );
        try {
          localStorage.setItem('matik_equipment_list', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      await updateEquipmentStatusInSupabase(equipmentId, false);
    } else if (action === 'delete') {
      // 3. Supprimer : supprime définitivement de la base Supabase et de la liste
      await handleDeleteEquipment(equipmentId);
    }
  };

  // Scroll helpers
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectEquipment = (item: Equipment) => {
    setSelectedEquipment(item);
    if (currentPage !== 'accueil' && currentPage !== 'catalogue') {
      setCurrentPage('catalogue');
    }
    setTimeout(() => {
      scrollToSection('reservation');
    }, 50);
  };

  const handleOpenBooking = () => {
    if (currentPage !== 'accueil' && currentPage !== 'catalogue') {
      setCurrentPage('catalogue');
    }
    setTimeout(() => {
      scrollToSection(selectedEquipment ? 'reservation' : 'catalogue');
    }, 50);
  };



  const handleBookingSuccess = async (
    payload: BookingPayload,
    details: {
      bookingId?: string;
      equipment: Equipment;
      clientPrenom: string;
      clientNom: string;
      clientEmail: string;
      clientTelephone?: string;
      startDate: string;
      endDate: string;
      sousTotal: number;
      fraisService: number;
      totalLocation: number;
      montantCaution: number;
      dureeJours: number;
      networkStatus: 'success' | 'cors_fallback' | 'simulated';
      stripeCheckoutUrl?: string | null;
      stripePaymentUrl?: string | null;
      stripeCautionUrl?: string | null;
      stripeCautionSessionId?: string | null;
      stripeCautionPaymentIntentId?: string | null;
      stripeCustomerId?: string | null;
      stripePaymentMethodId?: string | null;
      cautionAuthorizedAt?: string | null;
    }
  ) => {
    setLastPayload(payload);
    setLastDetails(details);

    const finalBookingId = details.bookingId || (payload as any).booking_id || (payload as any).bookingId || `bk-${Date.now()}`;

    // Enregistre la réservation en statut 'pending_payment' :
    // L'annonce reste disponible jusqu'à confirmation effective du paiement Stripe.
    // Le statut sera mis à jour en 'en_attente_remise' au retour stripe_status=caution_ok.
    const newBooking: BookingRecord = {
      id: finalBookingId,
      bookingId: finalBookingId,
      equipmentId: details.equipment.id,
      equipmentName: details.equipment.name,
      equipmentCategory: details.equipment.category,
      equipmentImage: details.equipment.image,
      ownerId: details.equipment.ownerId,
      ownerName: details.equipment.ownerName || details.equipment.partnerArtisan || 'Propriétaire Matik',
      ownerEmail: details.equipment.ownerEmail || '',
      ownerPhone: details.equipment.ownerPhone || '',
      clientName: `${details.clientPrenom} ${details.clientNom}`.trim() || 'Locataire Matik',
      clientEmail: details.clientEmail,
      clientPhone: details.clientTelephone || 'Non renseigné',
      startDate: details.startDate,
      endDate: details.endDate,
      days: details.dureeJours,
      sousTotal: details.sousTotal,
      fraisService: details.fraisService,
      totalPrice: details.totalLocation,
      cautionAmount: details.montantCaution,
      status: 'pending_payment', // ⏳ En attente de paiement Stripe — n'impacte pas la disponibilité
      stripeCautionStatus: 'sequestre_sans_debit',
      stripeCautionUrl: details.stripeCautionUrl || undefined,
      stripeCautionSessionId: details.stripeCautionSessionId || undefined,
      stripeCautionPaymentIntentId: details.stripeCautionPaymentIntentId || undefined,
      stripeCustomerId: details.stripeCustomerId || undefined,
      stripePaymentMethodId: details.stripePaymentMethodId || undefined,
      cautionAuthorizedAt: details.cautionAuthorizedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (details.stripeCautionUrl) {
      try {
        sessionStorage.setItem(`matik_caution_url_${newBooking.id}`, details.stripeCautionUrl);
        const refId = (payload as any).booking_id || (payload as any).bookingId;
        if (refId) {
          sessionStorage.setItem(`matik_caution_url_${refId}`, details.stripeCautionUrl);
        }
      } catch {}
    }

    // Mise à jour optimiste, puis persistance réelle dans Supabase.
    // En cas d'échec, on annule l'affichage et on bloque la redirection Stripe :
    // jamais de paiement sans réservation enregistrée côté loueur.
    setBookingList((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);

    const result = await insertBookingRecord(newBooking);
    if (!result.success) {
      setBookingList((prev) => prev.filter((b) => b.id !== newBooking.id));
      console.error('[Booking] Enregistrement Supabase impossible :', result.error);
      throw new Error(
        result.error === 'AUTH_REQUIRED'
          ? 'Connectez-vous pour finaliser votre réservation.'
          : `Impossible d'enregistrer la réservation (${result.error || 'erreur base de données'}). Aucun paiement n'a été effectué.`
      );
    }

    if (result.booking) {
      setBookingList((prev) => [result.booking as BookingRecord, ...prev.filter((b) => b.id !== (result.booking as BookingRecord).id)]);
    }

    // La réservation est bien en base : on peut afficher la confirmation
    // (si aucune redirection Stripe n'est en cours).
    if (!details.stripeCheckoutUrl && !details.stripePaymentUrl) {
      setIsConfirmationModalOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase SignOut Warning]', err);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('matik_user_session');
      localStorage.removeItem('matik_user');
    } catch {}
  };

  const handleUpdateLoueurProfile = (profile: LoueurProProfile | LoueurParticulierProfile) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('matik_user_session', JSON.stringify(profile));
      localStorage.setItem('matik_user', JSON.stringify(profile));
    } catch {}
  };

  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    if (user) {
      try {
        localStorage.setItem('matik_user_session', JSON.stringify(user));
        localStorage.setItem('matik_user', JSON.stringify(user));
      } catch {}
    }
    if (user?.role === 'loueur_pro' || user?.role === 'loueur_particulier') {
      setCurrentPage('espace-loueur');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navbar with Page Tabs & Espace Loueur Login */}
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenBooking={handleOpenBooking}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenAddEquipment={handleAddNewEquipment}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {/* PAGE 1: ACCUEIL */}
        {currentPage === 'accueil' && (
          <>
            <Hero
              onExploreCatalog={() => {
                setCurrentPage('catalogue');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenBooking={handleOpenBooking}
              onAddNewEquipment={handleAddNewEquipment}
              onSearch={handleSearchFromHome}
              initialFilters={catalogFilters}
            />

            {/* INNOVATION 3: Simulateur de Gains & Rentabilité Interactif */}
            <div id="simulateur-rentabilite">
              <ProfitSimulator onStartDepot={handleStartDepotFromSimulator} />
            </div>

            <Catalog
              equipmentList={equipmentList}
              selectedEquipmentId={selectedEquipment?.id || ''}
              bookingList={bookingList}
              isLoading={isEquipmentsLoading}
              filters={catalogFilters}
              onFiltersChange={setCatalogFilters}
              onSelectEquipment={handleSelectEquipment}
              onAddNewEquipment={handleAddNewEquipment}
              onOpenPassportModal={handleOpenPassportModal}
              onViewDetails={handleOpenDetails}
            />

            {selectedEquipment && (
              <BookingForm
                equipmentList={equipmentList}
                selectedEquipment={selectedEquipment}
                bookingList={bookingList}
                onSelectEquipment={setSelectedEquipment}
                onBookingSuccess={handleBookingSuccess}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}

            <HowItWorks onStartBooking={handleOpenBooking} />

            <Testimonials onStartBooking={handleOpenBooking} />

            {/* PWA App Download Showcase Banner */}
            <AppDownloadBanner onOpenInstallModal={() => setIsInstallModalOpen(true)} />

            <StripeCautionSection />
          </>
        )}

        {/* PAGE 2: CATALOGUE */}
        {currentPage === 'catalogue' && (
          <div className="space-y-12">
            <Catalog
              equipmentList={equipmentList}
              selectedEquipmentId={selectedEquipment?.id || ''}
              bookingList={bookingList}
              isLoading={isEquipmentsLoading}
              filters={catalogFilters}
              onFiltersChange={setCatalogFilters}
              onSelectEquipment={handleSelectEquipment}
              onAddNewEquipment={handleAddNewEquipment}
              onOpenPassportModal={handleOpenPassportModal}
              onViewDetails={handleOpenDetails}
            />

            <div id="simulateur-rentabilite">
              <ProfitSimulator onStartDepot={handleStartDepotFromSimulator} />
            </div>

            {selectedEquipment && (
              <BookingForm
                equipmentList={equipmentList}
                selectedEquipment={selectedEquipment}
                bookingList={bookingList}
                onSelectEquipment={setSelectedEquipment}
                onBookingSuccess={handleBookingSuccess}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* PAGE 3: ESPACE LOUEUR (DEDICATED DASHBOARD WITH RESERVATIONS & CAUTION RELEASE) */}
        {currentPage === 'espace-loueur' && (
          <LoueurDashboard
            currentUser={currentUser}
            equipmentList={equipmentList}
            bookingList={bookingList}
            onOpenAddModal={handleAddNewEquipment}
            onEditEquipment={handleEditEquipment}
            onToggleActive={handleToggleActive}
            onDeleteEquipment={handleDeleteEquipment}
            onNavigateToCatalog={() => {
              setCurrentPage('catalogue');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenLoginModal={() => setIsAuthModalOpen(true)}
            onUpdateProfile={handleUpdateLoueurProfile}
            onLogout={handleLogout}
            onOpenPassportModal={handleOpenPassportModal}
            onOpenInspectionModal={handleOpenInspectionModal}
            onReleaseCaution={handleReleaseCaution}
            onDisputeCaution={handleDisputeCaution}
            onEquipmentPostRestitutionAction={handlePostRestitutionEquipmentAction}
            onOpenProfitSimulator={() => {
              setCurrentPage('accueil');
              setTimeout(() => scrollToSection('simulateur-rentabilite'), 50);
            }}
            onViewReviews={handleOpenDetails}
          />
        )}

        {/* PAGE 4: GARANTIES & CONFIANCE */}
        {currentPage === 'garanties' && (
          <GarantiesPage
            onStartBooking={handleOpenBooking}
            onExploreCatalog={() => {
              setCurrentPage('catalogue');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            currentUser={currentUser}
          />
        )}

        {/* PAGES LÉGALES (Mentions légales, CGU / CGV, Confidentialité) */}
        {(currentPage === 'mentions-legales' ||
          currentPage === 'cgu' ||
          currentPage === 'confidentialite') && (
          <LegalPage
            page={currentPage}
            onBack={() => {
              setCurrentPage('accueil');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Quiet Footer with multi-page links */}
      <Footer
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onNavigate={setCurrentPage}
      />

      {/* INNOVATION 1: Passeport QR Code Modal */}
      <PassportQRModal
        isOpen={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        equipment={passportModalEquipment}
        onLaunchInspection={(eq) => handleOpenInspectionModal(eq, null, 'check_in')}
      />

      {/* INNOVATION 2: État des Lieux Photo Numérique (Check-in & Check-out) */}
      <DigitalInspectionModal
        isOpen={inspectionModalData.isOpen}
        onClose={() => setInspectionModalData((prev) => ({ ...prev, isOpen: false }))}
        equipment={inspectionModalData.equipment}
        booking={inspectionModalData.booking}
        type={inspectionModalData.type}
        isTenantSignaling={inspectionModalData.isTenantSignaling}
        onSaveReport={handleSaveInspectionReport}
        onOpenReview={handleOpenDetails}
      />

      {/* Equipment Details & ReviewSystem Modal */}
      <EquipmentDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        equipment={detailsEquipment}
        bookingList={bookingList}
        onSelectBooking={handleSelectEquipment}
        onOpenPassport={handleOpenPassportModal}
        currentUser={currentUser}
      />

      {/* PWA App Download & Install Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultRole="loueur_pro"
        onOpenLegal={(page) => {
          setIsAuthModalOpen(false);
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        payload={lastPayload}
        details={lastDetails}
      />

      {/* Equipment Loueur Add / Edit Modal with mandatory caution */}
      <EquipmentEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        equipmentToEdit={equipmentToEdit}
        onSave={handleSaveEquipment}
        onDelete={handleDeleteEquipment}
        currentUser={currentUser}
      />
    </div>
  );
}
