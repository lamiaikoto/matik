import React from 'react';
import { ShieldCheck, Lock, RefreshCcw, CreditCard, Sparkles, AlertCircle } from 'lucide-react';

export const StripeCautionSection: React.FC = () => {
  return (
    <section id="caution-securisee" className="py-16 lg:py-24 border-b border-slate-200/80 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Explanations */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Empreinte bancaire Stripe</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
              Une caution adaptée à chaque matériel, <br className="hidden sm:inline" />
              <span className="text-amber-600">sans aucun débit sur votre compte.</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Chaque loueur fixe une empreinte de caution proportionnée à la valeur de l’équipement (ex : 300 € pour une scie, 500 € pour un marteau-piqueur, 1500 € pour une mini-pelle).
              Nous utilisons le mécanisme d'autorisation préalable de Stripe : 0 € prélevé.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-950">0 € débité à la réservation</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Une simple réservation de fonds est opérée par votre banque pendant la durée du chantier.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <RefreshCcw className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-950">Levée après l'état des lieux de retour</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Après l'état des lieux de retour validé avec le loueur, l'empreinte bancaire est levée depuis son espace.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-950">Paiement traité par Stripe</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les paiements et empreintes sont traités par Stripe ; l'authentification 3D Secure dépend de votre banque.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-950 text-sm">Aperçu autorisation Stripe</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Prêt à valider
                </span>
              </div>

              {/* Card visual UI */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 space-y-4 shadow-md">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Autorisation de caution temporaire</span>
                  <span className="text-white font-bold">Stripe Payments</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Montant caution bloqué</span>
                    <span className="text-2xl font-extrabold text-white tabular-nums">500,00 €</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-400 block font-semibold">Montant prélevé</span>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">0,00 €</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Protocole 3D Secure selon la banque</span>
                  <span className="text-emerald-300 font-medium">Levée après retour validé</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Compatible Visa, Mastercard, American Express, Apple Pay</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Aucun impact sur le plafond de dépenses réel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
