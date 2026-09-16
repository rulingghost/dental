import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
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
  Sparkles,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sliders,
  Palette
} from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7', // Mavi (Zirkon)
  '#059669', // Zümrüt (İmplant)
  '#d97706', // Kehribar (MDP)
  '#7c3aed', // Mor (Lamina)
  '#64748b', // Kurşun / Demir / Metal
  '#dc2626', // Kırmızı
  '#ea580c', // Turuncu
  '#0891b2', // Camgöbeği
  '#4f46e5', // İndigo
  '#be185d'  // Gül
];

export const MaterialsView = () => {
  const {
    materials,
    orders,
    patients,
    companies,
    doctors,
    saveCustomMaterial,
    deleteCustomMaterial,
    addStepToMaterial,
    updateMaterialStep,
    removeStepFromMaterial,
    reorderMaterialSteps,
    resetMaterialsToDefault
  } = useDental();
  const { isAdmin } = useAuth();

  // Açık olan kartlar
  const [expandedMatIds, setExpandedMatIds] = useState(() => ({
    [Object.keys(materials)[0] || 'mdp']: true
  }));

  // Yeni / Düzenle Materyal Modalı State'i
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState(null);
  const [matName, setMatName] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matColor, setMatColor] = useState('#0284c7');
  const [matTemplateType, setMatTemplateType] = useState('standard');

  // Aşama Ekleme State'i
  const [addingStepForMatId, setAddingStepForMatId] = useState(null);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepHours, setNewStepHours] = useState('2');

  // Silinecek Aşama ve İçindeki İşler Modalı State'i
  const [deleteStepModalData, setDeleteStepModalData] = useState(null); // { matId, matName, step, ordersInStep }

  const toggleExpand = (id) => {
    setExpandedMatIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Sadece Admin görebilir
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

  // Materyal Modalını Aç
  const openNewMaterialModal = () => {
    setEditingMat(null);
    setMatName('');
    setMatDesc('');
    setMatColor('#64748b');
    setMatTemplateType('standard');
    setMatModalOpen(true);
  };

  const openEditMaterialModal = (mat, e) => {
    e.stopPropagation();
    setEditingMat(mat);
    setMatName(mat.name || '');
    setMatDesc(mat.description || '');
    setMatColor(mat.color || '#0284c7');
    setMatModalOpen(true);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!matName.trim()) return;

    let initialSteps = [];
    if (editingMat) {
      initialSteps = editingMat.steps || [];
    } else {
      if (matTemplateType === 'standard') {
        initialSteps = [
          { order: 1, name: 'Onay', description: 'İş emri onayı beklenir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 0, isDefault: true },
          { order: 2, name: 'Ölçü + Model', description: 'Model hazırlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 3, name: 'Üretim / İşleme', description: 'Restorasyon ana üretimi.', defaultTechnician: 'Yusuf Usta', estimatedHours: 4, isDefault: true },
          { order: 4, name: 'Glaze / Polisaj', description: 'Son kontroller ve parlatma.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true }
        ];
      } else if (matTemplateType === 'porcelain') {
        initialSteps = [
          { order: 1, name: 'Onay', description: 'İş emri onayı beklenir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 0, isDefault: true },
          { order: 2, name: 'Ölçü + Model', description: 'Klinik ölçüsü modele aktarılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 3, name: 'Altyapı', description: 'Restorasyon altyapısı hazırlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 4, name: 'Opak', description: 'Opak uygulaması yapılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true },
          { order: 5, name: 'Dentin', description: 'Dentin katmanı yığılır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 6, name: 'Glaze', description: 'Glaze ve parlatma tamamlanır.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true }
        ];
      } else if (matTemplateType === 'metal') {
        initialSteps = [
          { order: 1, name: 'Onay', description: 'İş emri onayı beklenir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 0, isDefault: true },
          { order: 2, name: 'Model Dökümü', description: 'Çalışma modeli elde edilir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true },
          { order: 3, name: 'Mum Modelaj / CAD', description: 'Altyapı mumlama veya dijital tasarım.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 4, name: 'Döküm & Reverte', description: 'Metal döküm ve manşet açımı.', defaultTechnician: 'Yusuf Usta', estimatedHours: 4, isDefault: true },
          { order: 5, name: 'Tesviye & Kumlama', description: 'Çapak alma, uyum kontrolü ve kumlama.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true },
          { order: 6, name: 'Polisaj / Kontrol', description: 'Yüksek parlaklık polisajı ve son kontrol.', defaultTechnician: 'Yusuf Usta', estimatedHours: 2, isDefault: true }
        ];
      } else {
        initialSteps = [
          { order: 1, name: 'Onay', description: 'İş emri onayı beklenir.', defaultTechnician: 'Yusuf Usta', estimatedHours: 0, isDefault: true },
          { order: 2, name: 'Üretim', description: 'Genel üretim aşaması.', defaultTechnician: 'Yusuf Usta', estimatedHours: 3, isDefault: true }
        ];
      }
    }

    const payload = {
      ...(editingMat || {}),
      name: matName.trim(),
      description: matDesc.trim() || `${matName.trim()} restorasyon üretimi.`,
      color: matColor,
      steps: initialSteps
    };

    const saved = await saveCustomMaterial(payload);
    if (saved) {
      setMatModalOpen(false);
      setExpandedMatIds(prev => ({ ...prev, [saved.id]: true }));
    }
  };

  // Materyal Silme
  const handleDeleteMaterial = async (matId, matName, e) => {
    e.stopPropagation();
    const ok = window.confirm(`"${matName}" materyalini ve üretim hattını tamamen silmek istediğinize emin misiniz?`);
    if (!ok) return;
    await deleteCustomMaterial(matId);
  };

  // Aşama Ekleme
  const handleOpenAddStep = (matId, e) => {
    e.stopPropagation();
    setAddingStepForMatId(matId);
    setNewStepName('');
    setNewStepDesc('');
    setNewStepHours('2');
  };

  const handleConfirmAddStep = async (matId) => {
    if (!newStepName.trim()) return;
    await addStepToMaterial(matId, {
      name: newStepName.trim(),
      description: newStepDesc.trim(),
      defaultTechnician: 'Yusuf Usta',
      estimatedHours: parseFloat(newStepHours) || 2
    });
    setAddingStepForMatId(null);
  };

  // Aşama Silme: İçerisinde aktif iş olup olmadığını denetleyip uyarı modalını aç
  const handleDeleteStep = (matId, step, e) => {
    e.stopPropagation();
    const mat = materials[matId];
    // Bu etaba bağlı aktif iş emirlerini tespit et
    const activeOrdersInStep = (orders || []).filter(o => {
      if (o.status === 'completed' || o.status === 'rejected') return false;
      const curStep = o.steps?.[o.currentStepIndex];
      const matchesMat = o.materialId === matId || !o.materialId;
      const matchesStep =
        (curStep?.name || '').trim().toLowerCase() === (step.name || '').trim().toLowerCase() ||
        curStep?.order === step.order;
      return matchesMat && matchesStep;
    });

    setDeleteStepModalData({
      matId,
      matName: mat?.name || 'Materyal',
      step,
      ordersInStep: activeOrdersInStep
    });
  };

  const handleConfirmDeleteStep = async () => {
    if (!deleteStepModalData) return;
    const { matId, step, ordersInStep } = deleteStepModalData;
    const orderIdsToDelete = (ordersInStep || []).map(o => o.id);
    await removeStepFromMaterial(matId, step.order, orderIdsToDelete);
    setDeleteStepModalData(null);
  };

  // Aşama Yukarı / Aşağı Taşıma
  const handleMoveStep = async (matId, stepIndex, direction, e) => {
    e.stopPropagation();
    const mat = materials[matId];
    if (!mat || !mat.steps) return;
    const steps = [...mat.steps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const temp = steps[stepIndex];
    steps[stepIndex] = steps[targetIndex];
    steps[targetIndex] = temp;

    await reorderMaterialSteps(matId, steps);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 50 }}>
      {/* Üst Başlık & Butonlar */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={26} color="var(--dental-blue)" />
            <span>Restorasyon Materyalleri & Üretim Hattı Yönetimi</span>
          </h2>
          <p className="page-subtitle">
            Laboratuvarda üretilen tüm diş protez materyallerini (Zirkonyum, İmplant, MDP, Demir vb.) ve her birine özel üretim istasyonlarını kurgulayın.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-dental btn-dental-primary"
            onClick={openNewMaterialModal}
          >
            <Plus size={16} />
            <span>Yeni Materyal Ekle</span>
          </button>

          <button
            type="button"
            className="btn-dental btn-dental-secondary btn-dental-sm"
            onClick={async () => {
              const ok = window.confirm('Tüm materyal ve aşama şablonları fabrika ayarlarına sıfırlansın mı?');
              if (ok) await resetMaterialsToDefault();
            }}
            title="Şablonları varsayılana sıfırla"
          >
            <RotateCcw size={14} />
            <span>Varsayılanlara Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Bilgilendirme Notu */}
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
          <strong>Nasıl Çalışır?</strong> Burada tanımladığınız materyaller ve üretim hatları, yeni iş emri oluştururken hekim veya teknisyen tarafından seçilebilir hale gelir. Sipariş oluşturulduğunda belirlediğiniz tüm etaplar otomatik olarak üretim hattına ve takvime entegre edilir.
        </div>
      </div>

      {/* Materyal Kartları Listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {Object.values(materials).map(mat => {
          const isExpanded = !!expandedMatIds[mat.id];
          const totalHours = (mat.steps || []).reduce((acc, s) => acc + (s.estimatedHours || 0), 0);
          const isCore = ['mdp', 'zirconia', 'implant', 'lamina'].includes(mat.id);

          return (
            <div
              key={mat.id}
              className="dental-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                borderLeft: `5px solid ${mat.color}`
              }}
            >
              {/* Kart Başlığı */}
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  cursor: 'pointer',
                  background: isExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)'
                }}
                onClick={() => toggleExpand(mat.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: mat.color,
                      boxShadow: `0 0 0 3px ${mat.color}30`
                    }}
                  />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {mat.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'JetBrains Mono',
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}
                  >
                    #{mat.id}
                  </span>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    • {mat.steps?.length || 0} Üretim Etabı • ~{totalHours} Saat İş Yükü
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {/* Sadece sonradan eklenen özel materyaller düzenlenebilir veya silinebilir */}
                  {!isCore && (
                    <>
                      <button
                        type="button"
                        className="btn-dental btn-dental-secondary btn-dental-sm"
                        onClick={(e) => openEditMaterialModal(mat, e)}
                        title="Özel Materyali Düzenle"
                      >
                        <Edit2 size={13} />
                        <span>Düzenle</span>
                      </button>

                      <button
                        type="button"
                        className="btn-dental btn-dental-danger btn-dental-sm"
                        onClick={(e) => handleDeleteMaterial(mat.id, mat.name, e)}
                        title="Özel Materyali Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}

                  {/* Aç / Kapa Butonu */}
                  <button
                    type="button"
                    className="btn-dental btn-dental-secondary btn-dental-sm"
                    onClick={() => toggleExpand(mat.id)}
                    style={{ padding: '6px 10px' }}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Materyal Açıklaması */}
              <div style={{ padding: '8px 20px 14px', borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {mat.description}
                </p>
              </div>

              {/* Üretim Hattı İstasyonları (Genişletildiğinde) */}
              {isExpanded && (
                <div style={{ padding: '18px 20px', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                      Üretim Hattı Akışı ({mat.steps?.length || 0} İstasyon)
                    </div>

                    <button
                      type="button"
                      className="btn-dental btn-dental-primary btn-dental-sm"
                      onClick={(e) => handleOpenAddStep(mat.id, e)}
                    >
                      <Plus size={14} />
                      <span>Yeni Etap Ekle</span>
                    </button>
                  </div>

                  {/* Etap Ekleme Kutusu (Açıksa) */}
                  {addingStepForMatId === mat.id && (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1.5px solid var(--dental-blue)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '18px 20px',
                        marginBottom: 16,
                        boxShadow: '0 8px 24px -6px rgba(2, 132, 199, 0.15)',
                        animation: 'fadeIn 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(2, 132, 199, 0.12)', color: 'var(--dental-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={16} />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--dental-blue)' }}>
                            Bu Materyale Yeni Üretim Etabı Ekle
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddingStepForMatId(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                          title="Vazgeç"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.3fr) minmax(220px, 2.4fr) minmax(110px, 0.9fr)', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label className="dental-field-label" style={{ marginBottom: 0 }}>
                            Etap / İstasyon Adı <span style={{ color: 'var(--status-urgent)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="dental-input dental-input-sm"
                            placeholder="Örn: Tesviye & Kumlama"
                            value={newStepName}
                            onChange={e => setNewStepName(e.target.value)}
                            autoFocus
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label className="dental-field-label" style={{ marginBottom: 0 }}>Açıklama</label>
                          <input
                            type="text"
                            className="dental-input dental-input-sm"
                            placeholder="Örn: Çapak alma ve uyum kontrolü"
                            value={newStepDesc}
                            onChange={e => setNewStepDesc(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label className="dental-field-label" style={{ marginBottom: 0 }}>Süre (~Saat)</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="dental-input dental-input-sm"
                              style={{ paddingRight: 38 }}
                              value={newStepHours}
                              onChange={e => setNewStepHours(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: 10, fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}>
                              saat
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          className="btn-dental btn-dental-secondary btn-dental-sm"
                          onClick={() => setAddingStepForMatId(null)}
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          className="btn-dental btn-dental-primary btn-dental-sm"
                          onClick={() => handleConfirmAddStep(mat.id)}
                        >
                          <Check size={14} />
                          <span>Etabı Hatta Ekle</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Etaplar Listesi */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(mat.steps || []).map((step, idx, arr) => {
                      const isDefaultStep = step.isDefault === true || (
                        ['mdp', 'zirconia', 'lamina'].includes(mat.id) && ['Onay', 'Ölçü + Model', 'Altyapı', 'Opak', 'Dentin', 'Glaze'].includes(step.name)
                      ) || (
                        mat.id === 'implant' && ['Onay', 'Ölçü + Model', 'Abutment + Freze', 'Torklama + Ölçü', 'Altyapı', 'Prova', 'Glaze'].includes(step.name)
                      );

                      return (
                        <div
                          key={step.order || idx}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 14,
                            flexWrap: 'wrap'
                          }}
                        >
                          {/* Sol Kısım: Sıra & İsim & Açıklama & Rozet */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: `${mat.color}20`,
                                color: mat.color,
                                border: `1.5px solid ${mat.color}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontFamily: 'JetBrains Mono',
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}
                            >
                              {idx + 1}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {step.name}
                                </span>
                                {isDefaultStep ? (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      color: 'var(--text-muted)',
                                      background: 'var(--bg-surface)',
                                      border: '1px solid var(--border-subtle)',
                                      padding: '2px 7px',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    title="Bu etap temel laboratuvar akışıdır; düzenlenemez veya silinemez."
                                  >
                                    🔒 Sabit Etap
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      color: 'var(--dental-blue)',
                                      background: 'rgba(2, 132, 199, 0.08)',
                                      border: '1px solid rgba(2, 132, 199, 0.25)',
                                      padding: '2px 7px',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    ✨ Özel Etap
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {step.description || 'Özel laboratuvar aşaması'}
                              </div>
                            </div>
                          </div>

                          {/* Orta Kısım: Tahmini Süre */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.82rem',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-card)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <Clock size={14} color="var(--dental-blue)" />
                            <span style={{ fontWeight: 600 }}>~{step.estimatedHours || 0} saat</span>
                          </div>

                          {/* Sağ Kısım: Sıralama & Silme */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Yukarı Taşı */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              className="btn-dental btn-dental-secondary btn-dental-sm"
                              style={{ padding: '4px 6px', opacity: idx === 0 ? 0.3 : 1 }}
                              onClick={(e) => handleMoveStep(mat.id, idx, 'up', e)}
                              title="Yukarı Taşı"
                            >
                              <ArrowUp size={14} />
                            </button>

                            {/* Aşağı Taşı */}
                            <button
                              type="button"
                              disabled={idx === arr.length - 1}
                              className="btn-dental btn-dental-secondary btn-dental-sm"
                              style={{ padding: '4px 6px', opacity: idx === arr.length - 1 ? 0.3 : 1 }}
                              onClick={(e) => handleMoveStep(mat.id, idx, 'down', e)}
                              title="Aşağı Taşı"
                            >
                              <ArrowDown size={14} />
                            </button>

                            {/* Yalnızca Özel Etaplar Silinebilir (Varsayılanlar Kilitli) */}
                            {!isDefaultStep && (
                              <button
                                type="button"
                                className="btn-dental btn-dental-danger btn-dental-sm"
                                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                                onClick={(e) => handleDeleteStep(mat.id, step, e)}
                                title="Özel Etabı Sil"
                              >
                                <Trash2 size={13} />
                                <span>Sil</span>
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

      {/* YENİ / DÜZENLE MATERYAL MODALI */}
      {matModalOpen && (
        <div className="modal-overlay" onClick={() => setMatModalOpen(false)}>
          <div
            className="modal-dialog-box"
            style={{ maxWidth: 540, borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
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
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 14px ${matColor}25`
                  }}
                >
                  <Layers size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {editingMat ? 'Restorasyon Materyalini Düzenle' : 'Yeni Restorasyon Materyali Tanımla'}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Laboratuvarda üretilecek materyali ve hat renk temasını belirleyin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setMatModalOpen(false)}
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial}>
              <div className="modal-dialog-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Materyal Adı */}
                <div className="form-item">
                  <label className="dental-field-label">
                    Materyal / Restorasyon Adı <span style={{ color: 'var(--status-urgent)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="dental-input"
                    placeholder="Örn: Demir (Döküm Metal) veya Titanyum Altyapı"
                    value={matName}
                    onChange={e => setMatName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Açıklama */}
                <div className="form-item">
                  <label className="dental-field-label">Kısa Açıklama</label>
                  <textarea
                    className="dental-input"
                    rows={2}
                    style={{ resize: 'none' }}
                    placeholder="Örn: Döküm metal kron ve köprü altyapı üretimi."
                    value={matDesc}
                    onChange={e => setMatDesc(e.target.value)}
                  />
                </div>

                {/* Renk Seçimi */}
                <div className="form-item">
                  <label className="dental-field-label">Takvim & Hat Renk Teması</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(c => {
                      const isSelected = matColor.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setMatColor(c)}
                          title={c}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: isSelected ? '3px solid #fff' : '2px solid transparent',
                            boxShadow: isSelected ? `0 0 0 2.5px ${c}, 0 4px 10px ${c}60` : '0 2px 4px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
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

                    {/* Özel Renk Seçici Buton */}
                    <label
                      title="Özel Renk Seç (Renk Paleti)"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'conic-gradient(from 180deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'transform 0.18s ease'
                      }}
                    >
                      <input
                        type="color"
                        value={matColor}
                        onChange={e => setMatColor(e.target.value)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                          inset: 0
                        }}
                      />
                      <Palette size={14} color="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))' }} />
                    </label>
                  </div>

                  {/* Canlı Önizleme Rozeti */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px dashed ${matColor}60`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Görünüm:</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: `${matColor}18`,
                          color: matColor,
                          border: `1.5px solid ${matColor}50`
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: matColor }} />
                        {matName.trim() || 'Restorasyon Adı'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: matColor,
                        backgroundColor: 'var(--bg-surface)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      {matColor}
                    </span>
                  </div>
                </div>

                {/* Başlangıç Şablonu (Yalnızca Yeni Eklerken) */}
                {!editingMat && (
                  <div className="form-item">
                    <label className="dental-field-label">Başlangıç Üretim Hattı Şablonu</label>
                    <select
                      className="dental-input"
                      value={matTemplateType}
                      onChange={e => setMatTemplateType(e.target.value)}
                    >
                      <option value="standard">Standart 4 Aşamalı (Onay, Model, Üretim, Bitiş)</option>
                      <option value="metal">Metal / Döküm Aşamalı (Model, CAD, Döküm, Tesviye, Polisaj)</option>
                      <option value="porcelain">Porselen Katmanlı (Model, Altyapı, Opak, Dentin, Glaze)</option>
                      <option value="minimal">Minimal 2 Aşamalı (Onay, Üretim)</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      * Ekledikten sonra aşamaları dilediğiniz gibi çoğaltabilir, silebilir ve sıralayabilirsiniz.
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Alt Butonları */}
              <div className="modal-dialog-footer" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-surface-elevated)' }}>
                <button
                  type="button"
                  className="btn-dental btn-dental-secondary"
                  onClick={() => setMatModalOpen(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-dental btn-dental-primary"
                  style={{
                    backgroundColor: matColor,
                    borderColor: matColor,
                    boxShadow: `0 4px 14px ${matColor}40`
                  }}
                >
                  <Check size={16} />
                  <span>{editingMat ? 'Değişiklikleri Kaydet' : 'Materyali Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÖZEL ETAP VE İÇERİSİNDEKİ İŞLERİ SİLME ONAY MODALI */}
      {deleteStepModalData && (
        <div className="modal-overlay" onClick={() => setDeleteStepModalData(null)}>
          <div
            className="modal-dialog-box"
            style={{
              maxWidth: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 620 : 480,
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              border: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? '1.5px solid var(--status-urgent)' : '1px solid var(--border-subtle)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
            <div
              className="modal-dialog-header"
              style={{
                padding: '20px 24px',
                background: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'rgba(220, 38, 38, 0.06)' : 'var(--bg-surface-elevated)',
                borderBottom: `1px solid ${deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'rgba(220, 38, 38, 0.2)' : 'var(--border-subtle)'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'rgba(220, 38, 38, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                    color: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'var(--status-urgent)' : 'var(--dental-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? <AlertTriangle size={24} /> : <Trash2 size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'var(--status-urgent)' : 'var(--text-primary)' }}>
                    {deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? 'Dikkat: Bu Etabın İçerisinde Aktif İşler Var!' : 'Özel Etabı Sil'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Materyal: <strong>{deleteStepModalData.matName}</strong> • Etap: <strong>{deleteStepModalData.step.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setDeleteStepModalData(null)}
                title="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Gövdesi */}
            <div className="modal-dialog-body" style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0 ? (
                <>
                  <div
                    style={{
                      background: 'rgba(220, 38, 38, 0.08)',
                      border: '1px solid rgba(220, 38, 38, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: 16
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--status-urgent)', marginBottom: 4 }}>
                      ⚠️ Kalıcı Silme Uyarısı
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      <strong>"{deleteStepModalData.step.name}"</strong> etabını silmek üzeresiniz. Şu anda bu etapta işlem gören toplam <strong>{deleteStepModalData.ordersInStep.length} adet aktif iş emri</strong> bulunmaktadır.
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: 'var(--status-urgent)', fontWeight: 700 }}>
                      Bu etabı sildiğinizde, içerisindeki aşağıdaki tüm iş emirleri de SİSTEMDEN VE VERİTABANINDAN KALICI OLARAK SİLİNECEKTİR!
                    </p>
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                    Silinecek İş Emirleri ({deleteStepModalData.ordersInStep.length} Adet)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deleteStepModalData.ordersInStep.map(ord => {
                      const patName = patients.find(p => String(p.id) === String(ord.patientId))?.name || 'İsimsiz Hasta';
                      const compName = companies.find(c => String(c.id) === String(ord.companyId))?.name || 'Klinik';
                      const docName = doctors.find(d => String(d.id) === String(ord.doctorId))?.name || 'Hekim';

                      return (
                        <div
                          key={ord.id}
                          style={{
                            padding: '10px 14px',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, color: 'var(--dental-blue)', fontSize: '0.88rem' }}>
                                #{ord.id}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {patName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {compName} • Dr. {docName}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Hedef Teslimat
                            </div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {ord.deliveryDate || 'Belirtilmedi'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    <strong>"{deleteStepModalData.step.name}"</strong> özel etabını üretim hattından çıkarmak istediğinize emin misiniz?
                  </p>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    ✓ Bu etapta şu anda işlem gören herhangi bir aktif iş emri bulunmamaktadır.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Alt Butonları */}
            <div
              className="modal-dialog-footer"
              style={{
                padding: '16px 24px',
                background: 'var(--bg-surface-elevated)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10
              }}
            >
              <button
                type="button"
                className="btn-dental btn-dental-secondary"
                onClick={() => setDeleteStepModalData(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-dental btn-dental-danger"
                style={{
                  backgroundColor: 'var(--status-urgent)',
                  borderColor: 'var(--status-urgent)',
                  fontWeight: 800
                }}
                onClick={handleConfirmDeleteStep}
              >
                <Trash2 size={16} />
                <span>
                  {deleteStepModalData.ordersInStep && deleteStepModalData.ordersInStep.length > 0
                    ? `Evet, Etabı ve ${deleteStepModalData.ordersInStep.length} İşi Sil`
                    : 'Evet, Etabı Sil'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
