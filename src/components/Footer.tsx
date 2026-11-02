import React from 'react';
import { Mail, Phone, MapPin, Smartphone } from 'lucide-react';
import { PageType } from '../types';
import { MatikLogo } from './MatikLogo';

export const Footer: React.FC<{
  onOpenInstallModal?: () => void;
  onNavigate?: (page: PageType) => void;
}> = ({ onOpenInstallModal, onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-200">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <MatikLogo
              size="sm"
              onClick={() => {
                onNavigate?.('accueil');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <p className="text-slate-600 text-xs leading-relaxed">
              Plateforme moderne de location d'outillage, équipements high-tech, événementiel et véhicules pour artisans, particuliers et entreprises.
            </p>
            {onOpenInstallModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Installer l'application mobile</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Navigation</h5>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('accueil');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('catalogue');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  Catalogue complet
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('espace-loueur');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-700 transition-colors cursor-pointer text-left font-medium"
                >
                  Espace Loueur
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('garanties');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  Garanties & Caution Stripe
                </button>
              </li>
            </ul>
          </div>

          {/* Guarantees */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Engagements</h5>
            <ul className="space-y-2">
              <li><span className="text-slate-600">Contrat dématérialisé sous 30s</span></li>
              <li><span className="text-slate-600">Empreinte Stripe sans débit immédiat</span></li>
              <li><span className="text-slate-600">Assurance casse et vol incluse</span></li>
              <li><span className="text-slate-600">Parc vérifié & certifié CE</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Support & Dépôts</h5>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>contact@matik.fr</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>01 89 45 20 00 (7j/7 7h-20h)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Réseau de dépôts & ateliers partenaires</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Matik. Tous droits réservés. Contrats régis par le droit français.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600">Paiement & Empreinte sécurisés par Stripe</span>
            <span>·</span>
            <span className="text-slate-600">Signature électronique certifiée</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
