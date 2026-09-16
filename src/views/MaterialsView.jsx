import React, { useState } from 'react';
import { useDental, inferPipelineTypeId } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Palette
} from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#64748b',
  '#dc2626',
  '#ea580c',
  '#0891b2',
  '#4f46e5',
  '#be185d'
];

const CORE_MATERIAL_IDS = ['mdp', 'zirconia', 'implant', 'lamina'];

function isLockedType(type) {
  return Boolean(type && (type.locked || type.id === 'other' || type.id === 'implant'));
}

function isLockedStep(type, step) {
  return isLockedType(type) && step?.isDefault;
}

export const MaterialsView = () => {
  const {
    materials,
    orders,
    patients,
    companies,
    doctors,
    showToast,
    saveCustomMaterial,
    deleteCustomMaterial,
    assignMaterialPipelineType,
    savePipelineType,
    deletePipelineType,
    pipelineTypes,
    addStepToPipelineType,
    removeStepFromPipelineType,
    reorderPipelineTypeSteps,
    resetMaterialsToDefault
  } = useDental();
  const { isAdmin } = useAuth();

  const [expandedTypeIds, setExpandedTypeIds] = useState(() => ({
    other: true
  }));

  const [matModalOpen, setMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState(null);
  const [matName, setMatName] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matColor, setMatColor] = useState('#0284c7');
  const [matPipelineTypeId, setMatPipelineTypeId] = useState('other');

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCopyFrom, setNewTypeCopyFrom] = useState('other');

  const [addingStepForTypeId, setAddingStepForTypeId] = useState(null);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepHours, setNewStepHours] = useState('2');
  const [deleteStepModalData, setDeleteStepModalData] = useState(null);

  if (!isAdmin) {
    return (
      <div className="dental-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={40} color="var(--status-urgent)" style={{ margin: '0 auto 12px' }} />
        <h3>Bu sayfaya erişim yetkiniz bulunmuyor</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Materyal ve üretim hattı yönetimi yalnızca laboratuvar yöneticileri tarafından yapılabilir.
        </p>
      </div>
    );
  }

  const toggleTypeExpand = (id) => {
    setExpandedTypeIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewMaterialModal = () => {
    setEditingMat(null);
    setMatName('');
    setMatDesc('');
    setMatColor('#64748b');
    setMatPipelineTypeId('other');
    setMatModalOpen(true);
  };

  const openEditMaterialModal = (mat, e) => {
    e.stopPropagation();
    setEditingMat(mat);
    setMatName(mat.name || '');
    setMatDesc(mat.description || '');
    setMatColor(mat.color || '#0284c7');
    setMatPipelineTypeId(inferPipelineTypeId(mat));
    setMatModalOpen(true);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!matName.trim()) return;
    const type = pipelineTypes?.[matPipelineTypeId];
    if (!type) {
      showToast('Önce bir etap tipi seçin.', 'error');
      return;
    }
    const saved = await saveCustomMaterial({
      ...(editingMat || {}),
      name: matName.trim(),
      description: matDesc.trim() || `${matName.trim()} restorasyon üretimi.`,
      color: matColor,
      pipelineTypeId: type.id,
      steps: type.steps || []
    });
    if (saved) setMatModalOpen(false);
  };

  const handleDeleteMaterial = async (matId, name, e) => {
    e.stopPropagation();
    const relatedCount = (orders || []).filter(o => o.materialId === matId).length;
    const message = relatedCount > 0
      ? `"${name}" materyalini silmek, buna bağlı ${relatedCount} iş emrini de kalıcı olarak siler. Onaylıyor musunuz?`
      : `"${name}" materyalini silmek istediğinize emin misiniz?`;
    const ok = window.confirm(message);
    if (!ok) return;
    await deleteCustomMaterial(matId);
  };

  const handleOpenAddStep = (typeId, e) => {
    e.stopPropagation();
    setAddingStepForTypeId(typeId);
    setNewStepName('');
    setNewStepDesc('');
    setNewStepHours('2');
  };

  const handleConfirmAddStep = async (typeId) => {
    if (!newStepName.trim()) return;
    await addStepToPipelineType(typeId, {
      name: newStepName.trim(),
      description: newStepDesc.trim(),
      estimatedHours: parseFloat(newStepHours) || 2
    });
    setAddingStepForTypeId(null);
  };

  const handleDeleteStep = (type, step, e) => {
    e.stopPropagation();
    const typeMatIds = new Set(
      Object.values(materials)
        .filter(m => inferPipelineTypeId(m) === type.id)
        .map(m => m.id)
    );
    const activeOrdersInStep = (orders || []).filter(o => {
      if (o.status === 'completed' || o.status === 'rejected') return false;
      if (typeMatIds.size && !typeMatIds.has(o.materialId)) return false;
      const curStep = o.steps?.[o.currentStepIndex];
      return (curStep?.name || '').trim().toLowerCase() === (step.name || '').trim().toLowerCase()
        || curStep?.order === step.order;
    });
    setDeleteStepModalData({
      typeId: type.id,
      typeName: type.name,
      step,
      ordersInStep: activeOrdersInStep
    });
  };

  const handleConfirmDeleteStep = async () => {
    if (!deleteStepModalData) return;
    const { typeId, step, ordersInStep } = deleteStepModalData;
    await removeStepFromPipelineType(typeId, step.order, (ordersInStep || []).map(o => o.id));
    setDeleteStepModalData(null);
  };

  const handleMoveStep = async (type, stepIndex, direction, e) => {
    e.stopPropagation();
    const steps = [...(type.steps || [])];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    if (isLockedStep(type, steps[stepIndex]) || isLockedStep(type, steps[targetIndex])) return;
    const temp = steps[stepIndex];
    steps[stepIndex] = steps[targetIndex];
    steps[targetIndex] = temp;
    await reorderPipelineTypeSteps(type.id, steps);
  };

  const typeList = Object.values(pipelineTypes || {});
  const materialList = Object.values(materials || {}).filter(m => m && m.id);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 50 }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={26} color="var(--dental-blue)" />
            <span>Restorasyon Materyalleri & Üretim Hattı Yönetimi</span>
          </h2>
          <p className="page-subtitle">
            Etap tipini tanımlayın, ardından materyali o tipe bağlayın. Üretim hattı seçilen tipe göre çalışır.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-dental btn-dental-primary" onClick={openNewMaterialModal}>
            <Plus size={16} />
            <span>Yeni Materyal Ekle</span>
          </button>
          <button
            type="button"
            className="btn-dental btn-dental-secondary btn-dental-sm"
            onClick={async () => {
              const ok = window.confirm('Tüm materyal ve etap tipleri fabrika ayarlarına sıfırlansın mı?');
              if (ok) await resetMaterialsToDefault();
            }}
          >
            <RotateCcw size={14} />
            <span>Varsayılanlara Sıfırla</span>
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          fontSize: '0.86rem',
          color: 'var(--text-secondary)'
        }}
      >
        <HelpCircle size={20} color="var(--dental-blue)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Nasıl Çalışır?</strong> İmplant 7, Diğer 6 etap olarak hazır gelir. Yeni bir üretim hattı istiyorsanız etap tipi ekleyin ve etaplarını orada düzenleyin. Materyale etap eklenmez; materyal yalnızca bir etap tipi seçer.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Etap Tipleri</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Kanban sekmeleri ve iş emri aşamaları buradan gelir.
          </p>
        </div>
        <button
          type="button"
          className="btn-dental btn-dental-primary btn-dental-sm"
          onClick={() => {
            setNewTypeName('');
            setNewTypeCopyFrom('other');
            setTypeModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>Yeni Etap Tipi</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {typeList.map(type => {
          const isExpanded = !!expandedTypeIds[type.id];
          const matCount = materialList.filter(m => inferPipelineTypeId(m) === type.id).length;
          const totalHours = (type.steps || []).reduce((acc, s) => acc + (s.estimatedHours || 0), 0);
          const locked = isLockedType(type);

          return (
            <div key={type.id} className="dental-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  cursor: 'pointer',
                  background: isExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)'
                }}
                onClick={() => toggleTypeExpand(type.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>{type.name}</h3>
                    {locked && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 999 }}>
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {type.steps?.length || 0} etap • {matCount} materyal • ~{totalHours} saat
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {!locked && (
                    <button
                      type="button"
                      className="btn-dental btn-dental-danger btn-dental-sm"
                      onClick={() => deletePipelineType(type.id)}
                    >
                      <Trash2 size={13} />
                      <span>Tipi Sil</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-dental btn-dental-secondary btn-dental-sm"
                    style={{ padding: '6px 10px' }}
                    onClick={() => toggleTypeExpand(type.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px 20px 20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {(type.steps || []).map(s => s.name).join(' → ') || 'Etap yok'}
                    </div>
                    <button
                      type="button"
                      className="btn-dental btn-dental-primary btn-dental-sm"
                      onClick={(e) => handleOpenAddStep(type.id, e)}
                    >
                      <Plus size={14} />
                      <span>Etap Ekle</span>
                    </button>
                  </div>

                  {addingStepForTypeId === type.id && (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1.5px solid var(--dental-blue)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 18px',
                        marginBottom: 14
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(200px, 2fr) minmax(100px, 0.8fr)', gap: 12 }}>
                        <div>
                          <label className="dental-field-label">Etap adı *</label>
                          <input
                            type="text"
                            className="dental-input dental-input-sm"
                            placeholder="Örn: Tesviye"
                            value={newStepName}
                            onChange={e => setNewStepName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="dental-field-label">Açıklama</label>
                          <input
                            type="text"
                            className="dental-input dental-input-sm"
                            placeholder="Kısa açıklama"
                            value={newStepDesc}
                            onChange={e => setNewStepDesc(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="dental-field-label">Süre (~saat)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="dental-input dental-input-sm"
                            value={newStepHours}
                            onChange={e => setNewStepHours(e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                        <button type="button" className="btn-dental btn-dental-secondary btn-dental-sm" onClick={() => setAddingStepForTypeId(null)}>Vazgeç</button>
                        <button type="button" className="btn-dental btn-dental-primary btn-dental-sm" onClick={() => handleConfirmAddStep(type.id)}>
                          <Check size={14} />
                          <span>Etabı Ekle</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(type.steps || []).map((step, idx, arr) => {
                      const lockedStep = isLockedStep(type, step);
                      return (
                        <div
                          key={`${type.id}-${step.order}-${idx}`}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'rgba(2, 132, 199, 0.1)',
                                color: 'var(--dental-blue)',
                                border: '1.5px solid var(--dental-blue)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                flexShrink: 0
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800 }}>{step.name}</span>
                                {lockedStep && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Sabit</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{step.description}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Clock size={14} color="var(--dental-blue)" />
                            ~{step.estimatedHours || 0} saat
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              disabled={idx === 0 || lockedStep || isLockedStep(type, arr[idx - 1])}
                              className="btn-dental btn-dental-secondary btn-dental-sm"
                              style={{ padding: '4px 6px', opacity: idx === 0 || lockedStep ? 0.35 : 1 }}
                              onClick={(e) => handleMoveStep(type, idx, 'up', e)}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === arr.length - 1 || lockedStep || isLockedStep(type, arr[idx + 1])}
                              className="btn-dental btn-dental-secondary btn-dental-sm"
                              style={{ padding: '4px 6px', opacity: idx === arr.length - 1 || lockedStep ? 0.35 : 1 }}
                              onClick={(e) => handleMoveStep(type, idx, 'down', e)}
                            >
                              <ArrowDown size={14} />
                            </button>
                            {!lockedStep && (
                              <button
                                type="button"
                                className="btn-dental btn-dental-danger btn-dental-sm"
                                onClick={(e) => handleDeleteStep(type, step, e)}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800 }}>Materyaller</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {materialList.map(mat => {
          const type = pipelineTypes?.[inferPipelineTypeId(mat)];
          const isCore = CORE_MATERIAL_IDS.includes(mat.id);
          return (
            <div
              key={mat.id}
              className="dental-card"
              style={{ padding: '16px 20px', borderLeft: `5px solid ${mat.color}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 240 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: mat.color, boxShadow: `0 0 0 3px ${mat.color}30` }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{mat.name}</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{mat.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    className="kanban-filter-select"
                    value={inferPipelineTypeId(mat)}
                    onChange={(e) => assignMaterialPipelineType(mat.id, e.target.value)}
                    title="Etap tipi"
                    style={{ fontSize: '0.8rem', minWidth: 160 }}
                  >
                    {typeList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.steps?.length || 0} etap)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {type?.steps?.length || 0} etap
                  </span>
                  {!isCore && (
                    <>
                      <button type="button" className="btn-dental btn-dental-secondary btn-dental-sm" onClick={(e) => openEditMaterialModal(mat, e)}>
                        <Edit2 size={13} />
                        <span>Düzenle</span>
                      </button>
                      <button type="button" className="btn-dental btn-dental-danger btn-dental-sm" onClick={(e) => handleDeleteMaterial(mat.id, mat.name, e)}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {matModalOpen && (
        <div className="modal-overlay" onClick={() => setMatModalOpen(false)}>
          <div className="modal-dialog-box" style={{ maxWidth: 540, borderRadius: 'var(--radius-xl)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-dialog-header" style={{ padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: `${matColor}18`,
                    color: matColor,
                    border: `1.5px solid ${matColor}45`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Layers size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {editingMat ? 'Materyali Düzenle' : 'Yeni Materyal'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Materyali tanımlayıp bir etap tipi seçin.
                  </p>
                </div>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setMatModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMaterial}>
              <div className="modal-dialog-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-item">
                  <label className="dental-field-label">Materyal adı *</label>
                  <input
                    type="text"
                    className="dental-input"
                    placeholder="Örn: Demir (Döküm Metal)"
                    value={matName}
                    onChange={e => setMatName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-item">
                  <label className="dental-field-label">Kısa açıklama</label>
                  <textarea
                    className="dental-input"
                    rows={2}
                    style={{ resize: 'none' }}
                    placeholder="Örn: Döküm metal kron üretimi."
                    value={matDesc}
                    onChange={e => setMatDesc(e.target.value)}
                  />
                </div>
                <div className="form-item">
                  <label className="dental-field-label">Renk</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(c => {
                      const isSelected = matColor.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setMatColor(c)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: isSelected ? '3px solid #fff' : '2px solid transparent',
                            boxShadow: isSelected ? `0 0 0 2.5px ${c}` : '0 2px 4px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <label
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'conic-gradient(from 180deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <input
                        type="color"
                        value={matColor}
                        onChange={e => setMatColor(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
                      />
                      <Palette size={14} color="#fff" />
                    </label>
                  </div>
                </div>
                <div className="form-item">
                  <label className="dental-field-label">Etap tipi *</label>
                  <select
                    className="dental-input"
                    value={matPipelineTypeId}
                    onChange={e => setMatPipelineTypeId(e.target.value)}
                    required
                  >
                    {typeList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.steps?.length || 0} etap)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Farklı bir hat istiyorsanız önce yukarıdan yeni etap tipi ekleyin.
                  </span>
                </div>
              </div>
              <div className="modal-dialog-footer" style={{ padding: '16px 24px' }}>
                <button type="button" className="btn-dental btn-dental-secondary" onClick={() => setMatModalOpen(false)}>İptal</button>
                <button
                  type="submit"
                  className="btn-dental btn-dental-primary"
                  style={{ backgroundColor: matColor, borderColor: matColor }}
                >
                  <Check size={16} />
                  <span>{editingMat ? 'Kaydet' : 'Materyali Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {typeModalOpen && (
        <div className="modal-overlay" onClick={() => setTypeModalOpen(false)}>
          <div className="modal-dialog-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Yeni Etap Tipi</h3>
              <button type="button" className="btn-modal-close" onClick={() => setTypeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const copy = pipelineTypes[newTypeCopyFrom];
                const saved = await savePipelineType({
                  name: newTypeName,
                  steps: (copy?.steps || []).map(s => ({ ...s, isDefault: false }))
                });
                if (saved) {
                  setTypeModalOpen(false);
                  setExpandedTypeIds(prev => ({ ...prev, [saved.id]: true }));
                }
              }}
            >
              <div className="modal-dialog-body">
                <div className="form-item" style={{ marginBottom: 12 }}>
                  <label>Tip adı *</label>
                  <input
                    className="dental-input"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="Örn: Metal / Döküm"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-item">
                  <label>Başlangıç etapları</label>
                  <select
                    className="dental-input"
                    value={newTypeCopyFrom}
                    onChange={e => setNewTypeCopyFrom(e.target.value)}
                  >
                    {typeList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} şablonunu kopyala ({t.steps?.length || 0} etap)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Oluşturduktan sonra etap ekleyip çıkarabilirsiniz. Bu tip Kanban’da yeni sekme olur.
                  </span>
                </div>
              </div>
              <div className="modal-dialog-footer">
                <button type="button" className="btn-dental btn-dental-secondary" onClick={() => setTypeModalOpen(false)}>İptal</button>
                <button type="submit" className="btn-dental btn-dental-primary">Tipi Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteStepModalData && (
        <div className="modal-overlay" onClick={() => setDeleteStepModalData(null)}>
          <div
            className="modal-dialog-box"
            style={{
              maxWidth: deleteStepModalData.ordersInStep?.length ? 620 : 480,
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-dialog-header" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: deleteStepModalData.ordersInStep?.length ? 'rgba(220, 38, 38, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                    color: deleteStepModalData.ordersInStep?.length ? 'var(--status-urgent)' : 'var(--dental-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {deleteStepModalData.ordersInStep?.length ? <AlertTriangle size={24} /> : <Trash2 size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}>
                    {deleteStepModalData.ordersInStep?.length ? 'Bu etapta aktif işler var' : 'Etabı sil'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {deleteStepModalData.typeName} • {deleteStepModalData.step.name}
                  </p>
                </div>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setDeleteStepModalData(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-dialog-body" style={{ padding: '20px 24px' }}>
              {deleteStepModalData.ordersInStep?.length ? (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>
                    Bu etabı silmek, içindeki {deleteStepModalData.ordersInStep.length} iş emrini de kalıcı olarak siler.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deleteStepModalData.ordersInStep.map(ord => {
                      const patName = patients.find(p => String(p.id) === String(ord.patientId))?.name || 'Hasta';
                      const compName = companies.find(c => String(c.id) === String(ord.companyId))?.name || 'Klinik';
                      return (
                        <div key={ord.id} style={{ padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <strong>#{ord.id}</strong> • {patName}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{compName}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p style={{ margin: 0 }}>
                  "{deleteStepModalData.step.name}" etabını bu tipten çıkarmak istediğinize emin misiniz?
                </p>
              )}
            </div>
            <div className="modal-dialog-footer" style={{ padding: '16px 24px' }}>
              <button type="button" className="btn-dental btn-dental-secondary" onClick={() => setDeleteStepModalData(null)}>Vazgeç</button>
              <button type="button" className="btn-dental btn-dental-danger" onClick={handleConfirmDeleteStep}>
                <Trash2 size={16} />
                <span>
                  {deleteStepModalData.ordersInStep?.length
                    ? `Etabı ve ${deleteStepModalData.ordersInStep.length} işi sil`
                    : 'Etabı sil'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
