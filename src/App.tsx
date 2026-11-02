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
import { AuthModal } from './components/AuthModal';
import { AppDownloadBanner } from './components/AppDownloadBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { ProfitSimulator } from './components/ProfitSimulator';
import { PassportQRModal } from './components/PassportQRModal';
import { DigitalInspectionModal } from './components/DigitalInspectionModal';
import { EquipmentDetails } from './components/EquipmentDetails';
import { Footer } from './components/Footer';
import { EQUIPMENT_LIST } from './data/equipment';
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

// Site vierge : aucun historique de réservation de démonstration
const INITIAL_BOOKINGS: BookingRecord[] = [];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('accueil');
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
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
    }
  };

  // Charge les données sauvegardées ou réinitialise les données de test préchargées
  useEffect(() => {
    try {
      // Effacement des anciennes données de test préchargées pour démarrage production 100% vierge
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

      const savedBookingsStr = localStorage.getItem('matik_bookings');
      if (savedBookingsStr) {
        const parsedBookings = JSON.parse(savedBookingsStr);
        if (Array.isArray(parsedBookings) && parsedBookings.length > 0) {
          setBookingList(parsedBookings);
        }
      }

      return () => {
        authListener.subscription.unsubscribe();
        unsubscribeRealtime();
      };
    } catch {}
  }, []);
  const [inspectionModalData, setInspectionModalData] = useState<{
    isOpen: boolean;
    equipment: Equipment | null;
    booking: BookingRecord | null;
    type: 'check_in' | 'check_out';
  }>({
    isOpen: false,
    equipment: null,
    booking: null,
    type: 'check_in',
  });

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
  } | null>(null);

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
    type: 'check_in' | 'check_out'
  ) => {
    setInspectionModalData({
      isOpen: true,
      equipment,
      booking,
      type,
    });
  };

  const handleSaveInspectionReport = (report: InspectionReport, releaseCaution?: boolean) => {
    if (report.bookingId) {
      setBookingList((prev) => {
        const updated = prev.map((b) => {
          if (b.id === report.bookingId) {
            return {
              ...b,
              status: releaseCaution ? ('restitue' as const) : ('en_cours' as const),
              stripeCautionStatus: releaseCaution
                ? ('caution_liberee' as const)
                : b.stripeCautionStatus,
              checkInReport: report.type === 'check_in' ? report : b.checkInReport,
              checkOutReport: report.type === 'check_out' ? report : b.checkOutReport,
            };
          }
          return b;
        });
        try {
          localStorage.setItem('matik_bookings', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const handleReleaseCaution = (bookingId: string) => {
    setBookingList((prev) => {
      const updated = prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'restitue' as const,
            stripeCautionStatus: 'caution_liberee' as const,
          };
        }
        return b;
      });
      try {
        localStorage.setItem('matik_bookings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
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



  const handleBookingSuccess = (
    payload: BookingPayload,
    details: {
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
    }
  ) => {
    setLastPayload(payload);
    setLastDetails(details);
    setIsConfirmationModalOpen(true);

    // Also automatically register booking in Loueur's reservations (Option A)
    const newBooking: BookingRecord = {
      id: `bk-${Date.now()}`,
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
      status: 'en_attente_remise',
      stripeCautionStatus: 'sequestre_sans_debit',
      createdAt: new Date().toISOString(),
    };

    setBookingList((prev) => {
      const updated = [newBooking, ...prev];
      try {
        localStorage.setItem('matik_bookings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
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
            />

            {/* INNOVATION 3: Simulateur de Gains & Rentabilité Interactif */}
            <div id="simulateur-rentabilite">
              <ProfitSimulator onStartDepot={handleStartDepotFromSimulator} />
            </div>

            <Catalog
              equipmentList={equipmentList}
              selectedEquipmentId={selectedEquipment?.id || ''}
              bookingList={bookingList}
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
