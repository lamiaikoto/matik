import { Equipment } from '../types';

export const EQUIPMENT_CATEGORIES = [
  'Tous',
  // BTP & Outillage
  'Bricolage & Outillage BTP',
  'Jardin, Espaces Verts & Forêt',
  'Industrie, Chantier & Gros Œuvre',

  // High-Tech, Son & Création
  'High-Tech, Photo & Audiovisuel',
  'Informatique, Gaming & Bureautique',
  'Musique & Instruments de Studio',
  'Événementiel, Son & Lumière',

  // Mobilité, Véhicules & Logistique
  'Véhicules, Remorques & Transport',
  'Automobile, Moto, Scooter & 2 Roues',
  'Déménagement, Stockage & Diables',

  // Sport, Vacances & Nautisme
  'Sport, Fitness & Montagne',
  'Nautisme, Bateaux & Plongée',
  'Voyage, Camping & Van aménagé',
  'Loisirs, Drones & Plein Air',

  // Maison, Enfance & Fêtes
  'Maison, Électroménager & Nettoyage',
  'Cuisine, Plancha & Gastronomie',
  'Bébé, Puériculture & Enfance',
  'Jeux, Gonflables & Animations',
  'Mode, Costumes, Luxe & Maroquinerie',
  'Mobilier, Décoration & Réception',

  // Santé & Universel
  'Santé, Médical & Bien-être',
  'Autre matériel & Objets insolites',
];

// Catalogue vierge au démarrage : aucun équipement de démonstration pré-rempli
export const EQUIPMENT_LIST: Equipment[] = [];

export const ARTISAN_PARTNERS: { id: string; name: string; city: string; address?: string }[] = [];
