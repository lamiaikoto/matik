export interface CatalogFilters {
  keyword: string;
  category: string;
  region: string;
  location: string;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  keyword: '',
  category: 'Tous',
  region: 'Toutes',
  location: '',
};

export const hasActiveCatalogFilters = (filters: CatalogFilters): boolean =>
  filters.category !== 'Tous' ||
  filters.region !== 'Toutes' ||
  filters.keyword.trim().length > 0 ||
  filters.location.trim().length > 0;
