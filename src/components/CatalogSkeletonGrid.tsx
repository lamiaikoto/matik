import React from 'react';

interface CatalogSkeletonGridProps {
  count?: number;
}

export const CatalogSkeletonGrid: React.FC<CatalogSkeletonGridProps> = ({ count = 8 }) => {
  return (
    <div
      data-testid="catalog-skeleton-grid"
      className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse"
      aria-label="Chargement du catalogue..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs"
        >
          {/* Image Skeleton */}
          <div className="relative aspect-[4/3] w-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 overflow-hidden">
            <div className="absolute top-3 left-3 w-24 h-6 bg-slate-300/80 rounded-lg" />
            <div className="absolute top-3 right-3 w-20 h-6 bg-slate-300/80 rounded-lg" />
            <div className="absolute bottom-3 right-3 w-16 h-5 bg-slate-300/80 rounded-lg" />
          </div>

          {/* Body Skeleton */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              {/* Category pill */}
              <div className="w-28 h-4 bg-slate-200 rounded-md" />
              {/* Title */}
              <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
              {/* Specs line */}
              <div className="w-1/2 h-3.5 bg-slate-100 rounded-md" />
            </div>

            {/* Price & Deposit Strip */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-3 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-200 rounded-md" />
              </div>
              <div className="w-20 h-7 bg-amber-100/60 rounded-lg" />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <div className="flex-1 h-10 bg-amber-200/70 rounded-xl" />
              <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
