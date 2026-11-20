import React from 'react';
import { Search, MapPin, RotateCcw } from 'lucide-react';
import { FRENCH_REGIONS } from '../data/regions';
import { CatalogFilters, hasActiveCatalogFilters } from '../data/catalogFilters';

interface SearchFilterBarProps {
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  categories: string[];
  /** Fourni sur l'accueil : affiche un bouton de recherche et soumet le formulaire. */
  onSubmit?: () => void;
  submitLabel?: string;
  /** Compteur affiché uniquement dans le catalogue. */
  resultCount?: number;
  totalCount?: number;
  variant?: 'catalog' | 'hero';
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  onChange,
  categories,
  onSubmit,
  submitLabel = 'Rechercher',
  resultCount,
  totalCount,
  variant = 'catalog',
  className = '',
}) => {
  const isActive = hasActiveCatalogFilters(filters);

  const update = (patch: Partial<CatalogFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const reset = () => {
    onChange({ keyword: '', category: 'Tous', region: 'Toutes', location: '', radius: 'all' });
  };

  const isHero = variant === 'hero';

  const containerClass = isHero
    ? `rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg shadow-slate-200/50 p-4 ${className}`
    : `rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5 ${className}`;

  const gridClass = isHero
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3';

  const spanClass = (field: 'keyword' | 'category' | 'region' | 'location') => {
    if (isHero) {
      return field === 'keyword' || field === 'location' ? 'sm:col-span-2' : '';
    }
    switch (field) {
      case 'keyword':
        return 'lg:col-span-4';
      case 'category':
        return 'lg:col-span-2';
      default:
        return 'lg:col-span-3';
    }
  };

  const fieldClass =
    'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500';
  const labelClass =
    'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

  const content = (
    <>
      <div className={gridClass}>
        {/* Mot-clé */}
        <div className={spanClass('keyword')}>
          <label htmlFor={`catalogSearch-${variant}`} className={labelClass}>
            Mot-clé
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id={`catalogSearch-${variant}`}
              type="search"
              value={filters.keyword}
              onChange={(e) => update({ keyword: e.target.value })}
              placeholder="Titre ou description de l'équipement…"
              className={`${fieldClass} pl-9 pr-3`}
            />
          </div>
        </div>

        {/* Catégorie synchronisée avec les pastilles du catalogue */}
        <div className={spanClass('category')}>
          <label htmlFor={`catalogCategory-${variant}`} className={labelClass}>
            Catégorie
          </label>
          <select
            id={`catalogCategory-${variant}`}
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            className={`${fieldClass} cursor-pointer`}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Région */}
        <div className={spanClass('region')}>
          <label htmlFor={`catalogRegion-${variant}`} className={labelClass}>
            Région
          </label>
          <select
            id={`catalogRegion-${variant}`}
            value={filters.region}
            onChange={(e) => update({ region: e.target.value })}
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="Toutes">Toutes les régions</option>
            {FRENCH_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Ville ou code postal & zone approximative */}
        <div className={spanClass('location')}>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={`catalogLocation-${variant}`} className={labelClass}>
              Ville ou code postal
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Zone approx.</span>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id={`catalogLocation-${variant}`}
              type="text"
              value={filters.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="Ex : Lyon, 69003, Bordeaux…"
              className={`${fieldClass} pl-9 pr-3`}
            />
          </div>
          {filters.location.trim().length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Rayon :</span>
              <select
                id={`catalogRadius-${variant}`}
                value={filters.radius || 'all'}
                onChange={(e) => update({ radius: e.target.value as any })}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] text-slate-700 font-semibold cursor-pointer focus:outline-none focus:border-amber-500"
              >
                <option value="all">Tout le secteur</option>
                <option value="dept">Rayon ~25 km (département)</option>
                <option value="exact">Commune exacte</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        {typeof resultCount === 'number' && typeof totalCount === 'number' ? (
          <p className="text-[11px] text-slate-500">
            <strong className="text-slate-900 font-bold">{resultCount}</strong> résultat
            {resultCount > 1 ? 's' : ''} sur {totalCount} annonce
            {totalCount > 1 ? 's' : ''} publiée{totalCount > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">
            Recherche par mot-clé, catégorie, région ou ville / code postal.
          </p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={reset}
            disabled={!isActive}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
              isActive
                ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>

          {onSubmit && (
            <button
              type="submit"
              className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-sm shadow-amber-400/25 cursor-pointer ${
                isHero
                  ? 'px-5 py-2.5 text-xs uppercase tracking-wider'
                  : 'px-3.5 py-2 text-[11px]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{submitLabel}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (onSubmit) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={containerClass}
      >
        {content}
      </form>
    );
  }

  return <div className={containerClass}>{content}</div>;
};
