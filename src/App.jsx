import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DentalProvider, useDental } from './context/DentalContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OrderModal } from './components/OrderModal';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import { TeamModal } from './components/TeamModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginView } from './views/LoginView';

import { Dashboard } from './views/Dashboard';
import { KanbanView } from './views/KanbanView';
import { OrdersView } from './views/OrdersView';
import { OrderDetailView } from './views/OrderDetailView';
import { CompaniesView } from './views/CompaniesView';
import { DoctorsView } from './views/DoctorsView';
import { PatientsView } from './views/PatientsView';
import { MaterialsView } from './views/MaterialsView';
import { UsersView } from './views/UsersView';
import { CalendarView } from './views/CalendarView';

const ToastNotification = () => {
  const { toast } = useDental();
  if (!toast) return null;

  const borderLeftColor = toast.type === 'error'
    ? 'var(--status-urgent)'
    : (toast.type === 'warning' ? 'var(--status-revision)' : 'var(--dental-blue)');

  return (
    <div className="dental-toast-notification" style={{ borderLeftColor }}>
      <span>{toast.type === 'error' ? '✕' : (toast.type === 'warning' ? '⚠️' : '✓')}</span>
      <span>{toast.message}</span>
    </div>
  );
};

const RoleRedirect = () => {
  const { isCompany, isOperator } = useAuth();
  if (isCompany) return <Navigate to="/orders" replace />;
  if (isOperator) return <Navigate to="/orders" replace />;
  return <Dashboard />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, isCompany, isOperator } = useAuth();

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', isSidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        <ToastNotification />
      </>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="main-content-flow">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
        <main className="page-body-container">
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route
              path="/kanban"
              element={isOperator ? <Navigate to="/orders" replace /> : <KanbanView />}
            />
            <Route path="/orders" element={<OrdersView />} />
            <Route path="/orders/:id" element={<OrderDetailView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/companies" element={<AdminRoute><CompaniesView /></AdminRoute>} />
            <Route path="/doctors" element={<AdminRoute><DoctorsView /></AdminRoute>} />
            <Route path="/patients" element={<AdminRoute><PatientsView /></AdminRoute>} />
            <Route path="/materials" element={<AdminRoute><MaterialsView /></AdminRoute>} />
            <Route path="/users" element={<AdminRoute><UsersView /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <OrderModal />
      {!(isCompany || isOperator) && <DatabaseConfigModal />}
      {!(isCompany || isOperator) && <TeamModal />}
      <MobileBottomNav />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DentalProvider>
          <AppLayout />
        </DentalProvider>
      </AuthProvider>
    </HashRouter>
  );
}
