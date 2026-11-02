import React, { useState, useEffect, useMemo } from 'react';
import { Equipment, LoueurProProfile, LoueurParticulierProfile, ClientProfile, CurrentUser, BookingRecord } from '../types';
import { CounterpartContactCard } from './CounterpartContactCard';
import { isEquipmentRented } from '../utils/availability';
import {
  Building2,
  Plus,
  Edit3,
  Power,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Search,
  Lock,
  HeartHandshake,
  MapPin,
  Mail,
  Phone,
  User,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle,
  Hash,
  Briefcase,
  QrCode,
  Camera,
  Calendar,
  Calculator,
  Star,
  MessageSquare,
  LogOut,
} from 'lucide-react';

interface LoueurDashboardProps {
  currentUser: CurrentUser;
  equipmentList: Equipment[];
  bookingList?: BookingRecord[];
  onOpenAddModal: () => void;
  onEditEquipment: (equipment: Equipment) => void;
  onToggleActive: (id: string) => void;
  onDeleteEquipment: (id: string) => void;
  onNavigateToCatalog: () => void;
  onOpenLoginModal: () => void;
  onUpdateProfile: (user: LoueurProProfile | LoueurParticulierProfile) => void;
  onLogout?: () => void;
  onOpenPassportModal?: (equipment: Equipment) => void;
  onOpenInspectionModal?: (
    equipment: Equipment | null,
    booking: BookingRecord | null,
    type: 'check_in' | 'check_out'
  ) => void;
  onReleaseCaution?: (bookingId: string) => void;
  onOpenProfitSimulator?: () => void;
  onViewReviews?: (equipment: Equipment) => void;
}

// Reusable Enterprise Floating Input with Leading Icon & Visual Validation States
interface FloatingInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  type?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  isValid: boolean;
  isTouched: boolean;
  onBlur: () => void;
  badge?: string;
  autoComplete?: string;
}

const EnterpriseFloatingInput: React.FC<FloatingInputProps> = ({
  id,
  label,
  value,
  onChange,
  icon,
  type = 'text',
  required = false,
  placeholder = '',
  helperText,
  errorMessage,
  isValid,
  isTouched,
  onBlur,
  badge,
  autoComplete,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Boolean(value && value.length > 0);
  const isFloated = isFocused || hasValue;

  const showError = isTouched && !isValid && Boolean(errorMessage);
  const showSuccess = isTouched && isValid && hasValue;

  return (
    <div className="space-y-1.5 group">
      <div
        className={`relative rounded-2xl border transition-all duration-200 bg-white ${
          showError
            ? 'border-red-400 ring-4 ring-red-500/10 focus-within:border-red-500 focus-within:ring-red-500/20 shadow-xs'
            : showSuccess
            ? 'border-emerald-400 ring-2 ring-emerald-500/10 focus-within:border-emerald-500 focus-within:ring-emerald-500/20 shadow-xs'
            : isFocused
            ? 'border-amber-500 ring-4 ring-amber-400/20 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        {/* Leading icon if provided */}
        {icon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none duration-150 ${
              showError
                ? 'text-red-500'
                : showSuccess
                ? 'text-emerald-600'
                : isFocused
                ? 'text-amber-600'
                : 'text-slate-400'
            }`}
          >
            {icon}
          </div>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur();
          }}
          autoComplete={autoComplete}
          required={required}
          placeholder={isFocused ? placeholder : ''}
          className={`block w-full h-14 ${
            icon ? 'pl-11' : 'pl-4'
          } pr-10 pt-5 pb-1.5 text-sm font-semibold text-slate-900 bg-transparent rounded-2xl focus:outline-none placeholder-slate-400/70`}
        />

        {/* Floating Label */}
        <label
          htmlFor={id}
          className={`absolute transition-all duration-150 ease-out pointer-events-none select-none ${
            icon ? 'left-11' : 'left-4'
          } ${
            isFloated
              ? 'top-2 text-[10px] font-bold tracking-wider uppercase'
              : 'top-4 text-sm font-medium'
          } ${
            showError
              ? 'text-red-600'
              : showSuccess
              ? 'text-emerald-700'
              : isFocused
              ? 'text-amber-700'
              : 'text-slate-400'
          }`}
        >
          {label} {required && <span className="text-amber-600 font-bold">*</span>}
        </label>

        {/* Right Status Indicator */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {showError && (
            <span title={errorMessage}>
              <AlertCircle className="w-4 h-4 text-red-500 animate-in fade-in zoom-in-75 duration-150" />
            </span>
          )}
          {showSuccess && (
            <span title="Champ vérifié et conforme">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in fade-in zoom-in-75 duration-150" />
            </span>
          )}
          {badge && !showError && !showSuccess && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Validation or Helper Message */}
      {showError ? (
        <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1.5 pl-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 pl-1">{helperText}</p>
      ) : null}
    </div>
  );
};

export const LoueurDashboard: React.FC<LoueurDashboardProps> = ({
  currentUser,
  equipmentList,
  bookingList = [],
  onOpenAddModal,
  onEditEquipment,
  onToggleActive,
  onDeleteEquipment,
  onNavigateToCatalog,
  onOpenLoginModal,
  onUpdateProfile,
  onLogout,
  onOpenPassportModal,
  onOpenInspectionModal,
  onReleaseCaution,
  onOpenProfitSimulator,
  onViewReviews,
}) => {
  const [dashboardTab, setDashboardTab] = useState<'materiel' | 'reservations'>(() => {
    return currentUser?.role === 'client' ? 'reservations' : 'materiel';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');

  // Profile Edit / View state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(!currentUser);
  const [profileRole, setProfileRole] = useState<'loueur_pro' | 'loueur_particulier'>(
    currentUser?.role === 'loueur_particulier' ? 'loueur_particulier' : 'loueur_pro'
  );
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Pro Form Fields
  const [proCompanyName, setProCompanyName] = useState<string>(
    currentUser && 'companyName' in currentUser ? currentUser.companyName : ''
  );
  const [proSiret, setProSiret] = useState<string>(
    currentUser && 'siret' in currentUser ? currentUser.siret : ''
  );
  const [proName, setProName] = useState<string>(
    currentUser && 'name' in currentUser ? currentUser.name || '' : ''
  );
  const [proEmail, setProEmail] = useState<string>(
    currentUser && 'email' in currentUser ? currentUser.email : ''
  );
  const [proPhone, setProPhone] = useState<string>(
    currentUser && 'phone' in currentUser ? currentUser.phone : ''
  );
  const [proCity, setProCity] = useState<string>(
    currentUser && 'city' in currentUser ? currentUser.city || '' : ''
  );

  // Particulier Form Fields
  const [particulierPrenom, setParticulierPrenom] = useState<string>(
    currentUser && 'prenom' in currentUser ? currentUser.prenom || '' : ''
  );
  const [particulierNom, setParticulierNom] = useState<string>(
    currentUser && 'nom' in currentUser ? currentUser.nom || '' : ''
  );
  const [particulierEmail, setParticulierEmail] = useState<string>(
    currentUser && 'email' in currentUser ? currentUser.email : ''
  );
  const [particulierPhone, setParticulierPhone] = useState<string>(
    currentUser && 'phone' in currentUser ? currentUser.phone : ''
  );
  const [particulierCity, setParticulierCity] = useState<string>(
    currentUser && 'city' in currentUser ? currentUser.city || '' : ''
  );

  // Field Touched Tracking for enterprise validation on blur
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Sync state if currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'loueur_pro') {
        setProfileRole('loueur_pro');
        setProCompanyName(currentUser.companyName || '');
        setProSiret(currentUser.siret || '');
        setProName(currentUser.name || '');
        setProEmail(currentUser.email || '');
        setProPhone(currentUser.phone || '');
        setProCity(currentUser.city || '');
      } else if (currentUser.role === 'loueur_particulier') {
        setProfileRole('loueur_particulier');
        setParticulierPrenom(currentUser.prenom || '');
        setParticulierNom(currentUser.nom || '');
        setParticulierEmail(currentUser.email || '');
        setParticulierPhone(currentUser.phone || '');
        setParticulierCity(currentUser.city || '');
      }
      setIsEditingProfile(false);
    } else {
      setIsEditingProfile(true);
    }
  }, [currentUser]);

  // Validation Rules
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;
  const isValidSiret = (siret: string) => siret.replace(/\D/g, '').length === 14;

  // Real-time validation computation
  const proValidations = useMemo(() => {
    return {
      companyName: proCompanyName.trim().length >= 2,
      siret: isValidSiret(proSiret),
      name: proName.trim().length >= 2,
      email: isValidEmail(proEmail),
      phone: isValidPhone(proPhone),
      city: proCity.trim().length >= 2,
    };
  }, [proCompanyName, proSiret, proName, proEmail, proPhone, proCity]);

  const particulierValidations = useMemo(() => {
    return {
      prenom: particulierPrenom.trim().length >= 2,
      nom: particulierNom.trim().length >= 2,
      email: isValidEmail(particulierEmail),
      phone: isValidPhone(particulierPhone),
      city: particulierCity.trim().length >= 2,
    };
  }, [particulierPrenom, particulierNom, particulierEmail, particulierPhone, particulierCity]);

  // Overall form validity
  const isProFormValid = Object.values(proValidations).every(Boolean);
  const isParticulierFormValid = Object.values(particulierValidations).every(Boolean);

  const completionCount =
    profileRole === 'loueur_pro'
      ? Object.values(proValidations).filter(Boolean).length
      : Object.values(particulierValidations).filter(Boolean).length;
  const totalCount = profileRole === 'loueur_pro' ? 6 : 5;
  const completionPercent = Math.round((completionCount / totalCount) * 100);

  // Handle SIRET formatting with groups: 834 920 194 00028
  const handleSiretChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 9)} ${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)} ${raw.slice(3)}`;
    }
    setProSiret(formatted);
  };

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched on submit
    if (profileRole === 'loueur_pro') {
      const allTouched = {
        proCompanyName: true,
        proSiret: true,
        proName: true,
        proEmail: true,
        proPhone: true,
        proCity: true,
      };
      setTouched((prev) => ({ ...prev, ...allTouched }));

      if (!isProFormValid) return;

      const updatedUser: LoueurProProfile = {
        id: currentUser?.id || `pro-${Date.now()}`,
        role: 'loueur_pro',
        companyName: proCompanyName.trim(),
        siret: proSiret.trim(),
        name: proName.trim(),
        email: proEmail.trim(),
        phone: proPhone.trim(),
        city: proCity.trim(),
      };
      onUpdateProfile(updatedUser);
    } else {
      const allTouched = {
        particulierPrenom: true,
        particulierNom: true,
        particulierEmail: true,
        particulierPhone: true,
        particulierCity: true,
      };
      setTouched((prev) => ({ ...prev, ...allTouched }));

      if (!isParticulierFormValid) return;

      const updatedUser: LoueurParticulierProfile = {
        id: currentUser?.id || `part-${Date.now()}`,
        role: 'loueur_particulier',
        prenom: particulierPrenom.trim(),
        nom: particulierNom.trim(),
        email: particulierEmail.trim(),
        phone: particulierPhone.trim(),
        city: particulierCity.trim(),
      };
      onUpdateProfile(updatedUser);
    }

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
    setIsEditingProfile(false);
  };

  const isParticulier = currentUser?.role === 'loueur_particulier';
  const isPro = currentUser?.role === 'loueur_pro';

  // Dans l'espace gestion loueur, afficher les équipements appartenant à ce compte
  const myEquipments = useMemo(() => {
    if (!currentUser?.id) return equipmentList;
    return equipmentList.filter((item) => !item.ownerId || item.ownerId === currentUser.id);
  }, [equipmentList, currentUser]);

  const filtered = myEquipments.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'Tous' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalCautionManaged = filtered.reduce((acc, item) => acc + item.depositAmount, 0);
  const activeCount = filtered.filter((i) => i.isActive !== false).length;

  return (
    <div className="py-10 lg:py-16 bg-[#F8FAFC] text-slate-900 min-h-[calc(100vh-80px)] font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Success Toast */}
        {saveSuccessToast && (
          <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle className="w-5 h-5 text-white" />
              <span>Profil loueur mis à jour et validé avec succès !</span>
            </div>
            <span className="text-xs bg-emerald-600 px-2.5 py-1 rounded-lg">Synchronisé</span>
          </div>
        )}

        {/* Loueur Identity & Profile Section */}
        {isEditingProfile ? (
          /* ENTERPRISE TABBED INTERFACE WITH FLOATING LABELS */
          <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-8 animate-in fade-in duration-200">
            {/* Top Bar with Description & Help */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gestion des statuts & coordonnées légales</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  Gestionnaire de Profil Loueur
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                  Basculez entre le mode Professionnel et Particulier. Vos données certifiées seront automatiquement renseignées sur vos contrats de location légaux et vos cautions Stripe.
                </p>
              </div>

              {/* Progress & Quick Fill Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>Complétude</span>
                      <span className="text-amber-800 font-extrabold">{completionPercent}%</span>
                    </div>
                    <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          completionPercent === 100 ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">
                    {completionCount}/{totalCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Sleek Segmented Tabbed Interface for Pro vs Particulier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90">
              <button
                type="button"
                onClick={() => setProfileRole('loueur_pro')}
                className={`group relative flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                  profileRole === 'loueur_pro'
                    ? 'bg-white text-slate-950 shadow-md ring-1 ring-amber-500/20 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70 border border-transparent'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                    profileRole === 'loueur_pro'
                      ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                      : 'bg-slate-200/90 text-slate-600 group-hover:bg-slate-300'
                  }`}
                >
                  <Building2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                      Loueur Professionnel
                    </span>
                    <div className="flex items-center gap-1.5">
                      {profileRole === 'loueur_pro' && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          profileRole === 'loueur_pro'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300/80 font-bold'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        SIRET requis
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Artisans, BTP, sociétés et ateliers. Facturation B2B, TVA et attestations pro.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProfileRole('loueur_particulier')}
                className={`group relative flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                  profileRole === 'loueur_particulier'
                    ? 'bg-white text-slate-950 shadow-md ring-1 ring-emerald-500/20 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70 border border-transparent'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                    profileRole === 'loueur_particulier'
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-200/90 text-slate-600 group-hover:bg-slate-300'
                  }`}
                >
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                      Loueur Particulier
                    </span>
                    <div className="flex items-center gap-1.5">
                      {profileRole === 'loueur_particulier' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          profileRole === 'loueur_particulier'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300/80 font-bold'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        0 SIRET requis
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Particuliers & propriétaires indépendants. Rentabilisez votre matériel avec caution Stripe.
                  </p>
                </div>
              </button>
            </div>

            {/* Form Section with Floating Labels and Strict Validation States */}
            <form onSubmit={handleSaveProfile} className="space-y-8">
              {profileRole === 'loueur_pro' ? (
                /* PRO FORM CONTENT */
                <div className="space-y-6">
                  {/* Informative Pro Banner */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Garantie Professionnelle Matik :</strong> Votre numéro SIRET (14 chiffres) est vérifié pour horodater vos contrats et sécuriser les empreintes bancaires de caution sans blocage de fonds.
                    </div>
                  </div>

                  {/* Inputs Grid with floating labels & enterprise spacing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <EnterpriseFloatingInput
                      id="proCompanyName"
                      label="Raison sociale ou Atelier"
                      value={proCompanyName}
                      onChange={setProCompanyName}
                      icon={<Building2 className="w-4 h-4" />}
                      required
                      placeholder="Ex: Atelier BTP & Matériel Moreau"
                      helperText="Le nom commercial affiché aux locataires"
                      errorMessage="La raison sociale doit contenir au moins 2 caractères"
                      isValid={proValidations.companyName}
                      isTouched={Boolean(touched.proCompanyName)}
                      onBlur={() => markTouched('proCompanyName')}
                      autoComplete="organization"
                    />

                    <EnterpriseFloatingInput
                      id="proSiret"
                      label="Numéro SIRET (14 chiffres)"
                      value={proSiret}
                      onChange={handleSiretChange}
                      icon={<Hash className="w-4 h-4" />}
                      required
                      placeholder="Ex: 834 920 194 00028"
                      helperText="Format officiel à 14 chiffres"
                      errorMessage="Le SIRET doit comporter exactement 14 chiffres"
                      isValid={proValidations.siret}
                      isTouched={Boolean(touched.proSiret)}
                      onBlur={() => markTouched('proSiret')}
                      badge="14 chiffres"
                    />

                    <EnterpriseFloatingInput
                      id="proName"
                      label="Nom & Prénom du responsable"
                      value={proName}
                      onChange={setProName}
                      icon={<User className="w-4 h-4" />}
                      required
                      placeholder="Ex: Thomas Moreau"
                      helperText="Personne habilitée pour les remises de clés"
                      errorMessage="Le nom du responsable est obligatoire"
                      isValid={proValidations.name}
                      isTouched={Boolean(touched.proName)}
                      onBlur={() => markTouched('proName')}
                      autoComplete="name"
                    />

                    <EnterpriseFloatingInput
                      id="proEmail"
                      label="Email professionnel"
                      type="email"
                      value={proEmail}
                      onChange={setProEmail}
                      icon={<Mail className="w-4 h-4" />}
                      required
                      placeholder="contact@atelier-moreau.fr"
                      helperText="Réception des contrats et alertes de caution"
                      errorMessage="Adresse e-mail invalide (ex: contact@societe.fr)"
                      isValid={proValidations.email}
                      isTouched={Boolean(touched.proEmail)}
                      onBlur={() => markTouched('proEmail')}
                      autoComplete="email"
                    />

                    <EnterpriseFloatingInput
                      id="proPhone"
                      label="Téléphone professionnel"
                      type="tel"
                      value={proPhone}
                      onChange={setProPhone}
                      icon={<Phone className="w-4 h-4" />}
                      required
                      placeholder="01 45 67 89 00"
                      helperText="Pour coordonner la mise à disposition"
                      errorMessage="Format de téléphone invalide (10 chiffres min)"
                      isValid={proValidations.phone}
                      isTouched={Boolean(touched.proPhone)}
                      onBlur={() => markTouched('proPhone')}
                      autoComplete="tel"
                    />

                    <EnterpriseFloatingInput
                      id="proCity"
                      label="Ville / Dépôt de retrait"
                      value={proCity}
                      onChange={setProCity}
                      icon={<MapPin className="w-4 h-4" />}
                      required
                      placeholder="Ex: Paris & Île-de-France"
                      helperText="Zone géographique où le matériel est retiré"
                      errorMessage="La ville ou localisation est obligatoire"
                      isValid={proValidations.city}
                      isTouched={Boolean(touched.proCity)}
                      onBlur={() => markTouched('proCity')}
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
              ) : (
                /* PARTICULIER FORM CONTENT */
                <div className="space-y-6">
                  {/* Informative Particulier Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Espace Particulier Simplifié :</strong> Aucun numéro SIRET requis. Vous bénéficiez des mêmes protections juridiques : caution Stripe garantie 0 € débité et modèle de contrat certifié.
                    </div>
                  </div>

                  {/* Inputs Grid with floating labels & enterprise spacing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <EnterpriseFloatingInput
                      id="particulierPrenom"
                      label="Prénom"
                      value={particulierPrenom}
                      onChange={setParticulierPrenom}
                      icon={<User className="w-4 h-4" />}
                      required
                      placeholder="Ex: Maxime"
                      helperText="Votre prénom usuel"
                      errorMessage="Le prénom doit contenir au moins 2 caractères"
                      isValid={particulierValidations.prenom}
                      isTouched={Boolean(touched.particulierPrenom)}
                      onBlur={() => markTouched('particulierPrenom')}
                      autoComplete="given-name"
                    />

                    <EnterpriseFloatingInput
                      id="particulierNom"
                      label="Nom de famille"
                      value={particulierNom}
                      onChange={setParticulierNom}
                      icon={<User className="w-4 h-4" />}
                      required
                      placeholder="Ex: Robert"
                      helperText="Votre nom de famille officiel"
                      errorMessage="Le nom doit contenir au moins 2 caractères"
                      isValid={particulierValidations.nom}
                      isTouched={Boolean(touched.particulierNom)}
                      onBlur={() => markTouched('particulierNom')}
                      autoComplete="family-name"
                    />

                    <EnterpriseFloatingInput
                      id="particulierEmail"
                      label="Email personnel"
                      type="email"
                      value={particulierEmail}
                      onChange={setParticulierEmail}
                      icon={<Mail className="w-4 h-4" />}
                      required
                      placeholder="maxime.robert@email.fr"
                      helperText="Notifications et copies des contrats signés"
                      errorMessage="Adresse e-mail invalide (ex: nom@email.fr)"
                      isValid={particulierValidations.email}
                      isTouched={Boolean(touched.particulierEmail)}
                      onBlur={() => markTouched('particulierEmail')}
                      autoComplete="email"
                    />

                    <EnterpriseFloatingInput
                      id="particulierPhone"
                      label="Téléphone portable"
                      type="tel"
                      value={particulierPhone}
                      onChange={setParticulierPhone}
                      icon={<Phone className="w-4 h-4" />}
                      required
                      placeholder="06 24 58 91 30"
                      helperText="Pour convenir du rendez-vous de remise"
                      errorMessage="Format de téléphone invalide (10 chiffres min)"
                      isValid={particulierValidations.phone}
                      isTouched={Boolean(touched.particulierPhone)}
                      onBlur={() => markTouched('particulierPhone')}
                      autoComplete="tel"
                    />

                    <EnterpriseFloatingInput
                      id="particulierCity"
                      label="Ville / Quartier de remise"
                      value={particulierCity}
                      onChange={setParticulierCity}
                      icon={<MapPin className="w-4 h-4" />}
                      required
                      placeholder="Ex: Lyon 3e / Part-Dieu"
                      helperText="Où le locataire viendra chercher l'équipement"
                      errorMessage="La ville ou le secteur est obligatoire"
                      isValid={particulierValidations.city}
                      isTouched={Boolean(touched.particulierCity)}
                      onBlur={() => markTouched('particulierCity')}
                    />
                  </div>
                </div>
              )}

              {/* Real-time Contract Preview Strip */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-slate-500 font-medium">Aperçu en temps réel sur vos contrats :</span>
                  <strong className="text-slate-900 truncate max-w-xs">
                    {profileRole === 'loueur_pro'
                      ? proCompanyName || 'Raison sociale'
                      : `${particulierPrenom || 'Prénom'} ${particulierNom || 'Nom'}`}
                  </strong>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 truncate max-w-[150px]">
                    {profileRole === 'loueur_pro' ? proCity || 'Ville' : particulierCity || 'Ville'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-semibold shrink-0">
                  {profileRole === 'loueur_pro' && proSiret ? `SIRET : ${proSiret}` : 'Particulier certifié'}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Annuler les modifications
                  </button>
                )}

                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-md shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Enregistrer mon profil {profileRole === 'loueur_pro' ? 'Pro' : 'Particulier'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* AFFICHAGE DU PROFIL ENREGISTRÉ (AVEC BOUTON D'ÉDITION DIRECTE) */
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    isParticulier
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {isParticulier ? 'Loueur Particulier' : 'Loueur Professionnel'}
                </span>

                {isParticulier ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Profil Particulier Vérifié (0 SIRET requis)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Compte Professionnel Vérifié
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {isParticulier && currentUser
                  ? `${currentUser.prenom} ${currentUser.nom}`
                  : currentUser && 'companyName' in currentUser
                  ? currentUser.companyName
                  : 'Atelier & Matériel'}
              </h1>

              {/* Profile Details Strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                {!isParticulier && currentUser && 'siret' in currentUser && (
                  <>
                    <span>
                      SIRET : <strong className="text-slate-950 font-bold">{currentUser.siret}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                  </>
                )}

                <span>
                  Contact :{' '}
                  <strong className="text-slate-950 font-bold">
                    {isParticulier && currentUser
                      ? `${currentUser.prenom} ${currentUser.nom}`
                      : currentUser && 'name' in currentUser
                      ? currentUser.name
                      : '-'}
                  </strong>
                </span>

                <span className="text-slate-300">·</span>

                <span>
                  Email :{' '}
                  <strong className="text-slate-950 font-bold">
                    {currentUser?.email || '-'}
                  </strong>
                </span>

                <span className="text-slate-300">·</span>

                <span>
                  Téléphone :{' '}
                  <strong className="text-slate-950 font-bold">
                    {currentUser?.phone || '-'}
                  </strong>
                </span>

                <span className="text-slate-300">·</span>

                <span>
                  Ville :{' '}
                  <strong className="text-slate-950 font-bold">
                    {currentUser?.city || '-'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Action Buttons: Modifier mon profil + Déconnexion + Déposer annonce */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-3 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                title="Modifier vos informations, passer de pro à particulier ou changer vos coordonnées"
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Modifier mes coordonnées</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-3 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Se déconnecter de votre compte pour changer de profil"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-sm shadow-amber-400/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Déposer une annonce</span>
              </button>
            </div>
          </div>
        )}

        {/* Loueur KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-xs text-slate-500 font-medium">Annonces actives en ligne</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tabular-nums">
              {activeCount}{' '}
              <span className="text-xs font-normal text-slate-500">/ {filtered.length} au catalogue</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">Prêts pour réservation immédiate</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-xs text-slate-500 font-medium">Cautions sous séquestre Stripe</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums">
              {totalCautionManaged} €
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Empreintes CB garanties 0 € débit</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-xs text-slate-500 font-medium">Contrats certifiés conformes</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tabular-nums">
              100%
            </div>
            <p className="text-[11px] text-blue-700 font-semibold">Génération numérique instantanée</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-xs text-slate-500 font-medium">Taux restitution sans incident</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
              99.8%
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Couverture casse & vol incluse</p>
          </div>
        </div>

        {/* SUB-TABS: MON PARC DE MATÉRIEL VS RÉSERVATIONS REÇUES */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 gap-1.5">
            <button
              type="button"
              onClick={() => setDashboardTab('materiel')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                dashboardTab === 'materiel'
                  ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-950/10'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Mon Parc de Matériel</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                {equipmentList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('reservations')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                dashboardTab === 'reservations'
                  ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-950/10'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Réservations & Cautions Stripe</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  bookingList.length > 0
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {bookingList.length}
              </span>
            </button>
          </div>

          {/* Quick simulator shortcut */}
          {onOpenProfitSimulator && (
            <button
              type="button"
              onClick={onOpenProfitSimulator}
              className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>Simuler la rentabilité de mon matériel</span>
            </button>
          )}
        </div>

        {/* TAB 1: EQUIPMENT INVENTORY */}
        {dashboardTab === 'materiel' ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Gestion de vos objets & matériel</h2>
                <p className="text-xs text-slate-500">
                  Ajustez les tarifs journaliers, fixez vos montants obligatoires de caution et générez les Passeports QR Code.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un objet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Equipment Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Équipement</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Prix / Jour</th>
                    <th className="py-3 px-4 text-amber-700">Caution fixée par vous</th>
                    <th className="py-3 px-4">Statut Annonce</th>
                    <th className="py-3 px-4 text-right">Outils & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const isActive = item.isActive !== false;
                    const rentInfo = isEquipmentRented(item.id, bookingList);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isActive ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Name & Photo */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-950 text-sm flex items-center gap-2">
                                <span>{item.name}</span>
                                {rentInfo.isRented && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                    Loué
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                {item.specs?.[0]?.label}: {item.specs?.[0]?.value}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-slate-700 font-semibold">
                          {item.category}
                        </td>

                        {/* Daily Rate */}
                        <td className="py-4 px-4 font-bold text-slate-950 text-sm tabular-nums">
                          {item.dailyRate} € <span className="text-[10px] text-slate-500 font-normal">/j</span>
                        </td>

                        {/* Caution Amount */}
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 font-bold text-sm tabular-nums">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{item.depositAmount} €</span>
                          </div>
                        </td>

                        {/* Status Toggle & Rental availability */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {rentInfo.isRented && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Loué {rentInfo.formattedEndDate ? `(fin: ${rentInfo.formattedEndDate})` : ''}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onToggleActive(item.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{isActive ? 'En ligne' : 'Désactivée'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Actions (with QR Passport & État des lieux) */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* QR Passport Button */}
                            {onOpenPassportModal && (
                              <button
                                type="button"
                                onClick={() => onOpenPassportModal(item)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Voir & Imprimer le Passeport QR Code officiel"
                              >
                                <QrCode className="w-4 h-4 text-slate-700" />
                              </button>
                            )}

                            {/* Inspection Button */}
                            {onOpenInspectionModal && (
                              <button
                                type="button"
                                onClick={() => onOpenInspectionModal(item, null, 'check_in')}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Lancer un état des lieux photo (Check-in)"
                              >
                                <Camera className="w-4 h-4 text-amber-600" />
                              </button>
                            )}

                            {/* Reviews Button */}
                            {onViewReviews && (
                              <button
                                type="button"
                                onClick={() => onViewReviews(item)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                                title="Voir les avis locataires & notes 5 étoiles"
                              >
                                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => onEditEquipment(item)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-700 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                              title="Modifier les tarifs ou le montant de la caution"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Éditer</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Supprimer définitivement "${item.name}" ?`)) {
                                  onDeleteEquipment(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-500 transition-colors cursor-pointer"
                              title="Supprimer cette annonce"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-slate-500">Aucun matériel ne correspond à votre filtre.</p>
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  + Ajouter un matériel
                </button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: OPTION A - RÉSERVATIONS REÇUES & CAUTIONS STRIPE */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                  <span>
                    {currentUser?.role === 'client'
                      ? 'Mes Réservations & Cautions Stripe'
                      : 'Réservations reçues & Gestion des Cautions Stripe'}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    Sécurisées
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {currentUser?.role === 'client'
                    ? 'Retrouvez les coordonnées de vos loueurs (Appel & WhatsApp directs), les dates de location et l’état de vos cautions Stripe.'
                    : 'Gérez les remises en main propre, contactez vos locataires en 1 clic (Appel & WhatsApp) et libérez les cautions au retour sans débit bancaire.'}
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Empreintes CB automatiques Stripe</span>
              </div>
            </div>

            {bookingList.length === 0 ? (
              <div className="py-14 text-center max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-950">
                    {currentUser?.role === 'client'
                      ? 'Vous n\'avez aucune réservation en cours'
                      : 'Aucune réservation active pour l\'instant'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {currentUser?.role === 'client'
                      ? 'Parcourez le catalogue d\'équipements pour réserver du matériel avec contrat numérique instantané et caution Stripe sans débit.'
                      : 'Dès qu\'un client effectue une réservation sur votre matériel au catalogue, elle apparaîtra ici avec ses dates, ses coordonnées et l\'empreinte de caution Stripe garantie.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToCatalog}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Voir les annonces au catalogue
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingList.map((booking) => {
                  const isCautionReleased = booking.stripeCautionStatus === 'caution_liberee';
                  const isCompleted = booking.status === 'restitue';

                  return (
                    <div
                      key={booking.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Equipment info */}
                        <div className="flex items-center gap-3.5">
                          {booking.equipmentImage ? (
                            <img
                              src={booking.equipmentImage}
                              alt={booking.equipmentName}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML =
                                  '<div class="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0"><svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg></div>';
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                              </svg>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {booking.equipmentCategory}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-950">{booking.equipmentName}</h4>
                            <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                              <span>Locataire : <strong className="text-slate-900">{booking.clientName}</strong></span>
                              <span>·</span>
                              <span>{booking.clientPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Dates & Price Strip */}
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Période</span>
                            <span className="font-bold text-slate-800">
                              Du {booking.startDate} au {booking.endDate} ({booking.days} j)
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Location</span>
                            <span className="font-black text-slate-950 text-sm tabular-nums">
                              {booking.totalPrice} €
                            </span>
                          </div>

                          {/* Caution status badge */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Caution Stripe</span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                                isCautionReleased
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>{booking.cautionAmount} €</span>
                              <span className="text-[10px] font-normal">
                                {isCautionReleased ? '· Libérée' : '· Séquestre'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Système de mise en relation directe : Carte de la contrepartie (Appel & WhatsApp 1-clic) */}
                      <CounterpartContactCard
                        counterpartRole={currentUser?.role === 'client' ? 'loueur' : 'locataire'}
                        name={currentUser?.role === 'client' ? (booking.ownerName || 'Loueur Matik') : booking.clientName}
                        phone={currentUser?.role === 'client' ? (booking.ownerPhone || '') : (booking.clientPhone || '')}
                        email={currentUser?.role === 'client' ? (booking.ownerEmail || '') : (booking.clientEmail || '')}
                        equipmentName={booking.equipmentName}
                      />

                      {/* Action buttons row */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : booking.status === 'en_cours'
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-semibold text-slate-800">
                            {isCompleted
                              ? 'Location terminée · Restitution conforme'
                              : booking.status === 'en_cours'
                              ? 'En cours de location'
                              : 'En attente de remise des clés'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* État des lieux départ */}
                          {onOpenInspectionModal && !isCompleted && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenInspectionModal(
                                  equipmentList.find((e) => e.id === booking.equipmentId) || null,
                                  booking,
                                  booking.status === 'en_cours' ? 'check_out' : 'check_in'
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {booking.status === 'en_cours'
                                  ? 'État des lieux retour'
                                  : 'État des lieux départ'}
                              </span>
                            </button>
                          )}

                          {/* 1-Click Caution Release */}
                          {onReleaseCaution && !isCautionReleased && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Confirmer la restitution conforme de l'équipement et libérer la caution Stripe de ${booking.cautionAmount} € ?`
                                  )
                                ) {
                                  onReleaseCaution(booking.id);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold uppercase tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Libérer la caution</span>
                            </button>
                          )}

                          {/* Reviews Button on completed/active booking */}
                          {onViewReviews && (
                            <button
                              type="button"
                              onClick={() => {
                                const eq = equipmentList.find((e) => e.id === booking.equipmentId) || {
                                  id: booking.equipmentId,
                                  name: booking.equipmentName,
                                  category: booking.equipmentCategory,
                                  dailyRate: 30,
                                  depositAmount: booking.cautionAmount,
                                  image: booking.equipmentImage,
                                  description: '',
                                  specs: [],
                                  partnerArtisan: '',
                                  inStock: true,
                                };
                                onViewReviews(eq);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-800 hover:text-amber-950 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Consulter et laisser un avis après location"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              <span>Avis</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Info Box: How Stripe Caution Protects Loueurs */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Comment Matik protège chaque loueur (particulier ou pro) ?</span>
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Pour chaque location, le client valide une pré-autorisation Stripe égale à votre caution fixée.
              En cas de dégradation ou de non-restitution, vous pouvez réclamer le débit partiel ou total sous 48h
              avec constat contradictoire.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            Voir la vue client (Catalogue)
          </button>
        </div>
      </div>
    </div>
  );
};
