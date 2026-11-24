import React from 'react';
import { Mail, Phone, MapPin, Smartphone, Video } from 'lucide-react';
import { PageType } from '../types';
import { MatikLogo } from './MatikLogo';

export const Footer: React.FC<{
  onOpenInstallModal?: () => void;
  onNavigate?: (page: PageType) => void;
}> = ({ onOpenInstallModal, onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <MatikLogo
              size="sm"
              onClick={() => {
                onNavigate?.('accueil');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <p className="text-slate-600 text-xs leading-relaxed">
              Plateforme de mise en relation entre particuliers et professionnels pour la location de matériel. Matikilou agit en qualité d'intermédiaire technique.
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
                    onNavigate?.('etat-des-lieux');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left inline-flex items-center gap-1.5 font-medium"
                >
                  <Video className="w-3 h-3 text-amber-600" />
                  État des lieux vidéo
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
                  Caution & Contrats
                </button>
              </li>
            </ul>
          </div>

          {/* Guarantees */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Engagements</h5>
            <ul className="space-y-2">
              <li><span className="text-slate-600">Empreinte Stripe sécurisée</span></li>
              <li><span className="text-slate-600">État des lieux photo contradictoire</span></li>
              <li><span className="text-slate-600">Contrat numérique de location</span></li>
              <li><span className="text-slate-600">Loueurs et locataires identifiés</span></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Légal</h5>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('mentions-legales');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  Mentions légales
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('cgu');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  CGU / CGV
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.('confidentialite');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-slate-950 transition-colors cursor-pointer text-left"
                >
                  Politique de confidentialité
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-950 uppercase tracking-wider text-[11px]">Support & Dépôts</h5>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>contact@matikilou.com</span>
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
            <span className="text-slate-600">Contrat numérique de location</span>
          </div>
        </div>
      </div>
    </footer>
  );
};