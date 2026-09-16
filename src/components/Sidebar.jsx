import React, { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDental } from '../context/DentalContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Columns3,
  ClipboardList,
  Building2,
  Stethoscope,
  Users,
  BookOpen,
  Download,
  Upload,
  RotateCcw,
  Database,
  UserCheck,
  X,
  Shield,
  LogOut,
  Plus,
  Calendar,
  Layers
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { orders, exportData, importData, clearAllData, setIsDbModalOpen, setIsTeamModalOpen, technicians, setIsOrderModalOpen, setEditingOrder } = useDental();
  const { currentUser, isAdmin, isOperator, isCompany, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [isResetting, setIsResetting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length;
  const pendingCount = orders.filter(o => o.status === 'pending_approval').length;
  const todayDeliveriesCount = orders.filter(o => o.deliveryDate === todayStr && o.status !== 'completed' && o.status !== 'rejected').length;

  const roleLabel = isAdmin ? 'Yönetici' : (isCompany ? 'Firma hesabı' : 'Kullanıcı');
  const initials = (currentUser?.name || currentUser?.username || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      importData(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobil Karartma Perdesi (Backdrop) */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-icon-dental">
            {/* Dental Tooth SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2C4.5 2 3 4 3 6.5C3 9 4.2 12.5 5 15.5C5.8 18.5 6.5 22 8 22C9.5 22 10 19 11 15C11.5 13 12.5 13 13 15C14 19 14.5 22 16 22C17.5 22 18.2 18.5 19 15.5C19.8 12.5 21 9 21 6.5C21 4 19.5 2 17 2C15 2 13.5 3.5 12 3.5C10.5 3.5 9 2 7 2Z"/>
            </svg>
          </div>
          <div className="brand-info">
            <h1>DentalLab Pro</h1>
            <span>Diş Üretim ERP</span>
          </div>

          {/* Mobil Kapatma Butonu */}
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onClose}
            aria-label="Menüyü Kapat"
          >
            <X size={20} />
          </button>
        </div>


      {/* Nav Linkleri */}
      <ul className="nav-menu">
        {!isCompany && (
          <>
            <li className="nav-heading">Üretim & Takip</li>
            {isAdmin && (
              <li>
                <NavLink
                  to="/"
                  end
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
                >
                  <LayoutDashboard size={18} />
                  <span>Genel Bakış</span>
                </NavLink>
              </li>
            )}
            {isAdmin && (
              <li>
                <NavLink
                  to="/kanban"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
                >
                  <Columns3 size={18} />
                  <span>Üretim Hattı (Kanban)</span>
                  {pendingCount > 0 && (
                    <span className="nav-badge-count">{pendingCount}</span>
                  )}
                </NavLink>
              </li>
            )}
            <li>
              <NavLink
                to="/orders"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <ClipboardList size={18} />
                <span>{isOperator ? 'İş Emirlerim' : 'Tüm İş Emirleri'}</span>
                {activeOrdersCount > 0 && (
                  <span className="nav-badge-count">{activeOrdersCount}</span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/calendar"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <Calendar size={18} />
                <span>Teslimat Takvimi</span>
                {todayDeliveriesCount > 0 && (
                  <span
                    className="nav-badge-count nav-badge-today"
                    title={`Bugün teslim edilecek ${todayDeliveriesCount} sipariş var`}
                  >
                    {todayDeliveriesCount}
                  </span>
                )}
              </NavLink>
            </li>
          </>
        )}

        {isCompany && (
          <>
            <li className="nav-heading">Takip & Sipariş</li>
            <li>
              <NavLink
                to="/orders"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <ClipboardList size={18} />
                <span>İş Emirlerim</span>
                {activeOrdersCount > 0 && (
                  <span className="nav-badge-count">{activeOrdersCount}</span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/calendar"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <Calendar size={18} />
                <span>Teslimat Takvimi</span>
                {todayDeliveriesCount > 0 && (
                  <span
                    className="nav-badge-count nav-badge-today"
                    title={`Bugün teslim edilecek ${todayDeliveriesCount} sipariş var`}
                  >
                    {todayDeliveriesCount}
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setIsOrderModalOpen(true);
                  handleNavClick();
                }}
                className="nav-item-btn"
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--dental-blue)', fontWeight: 700 }}
              >
                <Plus size={18} />
                <span>+ Yeni İş Emri Ver</span>
              </button>
            </li>
            <li>
              <NavLink
                to="/kanban"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <Columns3 size={18} />
                <span>Üretim Durumu</span>
              </NavLink>
            </li>
          </>
        )}

        {isAdmin && (
          <>
        <li className="nav-heading">Paydaşlar</li>
        <li>
          <NavLink
            to="/companies"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
          >
            <Building2 size={18} />
            <span>Klinikler & Firmalar</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/doctors"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
          >
            <Stethoscope size={18} />
            <span>Hekimler & Doktorlar</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/patients"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Hastalar & Arşiv</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/users"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
          >
            <Shield size={18} />
            <span>Kullanıcılar & Yetkiler</span>
          </NavLink>
        </li>
        <li className="nav-heading">Laboratuvar Ekibi</li>
        <li>
          <button
            type="button"
            onClick={() => {
              if (setIsTeamModalOpen) setIsTeamModalOpen(true);
              handleNavClick();
            }}
            className="nav-item-btn"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <UserCheck size={18} />
            <span>Teknisyenler & Ekip</span>
            <span className="nav-badge-count">{technicians ? technicians.length : 0}</span>
          </button>
        </li>

        <li className="nav-heading">Üretim Standartları</li>
        <li>
          <NavLink
            to="/materials"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
          >
            <Layers size={18} />
            <span>Restorasyon & Üretim Hattı</span>
          </NavLink>
        </li>

        <li className="nav-heading">Veritabanı & Yedekleme</li>
        <li style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Ücretsiz Veritabanı Ayarları Butonu */}
          <button
            type="button"
            className="btn-dental btn-dental-secondary btn-dental-sm"
            style={{ width: '100%', justifyContent: 'flex-start', background: 'var(--bg-surface-elevated)' }}
            onClick={() => {
              if (setIsDbModalOpen) setIsDbModalOpen(true);
              handleNavClick();
            }}
            title="Ücretsiz Bulut Veritabanı Bağlantısı"
          >
            <Database size={15} color="var(--dental-blue)" />
            <span>🗄️ Veritabanı Bağlantısı</span>
          </button>

          <button
            type="button"
            className="btn-dental btn-dental-secondary btn-dental-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={exportData}
          >
            <Download size={15} />
            <span>Yedek İndir (JSON)</span>
          </button>
          <button
            type="button"
            className="btn-dental btn-dental-secondary btn-dental-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Upload size={15} />
            <span>Yedek Yükle</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* TÜM VERİLERİ SIFIRLAMA BUTONU */}
          <button
            type="button"
            disabled={isResetting}
            className="btn-dental btn-dental-danger btn-dental-sm"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              background: isResetting ? 'var(--status-pending-bg)' : 'var(--status-urgent-bg)',
              color: isResetting ? 'var(--status-pending)' : 'var(--status-urgent)',
              fontWeight: 700,
              cursor: isResetting ? 'not-allowed' : 'pointer'
            }}
            onClick={async () => {
              const ok = window.confirm(
                'TÜM VERİLER SIFIRLANSIN MI?\n\n' +
                '• Tüm klinikler / firmalar\n' +
                '• Tüm hekimler\n' +
                '• Tüm hastalar\n' +
                '• Tüm iş emirleri ve aşamaları\n\n' +
                'Bulut veritabanı (Supabase) ve yerel önbellek dahil tamamen silinecektir.\n' +
                'Sıfırdan kendi laboratuvar verilerinizi girmek için bu işlemi onaylayabilirsiniz.'
              );
              if (!ok) return;

              try {
                setIsResetting(true);
                await clearAllData();
                handleNavClick();
                if (window.location.hash !== '#/' && window.location.hash !== '') {
                  window.location.hash = '#/';
                }
              } catch (err) {
                console.error('Sıfırlama hatası:', err);
              } finally {
                setIsResetting(false);
              }
            }}
            title="Tüm verileri temizle, sıfırdan kendi klinik ve işlerinizi ekleyin"
          >
            <RotateCcw size={15} className={isResetting ? 'spin-anim' : ''} />
            <span>{isResetting ? 'Sıfırlanıyor...' : '🗑️ Tüm Verileri Sıfırla'}</span>
          </button>
        </li>
          </>
        )}
      </ul>

      {/* Profil Alt Alanı */}
      <div className="sidebar-bottom">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--dental-blue), var(--dental-teal))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: '#fff',
              flexShrink: 0
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name || currentUser?.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{roleLabel}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn-dental btn-dental-secondary btn-dental-sm"
          onClick={logout}
          title="Çıkış yap"
          style={{ padding: '6px 8px' }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  </>
  );
};
