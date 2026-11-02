import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  X,
  Printer,
  Download,
  ShieldCheck,
  Sparkles,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Equipment } from '../types';

interface PassportQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onLaunchInspection?: (equipment: Equipment) => void;
}

export const PassportQRModal: React.FC<PassportQRModalProps> = ({
  isOpen,
  onClose,
  equipment,
  onLaunchInspection,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (equipment) {
      const passportUrl = `${window.location.origin}/?passport=${equipment.id}#checkin`;
      QRCode.toDataURL(passportUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [equipment]);

  if (!isOpen || !equipment) return null;

  const passportCode = `MTK-${equipment.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?passport=${equipment.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">Passeport Matériel Matik</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  QR Sécurisé
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identifiant certifié : <span className="font-mono text-amber-400 font-bold">{passportCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Equipment Summary Banner */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            {equipment.image ? (
              <img
                src={equipment.image}
                alt={equipment.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-500 uppercase">{equipment.category}</div>
              <h4 className="text-sm font-extrabold text-slate-900 truncate">{equipment.name}</h4>
              <div className="text-xs text-amber-700 font-bold mt-0.5">
                {equipment.dailyRate} € / jour · <span className="text-slate-600 font-medium">Caution Stripe : {equipment.depositAmount} €</span>
              </div>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50/50 to-slate-50 border-2 border-dashed border-amber-300/80 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${equipment.name}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Génération du QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">
                À coller sur votre matériel ou mallette
              </span>
              <p className="text-xs text-slate-500 max-w-sm">
                Lors de la remise de clés, le locataire scanne ce code avec son smartphone pour activer instantanément le contrat et la caution sans paperasse.
              </p>
            </div>
          </div>

          {/* Usage steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-amber-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">1</span>
                <span>Scannez</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Face-à-face via l'appareil photo du smartphone.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-amber-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">2</span>
                <span>État des lieux</span>
              </div>
              <p className="text-[11px] text-slate-500">
                3 photos express horodatées & signature.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                <span>Caution active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Garantie Stripe 0 € débité activée en direct.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimer l'étiquette</span>
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`passeport-matik-${equipment.id}.png`}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>PNG</span>
              </a>
            )}
          </div>

          {onLaunchInspection && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchInspection(equipment);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Simuler le Scan & Check-in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
