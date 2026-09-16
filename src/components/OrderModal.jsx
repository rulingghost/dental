import React, { useState, useEffect, useRef } from 'react';
import { useDental, inferPipelineTypeId } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import { Odontogram } from './Odontogram';
import { X, Sparkles, UserPlus, Calendar, Clock, DollarSign, Paperclip, Box, UploadCloud, Loader2, Building2, Stethoscope } from 'lucide-react';
import { uploadStlToSupabase } from '../services/supabaseService';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const OrderModal = () => {
  const {
    isOrderModalOpen,
    setIsOrderModalOpen,
    companies,
    doctors,
    patients,
    materials,
    vitaShades,
    technicians,
    pipelineTypes,
    setIsTeamModalOpen,
    saveOrder,
    saveDoctor,
    savePatient,
    showToast,
    editingOrder,
    setEditingOrder
  } = useDental();
  const { currentUser, isAdmin, isOperator, isCompany } = useAuth();

  const [companyId, setCompanyId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [isNewDoctor, setIsNewDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [assignedTech, setAssignedTech] = useState('');

  const [materialId, setMaterialId] = useState('mdp');
  const [shade, setShade] = useState('A2');
  const [priority, setPriority] = useState('normal');
  const [trialDate, setTrialDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [price, setPrice] = useState(3500);
  const [notes, setNotes] = useState('');
  const [selectedTeeth, setSelectedTeeth] = useState(['11', '21']);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedQuickDays, setSelectedQuickDays] = useState(5);
  const fileInputRef = useRef(null);

  // Akıllı Varsayılanlar & Tarihler
  useEffect(() => {
    if (isOrderModalOpen) {
      if (editingOrder) {
        setCompanyId(editingOrder.companyId || (isCompany && currentUser?.companyId ? String(currentUser.companyId) : ''));
        setDoctorId(editingOrder.doctorId || '');
        setIsNewDoctor(false);
        setNewDoctorName('');
        setPatientId(editingOrder.patientId || '');
        setIsNewPatient(false);
        setNewPatientName('');
        setAssignedTech(editingOrder.steps?.[0]?.technician || '');
        setMaterialId(editingOrder.materialId === 'porcelain' ? 'mdp' : (editingOrder.materialId || 'mdp'));
        setShade(editingOrder.shade || 'A2');
        setPriority(editingOrder.priority || 'normal');
        setTrialDate(editingOrder.trialDate || '');
        setDeliveryDate(editingOrder.deliveryDate || '');
        setPrice(editingOrder.price || 0);
        setNotes(editingOrder.notes || '');
        setSelectedTeeth(editingOrder.teeth || []);
        setAttachedFiles(editingOrder.stlFiles || []);
        setSelectedQuickDays(null);
        return;
      }

      const today = new Date();
      const trial = new Date(today);
      trial.setDate(today.getDate() + 3);
      const delivery = new Date(today);
      delivery.setDate(today.getDate() + 5);
      setTrialDate(trial.toISOString().split('T')[0]);
      setDeliveryDate(delivery.toISOString().split('T')[0]);
      setSelectedQuickDays(5);
      setMaterialId('mdp');
      setAttachedFiles([]);
      setIsNewDoctor(false);
      setNewDoctorName('');
      setIsNewPatient(false);
      setNewPatientName('');

      // Firma kullanıcısı ise firma doğrudan sabit seçilir
      if (isCompany && currentUser?.companyId) {
        const myCid = String(currentUser.companyId);
        setCompanyId(myCid);
        const compDocs = doctors.filter(d => String(d.companyId) === myCid);
        if (compDocs.length > 0) {
          setDoctorId(compDocs[0].id);
          const docPats = patients.filter(p => String(p.doctorId) === String(compDocs[0].id));
          if (docPats.length > 0) {
            setPatientId(docPats[0].id);
          } else {
            setPatientId('');
          }
        } else {
          setDoctorId('');
          setPatientId('');
        }
      } else if (!companyId && companies.length > 0) {
        // İlk firma ve doktoru otomatik seç (Boş bekleme süresini sıfırla)
        const firstComp = companies[0];
        setCompanyId(firstComp.id);
        const compDocs = doctors.filter(d => String(d.companyId) === String(firstComp.id));
        if (compDocs.length > 0) {
          setDoctorId(compDocs[0].id);
          const docPats = patients.filter(p => String(p.doctorId) === String(compDocs[0].id));
          if (docPats.length > 0) {
            setPatientId(docPats[0].id);
          }
        }
      }
    }
  }, [isOrderModalOpen, editingOrder, companies, doctors, patients, isCompany, currentUser]);

  // Diş sayısı değiştikçe bedel önerisi
  useEffect(() => {
    const count = selectedTeeth.length || 1;
    setPrice(count * 1750);
  }, [selectedTeeth]);

  if (!isOrderModalOpen) return null;

  const filteredDoctors = doctors.filter(d => !companyId || d.companyId === companyId);
  const filteredPatients = patients.filter(p => !doctorId || p.doctorId === doctorId);

  // Hızlı teslim tarihi ayarlayıcı
  const setQuickDeadline = (days) => {
    setSelectedQuickDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeliveryDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeCompanyId = isCompany ? String(currentUser?.companyId || companyId) : companyId;
    if (!activeCompanyId) {
      alert('Lütfen bir Klinik seçin.');
      return;
    }

    let finalDoctorId = doctorId;
    if (isNewDoctor || (filteredDoctors.length === 0 && !doctorId)) {
      if (!newDoctorName.trim()) {
        alert('Lütfen hekim adını girin.');
        return;
      }
      const savedDoc = await saveDoctor({
        companyId: activeCompanyId,
        name: newDoctorName.trim(),
        specialty: 'Diş Hekimi'
      });
      finalDoctorId = savedDoc.id;
    } else if (!doctorId) {
      alert('Lütfen listeden bir hekim seçin veya "+ Yeni Hekim Yaz" butonuna basıp adını girin.');
      return;
    }

    let finalPatientId = patientId;

    // Hızlı Hasta Ekleme (Hasta sayfasına gitmeye üşenilmesin)
    if (isNewPatient || (filteredPatients.length === 0 && !patientId)) {
      if (!newPatientName.trim()) {
        alert('Lütfen hasta adını girin.');
        return;
      }
      const saved = await savePatient({
        companyId: activeCompanyId,
        doctorId: finalDoctorId,
        name: newPatientName.trim(),
        chartNumber: 'PRT-' + Math.floor(1000 + Math.random() * 9000),
        age: 35,
        gender: 'Belirtilmedi'
      });
      finalPatientId = saved.id;
    } else if (!patientId) {
      alert('Lütfen listeden bir hasta seçin veya "+ Yeni Hasta" butonuna basıp adını yazın.');
      return;
    }

    // Varsa yeni STL dosyalarını Supabase Storage'a yükle
    let finalStlFiles = [];
    if (attachedFiles && attachedFiles.length > 0) {
      setIsUploadingFiles(true);
      for (const item of attachedFiles) {
        if (item.rawFile) {
          try {
            showToast(`${item.name} yükleniyor...`, 'info');
            const uploaded = await uploadStlToSupabase(item.rawFile, editingOrder?.id);
            finalStlFiles.push(uploaded);
          } catch (err) {
            console.error('File upload error:', err);
            showToast(`${item.name} yüklenirken hata: ${err.message}`, 'error');
          }
        } else {
          finalStlFiles.push(item);
        }
      }
      setIsUploadingFiles(false);
    }

    const template = materials[materialId] || materials.mdp;
    const needsApproval = !isAdmin;
    const keepSteps = editingOrder && editingOrder.materialId === materialId && Array.isArray(editingOrder.steps);
    const now = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    const steps = keepSteps
      ? editingOrder.steps
      : template.steps.map((s, idx) => {
          if (needsApproval) {
            return {
              order: s.order,
              name: s.name,
              description: s.description,
              status: idx === 0 ? 'in_progress' : 'pending',
              technician: assignedTech || s.defaultTechnician || (technicians && technicians[0]) || 'Yusuf Usta',
              startedAt: idx === 0 ? now : null,
              notes: ''
            };
          }
          return {
            order: s.order,
            name: s.name,
            description: s.description,
            status: idx === 0 ? 'completed' : (idx === 1 ? 'in_progress' : 'pending'),
            technician: assignedTech || s.defaultTechnician || (technicians && technicians[0]) || 'Yusuf Usta',
            startedAt: idx === 1 ? now : null,
            completedAt: idx === 0 ? now : null,
            completedDate: idx === 0 ? new Date().toISOString().split('T')[0] : null,
            notes: ''
          };
        });

    const saved = await saveOrder({
      ...(editingOrder || {}),
      companyId: activeCompanyId,
      doctorId: finalDoctorId,
      patientId: finalPatientId,
      materialId,
      teeth: selectedTeeth,
      shade,
      priority,
      status: needsApproval ? 'pending_approval' : (editingOrder?.status || 'in_progress'),
      createdBy: editingOrder?.createdBy || currentUser?.id,
      orderDate: editingOrder?.orderDate || new Date().toISOString().split('T')[0],
      trialDate,
      deliveryDate,
      price: parseFloat(price) || 0,
      notes,
      currentStepIndex: keepSteps ? (editingOrder?.currentStepIndex || 0) : (needsApproval ? 0 : 1),
      steps,
      stlFiles: finalStlFiles
    });

    if (!saved) return;

    setIsOrderModalOpen(false);
    setEditingOrder(null);
    showToast(
      needsApproval
        ? (editingOrder ? 'İş emri güncellendi. Yönetici onayı bekleniyor.' : 'İş emri laboratuvara iletildi. Yönetici onayından sonra üretim başlayacak.')
        : 'İş emri başarıyla başlatıldı ve üretim hattına alındı ✓',
      'success'
    );
  };

  const closeModal = () => {
    setAttachedFiles([]);
    setIsOrderModalOpen(false);
    setEditingOrder(null);
  };

  const handlePickFiles = (e) => {
    const picked = Array.from(e.target?.files || []);
    if (!picked.length) return;
    setAttachedFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      const next = [...prev];
      picked.forEach(file => {
        if (!names.has(file.name)) {
          next.push({
            rawFile: file,
            name: file.name,
            size: file.size,
            isNew: true
          });
        }
      });
      return next;
    });
    if (e.target) e.target.value = '';
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--status-inprogress-bg)', color: 'var(--dental-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingOrder ? 'İş Emrini Düzenle' : (isCompany ? 'Yeni Laboratuvar İş Emri Ver' : 'Yeni Diş Protez İş Emri')}
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {editingOrder
                  ? 'Onaylanana kadar bilgileri güncelleyebilirsiniz'
                  : (isCompany
                    ? 'İş emriniz doğrudan laboratuvar yönetici onayına iletilecektir'
                    : 'Hızlı seçim tuşları ile saniyeler içinde başlatın')}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-dental btn-dental-secondary"
            style={{ padding: 6, borderRadius: '50%' }}
            onClick={closeModal}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-dialog-body">
            <div className="dental-form-grid">
              {/* Klinik */}
              <div className="form-item">
                <label>Müşteri Klinik / Firma *</label>
                {isCompany ? (
                  <div
                    className="dental-input"
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: 'var(--dental-blue)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} />
                      <span>{companies.find(c => String(c.id) === String(currentUser?.companyId))?.name || currentUser?.name || 'Kliniğiniz'}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Sabit Firma)</span>
                  </div>
                ) : (
                  <select
                    className="dental-input"
                    value={companyId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setCompanyId(cid);
                      const docs = doctors.filter(d => String(d.companyId) === String(cid));
                      setDoctorId(docs[0]?.id || '');
                      setPatientId('');
                    }}
                    required
                  >
                    <option value="">Klinik Seçin...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Hekim (Hızlı Yeni Hekim Ekleme Desteği) */}
              <div className="form-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <label>Hekim / Doktor *</label>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--dental-blue)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onClick={() => setIsNewDoctor(!isNewDoctor)}
                  >
                    <Stethoscope size={13} />
                    <span>{isNewDoctor ? 'Kayıtlılardan Seç' : '+ Yeni Hekim Yaz'}</span>
                  </button>
                </div>

                {isNewDoctor || (filteredDoctors.length === 0 && !doctorId) ? (
                  <input
                    type="text"
                    className="dental-input"
                    placeholder="Örn: Dr. Ahmet Yılmaz"
                    value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    autoFocus={isNewDoctor}
                    required
                  />
                ) : (
                  <select
                    className="dental-input"
                    value={doctorId}
                    onChange={(e) => {
                      setDoctorId(e.target.value);
                      setPatientId('');
                    }}
                    required
                  >
                    <option value="">Hekim Seçin...</option>
                    {filteredDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty || 'Hekim'})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Hasta (Hızlı Yeni Hasta Ekleme Desteği) */}
              <div className="form-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <label>Hasta Adı *</label>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--dental-blue)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onClick={() => setIsNewPatient(!isNewPatient)}
                  >
                    <UserPlus size={13} />
                    <span>{isNewPatient ? 'Kayıtlılardan Seç' : '+ Yeni Hasta Adı Yaz'}</span>
                  </button>
                </div>

                {isNewPatient || (filteredPatients.length === 0 && !patientId) ? (
                  <input
                    type="text"
                    className="dental-input"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    autoFocus={isNewPatient}
                    required
                  />
                ) : (
                  <select
                    className="dental-input"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required
                  >
                    <option value="">Hasta Seçin...</option>
                    {filteredPatients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (#{p.chartNumber})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Materyal */}
              <div className="form-item">
                <label>Restorasyon / Materyal *</label>
                <select
                  className="dental-input"
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  required
                >
                  {Object.values(materials).filter(m => m && m.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {materials[materialId] && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    {(pipelineTypes?.[inferPipelineTypeId(materials[materialId])]?.name) || 'Diğer'} hattı
                    {' • '}
                    {materials[materialId].steps?.length || 0} üretim etabı
                  </span>
                )}
              </div>

              {/* VITA Rengi */}
              <div className="form-item">
                <label>VITA Diş Rengi *</label>
                <select
                  className="dental-input"
                  value={shade}
                  onChange={(e) => setShade(e.target.value)}
                  required
                >
                  {vitaShades.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Öncelik / Aciliyet */}
              <div className="form-item">
                <label>Aciliyet Seviyesi</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {[
                    { id: 'normal', label: '🟢 Normal' },
                    { id: 'urgent', label: '🔴 Acil (Vaka)' },
                    { id: 'vip', label: '⭐ VIP' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`quick-segmented-btn ${priority === p.id ? 'active' : ''}`}
                      onClick={() => setPriority(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorumlu Teknisyen Seçimi - Laboratuvar personeli için, firma kullanıcısına gösterilmez */}
              {!isCompany && (
                <div className="form-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Sorumlu Teknisyen</label>
                    {isAdmin && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--dental-blue)', fontSize: '0.74rem', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        if (setIsTeamModalOpen) setIsTeamModalOpen(true);
                      }}
                    >
                      + Ekip Yönetimi
                    </button>
                    )}
                  </div>
                  <select
                    className="dental-input"
                    value={assignedTech}
                    onChange={(e) => setAssignedTech(e.target.value)}
                  >
                    <option value="">Varsayılan İstasyon Teknisyeni</option>
                    {(technicians || []).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Teslim Tarihi ve Hızlı Gün Seçicileri */}
              <div className="form-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Teslim Tarihi *</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className={`quick-micro-btn ${selectedQuickDays === 2 ? 'active' : ''}`} onClick={() => setQuickDeadline(2)}>+2 Gün</button>
                    <button type="button" className={`quick-micro-btn ${selectedQuickDays === 4 ? 'active' : ''}`} onClick={() => setQuickDeadline(4)}>+4 Gün</button>
                    <button type="button" className={`quick-micro-btn ${selectedQuickDays === 5 ? 'active' : ''}`} onClick={() => setQuickDeadline(5)}>+5 Gün</button>
                    <button type="button" className={`quick-micro-btn ${selectedQuickDays === 7 ? 'active' : ''}`} onClick={() => setQuickDeadline(7)}>+7 Gün</button>
                  </div>
                </div>
                <input
                  type="date"
                  className="dental-input"
                  value={deliveryDate}
                  onChange={(e) => {
                    setDeliveryDate(e.target.value);
                    setSelectedQuickDays(null);
                  }}
                  required
                />
              </div>

              {/* Bedel */}
              <div className="form-item">
                <label>İşlem Bedeli (₺)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="dental-input"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="100"
                    style={{ width: '100%' }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    ({selectedTeeth.length} Diş)
                  </span>
                </div>
              </div>

              {/* Hekim Özel Talimatı */}
              <div className="form-item span-all">
                <label>Hekim / Klinik Laboratuvar Notu</label>
                <textarea
                  className="dental-input"
                  rows={2}
                  placeholder="Örn: 11 ve 21 nolu dişlerde insizal transparanlık yüksek tutulsun..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="form-item span-all">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                    <Box size={16} style={{ color: 'var(--dental-blue)' }} />
                    <span>3D STL & Dijital Tarama Dosyaları</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Supabase Bulut Depolama (.stl)
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.STL"
                  multiple
                  onChange={handlePickFiles}
                  style={{ display: 'none' }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handlePickFiles({ target: { files: e.dataTransfer.files } });
                    }
                  }}
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-surface-elevated)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--status-inprogress-bg)', color: 'var(--dental-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={20} />
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    STL Dosyalarını Seçin veya Sürükleyip Bırakın
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Üst çene, alt çene, kapanış taramaları • .stl formatı desteklenir
                  </div>
                </div>

                {attachedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={file.id || file.name || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '8px 12px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                          <Box size={16} style={{ color: 'var(--dental-teal)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {file.name}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            ({formatBytes(file.size)})
                          </span>
                          {file.url ? (
                            <span className="badge-pill badge-completed" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              Yüklendi ✓
                            </span>
                          ) : (
                            <span className="badge-pill" style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'var(--status-inprogress-bg)', color: 'var(--dental-blue)' }}>
                              Kaydedince Yüklenecek
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-dental btn-dental-secondary btn-dental-sm"
                          style={{ padding: '4px 6px', color: 'var(--status-urgent)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedFiles(prev => prev.filter(f => (f.id ? f.id !== file.id : f.name !== file.name)));
                          }}
                          title="Listeden Kaldır"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* İNTERAKTİF DİŞ ŞEMASI & HIZLI ŞABLONLAR */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  İşlem Yapılacak Dişler ({selectedTeeth.length} Diş Seçili):
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button type="button" className="quick-micro-btn" onClick={() => setSelectedTeeth(['11', '21'])}>11 - 21</button>
                  <button type="button" className="quick-micro-btn" onClick={() => setSelectedTeeth(['13', '12', '11', '21', '22', '23'])}>Ön 6 Diş</button>
                  <button type="button" className="quick-micro-btn" onClick={() => setSelectedTeeth(['12', '11', '21', '22'])}>Üst Ön 4</button>
                  <button type="button" className="quick-micro-btn" onClick={() => setSelectedTeeth(['33', '32', '31', '41', '42', '43'])}>Alt Ön</button>
                </div>
              </div>
              <Odontogram
                selectedTeeth={selectedTeeth}
                onChange={setSelectedTeeth}
              />
            </div>
          </div>

          <div className="modal-dialog-footer">
            <button
              type="button"
              className="btn-dental btn-dental-secondary"
              onClick={closeModal}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="btn-dental btn-dental-primary"
              disabled={isUploadingFiles}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {isUploadingFiles ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Dosyalar Yükleniyor...</span>
                </>
              ) : (
                editingOrder ? '✓ Değişiklikleri Kaydet' : (isCompany ? '✓ İş Emrini Onaya Gönder' : '✓ İş Emrini Hemen Başlat')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

