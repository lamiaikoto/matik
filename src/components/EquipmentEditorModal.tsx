import React, { useState, useEffect, useRef } from 'react';
import { Equipment, CurrentUser } from '../types';
import { EQUIPMENT_CATEGORIES } from '../data/equipment';
import { generateUUID, isValidUUID } from '../lib/equipmentService';
import {
  X,
  Plus,
  Save,
  Trash2,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Wrench,
  AlertCircle,
  Lock,
  Upload,
  Check,
  Camera,
  MapPin,
  Tag,
  Sliders,
  Eye,
  CheckCircle2,
  Info,
  DollarSign,
  Layers,
  Phone,
  Mail,
  Search,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface EquipmentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentToEdit: Equipment | null;
  onSave: (equipment: Equipment) => void;
  onDelete?: (id: string) => void;
  currentUser?: CurrentUser;
}

// Catégories disponibles pour les annonces (sans 'Tous')
const AVAILABLE_CATEGORIES = EQUIPMENT_CATEGORIES.filter((c) => c !== 'Tous');

// Bibliothèque d'images haute résolution classée par catégorie
const CURATED_CATEGORY_PRESETS: Record<string, { label: string; url: string }[]> = {
  'High-Tech, Photo & Audiovisuel': [
    { label: 'Drone 4K DJI Mini Pro', url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80' },
    { label: 'Boîtier Hybride Plein Format', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80' },
    { label: 'Vidéoprojecteur Cinéma 4K', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Stabilisateur Gimbal 3 Axes', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80' },
  ],
  'Bricolage & Outillage BTP': [
    { label: 'Perforateur Burineur Pro', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Scie Circulaire Laser', url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80' },
    { label: 'Ponceuse & Aspirateur Atelier', url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop&q=80' },
    { label: 'Bétonnière Chantier 160L', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=80' },
  ],
  'Jardin, Espaces Verts & Forêt': [
    { label: 'Motoculteur Fraiseur 4T', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Tronçonneuse d\'élagage', url: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80' },
    { label: 'Tondeuse Thermique Autotractée', url: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?w=800&auto=format&fit=crop&q=80' },
    { label: 'Nettoyeur HP 180 Bars', url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&auto=format&fit=crop&q=80' },
  ],
  'Industrie, Chantier & Gros Œuvre': [
    { label: 'Groupe Électrogène Inverter 5kW', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
    { label: 'Échafaudage Roulant Alu 6m', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=80' },
    { label: 'Plaque Vibrante Compacteur', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80' },
  ],
  'Informatique, Gaming & Bureautique': [
    { label: 'PC Portable Gamer & Station CAO', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80' },
    { label: 'Casque VR Réalité Virtuelle', url: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop&q=80' },
    { label: 'Imprimante 3D Haute Précision', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80' },
    { label: 'Console Next-Gen Gaming', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80' },
  ],
  'Musique & Instruments de Studio': [
    { label: 'Guitare Électrique USA & Ampli', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80' },
    { label: 'Batterie Électronique Mesh', url: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800&auto=format&fit=crop&q=80' },
    { label: 'Clavier Synthétiseur Studio', url: 'https://images.unsplash.com/photo-1520523839898-50712825e317?w=800&auto=format&fit=crop&q=80' },
  ],
  'Événementiel, Son & Lumière': [
    { label: 'Pack Sono 1500W & Micros', url: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop&q=80' },
    { label: 'Jeux de Lumière & Lasers', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' },
    { label: 'Barnum Pliant 3x6m', url: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800&auto=format&fit=crop&q=80' },
    { label: 'Tireuse à Bière Professionnelle', url: 'https://images.unsplash.com/photo-1518176258769-f227c798150e?w=800&auto=format&fit=crop&q=80' },
  ],
  'Véhicules, Remorques & Transport': [
    { label: 'Remorque Basculante 750kg', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80' },
    { label: 'Coffre de Toit XXL 480L', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80' },
    { label: 'Porte-Vélos d\'Attelage 4 Vélos', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80' },
  ],
  'Automobile, Moto, Scooter & 2 Roues': [
    { label: 'Trottinette Électrique Puissante', url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80' },
    { label: 'Remorque Porte-Moto', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80' },
  ],
  'Déménagement, Stockage & Diables': [
    { label: 'Diable Monte-Escalier Lourd', url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop&q=80' },
    { label: 'Kit 20 Bacs de Déménagement Pro', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Plateau Roulant Chariot 300kg', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80' },
  ],
  'Sport, Fitness & Montagne': [
    { label: 'VTT Électrique Tout-Suspendu', url: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800&auto=format&fit=crop&q=80' },
    { label: 'Pack Skis & Chaussures Haute Route', url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&auto=format&fit=crop&q=80' },
    { label: 'Tapis de Course Pliable', url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&auto=format&fit=crop&q=80' },
  ],
  'Nautisme, Bateaux & Plongée': [
    { label: 'Stand Up Paddle Gonflable', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80' },
    { label: 'Kayak de Mer 2 Places', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80' },
    { label: 'Pack Bouteille & Détendeur Plongée', url: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&auto=format&fit=crop&q=80' },
  ],
  'Voyage, Camping & Van aménagé': [
    { label: 'Tente de Toit 4x4 Expédition', url: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&auto=format&fit=crop&q=80' },
    { label: 'Van Aménagé Équipé Weekend', url: 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&auto=format&fit=crop&q=80' },
    { label: 'Tente Bivouac 4 Saisons', url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80' },
  ],
  'Loisirs, Drones & Plein Air': [
    { label: 'Télescope Astronomique', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80' },
    { label: 'Détecteur de Métaux Haute Sensibilité', url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80' },
  ],
  'Maison, Électroménager & Nettoyage': [
    { label: 'Shampouineuse Canapé / Moquette', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80' },
    { label: 'Nettoyeur Vapeur Désinfectant', url: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&auto=format&fit=crop&q=80' },
    { label: 'Déshumidificateur Grand Volume', url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop&q=80' },
  ],
  'Cuisine, Plancha & Gastronomie': [
    { label: 'Plancha Inox Gaz 3 Feux Pro', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80' },
    { label: 'Robot Pâtissier Multifonction', url: 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800&auto=format&fit=crop&q=80' },
    { label: 'Appareil à Raclette Traditionnelle 1/2 Meule', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80' },
  ],
  'Bébé, Puériculture & Enfance': [
    { label: 'Poussette Tout-Terrain Compacte', url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80' },
    { label: 'Siège Auto Bébé Pivotant Isofix', url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&auto=format&fit=crop&q=80' },
    { label: 'Lit Parapluie & Matelas Confort', url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80' },
  ],
  'Jeux, Gonflables & Animations': [
    { label: 'Château Gonflable Enfants 4x3m', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80' },
    { label: 'Jeux Géants en Bois (Puissance 4, Mölkky)', url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80' },
  ],
  'Mode, Costumes, Luxe & Maroquinerie': [
    { label: 'Smoking Homme & Robe de Gala', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80' },
    { label: 'Sac de Luxe Cuir Marque Haute Couture', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80' },
  ],
  'Mobilier, Décoration & Réception': [
    { label: 'Arche Florale Mariage & Banquette', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80' },
    { label: 'Mange-Debout Housses Noires (x10)', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80' },
  ],
  'Santé, Médical & Bien-être': [
    { label: 'Fauteuil Roulant Pliant Confort', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80' },
    { label: 'Table de Massage Professionnelle Alu', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80' },
  ],
  'Autre matériel & Objets insolites': [
    { label: 'Équipement Universel Multi-Usage', url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop&q=80' },
  ],
};

const SUGGESTED_QUICK_TAGS = [
  'Facture d\'achat disponible',
  'Manuel d\'utilisation fourni',
  'Housse de transport incluse',
  'Batteries chargées fournies',
  'Câbles complets inclus',
  'Révisé & testé avant remise',
  'Disponibilité 7j/7',
  'Antivol inclus',
];

export const EquipmentEditorModal: React.FC<EquipmentEditorModalProps> = ({
  isOpen,
  onClose,
  equipmentToEdit,
  onSave,
  onDelete,
  currentUser,
}) => {
  const isEditing = Boolean(equipmentToEdit);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form active section tab
  const [activeTab, setActiveTab] = useState<'info' | 'pricing' | 'photos' | 'specs'>('info');
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Form State - Strictement vierge, aucun chiffre ni texte de démo
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(AVAILABLE_CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [dailyRate, setDailyRate] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [ownerType, setOwnerType] = useState<'pro' | 'particulier'>('particulier');
  const [partnerArtisan, setPartnerArtisan] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [condition, setCondition] = useState<'neuf' | 'tres_bon_etat' | 'bon_etat'>('tres_bon_etat');
  const [description, setDescription] = useState('');

  // Photos - Vierge au départ
  const [image, setImage] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [photoSourceMode, setPhotoSourceMode] = useState<'upload' | 'preset' | 'url'>('upload');

  // Specs & Tags - Vierge au départ
  const [specsList, setSpecsList] = useState<{ label: string; value: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (equipmentToEdit) {
      setName(equipmentToEdit.name || '');
      const isKnown = AVAILABLE_CATEGORIES.includes(equipmentToEdit.category);
      if (isKnown) {
        setCategory(equipmentToEdit.category);
        setIsCustomCategory(false);
        setCustomCategoryName('');
      } else {
        setCategory(AVAILABLE_CATEGORIES[0]);
        setIsCustomCategory(true);
        setCustomCategoryName(equipmentToEdit.category || '');
      }
      setCity(equipmentToEdit.city || '');
      setDailyRate(equipmentToEdit.dailyRate ?? '');
      setDepositAmount(equipmentToEdit.depositAmount ?? '');
      setPartnerArtisan(equipmentToEdit.partnerArtisan || '');
      setOwnerType(equipmentToEdit.ownerType || 'particulier');
      setOwnerPhone(equipmentToEdit.ownerPhone || '');
      setOwnerEmail(equipmentToEdit.ownerEmail || '');
      setCondition(equipmentToEdit.condition || 'tres_bon_etat');
      setDescription(equipmentToEdit.description || '');
      setImage(equipmentToEdit.image || '');
      setSpecsList(equipmentToEdit.specs || []);
      setSelectedTags(equipmentToEdit.tags || []);
    } else {
      // Nouvelle annonce 100% propre : aucun chiffre démo pré-rempli
      const defaultOwner =
        currentUser?.role === 'loueur_pro'
          ? currentUser.companyName || currentUser.name
          : currentUser?.role === 'loueur_particulier'
          ? `${currentUser.prenom} ${currentUser.nom}`.trim()
          : currentUser && 'prenom' in currentUser && currentUser.prenom
          ? `${currentUser.prenom} ${currentUser.nom || ''}`.trim()
          : currentUser?.name || '';

      const defaultCity =
        currentUser && 'city' in currentUser && currentUser.city
          ? currentUser.city
          : '';

      const defaultType = currentUser?.role === 'loueur_pro' ? 'pro' : 'particulier';

      setName('');
      setCategory(AVAILABLE_CATEGORIES[0]);
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setCategorySearchQuery('');
      setCity(defaultCity);
      setDailyRate('');
      setDepositAmount('');
      setPartnerArtisan(defaultOwner);
      setOwnerType(defaultType);
      setOwnerPhone(currentUser?.phone || '');
      setOwnerEmail(currentUser?.email || '');
      setCondition('tres_bon_etat');
      setDescription('');
      setImage('');
      setCustomImageUrl('');
      setSpecsList([]);
      setSelectedTags([]);
    }
    setFormError(null);
    setActiveTab('info');
  }, [equipmentToEdit, isOpen, currentUser]);

  if (!isOpen) return null;

  // Handle local image upload via file reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Le fichier doit être une image (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('La taille de l\'image ne doit pas dépasser 5 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImage(result);
        setCustomImageUrl('');
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Smart caution multipliers
  const applyCautionMultiplier = (multiplier: number) => {
    const rate = Number(dailyRate) || 0;
    if (rate > 0) {
      setDepositAmount(Math.round(rate * multiplier));
      setFormError(null);
    } else {
      setFormError('Indiquez d\'abord votre tarif journalier pour calculer la caution automatiquement.');
    }
  };

  // Toggle quick tags
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Add / remove specs
  const handleAddSpec = () => {
    if (specsList.length < 6) {
      setSpecsList([...specsList, { label: '', value: '' }]);
    }
  };

  const handleUpdateSpec = (index: number, field: 'label' | 'value', val: string) => {
    const updated = [...specsList];
    updated[index][field] = val;
    setSpecsList(updated);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecsList(specsList.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict validation
    if (!name.trim()) {
      setActiveTab('info');
      setFormError('Le titre de l\'annonce est obligatoire (ex: Drone 4K DJI, Scie plongeante...).');
      return;
    }

    if (dailyRate === '' || Number(dailyRate) <= 0) {
      setActiveTab('pricing');
      setFormError('Le tarif de location par jour doit être supérieur à 0 €.');
      return;
    }

    // MANDATORY STRIPE CAUTION DEPOSIT VALIDATION
    if (depositAmount === '' || Number(depositAmount) <= 0) {
      setActiveTab('pricing');
      setFormError('Le montant de la caution obligatoire est requis et doit être supérieur à 0 €.');
      return;
    }

    // VÉRIFICATION OBLIGATOIRE DE LA PHOTO
    const chosenImage = customImageUrl.trim() || image.trim();
    if (!chosenImage) {
      setActiveTab('photos');
      setFormError('Une photo de votre équipement est obligatoire pour publier l\'annonce (téléversez une photo, choisissez un modèle dans la bibliothèque ou entrez une URL).');
      return;
    }

    const finalImage = chosenImage;
    const finalCategory = isCustomCategory && customCategoryName.trim()
      ? customCategoryName.trim()
      : category;

    const finalId = equipmentToEdit?.id && isValidUUID(equipmentToEdit.id)
      ? equipmentToEdit.id
      : generateUUID();

    const isPublishedByDefault = equipmentToEdit
      ? (equipmentToEdit.is_published !== false && equipmentToEdit.isActive !== false)
      : true;

    const savedEquipment: Equipment = {
      id: finalId,
      name: name.trim(),
      category: finalCategory,
      city: city.trim() || 'France',
      dailyRate: Number(dailyRate),
      depositAmount: Number(depositAmount), // Strict mandatory caution deposit
      image: finalImage,
      description:
        description.trim() ||
        'Équipement disponible à la location avec caution sécurisée Stripe sans débit.',
      partnerArtisan: partnerArtisan.trim() || (ownerType === 'pro' ? 'Loueur Professionnel' : 'Loueur Particulier'),
      ownerType,
      ownerId: currentUser?.id || equipmentToEdit?.ownerId,
      ownerName: partnerArtisan.trim() || (ownerType === 'pro' ? 'Loueur Professionnel' : 'Loueur Particulier'),
      ownerEmail: ownerEmail.trim() || currentUser?.email || '',
      ownerPhone: ownerPhone.trim() || currentUser?.phone || '',
      condition,
      tags: selectedTags,
      specs: specsList
        .filter((s) => s.label.trim() || s.value.trim())
        .map((s) => ({
          label: s.label.trim() || 'Caractéristique',
          value: s.value.trim() || 'Inclus',
        })),
      inStock: true,
      isActive: isPublishedByDefault,
      is_published: isPublishedByDefault,
      createdAt: equipmentToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(savedEquipment);
    onClose();
  };

  const currentPresets = CURATED_CATEGORY_PRESETS[category] || CURATED_CATEGORY_PRESETS['High-Tech & Audiovisuel'];

  // Calculate monthly earnings projection (assuming 4 days/month)
  const monthlyProjection = (Number(dailyRate) || 0) * 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:px-8 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm shadow-amber-400/20 font-bold">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-950 tracking-tight">
                  {isEditing ? 'Modifier l\'annonce de location' : 'Déposer une annonce de matériel'}
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Caution Stripe Garantie
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fixez votre tarif journalier et le montant obligatoire de la caution sous séquestre Stripe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live preview toggle button */}
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showLivePreview
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{showLivePreview ? 'Masquer aperçu' : 'Aperçu en direct'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Stepper */}
        <div className="px-5 sm:px-8 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">1</span>
            <span>Objet & Catégorie</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">2</span>
            <span>Tarifs & Caution Stripe</span>
            <span className="text-[10px] px-1 py-0.2 bg-red-100 text-red-700 font-bold rounded">Requis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">3</span>
            <span>Photos & État</span>
            <span className="text-[10px] px-1 py-0.2 bg-red-100 text-red-700 font-bold rounded">Requis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'specs'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">4</span>
            <span>Accessoires & Inclus</span>
          </button>
        </div>

        {/* Modal Main Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {formError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div className="font-medium">{formError}</div>
            </div>
          )}

          <div className={`grid gap-8 ${showLivePreview ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
            {/* Form Fields Column */}
            <form
              id="equipment-editor-form"
              onSubmit={handleSubmit}
              className={`space-y-6 ${showLivePreview ? 'lg:col-span-7' : 'w-full'}`}
            >
              {/* TAB 1: OBJET & CATÉGORIE */}
              {activeTab === 'info' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Auto-remplissage notification banner */}
                  {currentUser && !isEditing && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Session active détectée :</strong> Vos coordonnées de loueur (
                          {currentUser.role === 'loueur_pro' ? currentUser.companyName : `${partnerArtisan || currentUser.name}`}) sont pré-remplies automatiquement.
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                        Auto-rempli
                      </span>
                    </div>
                  )}

                  {/* Type de loueur & Identité */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Profil du propriétaire
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOwnerType('particulier')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          ownerType === 'particulier'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Particulier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOwnerType('pro')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          ownerType === 'pro'
                            ? 'bg-slate-900 text-amber-300 shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Professionnel / Société</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nom affiché du loueur <span className="text-amber-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={partnerArtisan}
                          onChange={(e) => setPartnerArtisan(e.target.value)}
                          placeholder="Ex: Studio Ciné Pro, Alexandre M...."
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Ville & Code Postal <span className="text-amber-600">*</span></span>
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ex: Bordeaux (33), Lyon 3e, Paris 11e..."
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Coordonnées de contact pour mise en relation & notifications */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>Téléphone (Appels & WhatsApp locataires)</span>
                        </label>
                        <input
                          type="tel"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          placeholder="Ex: 06 12 34 56 78"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>E-mail (Notifications & contrat)</span>
                        </label>
                        <input
                          type="email"
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          placeholder="Ex: contact@monatelier.fr"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Titre de l'objet */}
                  <div className="space-y-1.5">
                    <label htmlFor="eqName" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Titre précis de votre équipement <span className="text-amber-600">*</span>
                    </label>
                    <input
                      id="eqName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Scie circulaire, Appareil photo hybride, Enceinte sono..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-950 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                    />
                    <p className="text-[11px] text-slate-500">
                      Soyez précis sur la marque et le modèle pour inspirer confiance aux locataires.
                    </p>
                  </div>

                  {/* Sélection de Catégorie Universelle (Sans aucune limite) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Catégorie Matik <span className="text-amber-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(!isCustomCategory);
                          if (!isCustomCategory && !customCategoryName) {
                            setCustomCategoryName('');
                          }
                        }}
                        className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      >
                        {isCustomCategory ? 'Choisir dans la liste des catégories' : '+ Créer une catégorie sur-mesure'}
                      </button>
                    </div>

                    {/* Mode Catégorie Personnalisée Libre */}
                    {isCustomCategory ? (
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950">
                            Catégorie libre sur-mesure (Aucune limite)
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                            Tout se loue
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                          placeholder="Ex: Matériel agricole, Équitation, Détecteur de métaux, Jeux d'arcade, Robotique..."
                          className="w-full px-4 py-2.5 bg-white border border-amber-400 rounded-xl text-sm font-bold text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <p className="text-[11px] text-amber-900/80">
                          Votre matériel apparaîtra sous cette catégorie personnalisée dans le catalogue et les filtres.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Barre de recherche de catégorie si beaucoup de choix */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Rechercher une catégorie (BTP, Photo, Bébé, Camping, Cuisine, Luxe...)"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* Grille des catégories scrollable et ergonomique */}
                        <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {AVAILABLE_CATEGORIES
                              .filter((cat) =>
                                cat.toLowerCase().includes(categorySearchQuery.toLowerCase().trim())
                              )
                              .map((cat) => {
                                const isSelected = category === cat && !isCustomCategory;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setCategory(cat);
                                      setIsCustomCategory(false);
                                      // Auto pick top image preset for this category if preset mode
                                      const presets = CURATED_CATEGORY_PRESETS[cat];
                                      if (presets && presets[0] && photoSourceMode === 'preset') {
                                        setImage(presets[0].url);
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                      isSelected
                                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 text-slate-950 font-bold'
                                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                    }`}
                                  >
                                    <span className="truncate">{cat}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* Raccourci vers catégorie personnalisée */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCategory(true);
                              setCustomCategoryName('');
                            }}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 text-slate-600 hover:text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>Votre catégorie n'est pas dans la liste ? Cliquez ici pour la créer librement</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* État du matériel */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      État général du matériel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCondition('neuf')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          condition === 'neuf'
                            ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ⭐ Neuf / Impeccable
                      </button>

                      <button
                        type="button"
                        onClick={() => setCondition('tres_bon_etat')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          condition === 'tres_bon_etat'
                            ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ✨ Très bon état
                      </button>

                      <button
                        type="button"
                        onClick={() => setCondition('bon_etat')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          condition === 'bon_etat'
                            ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        👍 Bon état d'usage
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TARIFS & CAUTION STRIPE */}
              {activeTab === 'pricing' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Daily Rate & Mandatory Caution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    {/* Tarif journalier */}
                    <div className="space-y-2">
                      <label htmlFor="eqDailyRate" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Tarif de location journalier <span className="text-amber-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="eqDailyRate"
                          type="number"
                          min="1"
                          required
                          value={dailyRate}
                          onChange={(e) => setDailyRate(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Ex: 25"
                          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl text-lg font-black font-mono text-slate-950 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                          € / jour
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Prix fixé librement par vous.
                      </span>
                    </div>

                    {/* MANDATORY DEPOSIT WITH STRIPE HIGHLIGHT */}
                    <div className="space-y-2 p-3.5 rounded-xl bg-amber-50/70 border-2 border-amber-400">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="eqDepositAmount"
                          className="block text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Caution Stripe <span className="text-red-600">*</span></span>
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase">
                          OBLIGATOIRE
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="eqDepositAmount"
                          type="number"
                          min="1"
                          step="10"
                          required
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Ex: 200"
                          className="w-full pl-4 pr-8 py-2.5 bg-white border-2 border-amber-400 rounded-xl text-lg font-mono font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-amber-700">
                          €
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-900 leading-tight block font-medium">
                        Empreinte bancaire sécurisée Stripe sans débit immédiat pour le locataire.
                      </span>
                    </div>
                  </div>

                  {/* Assistant intelligent de calcul de caution */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Assistant calcul de caution recommandé</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Appliquez en un clic un ratio adapté à la valeur marchande de votre matériel :
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyCautionMultiplier(8)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        x8 (Standard {Number(dailyRate) > 0 ? `- ${(Number(dailyRate)) * 8} €` : ''})
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCautionMultiplier(10)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                      >
                        x10 Recommandé {Number(dailyRate) > 0 ? `(${(Number(dailyRate)) * 10} €)` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCautionMultiplier(15)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        x15 High-Tech & Pro {Number(dailyRate) > 0 ? `(${(Number(dailyRate)) * 15} €)` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Estimation des revenus mensuels */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          Revenus estimés pour vous
                        </div>
                        <div className="text-xs text-emerald-800">
                          {Number(dailyRate) > 0
                            ? 'À raison de 4 jours loués par mois chez vous ou à l\'atelier'
                            : 'Indiquez votre prix par jour pour voir votre estimation'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black font-mono text-emerald-900">
                        {Number(dailyRate) > 0 ? `~${(Number(dailyRate) || 0) * 4} €` : '- €'}{' '}
                        <span className="text-xs font-normal">/ mois</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-medium">Revenus complémentaires</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PHOTOS & MÉDIAS */}
              {activeTab === 'photos' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Photo Mode Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('upload')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        photoSourceMode === 'upload'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Téléverser mon fichier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('preset')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        photoSourceMode === 'preset'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Bibliothèque HD Matik</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('url')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        photoSourceMode === 'url'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>Lien URL</span>
                    </button>
                  </div>

                  {/* Mode 1: File Upload */}
                  {photoSourceMode === 'upload' && (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer space-y-3"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shadow-xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Cliquez pour choisir une photo ou glissez-déposez ici
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Format JPG, PNG ou WebP (max 5 Mo). Photo nette recommandée.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Presets */}
                  {photoSourceMode === 'preset' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Sélectionnez une photo professionnelle représentative pour la catégorie <strong>{category}</strong> :
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {currentPresets.map((preset) => {
                          const isSelected = image === preset.url && !customImageUrl;
                          return (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => {
                                setImage(preset.url);
                                setCustomImageUrl('');
                              }}
                              className={`p-1.5 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-50 shadow-sm'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-full h-20 object-cover rounded-xl"
                              />
                              <span className="text-[11px] text-slate-800 font-semibold truncate w-full text-center px-1">
                                {preset.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Direct URL */}
                  {photoSourceMode === 'url' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        URL directe de l'image (web)
                      </label>
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={(e) => {
                          setCustomImageUrl(e.target.value);
                          if (e.target.value.trim()) {
                            setImage(e.target.value.trim());
                          }
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {/* Active Photo Preview */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                    {customImageUrl || image ? (
                      <img
                        src={customImageUrl || image}
                        alt="Aperçu photo"
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                        <Camera className="w-6 h-6 stroke-1.5" />
                        <span className="text-[10px] font-medium mt-1">À choisir</span>
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {customImageUrl || image ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Photo sélectionnée pour l'annonce</span>
                          </>
                        ) : (
                          <span className="text-amber-800 font-semibold">Photo obligatoire requise</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {customImageUrl || image
                          ? 'Cette photo apparaîtra en couverture dans le catalogue et sur le contrat PDF.'
                          : 'Téléversez une photo de votre matériel, sélectionnez un modèle ou indiquez une URL pour valider.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ACCESSOIRES & SPÉCIFICATIONS */}
              {activeTab === 'specs' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Badges d'assurance et accessoires rapides */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Badges de réassurance (cliquez pour activer)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUICK_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spécifications dynamiques */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Points techniques clés (affichés sur la carte)
                      </label>
                      {specsList.length < 5 && (
                        <button
                          type="button"
                          onClick={handleAddSpec}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter une ligne</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {specsList.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                          <span>Facultatif : ajoutez des détails techniques (ex: Puissance, Accessoires inclus...).</span>
                          <button
                            type="button"
                            onClick={handleAddSpec}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                          >
                            + Ajouter
                          </button>
                        </div>
                      ) : (
                        specsList.map((spec, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={spec.label}
                              onChange={(e) => handleUpdateSpec(index, 'label', e.target.value)}
                              placeholder="Ex: Puissance, Modèle..."
                              className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                            />
                            <input
                              type="text"
                              value={spec.value}
                              onChange={(e) => handleUpdateSpec(index, 'value', e.target.value)}
                              placeholder="Ex: 1500W, Inclus..."
                              className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSpec(index)}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Description détaillée */}
                  <div className="space-y-2">
                    <label htmlFor="eqDesc" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Description complète & Modalités de remise
                    </label>
                    <textarea
                      id="eqDesc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Détaillez le fonctionnement, les accessoires fournis, les consignes d'utilisation et le lieu de rendez-vous..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Live Preview Card Column (Visible when showLivePreview is active) */}
            {showLivePreview && (
              <div className="lg:col-span-5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    <span>Rendu dans le catalogue</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Temps réel</span>
                </div>

                {/* Simulated Catalog Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
                    {customImageUrl || image ? (
                      <img
                        src={customImageUrl || image}
                        alt={name || 'Équipement'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <Camera className="w-10 h-10 mb-1 stroke-1" />
                        <span className="text-xs font-medium">Votre photo apparaîtra ici</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm ${
                          ownerType === 'particulier'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900 text-amber-300'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{ownerType === 'particulier' ? 'Particulier Vérifié' : 'Pro Vérifié'}</span>
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/95 text-emerald-700 border border-emerald-200 shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Disponible</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-amber-700 uppercase tracking-wider">{category}</span>
                      <span className="truncate max-w-[120px] font-medium">{city || partnerArtisan || 'France'}</span>
                    </div>

                    <h4 className="font-bold text-slate-950 text-sm leading-snug line-clamp-1">
                      {name || 'Titre de votre équipement'}
                    </h4>

                    {/* Specs preview */}
                    {specsList.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        {specsList.slice(0, 2).map((s, idx) => (
                          <div key={idx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block truncate">{s.label}</span>
                            <span className="text-slate-900 font-semibold block truncate">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pricing strip */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {dailyRate ? (
                          <>
                            <span className="text-lg font-black text-slate-950">{dailyRate} €</span>
                            <span className="text-[10px] text-slate-500 ml-1">/ jour</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">Tarif libre</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span>{depositAmount ? `Caution : ${depositAmount} €` : 'Caution à fixer'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-8 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div>
            {isEditing && onDelete && equipmentToEdit && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Confirmez-vous la suppression de l'annonce "${equipmentToEdit.name}" ?`)) {
                    onDelete(equipmentToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            {/* Next Tab / Submit button */}
            {activeTab !== 'specs' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'info') setActiveTab('pricing');
                  else if (activeTab === 'pricing') setActiveTab('photos');
                  else if (activeTab === 'photos') setActiveTab('specs');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-slate-200 hover:bg-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Étape suivante</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              type="submit"
              form="equipment-editor-form"
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-sm shadow-amber-400/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Enregistrer les modifications' : 'Publier l\'annonce'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
