import React from 'react';
import { Phone, Mail, MessageCircle, ExternalLink, User, Building2 } from 'lucide-react';

export interface CounterpartContactCardProps {
  /**
   * Rôle de la contrepartie affichée
   * - 'locataire' : affiché pour le loueur (contact du demandeur)
   * - 'loueur' : affiché pour le client (contact du loueur)
   */
  counterpartRole: 'locataire' | 'loueur';
  name: string;
  phone?: string;
  email?: string;
  equipmentName?: string;
  startDate?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Nettoie et formate un numéro de téléphone pour l'API WhatsApp wa.me
 * Gère les formats : 06 12 34 56 78, +33 6 12 34 56 78, 0033612345678, etc.
 */
export const formatWhatsAppNumber = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/\D/g, '');
  if (!cleaned) return '';

  // Numéro français commençant par 0 (ex: 0612345678 -> 33612345678)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '33' + cleaned.substring(1);
  } else if (cleaned.startsWith('0033')) {
    cleaned = '33' + cleaned.substring(4);
  }

  return cleaned;
};

/**
 * Construit l'URL WhatsApp avec message pré-rempli et convivial
 */
export const buildWhatsAppUrl = (
  rawPhone?: string,
  counterpartRole: 'locataire' | 'loueur' = 'locataire',
  name?: string,
  equipmentName?: string
): string => {
  const number = formatWhatsAppNumber(rawPhone);
  if (!number) return '';

  const politeName = name?.trim() ? `Bonjour ${name}` : 'Bonjour';
  const item = equipmentName ? `l'équipement « ${equipmentName} »` : 'le matériel';

  const defaultMessage =
    counterpartRole === 'locataire'
      ? `${politeName}, je vous contacte via Matik suite à votre réservation pour ${item}. Quand êtes-vous disponible pour organiser la remise en main propre et l'état des lieux ?`
      : `${politeName}, je vous contacte via Matik suite à ma réservation pour ${item}. Êtes-vous disponible pour convenir de l'heure et du lieu de retrait ?`;

  return `https://wa.me/${number}?text=${encodeURIComponent(defaultMessage)}`;
};

/**
 * Nettoie le numéro de téléphone pour le lien tel:
 */
export const buildTelUrl = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  const cleaned = rawPhone.replace(/[\s.-]/g, '');
  return `tel:${cleaned}`;
};

export const CounterpartContactCard: React.FC<CounterpartContactCardProps> = ({
  counterpartRole,
  name,
  phone,
  email,
  equipmentName,
  compact = false,
  className = '',
}) => {
  const cleanPhone = phone?.trim() || '';
  const cleanEmail = email?.trim() || '';
  const isLocataire = counterpartRole === 'locataire';

  const telHref = buildTelUrl(cleanPhone);
  const waHref = buildWhatsAppUrl(cleanPhone, counterpartRole, name, equipmentName);
  const mailtoHref = cleanEmail ? `mailto:${cleanEmail}` : '';

  const hasPhone = Boolean(cleanPhone && cleanPhone !== 'Non renseigné' && cleanPhone !== '06 00 00 00 00');

  if (compact) {
    return (
      <div className={`p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLocataire ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {isLocataire ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
          </div>
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isLocataire ? 'Contact Locataire' : 'Contact Loueur'}
            </span>
            <span className="font-extrabold text-slate-900 truncate block">
              {name || (isLocataire ? 'Locataire Matik' : 'Loueur')}
            </span>
            {hasPhone && <span className="text-slate-600 font-mono text-[11px]">{cleanPhone}</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {hasPhone && (
            <>
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 hover:text-amber-900 font-bold text-xs transition-colors shadow-2xs"
                title={`Appeler ${name}`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Appeler</span>
              </a>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
                title={`Envoyer un message WhatsApp à ${name}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </>
          )}

          {cleanEmail && (
            <a
              href={mailtoHref}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title={`Envoyer un email à ${cleanEmail}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4 ${className}`}>
      {/* Header with Role & Name */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
            isLocataire ? 'bg-amber-500/10 text-amber-700 border border-amber-200/60' : 'bg-emerald-500/10 text-emerald-700 border border-emerald-200/60'
          }`}>
            {isLocataire ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isLocataire ? 'Coordonnées du locataire (Demandeur)' : 'Coordonnées du propriétaire (Loueur)'}
            </span>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-950 truncate">
              {name || (isLocataire ? 'Locataire Matik' : 'Loueur')}
            </h4>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
          isLocataire ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {isLocataire ? 'Locataire vérifié' : 'Loueur partenaire'}
        </span>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block font-medium">Téléphone</span>
            {hasPhone ? (
              <span className="font-bold text-slate-900 font-mono text-xs">{cleanPhone}</span>
            ) : (
              <span className="text-slate-400 italic">Non communiqué</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block font-medium">E-mail</span>
            {cleanEmail ? (
              <a href={mailtoHref} className="font-bold text-slate-900 hover:text-amber-700 truncate block transition-colors">
                {cleanEmail}
              </a>
            ) : (
              <span className="text-slate-400 italic">Non communiqué</span>
            )}
          </div>
        </div>
      </div>

      {/* Two Quick Action Buttons */}
      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {hasPhone ? (
          <>
            {/* Bouton Appeler */}
            <a
              href={telHref}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-sm group cursor-pointer"
            >
              <Phone className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Appeler</span>
            </a>

            {/* Bouton Envoyer un WhatsApp */}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs hover:shadow-emerald-600/20 hover:shadow-md group cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Envoyer un WhatsApp</span>
            </a>
          </>
        ) : (
          <div className="text-xs text-slate-500 italic py-1 text-center w-full">
            Numéro de téléphone non renseigné pour les actions rapides.
          </div>
        )}
      </div>
    </div>
  );
};
