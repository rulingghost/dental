import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const WEEKDAYS_SHORT_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const MiniCalendarPicker = ({
  value,
  onChange,
  className = '',
  align = 'right'
}) => {
  const selectedDate = useMemo(() => {
    if (!value) return new Date();
    return value instanceof Date ? value : new Date(value);
  }, [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));
  const containerRef = useRef(null);

  // Seçili tarih değişirse görünüm ayını senkronize et
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const today = useMemo(() => new Date(), []);
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Ay geçişleri
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (targetDate) => {
    if (typeof onChange === 'function') {
      onChange(new Date(targetDate));
    }
    setIsOpen(false);
  };

  const handleJumpToday = (e) => {
    e.stopPropagation();
    const now = new Date();
    setViewDate(new Date(now));
    if (typeof onChange === 'function') {
      onChange(now);
    }
    setIsOpen(false);
  };

  const handleJumpDays = (days) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setViewDate(new Date(target));
    if (typeof onChange === 'function') {
      onChange(target);
    }
    setIsOpen(false);
  };

  // Takvim günlerini oluştur
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Pazartesi = 0

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Önceki ay taşmaları
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const fullDate = new Date(currentYear, currentMonth - 1, d);
      cells.push({
        date: fullDate,
        dayNum: d,
        isCurrentMonth: false,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate)
      });
    }

    // Bu ayın günleri
    for (let d = 1; d <= daysInMonth; d++) {
      const fullDate = new Date(currentYear, currentMonth, d);
      cells.push({
        date: fullDate,
        dayNum: d,
        isCurrentMonth: true,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate)
      });
    }

    // Gelecek ay taşmaları (42 güne tamamla)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const fullDate = new Date(currentYear, currentMonth + 1, d);
      cells.push({
        date: fullDate,
        dayNum: d,
        isCurrentMonth: false,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate)
      });
    }

    return cells;
  }, [currentYear, currentMonth, today, selectedDate]);

  const formattedDisplay = useMemo(() => {
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = MONTHS_TR[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${day} ${month} ${year}`;
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      className={`mini-date-picker-wrapper ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Tetikleyici Buton */}
      <button
        type="button"
        className="mini-date-picker-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          background: isOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
          border: isOpen ? '1.5px solid var(--dental-blue)' : '1.5px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.84rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'var(--shadow-sm)',
          transition: 'all 0.18s ease'
        }}
        title="Hızlı Tarih Seçiciyi Aç"
      >
        <CalendarIcon size={15} color="var(--dental-blue)" />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}>
          {formattedDisplay}
        </span>
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Popover Açılır Takvim */}
      {isOpen && (
        <div
          className="mini-date-picker-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: 310,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.28), 0 4px 12px rgba(0,0,0,0.06)',
            padding: 14,
            zIndex: 1050,
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          {/* Üst Kısım: Ay/Yıl ve Oklar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                {MONTHS_TR[currentMonth]}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {currentYear}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="btn-dental btn-dental-secondary btn-dental-sm"
                style={{ padding: '4px 7px' }}
                onClick={handlePrevMonth}
                title="Önceki Ay"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="btn-dental btn-dental-secondary btn-dental-sm"
                style={{ padding: '4px 7px' }}
                onClick={handleNextMonth}
                title="Sonraki Ay"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Hızlı Kısayollar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-subtle)',
              overflowX: 'auto'
            }}
          >
            <button
              type="button"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: 12 }}
              onClick={handleJumpToday}
            >
              Bugün
            </button>
            <button
              type="button"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: 12 }}
              onClick={() => handleJumpDays(1)}
            >
              Yarın
            </button>
            <button
              type="button"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: 12 }}
              onClick={() => handleJumpDays(7)}
            >
              +7 Gün
            </button>
            <button
              type="button"
              className="btn-dental btn-dental-secondary btn-dental-sm"
              style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: 12 }}
              onClick={() => {
                const start = new Date(currentYear, currentMonth, 1);
                handleSelectDay(start);
              }}
            >
              Ay Başı
            </button>
          </div>

          {/* Haftanın Günleri Başlıkları */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              gap: 2,
              marginBottom: 4
            }}
          >
            {WEEKDAYS_SHORT_TR.map(w => (
              <div
                key={w}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  padding: '4px 0'
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Günler Izgarası */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 3
            }}
          >
            {calendarCells.map((cell, idx) => {
              const { dayNum, isCurrentMonth, isToday, isSelected, date } = cell;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(date)}
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: isToday && !isSelected ? '1.5px solid var(--dental-blue)' : 'none',
                    backgroundColor: isSelected
                      ? 'var(--dental-blue)'
                      : isToday
                      ? 'rgba(2, 132, 199, 0.08)'
                      : 'transparent',
                    color: isSelected
                      ? '#fff'
                      : isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    opacity: isCurrentMonth ? 1 : 0.35,
                    fontWeight: isSelected || isToday ? 800 : 500,
                    fontSize: '0.82rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isToday
                        ? 'rgba(2, 132, 199, 0.08)'
                        : 'transparent';
                    }
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Alt Bilgi */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.74rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Bugün: {today.getDate()} {MONTHS_TR[today.getMonth()]}</span>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--dental-blue)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
              onClick={() => setIsOpen(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
