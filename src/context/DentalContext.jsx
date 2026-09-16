import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchAllFromSupabase,
  saveOrderToSupabase,
  deleteOrderFromSupabase,
  saveCompanyToSupabase,
  deleteCompanyFromSupabase,
  saveDoctorToSupabase,
  deleteDoctorFromSupabase,
  savePatientToSupabase,
  deletePatientFromSupabase,
  clearAllFromSupabase,
  uploadStlToSupabase,
  deleteStlFromSupabase,
  linkFilesToOrderInSupabase,
  fetchTechniciansFromSupabase,
  saveTechniciansToSupabase,
  saveMaterialsToSupabase
} from '../services/supabaseService';

const DentalContext = createContext(null);

const STORAGE_KEY = 'dentallab_data_clean_v8';
const DB_CONFIG_KEY = 'dentallab_database_config_v2';

export function idsMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function orderBelongsToCompany(order, companyId, patients = [], doctors = []) {
  if (!order || companyId == null || companyId === '') return false;
  if (idsMatch(order.companyId, companyId)) return true;
  const pat = (patients || []).find(p => idsMatch(p.id, order.patientId));
  if (pat && idsMatch(pat.companyId, companyId)) return true;
  const doc = (doctors || []).find(d => idsMatch(d.id, order.doctorId));
  if (doc && idsMatch(doc.companyId, companyId)) return true;
  return false;
}

const APPROVAL_STEP = {
  order: 1,
  name: 'Onay',
  description: 'Kullanıcıdan gelen iş emri yönetici onayını bekler.',
  defaultTechnician: 'Yusuf Usta',
  estimatedHours: 0,
  isDefault: true
};

const OTHER_PIPELINE_STEPS = [
  { ...APPROVAL_STEP },
  { order: 2, name: 'Ölçü + Model', description: 'Klinik ölçüsü alınır, laboratuvara aktarılır ve çalışma modeli elde edilir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 3, name: 'Altyapı', description: 'Restorasyon altyapısı hazırlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 4, name: 'Opak', description: 'Opak uygulaması yapılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true },
  { order: 5, name: 'Dentin', description: 'Dentin katmanı yığılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 6, name: 'Glaze', description: 'Glaze ve parlatma tamamlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true }
];

const IMPLANT_PIPELINE_STEPS = [
  { ...APPROVAL_STEP },
  { order: 2, name: 'Ölçü + Model', description: 'İmplant ölçüsü alınır ve analoglu çalışma modeli elde edilir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 3, name: 'Abutment + Freze', description: 'Abutment / dayanak hazırlanır ve altyapı veya üstyapı frezelenir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 7, isDefault: true },
  { order: 4, name: 'Torklama + Ölçü', description: 'Abutment torklanır ve torklama sonrası kontrol ölçüsü alınır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 5, name: 'Altyapı', description: 'Porselen öncesi altyapı hazırlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
  { order: 6, name: 'Prova', description: 'Altyapı / üstyapı provası yapılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true },
  { order: 7, name: 'Glaze', description: 'Glaze ve parlatma tamamlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true }
];

export function clonePipelineSteps(steps = []) {
  return (steps || []).map((s, idx) => ({ ...s, order: s.order || idx + 1 }));
}

export function slugifyPipelineId(name, fallback = 'tip') {
  const slug = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || `${fallback}_${Date.now()}`;
}

export function stepNamesKey(steps = []) {
  return (steps || []).map(s => normalizeStepName(s.name)).join('|');
}

export const DEFAULT_PIPELINE_TYPES = {
  other: {
    id: 'other',
    name: 'Diğer',
    locked: true,
    steps: clonePipelineSteps(OTHER_PIPELINE_STEPS)
  },
  implant: {
    id: 'implant',
    name: 'İmplant',
    locked: true,
    steps: clonePipelineSteps(IMPLANT_PIPELINE_STEPS)
  }
};

export const DEFAULT_MATERIALS = {
  mdp: {
    id: 'mdp',
    name: 'MDP (Metal Destekli Porselen)',
    badgeClass: 'badge-mat-mdp',
    color: '#d97706',
    pipelineTypeId: 'other',
    description: 'Metal destekli porselen restorasyon üretimi.',
    steps: clonePipelineSteps(OTHER_PIPELINE_STEPS)
  },
  zirconia: {
    id: 'zirconia',
    name: 'Zirkonyum',
    badgeClass: 'badge-mat-zirconia',
    color: '#0284c7',
    pipelineTypeId: 'other',
    description: 'Zirkonyum restorasyon üretimi.',
    steps: clonePipelineSteps(OTHER_PIPELINE_STEPS)
  },
  implant: {
    id: 'implant',
    name: 'İmplant',
    badgeClass: 'badge-mat-implant',
    color: '#059669',
    pipelineTypeId: 'implant',
    description: 'İmplant üstü protez üretimi. Son etaptan MDP (metal destekli porselen) işine geçilebilir.',
    steps: clonePipelineSteps(IMPLANT_PIPELINE_STEPS)
  },
  lamina: {
    id: 'lamina',
    name: 'Lamina',
    badgeClass: 'badge-mat-lamina',
    color: '#7c3aed',
    pipelineTypeId: 'other',
    description: 'Lamina restorasyon üretimi.',
    steps: clonePipelineSteps(OTHER_PIPELINE_STEPS)
  }
};

export function inferPipelineTypeId(mat) {
  if (!mat) return 'other';
  if (mat.pipelineTypeId) return mat.pipelineTypeId;
  if (mat.id === 'implant' || mat.materialId === 'implant') return 'implant';
  return 'other';
}

export function getMaterialPipelineType(mat, pipelineTypes = DEFAULT_PIPELINE_TYPES) {
  const typeId = inferPipelineTypeId(mat);
  return pipelineTypes[typeId] || pipelineTypes.other || DEFAULT_PIPELINE_TYPES.other;
}

const MATERIAL_ID_ALIASES = {
  emax: 'lamina',
  porcelain: 'mdp'
};

export function normalizeStepName(name) {
  const n = (name || '').trim();
  if (n === 'Ölçü' || n === 'Model' || n === 'Ölçü + Model') return 'Ölçü + Model';
  if (n === 'Abutment' || n === 'Freze' || n === 'Abutment + Freze') return 'Abutment + Freze';
  if (n === 'Torklama' || n === 'Ölçü 2' || n === 'Torklama + Ölçü') return 'Torklama + Ölçü';
  return n;
}

function mapLegacyStepName(name) {
  return normalizeStepName(name);
}

function mergeById(localList = [], remoteList = []) {
  const map = new Map();
  (localList || []).forEach(item => {
    if (item?.id == null) return;
    map.set(String(item.id), item);
  });
  (remoteList || []).forEach(item => {
    if (item?.id == null) return;
    const key = String(item.id);
    const local = map.get(key);
    map.set(key, local ? { ...local, ...item } : item);
  });
  return Array.from(map.values());
}

function nextOrderId(orders) {
  const year = new Date().getFullYear();
  let max = 0;
  (orders || []).forEach(o => {
    const match = String(o.id || '').match(/ORD-\d+-(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  const used = new Set((orders || []).map(o => o.id));
  let n = max + 1;
  let id = `ORD-${year}-${String(n).padStart(3, '0')}`;
  while (used.has(id)) {
    n += 1;
    id = `ORD-${year}-${String(n).padStart(3, '0')}`;
  }
  return id;
}

export function migrateOrderToCurrentPipeline(order, materialsMap = DEFAULT_MATERIALS) {
  if (!order) return order;
  const materialId = MATERIAL_ID_ALIASES[order.materialId] || order.materialId;
  const template = (materialsMap && materialsMap[materialId]) || DEFAULT_MATERIALS[materialId];
  if (!template || !Array.isArray(template.steps) || template.steps.length === 0) {
    return {
      ...order,
      materialId,
      companyId: order.companyId != null ? String(order.companyId) : order.companyId
    };
  }
  const resolvedId = template.id || materialId;
  const templateNames = template.steps.map(s => s.name);
  const currentNames = (order.steps || []).map(s => s.name);
  const alreadyMigrated =
    currentNames.length === templateNames.length &&
    currentNames.every((name, idx) => name === templateNames[idx]);

  if (alreadyMigrated && order.materialId === resolvedId) {
    return {
      ...order,
      steps: (order.steps || []).map(s => ({
        ...s,
        technician: normalizeTechnicianName(s.technician)
      }))
    };
  }

  const isCompleted = order.status === 'completed';
  const isPending = order.status === 'pending_approval' || order.status === 'rejected';
  const oldIdx = order.currentStepIndex || 0;
  const oldStep = (order.steps || [])[oldIdx];
  const mappedName = isPending ? 'Onay' : mapLegacyStepName(oldStep?.name);

  let newIdx = template.steps.findIndex(s => s.name === mappedName);
  if (newIdx < 0) {
    const oldLen = Math.max(1, (order.steps || []).length);
    newIdx = Math.min(Math.floor((oldIdx / oldLen) * template.steps.length), template.steps.length - 1);
  }
  if (isCompleted) newIdx = template.steps.length - 1;
  else if (!isPending && template.steps[newIdx]?.name === 'Onay') newIdx = Math.min(1, template.steps.length - 1);

  const steps = template.steps.map((s, idx) => ({
    order: s.order,
    name: s.name,
    description: s.description,
    technician: normalizeTechnicianName((order.steps && order.steps[Math.min(oldIdx, Math.max(0, (order.steps || []).length - 1))]?.technician) || s.defaultTechnician || 'Yusuf Usta'),
    notes: '',
    status: isCompleted || idx < newIdx ? 'completed' : (idx === newIdx ? 'in_progress' : 'pending'),
    startedAt: idx === newIdx ? (oldStep?.startedAt || null) : null,
    completedAt: idx < newIdx ? (order.steps?.[Math.min(idx, Math.max(0, (order.steps || []).length - 1))]?.completedAt || null) : null,
    completedDate: idx < newIdx ? (order.steps?.[Math.min(idx, Math.max(0, (order.steps || []).length - 1))]?.completedDate || null) : null
  }));

  return {
    ...order,
    materialId: resolvedId,
    companyId: order.companyId != null ? String(order.companyId) : order.companyId,
    steps,
    currentStepIndex: newIdx
  };
}

export function migrateOrdersToCurrentPipeline(orders, materialsMap = DEFAULT_MATERIALS) {
  if (!Array.isArray(orders)) return [];
  return orders.map(o => migrateOrderToCurrentPipeline(o, materialsMap));
}

export const IMPLANT_COMPLETED_LABEL = 'İmplant tamamlandı';

export function isOrderFromCompletedImplant(order) {
  if (!order) return false;
  if (order.fromImplantId || order.implantCompleted) return true;
  return (order.notes || '').includes(IMPLANT_COMPLETED_LABEL);
}

export const VITA_SHADES = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'BL1 (Bleach)', 'BL2 (Bleach)', 'BL3 (Bleach)', 'BL4 (Bleach)'
];

export const TECHNICIANS_STORAGE_KEY = 'dentallab_technicians_v2';
export const MATERIALS_STORAGE_KEY = 'dentallab_materials_v2';
export const DEFAULT_TECHNICIANS = [
  { id: 'tech-1', name: 'Yusuf Usta', role: 'Baş Teknisyen / Laboratuvar Şefi' }
];

export const TECHNICIANS = DEFAULT_TECHNICIANS.map(t => t.name);

export function normalizeTechnicianName(name) {
  if (!name) return 'Yusuf Usta';
  const lower = name.toLowerCase();
  if (
    lower.includes('ayşe') ||
    lower.includes('ali') ||
    lower.includes('elif') ||
    lower.includes('murat') ||
    lower.includes('yaşar') ||
    lower.includes('atanma')
  ) {
    return 'Yusuf Usta';
  }
  return name;
}

export const DEFAULT_OTHER_STEP_NAMES = ['Onay', 'Ölçü + Model', 'Altyapı', 'Opak', 'Dentin', 'Glaze'];
export const DEFAULT_IMPLANT_STEP_NAMES = ['Onay', 'Ölçü + Model', 'Abutment + Freze', 'Torklama + Ölçü', 'Altyapı', 'Prova', 'Glaze'];

export function sanitizeMaterials(mats) {
  if (!mats || typeof mats !== 'object') return mats;
  const cleaned = {};
  for (const [key, mat] of Object.entries(mats)) {
    if (!mat || key === '__pipelineTypes') continue;
    const pipelineTypeId = mat.pipelineTypeId
      || (key === 'implant' ? 'implant' : (['mdp', 'zirconia', 'lamina'].includes(key) ? 'other' : undefined));
    const isImplantType = pipelineTypeId === 'implant' || key === 'implant';
    const defaultNames = isImplantType ? DEFAULT_IMPLANT_STEP_NAMES : DEFAULT_OTHER_STEP_NAMES;
    const isCoreMat = ['mdp', 'zirconia', 'implant', 'lamina'].includes(key);

    cleaned[key] = {
      ...mat,
      id: mat.id || key,
      pipelineTypeId,
      steps: (mat.steps || []).map(step => {
        let tech = (step.defaultTechnician || '').trim();
        if (!tech || /ayşe|ali|elif|murat|yaşar/i.test(tech) || tech.includes('Teknisyen')) {
          tech = 'Yusuf Usta';
        }
        let isDef = step.isDefault;
        if (isDef === undefined) {
          if (isCoreMat) {
            isDef = defaultNames.includes(step.name);
          } else {
            isDef = false;
          }
        }
        return {
          ...step,
          defaultTechnician: tech,
          isDefault: Boolean(isDef)
        };
      })
    };
  }
  return cleaned;
}

export function sanitizePipelineTypes(types) {
  const merged = { ...DEFAULT_PIPELINE_TYPES };
  if (!types || typeof types !== 'object') return merged;
  Object.entries(types).forEach(([key, type]) => {
    if (!type || key === '__pipelineTypes') return;
    const id = type.id || key;
    merged[id] = {
      id,
      name: type.name || id,
      locked: id === 'other' || id === 'implant' ? true : Boolean(type.locked),
      steps: clonePipelineSteps(type.steps && type.steps.length ? type.steps : (id === 'implant' ? IMPLANT_PIPELINE_STEPS : OTHER_PIPELINE_STEPS))
    };
  });
  return merged;
}

export function hydratePipelineSystem(rawMaterials, storedTypes) {
  const mats = sanitizeMaterials(rawMaterials);
  const types = sanitizePipelineTypes(storedTypes);
  const otherKey = stepNamesKey(types.other?.steps);
  const implantKey = stepNamesKey(types.implant?.steps);

  Object.values(mats).forEach(mat => {
    if (mat.id === 'implant') {
      mat.pipelineTypeId = 'implant';
      mat.steps = clonePipelineSteps(types.implant.steps);
      return;
    }
    if (['mdp', 'zirconia', 'lamina'].includes(mat.id)) {
      mat.pipelineTypeId = 'other';
      mat.steps = clonePipelineSteps(types.other.steps);
      return;
    }

    const key = stepNamesKey(mat.steps);
    const assigned = (mat.pipelineTypeId && types[mat.pipelineTypeId]) || null;
    const assignedKey = assigned ? stepNamesKey(assigned.steps) : '';
    const matchingType = key
      ? Object.values(types).find(t => stepNamesKey(t.steps) === key)
      : null;

    if (matchingType && (!assigned || assigned.locked || assigned.id === matchingType.id)) {
      mat.pipelineTypeId = matchingType.id;
      mat.steps = clonePipelineSteps(matchingType.steps);
      return;
    }

    if (assigned && key && key === assignedKey) {
      mat.steps = clonePipelineSteps(assigned.steps);
      return;
    }

    if (key && key !== otherKey && key !== implantKey && (!assigned || assigned.locked)) {
      const typeId = `pt_${mat.id}`;
      types[typeId] = {
        id: typeId,
        name: `${mat.name || mat.id} hattı`,
        locked: false,
        steps: clonePipelineSteps(mat.steps)
      };
      mat.pipelineTypeId = typeId;
      return;
    }

    if (assigned) {
      mat.pipelineTypeId = assigned.id;
      mat.steps = clonePipelineSteps(assigned.steps);
      return;
    }

    mat.pipelineTypeId = 'other';
    mat.steps = clonePipelineSteps(types.other.steps);
  });

  return { materials: mats, pipelineTypes: types };
}

function splitMaterialsBlob(parsed) {
  if (!parsed || typeof parsed !== 'object') return { mats: {}, types: null };
  const { __pipelineTypes, ...mats } = parsed;
  return { mats, types: __pipelineTypes || null };
}

function joinMaterialsBlob(mats, types) {
  return { ...mats, __pipelineTypes: types };
}

function knownMaterialIds(materialsMap) {
  const known = new Set(Object.keys(materialsMap || {}).filter(k => k && k !== '__pipelineTypes'));
  ['mdp', 'zirconia', 'implant', 'lamina', 'porcelain', 'emax'].forEach(id => known.add(id));
  return known;
}

function dropOrphanMaterialOrders(orders, materialsMap) {
  const known = knownMaterialIds(materialsMap);
  const kept = [];
  const dropped = [];
  (orders || []).forEach(o => {
    if (o?.materialId && !known.has(o.materialId)) dropped.push(o);
    else kept.push(o);
  });
  return { kept, dropped };
}

function loadStoredPipelineSystem() {
  try {
    const saved = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const { mats, types } = splitMaterialsBlob(parsed);
      if (mats && Object.keys(mats).length > 0) {
        return hydratePipelineSystem({ ...DEFAULT_MATERIALS, ...mats }, types);
      }
    }
  } catch (e) {}
  return hydratePipelineSystem(DEFAULT_MATERIALS, DEFAULT_PIPELINE_TYPES);
}

export function sanitizeTechnicians(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_TECHNICIANS;
  }
  const filtered = list.filter(t => {
    const name = (t.name || '').toLowerCase();
    return !name.includes('ayşe') && !name.includes('ali') && !name.includes('elif') && !name.includes('murat') && !name.includes('yaşar');
  });
  if (filtered.length === 0) {
    return DEFAULT_TECHNICIANS;
  }
  if (!filtered.some(t => t.name.toLowerCase().includes('yusuf'))) {
    return [{ id: 'tech-1', name: 'Yusuf Usta', role: 'Baş Teknisyen / Laboratuvar Şefi' }, ...filtered];
  }
  return filtered;
}

// TEMİZ BAŞLANGIÇ: ÖRNEK VERİLER TAMAMEN KALDIRILDI!
const EMPTY_INITIAL_DATA = {
  companies: [],
  doctors: [],
  patients: [],
  orders: []
};

export const DentalProvider = ({ children }) => {
  const { currentUser, isCompany, isOperator, clearAdminRecovery, applyRemoteUsers } = useAuth();
  // Eski tüm mock önbellek anahtarlarını sil
  useEffect(() => {
    try {
      const oldKeys = [
        'dental_lab_pro_react_db_v2',
        'dental_lab_pro_db_v1',
        'dentallab_cloud_cache_v1',
        'dentallab_cloud_cache_v2',
        'dentallab_cloud_cache_v3',
        'dentallab_clean_db_v4',
        'dentallab_clean_db_v5'
      ];
      oldKeys.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }, []);

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dentallab_data_clean_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOldMock = parsed?.companies?.some(c => c.name?.includes('Dentİstanbul'));
        if (parsed && Array.isArray(parsed.orders) && !isOldMock) {
          const storedMats = loadStoredPipelineSystem().materials;
          const migrated = migrateOrdersToCurrentPipeline(parsed.orders, storedMats);
          return {
            ...parsed,
            orders: dropOrphanMaterialOrders(migrated, storedMats).kept
          };
        }
      }
    } catch (e) {
      console.error('Veri okuma hatası:', e);
    }
    return EMPTY_INITIAL_DATA;
  });

  // Veritabanı Yapılandırması (Supabase / Vercel Postgres)
  const [dbConfig, setDbConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(DB_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      provider: 'supabase', // 'supabase' | 'vercel'
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      apiUrl: '/api/db'
    };
  });

  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [dbStatus, setDbStatus] = useState('connected'); // 'connected' | 'connecting' | 'offline'

  const [theme, setTheme] = useState(() => localStorage.getItem('dental_theme') || 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Dinamik Teknisyen / Ekip Yönetimi (Sadece Yusuf Usta)
  const [techniciansList, setTechniciansList] = useState(() => {
    try {
      const saved = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeTechnicians(parsed);
          try {
            localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(sanitized));
          } catch (e) {}
          return sanitized;
        }
      }
    } catch (e) {}
    return DEFAULT_TECHNICIANS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(techniciansList));
    } catch (e) {}
  }, [techniciansList]);

  // Dinamik Restorasyon Materyalleri, Etap Tipleri ve Üretim Hatları
  const [materials, setMaterials] = useState(() => loadStoredPipelineSystem().materials);
  const [pipelineTypes, setPipelineTypes] = useState(() => loadStoredPipelineSystem().pipelineTypes);
  const materialsRef = useRef(materials);
  const pipelineTypesRef = useRef(pipelineTypes);
  materialsRef.current = materials;
  pipelineTypesRef.current = pipelineTypes;

  useEffect(() => {
    try {
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(joinMaterialsBlob(materials, pipelineTypes)));
    } catch (e) {}
  }, [materials, pipelineTypes]);

  const applyHydratedPipeline = (rawMats, rawTypes) => {
    const hydrated = hydratePipelineSystem(
      { ...DEFAULT_MATERIALS, ...materialsRef.current, ...(rawMats || {}) },
      { ...pipelineTypesRef.current, ...(rawTypes || {}) }
    );
    setMaterials(hydrated.materials);
    setPipelineTypes(hydrated.pipelineTypes);
    materialsRef.current = hydrated.materials;
    pipelineTypesRef.current = hydrated.pipelineTypes;
    return hydrated.materials;
  };

  // Veritabanına Otomatik Kaydetme
  const persistToDatabase = useCallback(async (dataToPersist) => {
    setIsDbLoading(true);
    try {
      // Supabase doğrudan tablo bazında (saveOrderToSupabase vb.) kaydedilir.
      // Opsiyonel /api/db endpointi varsa yedek olarak gönderilir
      if (dbConfig.apiUrl && dbConfig.apiUrl !== '/api/db') {
        await fetch(dbConfig.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToPersist)
        }).catch(() => {});
      }
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('connected');
    } finally {
      setIsDbLoading(false);
    }
  }, [dbConfig]);

  // Veritabanından Verileri Çekme (Arka plan sessiz veya ilk yükleme)
  const fetchFromDatabase = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsDbLoading(true);
    setIsSyncing(true);

    try {
      // 1. Supabase PostgreSQL Veritabanı
      const remote = await fetchAllFromSupabase();
      if (remote) {
        let liveMats = materialsRef.current;
        if (remote.customMaterials && typeof remote.customMaterials === 'object' && Object.keys(remote.customMaterials).length > 0) {
          const { mats, types } = splitMaterialsBlob(remote.customMaterials);
          liveMats = applyHydratedPipeline(mats, types);
        }
        const migratedRemote = migrateOrdersToCurrentPipeline(remote.orders || [], liveMats);
        const { kept, dropped } = dropOrphanMaterialOrders(migratedRemote, liveMats);
        dropped.forEach(o => deleteOrderFromSupabase(o.id));
        setData(prev => {
          const next = {
            companies: remote.companies || [],
            doctors: remote.doctors || [],
            patients: remote.patients || [],
            orders: kept
          };

          // Eğer veri aynıysa gereksiz state güncellemesi yapma (flicker ve gereksiz re-render engellenir)
          if (
            prev &&
            prev.orders?.length === next.orders.length &&
            prev.companies?.length === next.companies.length &&
            prev.doctors?.length === next.doctors.length &&
            prev.patients?.length === next.patients.length &&
            JSON.stringify(prev) === JSON.stringify(next)
          ) {
            return prev;
          }

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        // Teknisyenleri buluttan gelenle eşitle (Sadece Yusuf Usta)
        if (Array.isArray(remote.technicians)) {
          setTechniciansList(prev => {
            const sanitized = sanitizeTechnicians(remote.technicians);
            if (JSON.stringify(prev) === JSON.stringify(sanitized)) return prev;
            try {
              localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(sanitized));
            } catch (e) {}
            return sanitized;
          });
        }

        // Firma hesaplarını / kullanıcıları eşitle
        if (Array.isArray(remote.users) && remote.users.length > 0 && typeof applyRemoteUsers === 'function') {
          applyRemoteUsers(remote.users);
        }

        setLastSyncedAt(new Date());
        setDbStatus('connected');
        return;
      }

      // 2. /api/db endpointi (Vercel Serverless / Yedek)
      const res = await fetch(dbConfig.apiUrl || '/api/db');
      if (res.ok) {
        const result = await res.json();
        if (result && result.data && Array.isArray(result.data.orders)) {
          const isMock = result.data.companies?.some(c => c.name?.includes('Dentİstanbul'));
          if (!isMock) {
            const migratedOrders = migrateOrdersToCurrentPipeline(result.data.orders, materialsRef.current);
            const { kept, dropped } = dropOrphanMaterialOrders(migratedOrders, materialsRef.current);
            dropped.forEach(o => deleteOrderFromSupabase(o.id));
            const migrated = {
              ...result.data,
              orders: kept
            };
            setData(migrated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          }
          setDbStatus('connected');
        }
      }
    } catch (e) {
      setDbStatus('connected');
    } finally {
      if (!isBackground) setIsDbLoading(false);
      setIsSyncing(false);
    }
  }, [dbConfig, applyRemoteUsers]);

  // İlk açılışta ve canlı arka plan periyodunda sürekli eşitle (Tüm cihazlar anlık senkron)
  useEffect(() => {
    // 1. Sayfa ilk açıldığında anında çek
    fetchFromDatabase(false);

    // 2. CANLI SENKRONİZASYON: Sekme görünürken her 2.5 saniyede bir sessiz kontrol
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFromDatabase(true);
      }
    }, 2500);

    // 3. Kullanıcı pencereye döndüğünde beklemeden anında eşitle
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchFromDatabase(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [fetchFromDatabase]);

  // Veri değiştiğinde hem yerel belleğe yaz hem veritabanına kaydet
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
    persistToDatabase(data);
  }, [data, persistToDatabase]);

  const purgingOrphanIdsRef = useRef(new Set());
  useEffect(() => {
    const { dropped } = dropOrphanMaterialOrders(data.orders, materials);
    const fresh = dropped.filter(o => o?.id && !purgingOrphanIdsRef.current.has(String(o.id)));
    if (!fresh.length) return;
    fresh.forEach(o => purgingOrphanIdsRef.current.add(String(o.id)));
    const ids = new Set(fresh.map(o => String(o.id)));
    setData(prev => ({
      ...prev,
      orders: (prev.orders || []).filter(o => !ids.has(String(o.id)))
    }));
    fresh.forEach(o => {
      deleteOrderFromSupabase(o.id).finally(() => {
        purgingOrphanIdsRef.current.delete(String(o.id));
      });
    });
  }, [materials, data.orders]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dental_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const saveDbConfig = (newConfig) => {
    const next = { ...dbConfig, ...newConfig };
    setDbConfig(next);
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(next));
  };

  const testAndSyncDb = () => {
    fetchFromDatabase();
  };

  // Tüm Verileri Tamamen Temizleme (Tertemiz Boş Başlangıç)
  const clearAllData = async () => {
    const empty = JSON.parse(JSON.stringify(EMPTY_INITIAL_DATA));
    setData(empty);
    setTechniciansList(DEFAULT_TECHNICIANS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(DEFAULT_TECHNICIANS));
      const oldKeys = [
        'dentallab_data_clean_v7',
        'dentallab_data_clean_v6',
        'dentallab_clean_db_v5',
        'dentallab_clean_db_v4',
        'dental_lab_pro_react_db_v2',
        'dental_lab_pro_db_v1',
        'dentallab_cloud_cache_v1',
        'dentallab_cloud_cache_v2',
        'dentallab_cloud_cache_v3'
      ];
      oldKeys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    } catch (e) {}

    // 1. Supabase PostgreSQL veritabanındaki tüm tabloları temizle
    try {
      await clearAllFromSupabase();
    } catch (err) {
      console.error('Supabase sıfırlama hatası:', err);
    }

    // 2. /api/db endpointi varsa orayı da sıfırla
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empty)
      });
    } catch (e) {}

    if (typeof clearAdminRecovery === 'function') {
      clearAdminRecovery();
    }

    showToast('Tüm veriler ve bulut veritabanı başarıyla sıfırlandı! ✓', 'success');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dentallab_veriler_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Tüm verileriniz JSON dosyası olarak indirildi.');
  };

  const importData = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.orders !== undefined && parsed.companies !== undefined) {
        const migrated = {
          ...parsed,
          orders: migrateOrdersToCurrentPipeline(parsed.orders, materialsRef.current)
        };
        setData(migrated);
        persistToDatabase(migrated);
        showToast('Veriler başarıyla yüklendi ve veritabanına aktarıldı!');
        return true;
      }
    } catch (e) {
      showToast('Geçersiz JSON dosyası!', 'error');
    }
    return false;
  };

  const denyProductionChange = () => {
    if (isCompany || isOperator) {
      showToast(
        isCompany
          ? 'Firma hesabı işleri ilerletemez; yalnızca durumunu takip edebilir.'
          : 'Kullanıcı işleri ilerletemez; yalnızca kendi iş emrini onaylanana kadar düzenleyebilir.',
        'error'
      );
      return true;
    }
    return false;
  };

  // --- CRUD Metotları ---
  const saveOrder = async (order) => {
    let finalOrder = { ...order };

    if (isCompany) {
      const companyId = String(currentUser?.companyId || '');
      if (!companyId) {
        showToast('Kullanıcıya bağlı bir firma/klinik kaydı bulunamadı.', 'error');
        return null;
      }
      const existing = finalOrder.id ? (data.orders || []).find(o => o.id === finalOrder.id) : null;
      if (existing) {
        if (existing.status !== 'pending_approval' || (String(existing.companyId) !== companyId && existing.createdBy !== currentUser?.id)) {
          showToast('Onaylanan veya kliniğinize ait olmayan iş emri düzenlenemez.', 'error');
          return null;
        }
        finalOrder = {
          ...existing,
          ...finalOrder,
          companyId,
          status: 'pending_approval',
          currentStepIndex: 0
        };
      } else {
        finalOrder.companyId = companyId;
        finalOrder.status = 'pending_approval';
        finalOrder.createdBy = currentUser?.id;
        finalOrder.currentStepIndex = 0;
      }
    } else if (isOperator) {
      const existing = finalOrder.id ? (data.orders || []).find(o => o.id === finalOrder.id) : null;
      if (existing) {
        if (existing.createdBy !== currentUser?.id || existing.status !== 'pending_approval') {
          showToast('Onaylanan veya size ait olmayan iş emri düzenlenemez.', 'error');
          return null;
        }
        finalOrder = {
          ...existing,
          ...finalOrder,
          status: 'pending_approval',
          createdBy: currentUser.id,
          currentStepIndex: 0
        };
      } else {
        finalOrder.status = 'pending_approval';
        finalOrder.createdBy = currentUser?.id;
        finalOrder.currentStepIndex = 0;
      }
    }

    if (finalOrder.companyId != null) finalOrder.companyId = String(finalOrder.companyId);

    if (!finalOrder.id) {
      finalOrder.id = nextOrderId(data.orders);
      finalOrder.orderDate = finalOrder.orderDate || new Date().toISOString().split('T')[0];
    }
    setData(prev => {
      let orders = [...prev.orders];
      const exists = orders.some(o => o.id === finalOrder.id);
      if (exists) {
        orders = orders.map(o => o.id === finalOrder.id ? { ...o, ...finalOrder } : o);
      } else {
        orders.unshift(finalOrder);
      }
      return { ...prev, orders };
    });
    await saveOrderToSupabase(finalOrder);
    if (Array.isArray(finalOrder.stlFiles) && finalOrder.stlFiles.length > 0) {
      const fileIds = finalOrder.stlFiles.map(f => f.id).filter(Boolean);
      await linkFilesToOrderInSupabase(finalOrder.id, fileIds);
    }
    showToast(`İş emri #${finalOrder.id} kaydedildi.`);
    return finalOrder;
  };

  const uploadOrderStlFile = async (orderId, file) => {
    try {
      showToast(`${file.name} yükleniyor...`, 'info');
      const savedRecord = await uploadStlToSupabase(file, orderId);
      setData(prev => {
        const orders = prev.orders.map(o => {
          if (o.id !== orderId) return o;
          const currentFiles = o.stlFiles || [];
          return {
            ...o,
            stlFiles: [savedRecord, ...currentFiles.filter(f => f.id !== savedRecord.id)]
          };
        });
        return { ...prev, orders };
      });
      showToast(`✓ ${file.name} başarıyla yüklendi!`, 'success');
      return savedRecord;
    } catch (err) {
      console.error('uploadOrderStlFile error:', err);
      showToast(err.message || 'STL dosyası yüklenemedi.', 'error');
      throw err;
    }
  };

  const deleteOrderStlFile = async (orderId, fileId, fileUrl) => {
    try {
      await deleteStlFromSupabase(fileId, fileUrl);
      setData(prev => {
        const orders = prev.orders.map(o => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            stlFiles: (o.stlFiles || []).filter(f => f.id !== fileId)
          };
        });
        return { ...prev, orders };
      });
      showToast('STL dosyası silindi.', 'warning');
      return true;
    } catch (err) {
      console.error('deleteOrderStlFile error:', err);
      showToast('Dosya silinirken hata oluştu.', 'error');
      return false;
    }
  };

  const approveOrder = (orderId, completedDate = '') => {
    if (denyProductionChange()) return;
    const dateValue = completedDate || new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const steps = (o.steps || []).map((step, idx) => {
          if (idx === 0) {
            return {
              ...step,
              status: 'completed',
              completedAt: now,
              completedDate: dateValue
            };
          }
          if (idx === 1) {
            return { ...step, status: 'in_progress', startedAt: step.startedAt || now };
          }
          return step;
        });
        changedOrder = {
          ...o,
          status: 'in_progress',
          currentStepIndex: Math.min(1, Math.max(0, steps.length - 1)),
          steps
        };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('İş emri onaylandı ve üretim hattına alındı.', 'success');
  };

  const rejectOrder = (orderId) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        changedOrder = { ...o, status: 'rejected' };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('İş emri reddedildi.', 'warning');
  };

  const addStepToOrder = (orderId, newStepName, newStepDesc = '', technician = '') => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const steps = [...(o.steps || [])];
        const newOrderNum = steps.length + 1;
        steps.push({
          order: newOrderNum,
          name: newStepName,
          description: newStepDesc || 'Özel laboratuvar aşaması',
          status: 'pending',
          technician: technician || 'Yusuf Usta',
          notes: ''
        });
        changedOrder = { ...o, steps };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('Yeni aşama iş emrine eklendi!', 'success');
  };

  const removeStepFromOrder = (orderId, stepIndex) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        let steps = (o.steps || []).filter((_, idx) => idx !== stepIndex);
        steps = steps.map((s, idx) => ({ ...s, order: idx + 1 }));
        const curIdx = Math.min(o.currentStepIndex, Math.max(0, steps.length - 1));
        changedOrder = { ...o, steps, currentStepIndex: curIdx };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('Aşama çıkarıldı.', 'warning');
  };

  const editStepInOrder = (orderId, stepIndex, updatedData) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const steps = [...(o.steps || [])];
        if (steps[stepIndex]) {
          steps[stepIndex] = { ...steps[stepIndex], ...updatedData };
        }
        changedOrder = { ...o, steps };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('Aşama güncellendi.', 'success');
  };

  const updateStepStatus = (orderId, stepIndex, newStatus, technician = '', notes = '', completedDate = '') => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const updated = { ...o, steps: [...o.steps] };
        const step = { ...updated.steps[stepIndex] };
        step.status = newStatus;
        if (technician) step.technician = technician;
        if (notes) step.notes = notes;

        const now = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

        if (newStatus === 'in_progress') {
          step.startedAt = now;
          updated.status = 'in_progress';
          updated.currentStepIndex = stepIndex;
        } else if (newStatus === 'completed') {
          step.completedAt = now;
          step.completedDate = completedDate || new Date().toISOString().split('T')[0];
          if (step.name === 'Onay' || o.status === 'pending_approval') {
            updated.status = 'in_progress';
          }
          if (stepIndex + 1 < updated.steps.length) {
            updated.currentStepIndex = stepIndex + 1;
            if (updated.steps[stepIndex + 1].status === 'pending') {
              updated.steps[stepIndex + 1] = {
                ...updated.steps[stepIndex + 1],
                status: 'in_progress',
                startedAt: now
              };
            }
          } else {
            updated.status = 'completed';
          }
        } else if (newStatus === 'revision') {
          step.revisionAt = now;
          updated.status = 'revision';
        }

        updated.steps[stepIndex] = step;
        changedOrder = updated;
        return updated;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('Aşama durumu güncellendi.');
  };

  const advanceOrderToNextStep = (orderId, completedDate = '') => {
    if (denyProductionChange()) return;
    const order = data.orders.find(o => o.id === orderId);
    if (!order || !order.steps) return;
    const curIdx = order.currentStepIndex || 0;
    const current = order.steps[curIdx];
    if (current?.name === 'Onay' || order.status === 'pending_approval') {
      approveOrder(orderId, completedDate);
      return;
    }
    updateStepStatus(orderId, curIdx, 'completed', current?.technician || '', current?.notes || '', completedDate);
  };

  const convertImplantToMdp = (implantOrderId, completedDate = '') => {
    if (denyProductionChange()) return null;
    const implant = data.orders.find(o => o.id === implantOrderId);
    if (!implant || implant.materialId !== 'implant') return null;

    const now = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    const today = completedDate || new Date().toISOString().split('T')[0];

    const completedImplant = {
      ...implant,
      status: 'completed',
      currentStepIndex: Math.max(0, (implant.steps || []).length - 1),
      steps: (implant.steps || []).map((step, idx, arr) => ({
        ...step,
        status: 'completed',
        completedAt: step.completedAt || (idx === arr.length - 1 ? now : step.completedAt),
        completedDate: step.completedDate || (idx === arr.length - 1 ? today : step.completedDate)
      }))
    };

    const template = DEFAULT_MATERIALS.mdp;
    const mdpSteps = template.steps.map((s, idx) => ({
      order: s.order,
      name: s.name,
      description: s.description,
      status: idx === 0 ? 'completed' : (idx === 1 ? 'in_progress' : 'pending'),
      technician: s.defaultTechnician || 'Yusuf Usta',
      startedAt: idx === 1 ? now : null,
      completedAt: idx === 0 ? now : null,
      completedDate: idx === 0 ? today : null,
      notes: ''
    }));

    const newId = nextOrderId(data.orders);

    const implantNote = `${IMPLANT_COMPLETED_LABEL} (Kaynak iş emri: #${implant.id})`;
    const mdpOrder = {
      id: newId,
      companyId: implant.companyId != null ? String(implant.companyId) : implant.companyId,
      doctorId: implant.doctorId,
      patientId: implant.patientId,
      materialId: 'mdp',
      teeth: implant.teeth || [],
      shade: implant.shade || 'A2',
      priority: implant.priority || 'normal',
      status: 'in_progress',
      createdBy: implant.createdBy || null,
      orderDate: today,
      trialDate: implant.trialDate || '',
      deliveryDate: implant.deliveryDate || today,
      price: implant.price || 0,
      notes: implant.notes ? `${implantNote}\n${implant.notes}` : implantNote,
      currentStepIndex: 1,
      steps: mdpSteps,
      fromImplantId: implant.id,
      implantCompleted: true
    };

    setData(prev => {
      const orders = prev.orders.map(o => o.id === implant.id ? completedImplant : o);
      orders.unshift(mdpOrder);
      return { ...prev, orders };
    });
    saveOrderToSupabase(completedImplant);
    saveOrderToSupabase(mdpOrder);
    showToast(`İmplant bitti. MDP iş emri #${newId} oluşturuldu.`, 'success');
    return mdpOrder;
  };

  const convertImplantToPorcelain = convertImplantToMdp;

  const regressOrderToPrevStep = (orderId) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const curIdx = o.currentStepIndex || 0;
        if (curIdx <= 0) return o;
        const prevIdx = curIdx - 1;
        const updatedSteps = (o.steps || []).map((step, idx) => {
          if (idx === prevIdx) {
            return { ...step, status: 'in_progress', completedAt: null };
          } else if (idx >= curIdx) {
            return { ...step, status: 'pending', completedAt: null, startedAt: null };
          }
          return step;
        });
        changedOrder = {
          ...o,
          status: 'in_progress',
          currentStepIndex: prevIdx,
          steps: updatedSteps
        };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('İş emri bir önceki aşamaya geri alındı.', 'warning');
  };

  const moveOrderToStep = (orderId, targetStepIndex, completedDate = '') => {
    if (denyProductionChange()) return;
    const dateValue = completedDate || new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const curIdx = o.currentStepIndex || 0;
        const steps = (o.steps || []).map((step, idx) => {
          if (idx < targetStepIndex) {
            return {
              ...step,
              status: 'completed',
              completedAt: step.completedAt || now,
              completedDate: idx >= curIdx ? dateValue : (step.completedDate || dateValue)
            };
          } else if (idx === targetStepIndex) {
            return { ...step, status: 'in_progress', startedAt: step.startedAt || now };
          } else {
            return { ...step, status: 'pending', completedAt: null, startedAt: null, completedDate: null };
          }
        });
        const leavingOnay = (o.steps || [])[0]?.name === 'Onay' && targetStepIndex > 0;
        changedOrder = {
          ...o,
          status: targetStepIndex >= steps.length ? 'completed' : (leavingOnay || o.status === 'pending_approval' ? 'in_progress' : (targetStepIndex > 0 ? 'in_progress' : o.status)),
          currentStepIndex: Math.min(targetStepIndex, steps.length - 1),
          steps
        };
        if (changedOrder.status === 'pending_approval' && targetStepIndex > 0) {
          changedOrder.status = 'in_progress';
        }
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('İş emri istasyonu güncellendi.');
  };

  const restartOrder = (orderId, targetStepIndex = 0, restartReason = '') => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;

        const updatedSteps = (o.steps || []).map((step, idx) => {
          if (idx < targetStepIndex) {
            return step;
          } else if (idx === targetStepIndex) {
            return {
              ...step,
              status: 'in_progress',
              startedAt: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
              notes: restartReason ? `[Yeniden Başlatıldı: ${restartReason}] ${step.notes || ''}` : step.notes
            };
          } else {
            return {
              ...step,
              status: 'pending',
              completedAt: null
            };
          }
        });

        changedOrder = {
          ...o,
          status: 'in_progress',
          currentStepIndex: targetStepIndex,
          steps: updatedSteps,
          notes: restartReason ? `[Revizyon/Yeniden Başlatma: ${restartReason}] ${o.notes || ''}` : o.notes
        };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast(`İş emri üretime geri döndürüldü ve ${targetStepIndex + 1}. aşamadan yeniden başlatıldı!`, 'success');
  };

  const deleteOrder = (id) => {
    if (denyProductionChange()) return;
    setData(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
    deleteOrderFromSupabase(id);
    showToast('İş emri silindi.', 'warning');
  };

  // Teknisyen Ekleme / Çıkarma / Düzenleme (Bulut & Yerel Kalıcı Eşitlemeli)
  const addTechnician = async (name, role = 'Dental Teknisyen') => {
    if (denyProductionChange()) return null;
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    if (techniciansList.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`"${trimmed}" zaten ekipte kayıtlı.`, 'warning');
      return null;
    }
    const newTech = {
      id: 'tech-' + Date.now(),
      name: trimmed,
      role: role.trim() || 'Dental Teknisyen'
    };
    const nextList = [...techniciansList, newTech];
    setTechniciansList(nextList);
    try {
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(nextList));
    } catch (e) {}
    await saveTechniciansToSupabase(nextList);
    showToast(`Teknisyen "${trimmed}" başarıyla eklendi!`, 'success');
    return newTech;
  };

  const removeTechnician = async (techIdOrName) => {
    if (denyProductionChange()) return;
    const nextList = techniciansList.filter(t => t.id !== techIdOrName && t.name !== techIdOrName);
    setTechniciansList(nextList);
    try {
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(nextList));
    } catch (e) {}
    await saveTechniciansToSupabase(nextList);
    showToast('Teknisyen ekipten çıkarıldı.', 'info');
  };

  const updateTechnician = async (techId, updatedData) => {
    if (denyProductionChange()) return null;
    let oldName = '';
    const newName = (updatedData.name || '').trim();
    const nextList = techniciansList.map(t => {
      if (t.id === techId || t.name === techId) {
        oldName = t.name;
        return {
          ...t,
          ...updatedData,
          name: newName || t.name,
          role: updatedData.role !== undefined ? updatedData.role.trim() : t.role
        };
      }
      return t;
    });

    setTechniciansList(nextList);
    try {
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(nextList));
    } catch (e) {}
    await saveTechniciansToSupabase(nextList);

    // Eğer isim güncellendiyse mevcut iş emirlerinin aşamalarındaki ismi de güncelle
    if (oldName && newName && oldName !== newName) {
      setData(prev => {
        let changed = false;
        const orders = (prev.orders || []).map(o => {
          let stepsChanged = false;
          const steps = (o.steps || []).map(s => {
            if (s.technician === oldName) {
              stepsChanged = true;
              changed = true;
              return { ...s, technician: newName };
            }
            return s;
          });
          return stepsChanged ? { ...o, steps } : o;
        });
        if (!changed) return prev;
        return { ...prev, orders };
      });
    }

    showToast('Teknisyen güncellendi ve kalıcı kaydedildi ✓', 'success');
    return updatedObj;
  };

  // Belirli bir iş emrinin aşamasına sorumlu teknisyen atama
  const assignTechnicianToStep = (orderId, stepIndex, technician) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const updated = { ...o, steps: [...(o.steps || [])] };
        if (updated.steps[stepIndex]) {
          updated.steps[stepIndex] = {
            ...updated.steps[stepIndex],
            technician: technician
          };
        }
        changedOrder = updated;
        return updated;
      });

      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast(`Sorumlu teknisyen "${technician}" olarak güncellendi.`, 'success');
  };

  const updateOrderDates = (orderId, dates) => {
    if (denyProductionChange()) return;
    setData(prev => {
      let changedOrder = null;
      const orders = prev.orders.map(o => {
        if (o.id !== orderId) return o;
        changedOrder = { ...o, ...dates };
        return changedOrder;
      });
      if (changedOrder) saveOrderToSupabase(changedOrder);
      return { ...prev, orders };
    });
    showToast('Tarih güncellendi.', 'success');
  };

  // Küçük Tamamlandı Kutucuğu: Tek tıkla aşamayı tamamla veya geri al
  const toggleStepCompletion = (orderId, stepIndex) => {
    const order = data.orders.find(o => o.id === orderId);
    if (!order || !order.steps || !order.steps[stepIndex]) return;
    const currentStatus = order.steps[stepIndex].status;
    if (currentStatus === 'completed') {
      updateStepStatus(orderId, stepIndex, 'in_progress');
      showToast('Aşama tekrar işlemde olarak işaretlendi.', 'info');
    } else {
      updateStepStatus(orderId, stepIndex, 'completed');
      showToast('✓ Aşama tamamlandı!', 'success');
    }
  };

  const saveCompany = (comp) => {
    let savedObj = { ...comp };
    if (!savedObj.id) {
      savedObj.id = 'comp-' + Date.now();
      savedObj.createdAt = new Date().toISOString().split('T')[0];
    }
    savedObj.id = String(savedObj.id);
    setData(prev => {
      let companies = [...prev.companies];
      const exists = companies.some(c => c.id === savedObj.id);
      if (exists) {
        companies = companies.map(c => c.id === savedObj.id ? { ...c, ...savedObj } : c);
      } else {
        companies.unshift(savedObj);
      }
      return { ...prev, companies };
    });
    saveCompanyToSupabase(savedObj);
    showToast(comp.id ? 'Klinik güncellendi.' : 'Klinik kaydedildi.');
    return savedObj;
  };

  const deleteCompany = (id) => {
    setData(prev => ({ ...prev, companies: prev.companies.filter(c => c.id !== id) }));
    deleteCompanyFromSupabase(id);
    showToast('Klinik silindi.', 'warning');
  };

  const saveDoctor = async (doc) => {
    let savedObj = { ...doc };
    if (!savedObj.id) {
      savedObj.id = 'doc-' + Date.now();
      savedObj.createdAt = new Date().toISOString().split('T')[0];
    }
    setData(prev => {
      let doctors = [...prev.doctors];
      const exists = doctors.some(d => d.id === savedObj.id);
      if (exists) {
        doctors = doctors.map(d => d.id === savedObj.id ? { ...d, ...savedObj } : d);
      } else {
        doctors.unshift(savedObj);
      }
      return { ...prev, doctors };
    });
    await saveDoctorToSupabase(savedObj);
    showToast('Hekim kaydedildi.');
    return savedObj;
  };

  const deleteDoctor = (id) => {
    setData(prev => ({ ...prev, doctors: prev.doctors.filter(d => d.id !== id) }));
    deleteDoctorFromSupabase(id);
    showToast('Hekim silindi.', 'warning');
  };

  const savePatient = async (pat) => {
    let savedObj = { ...pat };
    if (!savedObj.id) {
      savedObj.id = 'pat-' + Date.now();
      savedObj.createdAt = new Date().toISOString().split('T')[0];
    }
    setData(prev => {
      let patients = [...prev.patients];
      const exists = patients.some(p => p.id === savedObj.id);
      if (exists) {
        patients = patients.map(p => p.id === savedObj.id ? { ...p, ...savedObj } : p);
      } else {
        patients.unshift(savedObj);
      }
      return { ...prev, patients };
    });
    await savePatientToSupabase(savedObj);
    showToast('Hasta kaydedildi.');
    return savedObj;
  };

  const deletePatient = (id) => {
    setData(prev => ({ ...prev, patients: prev.patients.filter(p => p.id !== id) }));
    deletePatientFromSupabase(id);
    showToast('Hasta silindi.', 'warning');
  };

  const persistPipelineBlob = (nextMats, nextTypes) => {
    saveMaterialsToSupabase(joinMaterialsBlob(nextMats, nextTypes));
  };

  const applyTypeStepsToMaterials = (mats, type) => {
    const next = { ...mats };
    Object.keys(next).forEach(id => {
      if (inferPipelineTypeId(next[id]) === type.id) {
        next[id] = { ...next[id], pipelineTypeId: type.id, steps: clonePipelineSteps(type.steps) };
      }
    });
    return next;
  };

  const commitPipelineType = (nextType) => {
    const nextTypes = { ...pipelineTypesRef.current, [nextType.id]: nextType };
    const nextMats = applyTypeStepsToMaterials(materialsRef.current, nextType);
    pipelineTypesRef.current = nextTypes;
    materialsRef.current = nextMats;
    setPipelineTypes(nextTypes);
    setMaterials(nextMats);
    persistPipelineBlob(nextMats, nextTypes);
    return nextType;
  };

  // --- DİNAMİK RESTORASYON MATERYALLERİ & ETAP YÖNETİMİ ---
  const saveCustomMaterial = async (matData) => {
    if (denyProductionChange()) return null;
    if (!matData.name || !matData.name.trim()) {
      showToast('Materyal adı boş olamaz.', 'error');
      return null;
    }
    const cleanId = (matData.id || slugifyPipelineId(matData.name, 'mat'));
    const typeId = matData.pipelineTypeId || inferPipelineTypeId(matData) || 'other';
    const typesMap = pipelineTypesRef.current || pipelineTypes;
    const type = typesMap[typeId] || typesMap.other || DEFAULT_PIPELINE_TYPES.other;
    const isCore = ['mdp', 'zirconia', 'implant', 'lamina'].includes(cleanId) && materialsRef.current[cleanId] && !matData.id;
    if (isCore) {
      showToast('Temel sistem materyalleri bu formdan yeniden oluşturulamaz.', 'warning');
      return null;
    }
    const updated = {
      id: cleanId,
      name: matData.name.trim(),
      badgeClass: matData.badgeClass || `badge-mat-${cleanId}`,
      color: matData.color || '#0284c7',
      pipelineTypeId: type.id,
      description: matData.description || `${matData.name.trim()} restorasyon üretimi.`,
      steps: clonePipelineSteps(
        Array.isArray(matData.steps) && matData.steps.length > 0 ? matData.steps : type.steps
      )
    };

    const next = { ...materialsRef.current, [cleanId]: updated };
    materialsRef.current = next;
    setMaterials(next);
    persistPipelineBlob(next, pipelineTypesRef.current);
    showToast(`"${updated.name}" materyali "${type.name}" etap tipine bağlandı ✓`, 'success');
    return updated;
  };

  const assignMaterialPipelineType = async (matId, typeId) => {
    if (denyProductionChange()) return false;
    const mat = materialsRef.current[matId];
    const type = pipelineTypesRef.current[typeId];
    if (!mat || !type) return false;
    const updated = { ...mat, pipelineTypeId: type.id, steps: clonePipelineSteps(type.steps) };
    const next = { ...materialsRef.current, [matId]: updated };
    materialsRef.current = next;
    setMaterials(next);
    persistPipelineBlob(next, pipelineTypesRef.current);
    showToast(`"${mat.name}" artık "${type.name}" hattında.`, 'success');
    return true;
  };

  const savePipelineType = async (typeData) => {
    if (denyProductionChange()) return null;
    const name = (typeData.name || '').trim();
    if (!name) {
      showToast('Etap tipi adı boş olamaz.', 'error');
      return null;
    }
    const typesMap = pipelineTypesRef.current;
    let id = typeData.id || slugifyPipelineId(name, 'etap');
    if (!typeData.id && typesMap[id]) id = `${id}_${Date.now().toString().slice(-4)}`;
    const existing = typesMap[id];
    const isNew = !existing;
    const sourceSteps = typeData.steps && typeData.steps.length
      ? typeData.steps
      : (existing?.steps || OTHER_PIPELINE_STEPS);
    const nextType = {
      id,
      name,
      locked: existing ? Boolean(existing.locked) : false,
      steps: clonePipelineSteps(sourceSteps).map(s => ({
        ...s,
        isDefault: isNew ? false : Boolean(s.isDefault)
      }))
    };
    commitPipelineType(nextType);
    showToast(`"${nextType.name}" etap tipi kaydedildi.`, 'success');
    return nextType;
  };

  const deletePipelineType = async (typeId) => {
    if (denyProductionChange()) return false;
    const type = pipelineTypesRef.current[typeId];
    if (!type) return false;
    if (type.locked || typeId === 'other' || typeId === 'implant') {
      showToast('Varsayılan etap tipleri silinemez.', 'warning');
      return false;
    }
    const used = Object.values(materialsRef.current).some(m => inferPipelineTypeId(m) === typeId);
    if (used) {
      showToast('Bu etap tipini kullanan materyaller var. Önce materyalleri başka tipe alın.', 'error');
      return false;
    }
    const nextTypes = { ...pipelineTypesRef.current };
    delete nextTypes[typeId];
    pipelineTypesRef.current = nextTypes;
    setPipelineTypes(nextTypes);
    persistPipelineBlob(materialsRef.current, nextTypes);
    showToast('Etap tipi silindi.', 'warning');
    return true;
  };

  const isLockedPipelineType = (type) => Boolean(type && (type.locked || type.id === 'other' || type.id === 'implant'));

  const addStepToPipelineType = async (typeId, stepData) => {
    if (denyProductionChange()) return null;
    const type = pipelineTypesRef.current[typeId];
    if (!type) return null;
    const newStep = {
      order: (type.steps || []).length + 1,
      name: stepData.name?.trim() || 'Yeni Etap',
      description: stepData.description?.trim() || 'Özel laboratuvar aşaması',
      defaultTechnician: 'Yusuf Usta',
      estimatedHours: parseFloat(stepData.estimatedHours) || 2,
      isDefault: false
    };
    commitPipelineType({ ...type, steps: [...(type.steps || []), newStep] });
    showToast(`"${newStep.name}" etabı "${type.name}" tipine eklendi.`, 'success');
    return newStep;
  };

  const updatePipelineTypeStep = async (typeId, stepOrder, stepData) => {
    if (denyProductionChange()) return null;
    const type = pipelineTypesRef.current[typeId];
    if (!type) return null;
    const target = (type.steps || []).find(s => s.order === stepOrder);
    if (!target) return null;
    if (isLockedPipelineType(type) && target.isDefault) {
      showToast('Varsayılan etap tiplerindeki temel etaplar düzenlenemez.', 'error');
      return null;
    }
    const nextSteps = (type.steps || []).map(s => {
      if (s.order !== stepOrder) return s;
      return {
        ...s,
        name: stepData.name !== undefined ? stepData.name.trim() : s.name,
        description: stepData.description !== undefined ? stepData.description.trim() : s.description,
        defaultTechnician: 'Yusuf Usta',
        estimatedHours: stepData.estimatedHours !== undefined ? (parseFloat(stepData.estimatedHours) || 0) : s.estimatedHours,
        isDefault: isLockedPipelineType(type) ? Boolean(s.isDefault) : false
      };
    });
    commitPipelineType({ ...type, steps: nextSteps });
    showToast('Etap güncellendi.', 'success');
    return true;
  };

  const removeStepFromPipelineType = async (typeId, stepOrder, orderIdsToDelete = []) => {
    if (denyProductionChange()) return false;
    const type = pipelineTypesRef.current[typeId];
    if (!type) return false;
    const stepToDelete = (type.steps || []).find(s => s.order === stepOrder);
    if (!stepToDelete) return false;
    if (isLockedPipelineType(type) && stepToDelete.isDefault) {
      showToast('Varsayılan etap tiplerindeki temel etaplar silinemez.', 'error');
      return false;
    }
    if ((type.steps || []).length <= 1) {
      showToast('Bir etap tipinde en az 1 üretim etabı bulunmalıdır.', 'warning');
      return false;
    }

    if (Array.isArray(orderIdsToDelete) && orderIdsToDelete.length > 0) {
      const idsSet = new Set(orderIdsToDelete.map(id => String(id)));
      setData(prev => ({
        ...prev,
        orders: (prev.orders || []).filter(o => !idsSet.has(String(o.id)))
      }));
      for (const ordId of orderIdsToDelete) {
        deleteOrderFromSupabase(ordId);
      }
    }

    const typeMatIds = new Set(
      Object.values(materialsRef.current)
        .filter(m => inferPipelineTypeId(m) === typeId)
        .map(m => m.id)
    );

    setData(prev => {
      let ordersChanged = false;
      const updatedOrders = (prev.orders || []).map(o => {
        if (typeMatIds.size && !typeMatIds.has(o.materialId)) return o;
        const oldSteps = o.steps || [];
        const hasStep = oldSteps.some(s => s.name === stepToDelete.name);
        if (!hasStep) return o;
        ordersChanged = true;
        const filteredSteps = oldSteps
          .filter(s => s.name !== stepToDelete.name)
          .map((s, idx) => ({ ...s, order: idx + 1 }));
        const maxIdx = Math.max(0, filteredSteps.length - 1);
        return {
          ...o,
          steps: filteredSteps,
          currentStepIndex: Math.min(o.currentStepIndex || 0, maxIdx)
        };
      });
      return ordersChanged ? { ...prev, orders: updatedOrders } : prev;
    });

    const nextSteps = (type.steps || [])
      .filter(s => s.order !== stepOrder)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    commitPipelineType({ ...type, steps: nextSteps });

    const deletedCount = (orderIdsToDelete || []).length;
    if (deletedCount > 0) {
      showToast(`"${stepToDelete.name}" etabı ve içerisindeki ${deletedCount} iş emri silindi.`, 'warning');
    } else {
      showToast(`"${stepToDelete.name}" etabı "${type.name}" tipinden silindi.`, 'warning');
    }
    return true;
  };

  const reorderPipelineTypeSteps = async (typeId, newSteps) => {
    if (denyProductionChange()) return false;
    const type = pipelineTypesRef.current[typeId];
    if (!type) return false;
    const normalized = (newSteps || []).map((s, idx) => ({ ...s, order: idx + 1 }));
    commitPipelineType({ ...type, steps: normalized });
    showToast('Etap sıralaması güncellendi.', 'success');
    return true;
  };

  const deleteOrdersForMaterial = (matId) => {
    const related = (data.orders || []).filter(o => o.materialId === matId);
    if (!related.length) return 0;
    const ids = new Set(related.map(o => String(o.id)));
    setData(prev => ({
      ...prev,
      orders: (prev.orders || []).filter(o => !ids.has(String(o.id)))
    }));
    related.forEach(o => deleteOrderFromSupabase(o.id));
    return related.length;
  };

  const deleteCustomMaterial = async (matId) => {
    if (denyProductionChange()) return false;
    if (['mdp', 'zirconia', 'implant', 'lamina'].includes(matId)) {
      showToast('Temel sistem materyalleri silinemez.', 'warning');
      return false;
    }
    const mat = materialsRef.current[matId];
    const typeId = inferPipelineTypeId(mat || { id: matId });
    const removedOrders = deleteOrdersForMaterial(matId);

    const nextMats = { ...materialsRef.current };
    delete nextMats[matId];
    materialsRef.current = nextMats;
    setMaterials(nextMats);

    let nextTypes = pipelineTypesRef.current;
    if (typeId && typeId !== 'other' && typeId !== 'implant' && nextTypes[typeId] && !nextTypes[typeId].locked) {
      const stillUsed = Object.values(nextMats).some(m => inferPipelineTypeId(m) === typeId);
      if (!stillUsed) {
        nextTypes = { ...nextTypes };
        delete nextTypes[typeId];
        pipelineTypesRef.current = nextTypes;
        setPipelineTypes(nextTypes);
      }
    }
    persistPipelineBlob(nextMats, nextTypes);

    if (removedOrders > 0) {
      showToast(`Materyal ve ona bağlı ${removedOrders} iş emri silindi.`, 'warning');
    } else {
      showToast('Materyal silindi.', 'warning');
    }
    return true;
  };

  const resetMaterialsToDefault = async () => {
    if (denyProductionChange()) return false;
    materialsRef.current = DEFAULT_MATERIALS;
    pipelineTypesRef.current = DEFAULT_PIPELINE_TYPES;
    setMaterials(DEFAULT_MATERIALS);
    setPipelineTypes(DEFAULT_PIPELINE_TYPES);
    try {
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(joinMaterialsBlob(DEFAULT_MATERIALS, DEFAULT_PIPELINE_TYPES)));
    } catch (e) {}
    await saveMaterialsToSupabase(joinMaterialsBlob(DEFAULT_MATERIALS, DEFAULT_PIPELINE_TYPES));
    showToast('Tüm materyaller ve etap tipleri varsayılana sıfırlandı.', 'info');
    return true;
  };

  const scopedCompanies = useMemo(() => {
    const all = data.companies || [];
    if (!isCompany) return all;
    if (!currentUser?.companyId) return [];
    return all.filter(c => idsMatch(c.id, currentUser.companyId));
  }, [data.companies, isCompany, currentUser]);

  const scopedDoctors = useMemo(() => {
    const all = data.doctors || [];
    if (!isCompany) return all;
    if (!currentUser?.companyId) return [];
    return all.filter(d => idsMatch(d.companyId, currentUser.companyId));
  }, [data.doctors, isCompany, currentUser]);

  const scopedPatients = useMemo(() => {
    const all = data.patients || [];
    if (!isCompany) return all;
    if (!currentUser?.companyId) return [];
    return all.filter(p => idsMatch(p.companyId, currentUser.companyId));
  }, [data.patients, isCompany, currentUser]);

  const scopedOrders = useMemo(() => {
    const all = data.orders || [];
    if (isCompany) {
      const cid = currentUser?.companyId;
      if (!cid) return [];
      return all.filter(o => orderBelongsToCompany(o, cid, data.patients, data.doctors));
    }
    if (isOperator && currentUser?.id) return all.filter(o => o.createdBy === currentUser.id);
    return all;
  }, [data.orders, data.patients, data.doctors, isCompany, isOperator, currentUser]);

  return (
    <DentalContext.Provider
      value={{
        orders: scopedOrders,
        companies: scopedCompanies,
        doctors: scopedDoctors,
        patients: scopedPatients,
        materials,
        pipelineTypes,
        saveCustomMaterial,
        deleteCustomMaterial,
        assignMaterialPipelineType,
        savePipelineType,
        deletePipelineType,
        addStepToPipelineType,
        updatePipelineTypeStep,
        removeStepFromPipelineType,
        reorderPipelineTypeSteps,
        resetMaterialsToDefault,
        vitaShades: VITA_SHADES,
        technicians: techniciansList.map(t => t.name),
        techniciansList,
        addTechnician,
        removeTechnician,
        updateTechnician,
        assignTechnicianToStep,
        updateOrderDates,
        toggleStepCompletion,
        isTeamModalOpen,
        setIsTeamModalOpen,
        theme,
        toggleTheme,
        searchQuery,
        setSearchQuery,
        toast,
        showToast,
        isOrderModalOpen,
        setIsOrderModalOpen,
        editingOrder,
        setEditingOrder,
        isDbModalOpen,
        setIsDbModalOpen,
        dbConfig,
        saveDbConfig,
        dbStatus,
        isDbLoading,
        isSyncing,
        lastSyncedAt,
        fetchFromDatabase,
        testAndSyncDb,
        clearAllData,
        exportData,
        importData,
        saveOrder,
        uploadOrderStlFile,
        deleteOrderStlFile,
        approveOrder,
        rejectOrder,
        addStepToOrder,
        removeStepFromOrder,
        editStepInOrder,
        updateStepStatus,
        advanceOrderToNextStep,
        convertImplantToPorcelain,
        convertImplantToMdp,
        regressOrderToPrevStep,
        moveOrderToStep,
        restartOrder,
        deleteOrder,
        saveCompany,
        deleteCompany,
        saveDoctor,
        deleteDoctor,
        savePatient,
        deletePatient
      }}
    >
      {children}
    </DentalContext.Provider>
  );
};

export const useDental = () => useContext(DentalContext);
