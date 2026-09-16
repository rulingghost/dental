import React, { useState, useMemo } from 'react';
import { useDental } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import { CalendarQuickDetailDrawer } from '../components/CalendarQuickDetailDrawer';
import { MiniCalendarPicker } from '../components/MiniCalendarPicker';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  AlertTriangle,
  Clock,
  Stethoscope,
  Package,
  Layers,
  Sparkles,
  User,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  RotateCcw,
  Eye,
  Info,
  ChevronDown
} from 'lucide-react';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SHORT_DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatIso(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CalendarView = () => {
  const {
    orders,
    companies,
    doctors,
    patients,
    materials,
    techniciansList
  } = useDental();
  const { isAdmin, isCompany } = useAuth();

  // Aktif Tarih ve Görünüm Modu
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'

  // Seçili Sipariş Detay Çekmecesi
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState('delivery');

  // Günü Genişletme Popover (Ay görünümünde 3'ten fazla iş varsa)
  const [expandedDay, setExpandedDay] = useState(null);

  // Filtreler
  const [filterType, setFilterType] = useState('all'); // 'all' | 'delivery' | 'trial' | 'order'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'overdue' | 'today' | 'urgent' | 'in_progress' | 'completed'
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => formatIso(new Date()), []);

  // Tarih Gezinme Metotları
  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else if (viewMode === 'day') {
        d.setDate(d.getDate() - 1);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else if (viewMode === 'day') {
        d.setDate(d.getDate() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // KPI Hesaplamaları
  const kpiStats = useMemo(() => {
    let overdue = 0;
    let todayDeliveries = 0;
    let todayTrials = 0;
    let urgentCount = 0;
    let inProgressCount = 0;
    let monthlyTeethCount = 0;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    (orders || []).forEach(o => {
      const isCompleted = o.status === 'completed';
      const isRejected = o.status === 'rejected';

      // Gecikmiş: teslim tarihi bugünden önce ve tamamlanmamış
      if (o.deliveryDate && o.deliveryDate < todayStr && !isCompleted && !isRejected) {
        overdue++;
      }
      // Bugün teslim
      if (o.deliveryDate === todayStr && !isRejected) {
        todayDeliveries++;
      }
      // Bugün prova
      if (o.trialDate === todayStr && !isRejected) {
        todayTrials++;
      }
      // Acil / VIP
      if ((o.priority === 'urgent' || o.priority === 'vip') && !isCompleted && !isRejected) {
        urgentCount++;
      }
      // Üretimde
      if (o.status === 'in_progress') {
        inProgressCount++;
      }

      // Bu ayki toplam diş sayısı
      if (o.deliveryDate) {
        const d = new Date(o.deliveryDate);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          monthlyTeethCount += (o.teeth?.length || 1);
        }
      }
    });

    return {
      overdue,
      todayDeliveries,
      todayTrials,
      urgentCount,
      inProgressCount,
      monthlyTeethCount
    };
  }, [orders, todayStr, currentDate]);

  // Takvim Etkinlikleri Havuzu
  const allEvents = useMemo(() => {
    const list = [];
    (orders || []).forEach(o => {
      const patient = patients.find(p => String(p.id) === String(o.patientId));
      const doctor = doctors.find(d => String(d.id) === String(o.doctorId));
      const company = companies.find(c => String(c.id) === String(o.companyId));
      const material = materials[o.materialId] || { name: o.materialId, color: '#0284c7' };
      const currentStep = o.steps?.[o.currentStepIndex];

      // 1. Teslimat Etkinliği
      if (o.deliveryDate) {
        list.push({
          id: `${o.id}-del`,
          orderId: o.id,
          type: 'delivery',
          date: o.deliveryDate,
          order: o,
          patient,
          doctor,
          company,
          material,
          currentStep,
          isUrgent: o.priority === 'urgent',
          isVip: o.priority === 'vip',
          isOverdue: o.deliveryDate < todayStr && o.status !== 'completed' && o.status !== 'rejected',
          isToday: o.deliveryDate === todayStr,
          isCompleted: o.status === 'completed'
        });
      }

      // 2. Hasta Provası Etkinliği
      if (o.trialDate) {
        list.push({
          id: `${o.id}-trial`,
          orderId: o.id,
          type: 'trial',
          date: o.trialDate,
          order: o,
          patient,
          doctor,
          company,
          material,
          currentStep,
          isUrgent: o.priority === 'urgent',
          isVip: o.priority === 'vip',
          isOverdue: o.trialDate < todayStr && o.status !== 'completed' && o.status !== 'rejected',
          isToday: o.trialDate === todayStr,
          isCompleted: o.status === 'completed'
        });
      }

      // 3. Sipariş Giriş Tarihi
      if (o.orderDate) {
        list.push({
          id: `${o.id}-ord`,
          orderId: o.id,
          type: 'order',
          date: o.orderDate,
          order: o,
          patient,
          doctor,
          company,
          material,
          currentStep,
          isUrgent: o.priority === 'urgent',
          isVip: o.priority === 'vip',
          isOverdue: false,
          isToday: o.orderDate === todayStr,
          isCompleted: o.status === 'completed'
        });
      }
    });

    return list;
  }, [orders, patients, doctors, companies, materials, todayStr]);

  // Filtrelenmiş Etkinlikler
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const o = ev.order;

      // Tür Filtresi
      if (filterType !== 'all') {
        if (ev.type !== filterType) return false;
      }

      // Durum Filtresi
      if (filterStatus === 'overdue') {
        if (!ev.isOverdue) return false;
      } else if (filterStatus === 'today') {
        if (!ev.isToday) return false;
      } else if (filterStatus === 'urgent') {
        if (!ev.isUrgent && !ev.isVip) return false;
      } else if (filterStatus === 'in_progress') {
        if (o.status !== 'in_progress') return false;
      } else if (filterStatus === 'completed') {
        if (o.status !== 'completed') return false;
      }

      // Klinik Filtresi
      if (selectedCompanyId && String(o.companyId) !== String(selectedCompanyId)) {
        return false;
      }

      // Hekim Filtresi
      if (selectedDoctorId && String(o.doctorId) !== String(selectedDoctorId)) {
        return false;
      }

      // Materyal Filtresi
      if (selectedMaterialId && o.materialId !== selectedMaterialId) {
        return false;
      }

      // Teknisyen Filtresi
      if (selectedTechnician) {
        const hasTech = (o.steps || []).some(s => s.technician === selectedTechnician);
        if (!hasTech) return false;
      }

      // Canlı Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patName = (ev.patient?.name || '').toLowerCase();
        const docName = (ev.doctor?.name || '').toLowerCase();
        const compName = (ev.company?.name || '').toLowerCase();
        const orderId = (o.id || '').toLowerCase();
        const shade = (o.shade || '').toLowerCase();
        const teethStr = (o.teeth || []).join(' ');

        const match = patName.includes(q) ||
          docName.includes(q) ||
          compName.includes(q) ||
          orderId.includes(q) ||
          shade.includes(q) ||
          teethStr.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [
    allEvents,
    filterType,
    filterStatus,
    selectedCompanyId,
    selectedDoctorId,
    selectedMaterialId,
    selectedTechnician,
    searchQuery
  ]);

  // Günlere Göre Gruplanmış Etkinlikler Haritası
  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach(ev => {
      if (!ev.date) return;
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date).push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Etkinliğe Tıklama
  const handleEventClick = (ev, e) => {
    e.stopPropagation();
    setSelectedOrder(ev.order);
    setSelectedEventType(ev.type);
  };

  // Filtreleri Temizleme
  const handleResetFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSelectedCompanyId('');
    setSelectedDoctorId('');
    setSelectedMaterialId('');
    setSelectedTechnician('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    filterType !== 'all' ||
    filterStatus !== 'all' ||
    selectedCompanyId !== '' ||
    selectedDoctorId !== '' ||
    selectedMaterialId !== '' ||
    selectedTechnician !== '' ||
    searchQuery.trim() !== '';

  // =========================================================================
  // GÖRÜNÜM 1: AYLIK MATRİS (MONTH GRID)
  // =========================================================================
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Ayın ilk ve son günü
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Pazartesi başlangıçlı gün indeksi (0 = Pzt, 6 = Paz)
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const daysCount = lastDay.getDate();

    // Önceki ayın günleri
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = startDayIdx - 1; i >= 0; i--) {
      prevMonthDays.push({
        date: formatIso(new Date(year, month - 1, prevMonthLastDay - i)),
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false
      });
    }

    // Bu ayın günleri
    const currentMonthDays = [];
    for (let i = 1; i <= daysCount; i++) {
      currentMonthDays.push({
        date: formatIso(new Date(year, month, i)),
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Sonraki ayın günleri (Toplam 35 veya 42 kutu)
    const totalFilled = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = totalFilled > 35 ? 42 - totalFilled : 35 - totalFilled;
    const nextMonthDays = [];
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({
        date: formatIso(new Date(year, month + 1, i)),
        dayNum: i,
        isCurrentMonth: false
      });
    }

    const allMonthCells = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

    return (
      <div className="calendar-month-wrapper">
        {/* Gün Başlıkları */}
        <div className="calendar-weekdays-header">
          {DAY_NAMES.map((d, idx) => (
            <div key={d} className="calendar-weekday-cell">
              <span className="full-name">{d}</span>
              <span className="short-name">{SHORT_DAY_NAMES[idx]}</span>
            </div>
          ))}
        </div>

        {/* Gün Izgarası */}
        <div className="calendar-month-grid">
          {allMonthCells.map(cell => {
            const dayEvents = eventsByDate.get(cell.date) || [];
            const isToday = cell.date === todayStr;
            const hasOverdue = dayEvents.some(e => e.isOverdue);
            const hasUrgent = dayEvents.some(e => e.isUrgent);

            // Teslimat ve prova sayıları
            const delCount = dayEvents.filter(e => e.type === 'delivery').length;
            const trialCount = dayEvents.filter(e => e.type === 'trial').length;

            return (
              <div
                key={cell.date}
                className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${hasOverdue ? 'has-overdue' : ''}`}
                onClick={() => {
                  setCurrentDate(new Date(cell.date));
                  setViewMode('day');
                }}
              >
                {/* Gün Numarası ve Rozetler */}
                <div className="calendar-day-cell-top">
                  <span className={`calendar-day-num ${isToday ? 'today-pill' : ''}`}>
                    {cell.dayNum}
                  </span>

                  <div className="calendar-day-counts">
                    {delCount > 0 && (
                      <span className="day-count-badge badge-del" title={`${delCount} Teslimat`}>
                        <Package size={11} /> {delCount}
                      </span>
                    )}
                    {trialCount > 0 && (
                      <span className="day-count-badge badge-trial" title={`${trialCount} Prova`}>
                        <Stethoscope size={11} /> {trialCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Günün Etkinlik Çipleri (İlk 3 adet) */}
                <div className="calendar-events-list">
                  {dayEvents.slice(0, 3).map(ev => {
                    const isTrial = ev.type === 'trial';
                    const isOrd = ev.type === 'order';

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className={`calendar-event-pill ${isTrial ? 'pill-trial' : (isOrd ? 'pill-order' : 'pill-delivery')} ${ev.isUrgent ? 'pill-urgent' : ''} ${ev.isOverdue ? 'pill-overdue' : ''}`}
                        onClick={e => handleEventClick(ev, e)}
                        title={`#${ev.orderId} - ${ev.patient?.name || 'Hasta'}\n${ev.company?.name || ''}\n${ev.material.name}\n${isTrial ? '🩺 Hasta Provası' : '📦 Teslimat'}`}
                      >
                        <span className="event-pill-icon">
                          {isTrial ? '🩺' : (isOrd ? '📥' : '📦')}
                        </span>
                        <span className="event-pill-title">
                          {ev.patient?.name || ev.orderId}
                        </span>
                        {ev.isUrgent && <span className="pill-urgent-dot" />}
                        {ev.order.teeth && ev.order.teeth.length > 0 && (
                          <span className="event-pill-teeth">{ev.order.teeth.length}Ü</span>
                        )}
                      </button>
                    );
                  })}

                  {/* 3'ten Fazla Varsa "+X İş" Butonu */}
                  {dayEvents.length > 3 && (
                    <button
                      type="button"
                      className="calendar-more-events-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setExpandedDay(cell.date);
                      }}
                    >
                      +{dayEvents.length - 3} iş daha
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // GÖRÜNÜM 2: HAFTALIK GÖRÜNÜM (WEEK VIEW)
  // =========================================================================
  const renderWeekView = () => {
    // Seçili tarihin haftasındaki Pazartesi gününü bul
    const curr = new Date(currentDate);
    let day = curr.getDay() - 1;
    if (day === -1) day = 6;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push({
        date: formatIso(d),
        dayName: DAY_NAMES[i],
        dayNum: d.getDate(),
        monthName: MONTH_NAMES[d.getMonth()]
      });
    }

    return (
      <div className="calendar-week-container">
        <div className="calendar-week-grid">
          {weekDays.map(w => {
            const dayEvents = eventsByDate.get(w.date) || [];
            const isToday = w.date === todayStr;

            return (
              <div
                key={w.date}
                className={`calendar-week-col ${isToday ? 'is-today-col' : ''}`}
              >
                {/* Sütun Başlığı */}
                <div className="calendar-week-col-header">
                  <span className="week-day-title">{w.dayName}</span>
                  <div className="week-day-badge">
                    <span className="week-day-number">{w.dayNum}</span>
                    <span className="week-month-small">{w.monthName}</span>
                  </div>
                  <div className="week-col-count">
                    {dayEvents.length} iş
                  </div>
                </div>

                {/* Sütun Kartları */}
                <div className="calendar-week-events-list">
                  {dayEvents.length === 0 ? (
                    <div className="calendar-empty-col-hint">
                      Planlanmış iş yok
                    </div>
                  ) : (
                    dayEvents.map(ev => {
                      const isTrial = ev.type === 'trial';
                      return (
                        <div
                          key={ev.id}
                          className={`calendar-week-card ${isTrial ? 'card-trial' : 'card-delivery'} ${ev.isUrgent ? 'card-urgent' : ''} ${ev.isOverdue ? 'card-overdue' : ''}`}
                          onClick={e => handleEventClick(ev, e)}
                        >
                          <div className="week-card-top">
                            <span className="week-card-tag">
                              {isTrial ? '🩺 Prova' : '📦 Teslimat'}
                            </span>
                            {ev.isUrgent && (
                              <span className="week-urgent-badge">ACİL</span>
                            )}
                            <span className="week-card-ord-id">#{ev.orderId}</span>
                          </div>

                          <div className="week-card-patient">
                            {ev.patient?.name || 'İsimsiz Hasta'}
                          </div>

                          <div className="week-card-meta">
                            <span>{ev.company?.name || 'Klinik'}</span>
                            <span className="dot-sep">•</span>
                            <span style={{ color: ev.material.color, fontWeight: 700 }}>
                              {ev.material.name}
                            </span>
                          </div>

                          <div className="week-card-bottom">
                            <span className="week-card-step">
                              İstasyon: <strong>{ev.currentStep?.name || 'Onay'}</strong>
                            </span>
                            {ev.order.teeth && ev.order.teeth.length > 0 && (
                              <span className="week-card-teeth">
                                {ev.order.teeth.length} Diş
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // GÖRÜNÜM 3: GÜNLÜK AJANDA (DAY VIEW)
  // =========================================================================
  const renderDayView = () => {
    const selectedDateStr = formatIso(currentDate);
    const dayEvents = eventsByDate.get(selectedDateStr) || [];

    const deliveries = dayEvents.filter(e => e.type === 'delivery');
    const trials = dayEvents.filter(e => e.type === 'trial');
    const ordersAccepted = dayEvents.filter(e => e.type === 'order');

    const dObj = currentDate;
    let dayIdx = dObj.getDay() - 1;
    if (dayIdx === -1) dayIdx = 6;
    const dayFullTitle = `${dObj.getDate()} ${MONTH_NAMES[dObj.getMonth()]} ${dObj.getFullYear()}, ${DAY_NAMES[dayIdx]}`;

    return (
      <div className="calendar-day-agenda-container">
        {/* Gün Özeti Başlığı */}
        <div className="calendar-day-summary-banner">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              {dayFullTitle}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Bugün için laboratuvarda toplam <strong>{dayEvents.length} operasyon</strong> bulunmaktadır.
            </p>
          </div>

          <div className="calendar-day-banner-stats">
            <div className="banner-stat-chip">
              <Package size={16} color="var(--dental-blue)" />
              <span><strong>{deliveries.length}</strong> Teslimat</span>
            </div>
            <div className="banner-stat-chip">
              <Stethoscope size={16} color="var(--dental-teal)" />
              <span><strong>{trials.length}</strong> Prova</span>
            </div>
          </div>
        </div>

        {/* 3 Bölümlü Gün Akışı */}
        <div className="calendar-day-sections-grid">
          {/* Bölüm A: Nihai Teslimatlar */}
          <div className="calendar-day-section-col">
            <div className="day-col-header" style={{ borderLeftColor: 'var(--dental-blue)' }}>
              <Package size={18} color="var(--dental-blue)" />
              <h4>Nihai Teslimatlar ({deliveries.length})</h4>
            </div>

            <div className="day-col-items">
              {deliveries.length === 0 ? (
                <div className="day-empty-box">Bu tarihte planlanmış teslimat yok.</div>
              ) : (
                deliveries.map(ev => (
                  <div
                    key={ev.id}
                    className={`calendar-agenda-card ${ev.isUrgent ? 'is-urgent' : ''} ${ev.isOverdue ? 'is-overdue' : ''}`}
                    onClick={e => handleEventClick(ev, e)}
                  >
                    <div className="agenda-card-top">
                      <span className="agenda-ord-badge">#{ev.orderId}</span>
                      {ev.isUrgent && <span className="calendar-badge-urgent-pulse">🚨 Acil</span>}
                      {ev.isCompleted && <span className="calendar-badge-completed">✓ Bitti</span>}
                      <span className="agenda-mat-badge" style={{ color: ev.material.color, borderColor: ev.material.color }}>
                        {ev.material.name}
                      </span>
                    </div>

                    <div className="agenda-card-main">
                      <h4 className="agenda-patient-name">{ev.patient?.name || 'Hasta'}</h4>
                      <div className="agenda-doctor-info">
                        <span>{ev.company?.name}</span> • <span>Dr. {ev.doctor?.name}</span>
                      </div>
                    </div>

                    <div className="agenda-card-details">
                      <div>
                        Aşama: <strong>{ev.currentStep?.name || 'Onay'}</strong>
                      </div>
                      <div>
                        Teknisyen: <strong>{ev.currentStep?.technician || 'Atanmadı'}</strong>
                      </div>
                      {ev.order.teeth && (
                        <div>
                          Dişler: <strong>{ev.order.teeth.join(', ')}</strong> ({ev.order.shade || 'A2'})
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bölüm B: Hasta Provaları */}
          <div className="calendar-day-section-col">
            <div className="day-col-header" style={{ borderLeftColor: 'var(--dental-teal)' }}>
              <Stethoscope size={18} color="var(--dental-teal)" />
              <h4>Hasta Provaları ({trials.length})</h4>
            </div>

            <div className="day-col-items">
              {trials.length === 0 ? (
                <div className="day-empty-box">Bu tarihte hasta provası randevusu yok.</div>
              ) : (
                trials.map(ev => (
                  <div
                    key={ev.id}
                    className="calendar-agenda-card card-trial-style"
                    onClick={e => handleEventClick(ev, e)}
                  >
                    <div className="agenda-card-top">
                      <span className="agenda-ord-badge">#{ev.orderId}</span>
                      <span className="trial-banner-tag">🩺 Prova Randevusu</span>
                      <span className="agenda-mat-badge" style={{ color: ev.material.color, borderColor: ev.material.color }}>
                        {ev.material.name}
                      </span>
                    </div>

                    <div className="agenda-card-main">
                      <h4 className="agenda-patient-name">{ev.patient?.name || 'Hasta'}</h4>
                      <div className="agenda-doctor-info">
                        <span>{ev.company?.name}</span> • <span>Dr. {ev.doctor?.name}</span>
                      </div>
                    </div>

                    <div className="agenda-card-details">
                      <div>
                        Mevcut İstasyon: <strong>{ev.currentStep?.name || 'Onay'}</strong>
                      </div>
                      <div>
                        Nihai Teslimat Tarihi: <strong>{ev.order.deliveryDate}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bölüm C: Günlük Sipariş Girişleri */}
          <div className="calendar-day-section-col">
            <div className="day-col-header" style={{ borderLeftColor: '#6366f1' }}>
              <Layers size={18} color="#6366f1" />
              <h4>Sipariş Kabulü ({ordersAccepted.length})</h4>
            </div>

            <div className="day-col-items">
              {ordersAccepted.length === 0 ? (
                <div className="day-empty-box">Bu tarihte girilmiş sipariş kaydı yok.</div>
              ) : (
                ordersAccepted.map(ev => (
                  <div
                    key={ev.id}
                    className="calendar-agenda-card"
                    onClick={e => handleEventClick(ev, e)}
                  >
                    <div className="agenda-card-top">
                      <span className="agenda-ord-badge">#{ev.orderId}</span>
                      <span className="agenda-mat-badge" style={{ color: ev.material.color, borderColor: ev.material.color }}>
                        {ev.material.name}
                      </span>
                    </div>

                    <div className="agenda-card-main">
                      <h4 className="agenda-patient-name">{ev.patient?.name || 'Hasta'}</h4>
                      <div className="agenda-doctor-info">
                        <span>{ev.company?.name}</span> • <span>Dr. {ev.doctor?.name}</span>
                      </div>
                    </div>

                    <div className="agenda-card-details">
                      <div>
                        Hedef Teslimat: <strong>{ev.order.deliveryDate}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // GÖRÜNÜM 4: SIRALI LİSTE / AJANDA AKIŞI (AGENDA LIST VIEW)
  // =========================================================================
  const renderAgendaListView = () => {
    // Teslimat ve prova etkinliklerini tarihe göre sırala
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      // Önce tarihe göre
      const cmp = (a.date || '').localeCompare(b.date || '');
      if (cmp !== 0) return cmp;
      return a.orderId.localeCompare(b.orderId);
    });

    // Gecikenler en başa gelsin
    const overdueEvents = sortedEvents.filter(e => e.isOverdue);
    const regularEvents = sortedEvents.filter(e => !e.isOverdue);

    // Tarihe göre gruplama
    const dateGroups = new Map();
    regularEvents.forEach(ev => {
      if (!dateGroups.has(ev.date)) {
        dateGroups.set(ev.date, []);
      }
      dateGroups.get(ev.date).push(ev);
    });

    return (
      <div className="calendar-agenda-list-view">
        {/* Geciken İşler Bölümü */}
        {overdueEvents.length > 0 && (
          <div className="calendar-agenda-group overdue-group">
            <div className="calendar-agenda-group-header overdue-header">
              <AlertTriangle size={18} color="var(--status-urgent)" />
              <h3>🚨 GECİKMİŞ TESLİMATLAR ({overdueEvents.length} İş)</h3>
              <span className="overdue-warning-note">Teslim tarihi geçmiş ama tamamlanmamış siparişler</span>
            </div>

            <div className="calendar-agenda-items-grid">
              {overdueEvents.map(ev => renderAgendaCard(ev, true))}
            </div>
          </div>
        )}

        {/* Normal Tarih Grupları */}
        {Array.from(dateGroups.entries()).map(([dateStr, items]) => {
          const dObj = new Date(dateStr);
          let dayIdx = dObj.getDay() - 1;
          if (dayIdx === -1) dayIdx = 6;
          const isToday = dateStr === todayStr;

          return (
            <div key={dateStr} className={`calendar-agenda-group ${isToday ? 'is-today-group' : ''}`}>
              <div className="calendar-agenda-group-header">
                <CalendarIcon size={18} color={isToday ? 'var(--dental-blue)' : 'var(--text-muted)'} />
                <h3>
                  {dObj.getDate()} {MONTH_NAMES[dObj.getMonth()]} {dObj.getFullYear()}, {DAY_NAMES[dayIdx]}
                </h3>
                {isToday && <span className="today-chip">BUGÜN</span>}
                <span className="group-items-count">{items.length} Operasyon</span>
              </div>

              <div className="calendar-agenda-items-grid">
                {items.map(ev => renderAgendaCard(ev, false))}
              </div>
            </div>
          );
        })}

        {sortedEvents.length === 0 && (
          <div className="calendar-no-results-box">
            <CalendarIcon size={48} color="var(--text-muted)" />
            <h4>Seçilen filtrelerle eşleşen takvim kaydı bulunamadı</h4>
            <p>Filtreleri sıfırlayarak tüm iş emirlerini görüntüleyebilirsiniz.</p>
            <button
              type="button"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} />
              <span>Filtreleri Temizle</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Ajanda Kartı Render Yardımcısı
  const renderAgendaCard = (ev, isOverdueMode) => {
    const isTrial = ev.type === 'trial';
    const isOrd = ev.type === 'order';

    return (
      <div
        key={ev.id}
        className={`calendar-agenda-item-card ${isTrial ? 'is-trial' : (isOrd ? 'is-order' : 'is-delivery')} ${ev.isUrgent ? 'is-urgent' : ''} ${ev.isOverdue ? 'is-overdue' : ''}`}
        onClick={e => handleEventClick(ev, e)}
      >
        <div className="agenda-item-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="agenda-event-type-pill">
              {isTrial ? '🩺 Hasta Provası' : (isOrd ? '📥 Sipariş Girişi' : '📦 Nihai Teslimat')}
            </span>
            {ev.isUrgent && <span className="calendar-badge-urgent-pulse">ACİL</span>}
            {ev.isVip && <span className="calendar-badge-vip">VIP</span>}
          </div>
          <span className="agenda-ord-num">#{ev.orderId}</span>
        </div>

        <div className="agenda-item-body">
          <div className="agenda-item-patient">{ev.patient?.name || 'İsimsiz Hasta'}</div>
          <div className="agenda-item-clinic">
            <Building2 size={13} />
            <span>{ev.company?.name || 'Klinik Belirtilmedi'}</span>
            <span className="dot-sep">•</span>
            <Stethoscope size={13} />
            <span>Dr. {ev.doctor?.name || 'Hekim Belirtilmedi'}</span>
          </div>
        </div>

        <div className="agenda-item-footer">
          <div className="agenda-footer-left">
            <span className="mat-dot" style={{ backgroundColor: ev.material.color }} />
            <span className="mat-name">{ev.material.name}</span>
            {ev.order.teeth && ev.order.teeth.length > 0 && (
              <span className="teeth-badge">{ev.order.teeth.length} Diş ({ev.order.shade || 'A2'})</span>
            )}
          </div>

          <div className="agenda-footer-right">
            <span>Aşama: <strong>{ev.currentStep?.name || 'Onay'}</strong></span>
            {ev.currentStep?.technician && (
              <span className="tech-name">({ev.currentStep.technician})</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // GÜNÜ GENİŞLETME POPOVER (MODAL)
  // =========================================================================
  const renderExpandedDayModal = () => {
    if (!expandedDay) return null;
    const dayEvents = eventsByDate.get(expandedDay) || [];
    const d = new Date(expandedDay);
    let dayIdx = d.getDay() - 1;
    if (dayIdx === -1) dayIdx = 6;
    const title = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES[dayIdx]}`;

    return (
      <div className="calendar-expanded-modal-overlay" onClick={() => setExpandedDay(null)}>
        <div className="calendar-expanded-modal-content" onClick={e => e.stopPropagation()}>
          <div className="calendar-expanded-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{title}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Bu gün için toplam {dayEvents.length} iş emri işlemi
              </span>
            </div>
            <button
              type="button"
              className="calendar-drawer-close-btn"
              onClick={() => setExpandedDay(null)}
            >
              ✕
            </button>
          </div>

          <div className="calendar-expanded-list">
            {dayEvents.map(ev => {
              const isTrial = ev.type === 'trial';
              return (
                <div
                  key={ev.id}
                  className={`calendar-expanded-item ${isTrial ? 'is-trial' : 'is-delivery'} ${ev.isUrgent ? 'is-urgent' : ''}`}
                  onClick={e => {
                    setExpandedDay(null);
                    handleEventClick(ev, e);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="expanded-type-tag">
                      {isTrial ? '🩺 Prova' : '📦 Teslimat'}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>#{ev.orderId}</span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 4 }}>
                    {ev.patient?.name || 'Hasta'}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {ev.company?.name} • Dr. {ev.doctor?.name}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.78rem' }}>
                    <span style={{ color: ev.material.color, fontWeight: 700 }}>{ev.material.name}</span>
                    <span>İstasyon: <strong>{ev.currentStep?.name}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-view-container">
      {/* Üst Başlık & Açıklama */}
      <div className="calendar-page-header">
        <div>
          <h1 className="calendar-page-title">
            <CalendarIcon size={26} color="var(--dental-blue)" />
            <span>Üretim & Teslimat Takvimi</span>
          </h1>
          <p className="calendar-page-subtitle">
            Tüm iş emirlerinin nihai teslimat tarihleri, hasta prova randevuları ve teknisyen istasyonları
          </p>
        </div>

        {/* Görünüm Değiştirici Butonlar */}
        <div className="calendar-view-tabs">
          <button
            type="button"
            className={`calendar-tab-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            📅 Ay
          </button>
          <button
            type="button"
            className={`calendar-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            🗓️ Hafta
          </button>
          <button
            type="button"
            className={`calendar-tab-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            📋 Gün
          </button>
          <button
            type="button"
            className={`calendar-tab-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            📑 Liste
          </button>
        </div>
      </div>

      {/* KPI İstatistik Şeridi */}
      <div className="calendar-kpi-bar">
        <button
          type="button"
          className={`calendar-kpi-card ${filterStatus === 'overdue' ? 'is-active-kpi' : ''} ${kpiStats.overdue > 0 ? 'kpi-danger' : ''}`}
          onClick={() => setFilterStatus(prev => prev === 'overdue' ? 'all' : 'overdue')}
          title="Teslim tarihi geçmiş siparişler"
        >
          <div className="kpi-icon-wrap icon-danger">
            <AlertTriangle size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.overdue}</div>
            <div className="kpi-label">Geciken İşler</div>
          </div>
        </button>

        <button
          type="button"
          className={`calendar-kpi-card ${filterStatus === 'today' ? 'is-active-kpi' : ''}`}
          onClick={() => setFilterStatus(prev => prev === 'today' ? 'all' : 'today')}
          title="Bugün teslim edilecek siparişler"
        >
          <div className="kpi-icon-wrap icon-delivery">
            <Package size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.todayDeliveries}</div>
            <div className="kpi-label">Bugün Teslim</div>
          </div>
        </button>

        <button
          type="button"
          className={`calendar-kpi-card ${filterType === 'trial' ? 'is-active-kpi' : ''}`}
          onClick={() => setFilterType(prev => prev === 'trial' ? 'all' : 'trial')}
          title="Bugünkü hasta prova randevuları"
        >
          <div className="kpi-icon-wrap icon-trial">
            <Stethoscope size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.todayTrials}</div>
            <div className="kpi-label">Bugün Prova</div>
          </div>
        </button>

        <button
          type="button"
          className={`calendar-kpi-card ${filterStatus === 'urgent' ? 'is-active-kpi' : ''}`}
          onClick={() => setFilterStatus(prev => prev === 'urgent' ? 'all' : 'urgent')}
          title="Acil veya VIP siparişler"
        >
          <div className="kpi-icon-wrap icon-urgent">
            <Flame size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.urgentCount}</div>
            <div className="kpi-label">Acil / VIP</div>
          </div>
        </button>

        <button
          type="button"
          className={`calendar-kpi-card ${filterStatus === 'in_progress' ? 'is-active-kpi' : ''}`}
          onClick={() => setFilterStatus(prev => prev === 'in_progress' ? 'all' : 'in_progress')}
          title="Mevcut üretim hattında olan işler"
        >
          <div className="kpi-icon-wrap icon-progress">
            <Layers size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.inProgressCount}</div>
            <div className="kpi-label">Üretimde</div>
          </div>
        </button>

        <div className="calendar-kpi-card kpi-neutral">
          <div className="kpi-icon-wrap icon-neutral">
            <Sparkles size={18} />
          </div>
          <div className="kpi-info">
            <div className="kpi-num">{kpiStats.monthlyTeethCount}</div>
            <div className="kpi-label">Bu Ay Toplam Diş</div>
          </div>
        </div>
      </div>

      {/* Kontrol & Gezinme Çubuğu */}
      <div className="calendar-nav-control-bar">
        <div className="calendar-nav-buttons">
          <button
            type="button"
            className="calendar-nav-arrow-btn"
            onClick={handlePrev}
            aria-label="Önceki"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="calendar-nav-today-btn"
            onClick={handleToday}
          >
            Bugün
          </button>

          <button
            type="button"
            className="calendar-nav-arrow-btn"
            onClick={handleNext}
            aria-label="Sonraki"
          >
            <ChevronRight size={18} />
          </button>

          <h2 className="calendar-nav-title">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            {viewMode === 'day' && ` - ${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()]}`}
          </h2>
        </div>

        {/* Hızlı Tarih Seçici (Özel Mini Takvim Popover) */}
        <div className="calendar-nav-quick-date">
          <MiniCalendarPicker
            value={currentDate}
            onChange={newDate => setCurrentDate(newDate)}
            align="right"
          />
        </div>
      </div>

      {/* Akıllı Filtreleme ve Arama Çubuğu */}
      <div className="calendar-filters-card">
        <div className="calendar-filters-row">
          {/* Canlı Arama Inputu */}
          <div className="calendar-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="calendar-search-input"
              placeholder="Hasta adı, sipariş no, hekim veya klinik ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Tür Seçici (Tümü / Teslimat / Prova) */}
          <select
            className="calendar-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Tüm Etkinlikler</option>
            <option value="delivery">📦 Sadece Teslimatlar</option>
            <option value="trial">🩺 Sadece Hasta Provaları</option>
            <option value="order">📥 Sipariş Girişleri</option>
          </select>

          {/* Durum Seçici */}
          <select
            className="calendar-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="overdue">🚨 Geciken İşler</option>
            <option value="today">⏰ Bugün Teslim Olanlar</option>
            <option value="urgent">⚡ Acil & VIP</option>
            <option value="in_progress">⚙️ Üretimde Olanlar</option>
            <option value="completed">✅ Tamamlananlar</option>
          </select>

          {/* Klinik Filtresi (Sadece Yönetici için) */}
          {isAdmin && (
            <select
              className="calendar-select"
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Tüm Klinikler</option>
              {(companies || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Hekim Filtresi */}
          <select
            className="calendar-select"
            value={selectedDoctorId}
            onChange={e => setSelectedDoctorId(e.target.value)}
          >
            <option value="">Tüm Hekimler</option>
            {(doctors || []).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Materyal Filtresi */}
          <select
            className="calendar-select"
            value={selectedMaterialId}
            onChange={e => setSelectedMaterialId(e.target.value)}
          >
            <option value="">Tüm Materyaller</option>
            {Object.entries(materials).map(([key, mat]) => (
              <option key={key} value={key}>{mat.name}</option>
            ))}
          </select>

          {/* Teknisyen Filtresi (Yönetici) */}
          {isAdmin && (
            <select
              className="calendar-select"
              value={selectedTechnician}
              onChange={e => setSelectedTechnician(e.target.value)}
            >
              <option value="">Tüm Teknisyenler</option>
              {(techniciansList || []).map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Temizleme Butonu */}
          {hasActiveFilters && (
            <button
              type="button"
              className="calendar-reset-btn"
              onClick={handleResetFilters}
              title="Filtreleri Temizle"
            >
              <RotateCcw size={14} />
              <span>Sıfırla</span>
            </button>
          )}
        </div>
      </div>

      {/* Aktif Görünüm Ekranı */}
      <div className="calendar-main-body">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'agenda' && renderAgendaListView()}
      </div>

      {/* Popover / Modal */}
      {renderExpandedDayModal()}

      {/* Hızlı İşlem Çekmecesi */}
      {selectedOrder && (
        <CalendarQuickDetailDrawer
          order={selectedOrder}
          eventType={selectedEventType}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};
