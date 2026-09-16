import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDental } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  User,
  Building2,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';

export const CalendarQuickDetailDrawer = ({
  order,
  eventType = 'delivery',
  onClose = () => {}
}) => {
  const {
    companies,
    doctors,
    patients,
    materials,
    updateOrderDates,
    advanceOrderToNextStep
  } = useDental();
  const { isAdmin, isCompany } = useAuth();

  const [deliveryDate, setDeliveryDate] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (order) {
      setDeliveryDate(order.deliveryDate || '');
      setTrialDate(order.trialDate || '');
      setSavedSuccess(false);
    }
  }, [order]);

  if (!order) return null;

  const patient = patients.find(p => String(p.id) === String(order.patientId));
  const doctor = doctors.find(d => String(d.id) === String(order.doctorId));
  const company = companies.find(c => String(c.id) === String(order.companyId));
  const material = materials[order.materialId] || { name: order.materialId, color: '#0284c7' };

  const currentStep = order.steps?.[order.currentStepIndex];
  const totalSteps = order.steps?.length || 0;
  const currentStepNum = (order.currentStepIndex || 0) + 1;

  // Gün hesaplamaları
  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = eventType === 'trial' ? order.trialDate : order.deliveryDate;
  
  let daysDiff = null;
  let isOverdue = false;
  let isToday = false;

  if (targetDate) {
    const dTarget = new Date(targetDate);
    const dToday = new Date(todayStr);
    const diffTime = dTarget.getTime() - dToday.getTime();
    daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
    isToday = daysDiff === 0;
    isOverdue = daysDiff < 0 && order.status !== 'completed' && order.status !== 'rejected';
  }

  const handleSaveDates = async (e) => {
    e.preventDefault();
    if (isCompany) return;
    setIsSaving(true);
    try {
      await updateOrderDates(order.id, {
        deliveryDate: deliveryDate || order.deliveryDate,
        trialDate: trialDate || null
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Tarih güncelleme hatası:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdvance = () => {
    if (isCompany) return;
    advanceOrderToNextStep(order.id);
  };

  // WhatsApp Mesajı Oluştur
  const doctorPhone = (doctor?.phone || company?.phone || '').replace(/[^0-9]/g, '');
  const waPhone = doctorPhone.startsWith('0') ? '9' + doctorPhone : (doctorPhone.startsWith('90') ? doctorPhone : '90' + doctorPhone);
  const waText = encodeURIComponent(
    `Merhaba Sayın ${doctor?.name || 'Hekimim'},\n` +
    `Laboratuvarımızdaki #${order.id} nolu iş emriniz (${patient?.name || 'Hasta'}, ${material.name}) hakkında bilgilendirme:\n` +
    `• Durum: ${order.status === 'completed' ? 'Tamamlandı' : 'Üretimde'}\n` +
    `• Mevcut Aşama: ${currentStep?.name || 'Üretim'}\n` +
    (order.trialDate ? `• Prova Tarihi: ${order.trialDate}\n` : '') +
    `• Nihai Teslim Tarihi: ${order.deliveryDate}\n` +
    `DentalLab Pro Laboratuvarı`
  );

  return (
    <div className="calendar-drawer-overlay" onClick={onClose}>
      <div className="calendar-drawer-content" onClick={e => e.stopPropagation()}>
        {/* Üst Başlık Barı */}
        <div className="calendar-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="calendar-drawer-badge-order">{order.id}</span>
              {order.priority === 'urgent' && (
                <span className="calendar-badge-urgent-pulse">🚨 Acil Sipariş</span>
              )}
              {order.priority === 'vip' && (
                <span className="calendar-badge-vip">⭐ VIP</span>
              )}
              {order.status === 'completed' && (
                <span className="calendar-badge-completed">✓ Tamamlandı</span>
              )}
              {order.status === 'pending_approval' && (
                <span className="calendar-badge-pending">⏳ Onay Bekliyor</span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {patient?.name || 'İsimsiz Hasta'}
            </h3>
          </div>
          <button
            type="button"
            className="calendar-drawer-close-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Durum / Uyarı Şeridi */}
        <div className="calendar-drawer-status-strip">
          {isOverdue && (
            <div className="calendar-drawer-alert alert-danger">
              <AlertTriangle size={18} />
              <div>
                <strong>Teslimat Gecikmesi:</strong> {Math.abs(daysDiff)} gün önce teslim edilmeliydi!
              </div>
            </div>
          )}
          {isToday && (
            <div className="calendar-drawer-alert alert-warning">
              <Clock size={18} />
              <div>
                <strong>Bugün Teslim Günü:</strong> İşin bugün hekime/kliniğe teslim edilmesi planlandı.
              </div>
            </div>
          )}
          {daysDiff > 0 && !isOverdue && (
            <div className="calendar-drawer-alert alert-info">
              <Calendar size={18} />
              <div>
                <strong>Teslimata Kalan Süre:</strong> {daysDiff} gün sonra ({order.deliveryDate})
              </div>
            </div>
          )}
          {eventType === 'trial' && order.trialDate && (
            <div className="calendar-drawer-alert alert-trial">
              <Stethoscope size={18} />
              <div>
                <strong>Hasta Prova Randevusu:</strong> {order.trialDate} tarihinde prova var.
              </div>
            </div>
          )}
        </div>

        {/* Gövde Alanı */}
        <div className="calendar-drawer-body">
          {/* Hasta & Klinik & Hekim Bilgi Kartları */}
          <div className="calendar-drawer-section">
            <h4 className="calendar-section-title">Klinik & Hekim Bilgileri</h4>
            <div className="calendar-meta-grid">
              <div className="calendar-meta-item">
                <Building2 size={16} color="var(--text-muted)" />
                <div>
                  <span className="meta-label">Klinik / Firma</span>
                  <span className="meta-val">{company?.name || 'Kayıtsız Klinik'}</span>
                </div>
              </div>

              <div className="calendar-meta-item">
                <Stethoscope size={16} color="var(--text-muted)" />
                <div>
                  <span className="meta-label">Hekim</span>
                  <span className="meta-val">{doctor?.name || 'Kayıtsız Hekim'}</span>
                </div>
              </div>

              <div className="calendar-meta-item">
                <User size={16} color="var(--text-muted)" />
                <div>
                  <span className="meta-label">Hasta Kart No</span>
                  <span className="meta-val">{patient?.chartNumber || 'Belirtilmedi'}</span>
                </div>
              </div>

              <div className="calendar-meta-item">
                <Sparkles size={16} color="var(--text-muted)" />
                <div>
                  <span className="meta-label">VITA Rengi</span>
                  <span className="meta-val shade-pill">{order.shade || 'A2'}</span>
                </div>
              </div>
            </div>

            {/* FDI Diş Numaraları */}
            {order.teeth && order.teeth.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="meta-label" style={{ display: 'block', marginBottom: 6 }}>
                  Restorasyon Yapılan Dişler ({order.teeth.length} Üye):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {order.teeth.map(t => (
                    <span key={t} className="calendar-tooth-chip">#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Üretim İstasyonu / Aşama Bilgisi */}
          <div className="calendar-drawer-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 className="calendar-section-title" style={{ margin: 0 }}>Üretim Aşaması</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                İstasyon {currentStepNum} / {totalSteps}
              </span>
            </div>

            <div className="calendar-current-step-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentStep?.name || 'Onay Bekliyor'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Sorumlu: <strong>{currentStep?.technician || 'Atanmadı'}</strong>
                  </div>
                </div>
                <div
                  className="calendar-mat-badge"
                  style={{ backgroundColor: `${material.color}20`, color: material.color, borderColor: material.color }}
                >
                  {material.name}
                </div>
              </div>

              {/* İstasyon İlerleme Çubuğu */}
              <div className="calendar-step-bar-wrap">
                {(order.steps || []).map((s, idx) => (
                  <div
                    key={idx}
                    className={`calendar-step-bar-seg ${
                      idx < order.currentStepIndex
                        ? 'is-completed'
                        : (idx === order.currentStepIndex ? 'is-current' : 'is-pending')
                    }`}
                    title={`${s.name} (${s.technician || 'Teknisyen yok'})`}
                  />
                ))}
              </div>

              {/* Yönetici Hızlı İstasyon İlerletme Butonu */}
              {isAdmin && order.status !== 'completed' && order.status !== 'rejected' && (
                <button
                  type="button"
                  className="btn-dental btn-dental-secondary btn-dental-sm"
                  style={{ width: '100%', marginTop: 12, justifyContent: 'center', fontWeight: 700 }}
                  onClick={handleAdvance}
                >
                  <ArrowRight size={15} />
                  <span>Sonraki Aşamaya İlerlet</span>
                </button>
              )}
            </div>
          </div>

          {/* Tarihleri Hızlı Güncelleme Formu (Yönetici) */}
          {!isCompany && (
            <div className="calendar-drawer-section">
              <h4 className="calendar-section-title">Hızlı Tarih Düzenleme</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                Hekimden gelen talebe göre teslimat ve prova tarihini güncelleyin:
              </p>

              <form onSubmit={handleSaveDates} className="calendar-dates-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="dental-field-label">Teslim Tarihi</label>
                    <input
                      type="date"
                      className="input-dental"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="dental-field-label">Prova Tarihi (Opsiyonel)</label>
                    <input
                      type="date"
                      className="input-dental"
                      value={trialDate}
                      onChange={e => setTrialDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-dental btn-dental-primary btn-dental-sm"
                  >
                    {savedSuccess ? (
                      <>
                        <Check size={14} />
                        <span>Kaydedildi!</span>
                      </>
                    ) : (
                      <span>{isSaving ? 'Kaydediliyor...' : 'Tarihleri Güncelle'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notlar */}
          {order.notes && (
            <div className="calendar-drawer-section">
              <h4 className="calendar-section-title">Sipariş Notları</h4>
              <div className="calendar-notes-box">
                {order.notes}
              </div>
            </div>
          )}
        </div>

        {/* Alt Aksiyon Çubuğu */}
        <div className="calendar-drawer-footer">
          {doctorPhone && (
            <a
              href={`https://wa.me/${waPhone}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              style={{ color: '#16a34a' }}
              title="Hekime WhatsApp Bilgilendirmesi Gönder"
            >
              <MessageCircle size={16} />
              <span>WhatsApp Bilgi</span>
            </a>
          )}

          <Link
            to={`/orders/${order.id}`}
            className="btn-dental btn-dental-primary btn-dental-sm"
            style={{ marginLeft: 'auto' }}
          >
            <span>İş Emri Detayına Git</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
