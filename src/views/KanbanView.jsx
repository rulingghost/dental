import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDental, isOrderFromCompletedImplant, normalizeStepName } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import { StepDateModal } from '../components/StepDateModal';
import {
  Plus,
  RotateCcw,
  CheckCircle2,
  Factory,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  X,
  Clock,
  User,
  Building2,
  Calendar,
  Sparkles,
  Info,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  Layers
} from 'lucide-react';

export const KanbanView = () => {
  const navigate = useNavigate();
  const {
    orders,
    companies,
    doctors,
    patients,
    materials,
    technicians,
    advanceOrderToNextStep,
    convertImplantToMdp,
    regressOrderToPrevStep,
    moveOrderToStep,
    restartOrder,
    setIsOrderModalOpen,
    setIsTeamModalOpen,
    assignTechnicianToStep,
    approveOrder,
    rejectOrder,
    setEditingOrder
  } = useDental();
  const { isAdmin, isCompany } = useAuth();
  const readOnly = isCompany;

  const formatCardDate = (value) => {
    if (!value) return 'Belirtilmedi';
    const parts = String(value).split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return value;
  };

  // 'active_pipeline' (Üretim hattı) vs 'completed_archive' (Tamamlananlar)
  const [viewMode, setViewMode] = useState('active_pipeline');

  // Bilgi Modalı State'i (İşlem Hakkında)
  const [infoModalOrder, setInfoModalOrder] = useState(null);

  // Tıklanınca Açılan Kartlar (Akordiyon / Sadeleştirme)
  const [expandedCardIds, setExpandedCardIds] = useState({});

  const toggleCardExpand = (orderId, e) => {
    if (e) e.stopPropagation();
    setExpandedCardIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const areAllExpanded = orders.length > 0 && orders.every(o => !!expandedCardIds[o.id]);

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedCardIds({});
    } else {
      const all = {};
      orders.forEach(o => all[o.id] = true);
      setExpandedCardIds(all);
    }
  };

  // Filtreleme Durumları
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClinic, setFilterClinic] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [filterCategory, setFilterCategory] = useState('other');
  const [dateModal, setDateModal] = useState(null);

  // Mobil İstasyon Filtresi ('all' veya istasyon id'si örn: 'col-model')
  const [activeMobileStation, setActiveMobileStation] = useState('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sürükle-Bırak Durumu
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  const [dragOverStationId, setDragOverStationId] = useState(null);

  const pendingOrders = orders.filter(o => o.status === 'pending_approval');
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'rejected');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const BASE_STATIONS = [
    { id: 'col-onay', title: 'Onay', stepName: 'Onay' },
    { id: 'col-olcu-model', title: 'Ölçü + Model', stepName: 'Ölçü + Model' },
    { id: 'col-abut-freze', title: 'Abutment + Freze', stepName: 'Abutment + Freze' },
    { id: 'col-tork-olcu', title: 'Torklama + Ölçü', stepName: 'Torklama + Ölçü' },
    { id: 'col-altyapi', title: 'Altyapı', stepName: 'Altyapı' },
    { id: 'col-opak', title: 'Opak', stepName: 'Opak' },
    { id: 'col-dentin', title: 'Dentin', stepName: 'Dentin' },
    { id: 'col-prova', title: 'Prova', stepName: 'Prova' },
    { id: 'col-glaze', title: 'Glaze', stepName: 'Glaze' }
  ];

  const STATIONS = React.useMemo(() => {
    // Eğer belirli bir materyal seçilmişse, doğrudan o materyalin etaplarını getir
    if (filterMaterial !== 'all' && materials[filterMaterial]?.steps) {
      return materials[filterMaterial].steps.map(s => ({
        id: `col-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: s.name,
        stepName: normalizeStepName(s.name)
      }));
    }

    if (filterCategory === 'implant') {
      return BASE_STATIONS.filter(s => !['Opak', 'Dentin'].includes(s.stepName));
    }

    const baseOther = BASE_STATIONS.filter(s => !['Abutment + Freze', 'Torklama + Ölçü', 'Prova'].includes(s.stepName));
    const knownNames = new Set(BASE_STATIONS.map(s => s.stepName.toLowerCase()));
    const customStations = [];

    Object.values(materials || {}).forEach(m => {
      (m.steps || []).forEach(s => {
        const norm = normalizeStepName(s.name);
        if (norm && !knownNames.has(norm.toLowerCase())) {
          knownNames.add(norm.toLowerCase());
          customStations.push({
            id: `col-${norm.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: norm,
            stepName: norm
          });
        }
      });
    });

    return [...baseOther, ...customStations];
  }, [filterMaterial, filterCategory, materials]);

  const currentStepName = (order) => normalizeStepName(order.steps?.[order.currentStepIndex || 0]?.name || '');

  const openAdvanceModal = (order, mode = 'next') => {
    setDateModal({
      orderId: order.id,
      mode,
      stepName: currentStepName(order)
    });
  };

  const confirmAdvance = (date) => {
    if (!dateModal) return;
    if (dateModal.mode === 'toMdp') {
      convertImplantToMdp(dateModal.orderId, date);
      setFilterCategory('other');
    } else if (dateModal.mode === 'drop') {
      moveOrderToStep(dateModal.orderId, dateModal.targetIndex, date);
    } else {
      advanceOrderToNextStep(dateModal.orderId, date);
    }
    setDateModal(null);
  };

  useEffect(() => {
    setActiveMobileStation('all');
  }, [filterCategory]);

  // Filtrelenmiş Aktif Siparişler
  const filteredActiveOrders = activeOrders.filter(order => {
    const pat = patients.find(p => p.id === order.patientId);
    const doc = doctors.find(d => d.id === order.doctorId);
    const comp = companies.find(c => c.id === order.companyId);
    const curStep = order.steps?.[order.currentStepIndex];

    // Arama Metni Filtresi
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = order.id?.toLowerCase().includes(q);
      const matchPat = pat?.name?.toLowerCase().includes(q);
      const matchDoc = doc?.name?.toLowerCase().includes(q);
      const matchComp = comp?.name?.toLowerCase().includes(q);
      const matchTeeth = (order.teeth || []).some(t => t.toString().includes(q));
      if (!matchId && !matchPat && !matchDoc && !matchComp && !matchTeeth) return false;
    }

    // Klinik Filtresi
    if (filterClinic !== 'all' && order.companyId !== filterClinic) return false;

    // Öncelik Filtresi
    if (filterPriority !== 'all' && order.priority !== filterPriority) return false;

    // Materyal Filtresi
    if (filterMaterial !== 'all' && order.materialId !== filterMaterial) return false;

    // Teknisyen Filtresi
    if (filterTechnician !== 'all') {
      const techName = curStep?.technician || '';
      if (!techName.includes(filterTechnician)) return false;
    }

    // İmplant / Diğer kategorisi
    if (filterCategory === 'implant' && order.materialId !== 'implant') return false;
    if (filterCategory === 'other' && order.materialId === 'implant') return false;

    return true;
  });

  // Drag & Drop İşleyicileri
  const handleDragStart = (e, orderId) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    setDraggedOrderId(orderId);
    e.dataTransfer.setData('text/plain', orderId);
    e.currentTarget.classList.add('is-dragging');
  };

  const handleDragEnd = (e) => {
    setDraggedOrderId(null);
    setDragOverStationId(null);
    e.currentTarget.classList.remove('is-dragging');
  };

  const handleDragOver = (e, stationId) => {
    if (readOnly) return;
    e.preventDefault();
    if (dragOverStationId !== stationId) {
      setDragOverStationId(stationId);
    }
  };

  const handleDragLeave = (e, stationId) => {
    if (dragOverStationId === stationId) {
      setDragOverStationId(null);
    }
  };

  const handleDrop = (e, targetStation) => {
    e.preventDefault();
    setDragOverStationId(null);
    if (readOnly) return;
    const orderId = draggedOrderId || e.dataTransfer.getData('text/plain');
    setDraggedOrderId(null);
    if (!orderId) return;

    const order = orders.find(o => o.id === orderId);
    if (!order || !order.steps) return;

    const targetIndex = (order.steps || []).findIndex(s => normalizeStepName(s.name) === targetStation.stepName);
    if (targetIndex < 0) return;
    if (targetIndex === (order.currentStepIndex || 0)) return;

    setDateModal({
      mode: 'drop',
      orderId,
      targetIndex,
      stepName: currentStepName(order) || targetStation.stepName
    });
  };

  const handleRestartOrder = (orderId, e) => {
    e.stopPropagation();
    if (window.confirm('Bu tamamlanmış iş emri tekrar üretime geri alınsın ve üzerinde işlem yapılsın mı?')) {
      const order = orders.find(o => o.id === orderId);
      const targetStep = order?.steps?.length ? Math.max(0, order.steps.length - 2) : 0;
      restartOrder(orderId, targetStep, 'Kullanıcı talebiyle üretim hattına geri alındı');
      setViewMode('active_pipeline');
    }
  };

  const isFiltered = searchTerm || filterClinic !== 'all' || filterPriority !== 'all' || filterMaterial !== 'all' || filterTechnician !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterClinic('all');
    setFilterPriority('all');
    setFilterMaterial('all');
    setFilterTechnician('all');
  };

  return (
    <div>
      {/* Üst Başlık ve Görünüm Değiştirici */}
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <h2 className="page-title">{isCompany ? 'İşlerimin Durumu' : 'Üretim İstasyonları'}</h2>
            <span className="page-count-badge">{activeOrders.length} Aktif Üretimde</span>
          </div>
          <p className="page-subtitle">
            {isCompany
              ? 'Kendi iş emirlerinizin hangi aşamada olduğunu ve teslim / prova tarihlerini buradan izleyin.'
              : (viewMode === 'active_pipeline'
              ? 'Kartları "Sonraki Aşamaya Geçir" butonuyla veya sürükleyip bırakarak hızlıca bir sonraki istasyona aktarın.'
              : 'Tamamlanan protez işleri arşivi. Dilediğiniz zaman "Yeniden Başlat" ile geri alabilirsiniz.')}
          </p>
        </div>

        <div className="page-header-actions">
          <div className="segmented-tabs">
            <button
              type="button"
              className={`btn-dental btn-dental-sm ${viewMode === 'active_pipeline' ? 'btn-dental-primary' : 'btn-dental-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setViewMode('active_pipeline')}
            >
              <Factory size={15} />
              <span>Üretim Hattı ({activeOrders.length})</span>
            </button>
            <button
              type="button"
              className={`btn-dental btn-dental-sm ${viewMode === 'completed_archive' ? 'btn-dental-primary' : 'btn-dental-secondary'}`}
              style={{ border: 'none', marginLeft: 4 }}
              onClick={() => setViewMode('completed_archive')}
            >
              <CheckCircle2 size={15} />
              <span>Tamamlananlar ({completedOrders.length})</span>
            </button>
          </div>

          <div className="page-header-extra-actions desktop-only" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-dental btn-dental-secondary"
              onClick={toggleExpandAll}
              title={areAllExpanded ? 'Tüm kartları kompakt görünüme al' : 'Tüm kartların detaylarını aç'}
            >
              <ChevronsUpDown size={15} color="var(--dental-blue)" />
              <span>{areAllExpanded ? 'Kutuları Sadeleştir' : 'Tüm Kutuları Aç'}</span>
            </button>

            {isAdmin && (
              <>
            <button
              type="button"
              className="btn-dental btn-dental-secondary"
              onClick={() => setIsTeamModalOpen(true)}
              title="Laboratuvar teknisyenlerini ve ekibi yönet"
            >
              <Users size={16} />
              <span>Ekip & Teknisyenler</span>
            </button>

            <button
              type="button"
              className="btn-dental btn-dental-primary"
              onClick={() => {
                setEditingOrder(null);
                setIsOrderModalOpen(true);
              }}
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Yeni İş Emri Başlat</span>
            </button>
              </>
            )}

            {isCompany && (
              <button
                type="button"
                className="btn-dental btn-dental-primary"
                onClick={() => {
                  setEditingOrder(null);
                  setIsOrderModalOpen(true);
                }}
              >
                <Plus size={17} strokeWidth={2.5} />
                <span>+ Yeni İş Emri Ver</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gelişmiş Filtreleme & Arama Araç Çubuğu (Kanban İçin) */}
      {viewMode === 'active_pipeline' && (
        <div className="kanban-toolbar">
          <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
            {/* Arama Kutusu */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Hasta adı, klinik, diş no veya iş emri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dental-input"
                style={{ width: '100%', paddingLeft: 34, paddingRight: searchTerm ? 32 : 12, fontSize: '0.84rem' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4
                  }}
                  title="Aramayı Temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobilde Filtreleri Aç/Kapa Butonu */}
            <button
              type="button"
              className={`btn-dental btn-dental-sm kanban-mobile-filter-toggle ${isFiltered ? 'btn-dental-primary' : 'btn-dental-secondary'}`}
              onClick={() => setShowMobileFilters(prev => !prev)}
            >
              <Filter size={15} />
              <span>Filtrele {isFiltered && '●'}</span>
            </button>
          </div>

          {/* İmplant / Diğer hızlı kategori sekmeleri */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
            <button
              type="button"
              className={`quick-chip-btn ${filterCategory === 'implant' ? 'active' : ''}`}
              onClick={() => setFilterCategory('implant')}
            >
              İmplant ({activeOrders.filter(o => o.materialId === 'implant').length})
            </button>
            <button
              type="button"
              className={`quick-chip-btn ${filterCategory === 'other' ? 'active' : ''}`}
              onClick={() => setFilterCategory('other')}
            >
              Diğer ({activeOrders.filter(o => o.materialId !== 'implant').length})
            </button>
          </div>

          {/* Filtre Seçicileri */}
          <div className={`kanban-filter-group ${showMobileFilters ? 'is-expanded' : ''}`}>
            {/* Klinik Filtresi */}
            {!isCompany && (
            <select
              value={filterClinic}
              onChange={(e) => setFilterClinic(e.target.value)}
              className="kanban-filter-select"
            >
              <option value="all">🏥 Tüm Klinikler ({companies.length})</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            )}

            {/* Öncelik Filtresi */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="kanban-filter-select"
            >
              <option value="all">⚡ Tüm Öncelikler</option>
              <option value="urgent">🔴 Acil (Vaka)</option>
              <option value="vip">⭐ VIP Özel</option>
              <option value="normal">🟢 Normal</option>
            </select>

            {/* Materyal Filtresi */}
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="kanban-filter-select"
            >
              <option value="all">🦷 Tüm Materyaller</option>
              {Object.values(materials).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Teknisyen Filtresi */}
            {!isCompany && (
            <select
              value={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.value)}
              className="kanban-filter-select"
            >
              <option value="all">👷 Tüm Teknisyenler</option>
              {technicians.map(t => (
                <option key={t} value={t.split(' ')[0]}>{t}</option>
              ))}
            </select>
            )}

            {/* Filtreleri Temizle */}
            {isFiltered && (
              <button
                type="button"
                className="btn-dental btn-dental-secondary btn-dental-sm"
                onClick={resetFilters}
                style={{ fontSize: '0.78rem', color: 'var(--status-urgent)' }}
              >
                <X size={14} />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isAdmin && viewMode === 'active_pipeline' && pendingOrders.length > 0 && (
        <div className="dental-card" style={{ marginBottom: 16, borderLeft: '4px solid var(--status-revision)' }}>
          <strong style={{ display: 'block', marginBottom: 10 }}>
            Onay bekleyen iş emirleri ({pendingOrders.length})
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingOrders.map(order => {
              const pat = patients.find(p => p.id === order.patientId);
              const comp = companies.find(c => c.id === order.companyId);
              return (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 8
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>#{order.id} • {pat?.name || 'Hasta'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {comp?.name || '-'} • {materials[order.materialId]?.name || order.materialId}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn-dental btn-dental-primary btn-dental-sm" onClick={() => openAdvanceModal(order, 'next')}>
                      Onayla
                    </button>
                    <button type="button" className="btn-dental btn-dental-danger btn-dental-sm" onClick={() => rejectOrder(order.id)}>
                      Reddet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MOBİL İSTASYON HIZLI GEÇİŞ SEKMELERİ (Kolay Tek Parmak Kullanımı) */}
      {viewMode === 'active_pipeline' && orders.length > 0 && (
        <div className="kanban-mobile-station-tabs">
          <button
            type="button"
            className={`kanban-station-tab-btn ${activeMobileStation === 'all' ? 'active' : ''}`}
            onClick={() => setActiveMobileStation('all')}
          >
            <span>🌟 Tümü ({filteredActiveOrders.length})</span>
          </button>
          {STATIONS.map(st => {
            const count = filteredActiveOrders.filter(o => currentStepName(o) === st.stepName).length;

            return (
              <button
                key={st.id}
                type="button"
                className={`kanban-station-tab-btn ${activeMobileStation === st.id ? 'active' : ''}`}
                onClick={() => setActiveMobileStation(st.id)}
              >
                <span>{st.title}</span>
                <span className={`station-tab-badge ${count > 0 ? 'has-jobs' : ''}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* SIFIR VERİ DURUMU (Tertemiz Sistem) */}
      {orders.length === 0 && (
        <div
          style={{
            padding: '60px 30px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            margin: '20px 0'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(2, 132, 199, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--dental-blue)'
            }}
          >
            <Factory size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
            {isCompany ? 'Henüz takip edilecek iş yok' : 'Üretim Hattında Henüz İş Emri Bulunmuyor'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto 20px' }}>
            {isCompany
              ? 'Kliniğinize ait iş emirleri laboratuvara düştüğünde aşamasını ve teslim tarihini burada görürsünüz.'
              : 'Sisteminiz tertemiz ve hazır. Sol menüden kliniklerinizi ve hekimlerinizi ekleyebilir, ardından yeni diş protez iş emirlerinizi başlatabilirsiniz.'}
          </p>
          {(isAdmin || isCompany) && (
          <button
            type="button"
            className="btn-dental btn-dental-primary"
            onClick={() => {
              setEditingOrder(null);
              setIsOrderModalOpen(true);
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>{isCompany ? '+ İlk İş Emrini Ver' : 'İlk İş Emrini Başlat'}</span>
          </button>
          )}
        </div>
      )}

      {/* GÖRÜNÜM 1: AKTİF ÜRETİM KANBAN İSTASYONLARI */}
      {viewMode === 'active_pipeline' && orders.length > 0 && (
        <div
          className={`kanban-board-container ${activeMobileStation !== 'all' ? 'has-single-station' : ''}`}
          style={{ '--kanban-cols': STATIONS.length }}
        >
          {(activeMobileStation === 'all' ? STATIONS : STATIONS.filter(s => s.id === activeMobileStation)).map(st => {
            // Bu istasyona uyan siparişler (Acil ve en yakın teslim tarihliler otomatik en üstte)
            const matchingOrders = filteredActiveOrders
              .filter(o => currentStepName(o) === st.stepName)
              .sort((a, b) => {
                if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
                if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
                if (a.priority === 'vip' && b.priority !== 'vip') return -1;
                if (b.priority === 'vip' && a.priority !== 'vip') return 1;
                return (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
              });

            return (
              <div
                key={st.id}
                className={`kanban-station-col ${activeMobileStation !== 'all' ? 'is-single-station' : ''} ${dragOverStationId === st.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, st.id)}
                onDragLeave={(e) => handleDragLeave(e, st.id)}
                onDrop={(e) => handleDrop(e, st)}
              >
                {/* İstasyon Başlığı */}
                <div className="kanban-station-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{st.title}</strong>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: matchingOrders.length > 0 ? 'var(--dental-blue)' : 'var(--bg-surface)',
                      color: matchingOrders.length > 0 ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {matchingOrders.length}
                  </span>
                </div>

                {/* Kartlar Akışı */}
                <div className="station-cards-flow">
                  {matchingOrders.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 10px',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(0,0,0,0.01)'
                      }}
                    >
                      Bu aşamada bekleyen iş yok
                      <div style={{ fontSize: '0.72rem', marginTop: 4, color: 'var(--text-muted)' }}>
                        (Kartları buraya sürükleyebilirsiniz)
                      </div>
                    </div>
                  ) : (
                    matchingOrders.map(order => {
                      const pat = patients.find(p => p.id === order.patientId);
                      const doc = doctors.find(d => d.id === order.doctorId);
                      const comp = companies.find(c => c.id === order.companyId);
                      const curStep = order.steps?.[order.currentStepIndex];
                      const totalSteps = order.steps?.length || 1;
                      const curIndex = order.currentStepIndex || 0;
                      const isLastStep = curIndex >= totalSteps - 1;
                      const isImplantLastStage = order.materialId === 'implant' && isLastStep;
                      const fromImplant = isOrderFromCompletedImplant(order);

                      const completedCount = (order.steps || []).filter(s => s.status === 'completed').length;
                      const pct = Math.round((completedCount / totalSteps) * 100);

                      // Öncelik Rozeti
                      const priorityConfig = {
                        urgent: { label: '🔴 ACİL', color: 'var(--status-urgent)', bg: 'var(--status-urgent-bg)' },
                        vip: { label: '⭐ VIP', color: 'var(--status-revision)', bg: 'var(--status-revision-bg)' },
                        normal: { label: 'Normal', color: 'var(--dental-blue)', bg: 'var(--status-inprogress-bg)' }
                      }[order.priority || 'normal'];

                      const isExpanded = !!expandedCardIds[order.id];

                      return (
                        <div
                          key={order.id}
                          className={`job-card ${isExpanded ? 'is-expanded' : ''}`}
                          data-priority={order.priority}
                          draggable={!readOnly}
                          onDragStart={(e) => handleDragStart(e, order.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => toggleCardExpand(order.id, e)}
                          title="Tıklayarak detayları ve işlemleri açın/kapatın"
                        >
                          {/* Üst Satır: Sipariş No + Öncelik + Hasta Adı + Materyal/Renk */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 800, color: 'var(--dental-blue)' }}>
                                  #{order.id}
                                </span>
                                {order.priority !== 'normal' && (
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      color: priorityConfig.color,
                                      background: priorityConfig.bg
                                    }}
                                  >
                                    {priorityConfig.label}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'var(--bg-surface-elevated)',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  {materials[order.materialId]?.name?.split(' ')[0] || order.materialId} • {order.shade}
                                </span>
                                {fromImplant && (
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      color: 'var(--status-completed)',
                                      background: 'var(--status-completed-bg)'
                                    }}
                                  >
                                    İmplant tamamlandı
                                  </span>
                                )}
                                {order.stlFiles && order.stlFiles.length > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      color: 'var(--dental-blue)',
                                      background: 'var(--status-inprogress-bg)'
                                    }}
                                    title={`${order.stlFiles.length} STL dosyası yüklü`}
                                  >
                                    📦 {order.stlFiles.length} STL
                                  </span>
                                )}
                              </div>

                              {/* Hasta Adı */}
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {pat?.name || 'İsimsiz Hasta'}
                              </div>
                            </div>

                            {/* Sağ Üst: Hızlı İlerletme & Genişletme İkonu */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {!isExpanded && !readOnly && (
                                <button
                                  type="button"
                                  className="job-regress-btn"
                                  style={{ width: 26, height: 26, minHeight: 'unset', padding: 0, borderRadius: 6, background: 'rgba(2, 132, 199, 0.08)', color: 'var(--dental-blue)', border: 'none' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isImplantLastStage) {
                                      setExpandedCardIds(prev => ({ ...prev, [order.id]: true }));
                                      return;
                                    }
                                    openAdvanceModal(order, 'next');
                                  }}
                                  title={isImplantLastStage ? 'Son etap: Bitir veya MDP ye geç' : (isLastStep ? 'İşi Bitir' : 'Sonraki Aşamaya İlerlet')}
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                </button>
                              )}
                              <div className="card-expand-indicator" style={{ padding: 2 }}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </div>

                          {/* Orta Satır (Kompakt Bilgi): Klinik Adı & Mevcut Aşama Yüzdesi */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                              🏥 {comp?.name ? comp.name.replace(' Ağız ve Diş Sağlığı', '') : '-'}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--dental-blue)', fontSize: '0.72rem' }}>
                              %{pct} ({curIndex + 1}/{totalSteps})
                            </span>
                          </div>

                          <div
                            style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>📅 Teslim</span>
                              <strong style={{ fontSize: '0.78rem' }}>{formatCardDate(order.deliveryDate)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>🦷 Prova</span>
                              <strong style={{ fontSize: '0.78rem' }}>{formatCardDate(order.trialDate)}</strong>
                            </div>
                            {(order.steps || []).filter(s => s.completedDate).slice(-1).map(s => (
                              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>✓ {s.name}</span>
                                <strong style={{ fontSize: '0.78rem' }}>{formatCardDate(s.completedDate)}</strong>
                              </div>
                            ))}
                          </div>

                          {/* İnce Şık İlerleme Çubuğu */}
                          <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 999, overflow: 'hidden', marginTop: 5 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--dental-blue), var(--dental-teal))' }} />
                          </div>

                          {/* TIKLANINCA AÇILAN ZENGİN DETAY ÇEKMECESİ */}
                          {isExpanded && (
                            <div className="job-card-details-drawer" onClick={(e) => e.stopPropagation()}>
                              {/* 1. Diş Numaraları ve Hekim */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>🦷 FDI Dişler:</span>
                                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {(order.teeth || []).join(', ') || 'Tüm Çene'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>👨‍⚕️ Sorumlu Hekim:</span>
                                  <span style={{ fontWeight: 600 }}>{doc?.name || '-'}</span>
                                </div>

                                {order.stlFiles && order.stlFiles.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>📦 3D Tarama:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--dental-teal)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.stlFiles.map(f => f.name).join(', ')}>
                                      {order.stlFiles.length} STL ({order.stlFiles.map(f => f.name).join(', ')})
                                    </span>
                                  </div>
                                )}

                                {/* Sorumlu Teknisyen Seçimi */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={12} color="var(--dental-blue)" /> Teknisyen:
                                  </span>
                                  {readOnly ? (
                                    <span style={{ fontWeight: 600 }}>{curStep?.technician || 'Atanmamış'}</span>
                                  ) : (
                                  <select
                                    value={curStep?.technician || ''}
                                    onChange={(e) => assignTechnicianToStep(order.id, curIndex, e.target.value)}
                                    title="Sorumlu Teknisyeni Değiştir"
                                    style={{
                                      background: 'var(--bg-surface-elevated)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 4,
                                      fontSize: '0.72rem',
                                      padding: '2px 6px',
                                      color: 'var(--text-primary)',
                                      cursor: 'pointer',
                                      maxWidth: 130,
                                      outline: 'none'
                                    }}
                                  >
                                    <option value="">Teknisyen Seç</option>
                                    {technicians.map(t => (
                                      <option key={t} value={t}>{t.split(' ')[0]}</option>
                                    ))}
                                  </select>
                                  )}
                                </div>

                                {order.notes && (
                                  <div style={{ marginTop: 4, padding: '6px 8px', background: 'var(--bg-surface-elevated)', borderRadius: 4, fontSize: '0.74rem', borderLeft: '2px solid var(--dental-blue)' }}>
                                    📝 {order.notes}
                                  </div>
                                )}
                              </div>

                              {!readOnly && (
                              <div className="job-card-actions" style={{ marginTop: 10, paddingTop: 8, flexWrap: 'wrap' }}>
                                {curIndex > 0 && (
                                  <button
                                    type="button"
                                    className="job-regress-btn"
                                    onClick={() => regressOrderToPrevStep(order.id)}
                                    title="Bir önceki istasyona geri al"
                                  >
                                    <ArrowLeft size={13} />
                                  </button>
                                )}

                                {isImplantLastStage ? (
                                  <>
                                    <button
                                      type="button"
                                      className="job-advance-btn"
                                      onClick={() => openAdvanceModal(order, 'next')}
                                      title="İmplantı bitir ve arşive aktar"
                                    >
                                      <span>✓ Bitir</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="job-advance-btn job-porcelain-btn"
                                      onClick={() => openAdvanceModal(order, 'toMdp')}
                                      title="İmplantı bitir ve MDP iş emri aç"
                                    >
                                      <span>MDP'ye geç</span>
                                      <ArrowRight size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="job-advance-btn"
                                    onClick={() => openAdvanceModal(order, 'next')}
                                    title={isLastStep ? 'Bu işi bitir ve arşive aktar' : 'Sonraki üretim istasyonuna aktar'}
                                  >
                                    <span>{currentStepName(order) === 'Onay' ? '✓ Onayla' : (isLastStep ? '✓ İşi Bitir' : '✓ İlerlet')}</span>
                                    <ArrowRight size={13} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn-dental btn-dental-secondary"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  onClick={() => setInfoModalOrder(order)}
                                  title="Bu istasyonun rehberini ve talimatlarını gör"
                                >
                                  <Info size={12} />
                                  <span>Rehber</span>
                                </button>
                              </div>
                              )}
                              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                {readOnly && (
                                  <button
                                    type="button"
                                    className="btn-dental btn-dental-secondary"
                                    style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                    onClick={() => setInfoModalOrder(order)}
                                    title="Bu istasyonun rehberini ve talimatlarını gör"
                                  >
                                    <Info size={12} />
                                    <span>Rehber</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-dental btn-dental-secondary"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  onClick={() => navigate('/orders/' + order.id)}
                                  title="Tam Sipariş ve Aşama Sayfasına Git"
                                >
                                  <ExternalLink size={12} />
                                  {readOnly && <span>Detay</span>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GÖRÜNÜM 2: TAMAMLANANLAR ARŞİVİ (YENİDEN BAŞLATMA VE DÜZENLEME) */}
      {viewMode === 'completed_archive' && (
        <div>
          <div style={{ padding: '14px 18px', background: 'var(--status-completed-bg)', border: '1px solid var(--status-completed)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={20} color="var(--status-completed)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {isCompany
                  ? 'Tamamlanan iş emirleriniz burada arşivlenir. Hasta, hekim, teslim tarihi ve aşama bilgilerini görüntüleyebilirsiniz.'
                  : <>Tamamlanan protez işleri üretim hattında kalabalık yaratmaması için burada arşivlenir. Kliniğin revizyon veya ilave isteğinde <strong style={{ color: 'var(--dental-blue)' }}>"İşlemi Yeniden Başlat"</strong> butonuyla hemen üretim hattına geri alabilirsiniz.</>}
              </span>
            </div>
          </div>

          <div className="entity-card-grid">
            {completedOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                Henüz tamamlanmış iş emri bulunmuyor.
              </div>
            ) : (
              completedOrders.map(order => {
                const pat = patients.find(p => p.id === order.patientId);
                const doc = doctors.find(d => d.id === order.doctorId);
                const comp = companies.find(c => c.id === order.companyId);

                const isExpanded = !!expandedCardIds[order.id];

                return (
                  <div
                    key={order.id}
                    className={`dental-card ${isExpanded ? 'is-expanded' : ''}`}
                    style={{
                      borderLeft: '4px solid var(--status-completed)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: isExpanded ? '16px' : '12px 16px'
                    }}
                    onClick={() => toggleCardExpand(order.id)}
                    title="Tıklayarak detayları açın / kapatın"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--status-completed)', fontSize: '0.85rem' }}>
                          #{order.id}
                        </span>
                        <span className="badge-pill badge-completed" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                          Tamamlandı ✓
                        </span>
                        {isOrderFromCompletedImplant(order) && (
                          <span className="badge-pill badge-completed" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                            İmplant tamamlandı
                          </span>
                        )}
                      </div>
                      <div className="card-expand-indicator">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {pat?.name || 'İsimsiz Hasta'}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      🏥 {comp?.name || '-'} {doc?.name ? `• ${doc.name}` : ''}
                    </div>

                    {/* Tıklanınca Açılan Detaylar */}
                    {isExpanded && (
                      <div className="job-card-details-drawer" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className="badge-pill" style={{ background: 'var(--bg-surface-elevated)', fontSize: '0.74rem' }}>
                            Materyal: {order.materialId}
                          </span>
                          <span className="badge-pill" style={{ background: '#e0f2fe', color: '#0284c7', fontWeight: 700, fontSize: '0.74rem' }}>
                            VITA: {order.shade}
                          </span>
                          <span className="badge-pill" style={{ background: 'var(--bg-surface-elevated)', fontFamily: 'JetBrains Mono', fontSize: '0.74rem' }}>
                            Dişler: {(order.teeth || []).join(', ')}
                          </span>
                        </div>

                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📅 Teslim:</span>
                          <strong style={{ fontSize: '0.82rem' }}>{formatCardDate(order.deliveryDate)}</strong>
                        </div>

                        {order.notes && (
                          <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--bg-surface-elevated)', borderRadius: 4, fontSize: '0.74rem', borderLeft: '2px solid var(--status-completed)' }}>
                            📝 {order.notes}
                          </div>
                        )}

                        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
                          {!readOnly && (
                          <button
                            type="button"
                            className="btn-dental btn-dental-primary btn-dental-sm"
                            style={{ flex: 1, background: 'linear-gradient(135deg, var(--dental-teal), var(--dental-blue))' }}
                            onClick={(e) => handleRestartOrder(order.id, e)}
                            title="Bu işlemi tekrar aktif üretim hattına al"
                          >
                            <RotateCcw size={14} />
                            <span>Üretime Geri Al & Yeniden Başlat</span>
                          </button>
                          )}

                          <button
                            type="button"
                            className="btn-dental btn-dental-secondary btn-dental-sm"
                            onClick={() => navigate('/orders/' + order.id)}
                          >
                            <span>{readOnly ? 'Detay' : 'Detay & Düzenle'}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* İŞLEM HAKKINDA MODALI (Kanban Kartından 1-Tıkla Açılan Detaylı Rehber) */}
      {infoModalOrder && (() => {
        const o = infoModalOrder;
        const pat = patients.find(p => p.id === o.patientId);
        const doc = doctors.find(d => d.id === o.doctorId);
        const comp = companies.find(c => c.id === o.companyId);
        const curIdx = o.currentStepIndex || 0;
        const curStep = o.steps?.[curIdx] || {};
        const mat = materials[o.materialId] || { name: o.materialId, color: '#0284c7' };

        return (
          <div className="modal-overlay" onClick={() => setInfoModalOrder(null)}>
            <div
              className="modal-dialog-box"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Başlığı */}
              <div className="modal-dialog-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: 'var(--dental-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Info size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      İş Emri #{o.id} • İşlem Hakkında
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {pat?.name || 'Hasta'} • {comp?.name || 'Klinik'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setInfoModalOrder(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal İçeriği */}
              <div className="modal-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Şu Anki İstasyon Bilgisi */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(6, 182, 212, 0.12))',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--dental-blue)', letterSpacing: '0.04em' }}>
                    Mevcut İstasyon ({curIdx + 1} / {(o.steps || []).length}):
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: 'var(--text-primary)' }}>
                    {curStep.name || 'İşlem İstasyonu'}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                    {curStep.description || 'Bu istasyonda uygulanacak özel teknik talimat girilmemiş.'}
                  </div>
                </div>

                {/* Sorumlu Teknisyen & Süre */}
                <div className="form-grid-2" style={{ marginBottom: 0 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sorumlu Teknisyen:</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      👤 {curStep.technician || 'Atanmadı'}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Nihai Teslim Tarihi:</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{formatCardDate(o.deliveryDate)}</div>
                  </div>
                </div>

                {/* Diş & Materyal Detayları */}
                <div style={{ padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Restorasyon & Malzeme:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge-pill ${mat.badgeClass || ''}`} style={{ fontSize: '0.78rem' }}>
                      {mat.name}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', background: 'var(--status-completed-bg)', color: 'var(--status-completed)', borderRadius: 4 }}>
                      VITA Renk: {o.shade || 'A2'}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', fontWeight: 700, padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                      Diş No: {(o.teeth || []).join(', ') || '-'}
                    </span>
                  </div>
                </div>

                {/* Hekim / Sipariş Notları */}
                {o.notes && (
                  <div style={{ padding: '10px 12px', background: 'var(--status-revision-bg)', border: '1px solid var(--status-revision)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-revision)', marginBottom: 2 }}>
                      ⚠️ Hekim / Sipariş Notu:
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {o.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Altı */}
              <div className="modal-dialog-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn-dental btn-dental-primary"
                  onClick={() => {
                    navigate('/orders/' + o.id);
                    setInfoModalOrder(null);
                  }}
                >
                  <span>Tüm Reçeteyi & Detayları Aç</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  className="btn-dental btn-dental-secondary"
                  onClick={() => setInfoModalOrder(null)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {dateModal && (
        <StepDateModal
          title={dateModal.mode === 'toMdp' ? 'MDP işine geç' : (dateModal.stepName === 'Onay' ? 'İş emrini onayla' : 'Aşama tarihi')}
          subtitle={
            dateModal.mode === 'toMdp'
              ? 'İmplant tamamlanma tarihini seçin. Yeni MDP işi Diğer hattında görünecek.'
              : `"${dateModal.stepName || 'Bu aşama'}" için tarihi girin.`
          }
          confirmLabel={dateModal.mode === 'toMdp' ? 'MDP ye geç' : (dateModal.stepName === 'Onay' ? 'Onayla ve başlat' : 'Kaydet ve ilerle')}
          onConfirm={confirmAdvance}
          onCancel={() => setDateModal(null)}
        />
      )}
    </div>
  );
};
