import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useDoctorHeartbeat } from './hooks/useDoctorHeartbeat';
import { UserRole } from './types/auth.types';
import AppShell from './layouts/AppShell';
import AdminShell from './layouts/AdminShell';
import FullBleedLayout from './layouts/FullBleedLayout';
import LoginPage from './pages/auth/LoginPage';
import OTPPage from './pages/auth/OTPPage';
import RegistrationPage from './pages/auth/RegistrationPage';
import QueuePage from './pages/queue/QueuePage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientFormPage from './pages/patients/PatientFormPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import ConsultWorkspace from './pages/consult/ConsultWorkspace';
import PrescriptionPreviewPage from './pages/consult/PrescriptionPreviewPage';
import RxSuccessPage from './pages/consult/RxSuccessPage';
import CasebookPage from './pages/casebook/CasebookPage';
import WalletPage from './pages/wallet/WalletPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UserProfilePage from './pages/settings/UserProfilePage';
import ClinicProfilePage from './pages/settings/ClinicProfilePage';
import ConnectionPage from './pages/settings/ConnectionPage';
import MedicineTestManagementPage from './pages/settings/MedicineTestManagementPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminClinicsPage from './pages/admin/AdminClinicsPage';
import AdminPatientsPage from './pages/admin/AdminPatientsPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import NotFoundPage from './pages/NotFoundPage';
import PageLoader from './components/PageLoader';

function RequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  useDoctorHeartbeat();

  if (isLoading) {
    return <PageLoader fullScreen />;
  }

  if (!isAuthenticated || !user?.isProfileComplete) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
}

function RoleShell() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === UserRole.ADMIN) return <AdminShell />;
  return <AppShell />;
}

function RoleIndexRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user?.role === UserRole.ADMIN ? '/admin/overview' : '/queue'} replace />;
}

export function AppRouter() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/otp" element={<OTPPage />} />
        <Route path="/auth/register" element={<RegistrationPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RoleShell />}>
            <Route index element={<RoleIndexRedirect />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/edit" element={<PatientFormPage />} />
            <Route path="/patients/:id/history" element={<PatientDetailPage />} />
            <Route path="/casebook" element={<CasebookPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<UserProfilePage />} />
            <Route path="/settings/clinic" element={<ClinicProfilePage />} />
            <Route path="/settings/connection" element={<ConnectionPage />} />
            <Route path="/settings/medicines-tests" element={<MedicineTestManagementPage />} />

            <Route path="/admin/overview" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/clinics" element={<AdminClinicsPage />} />
            <Route path="/admin/patients" element={<AdminPatientsPage />} />
            <Route path="/admin/revenue" element={<AdminRevenuePage />} />
          </Route>

          {/* Consult flow renders full-bleed (no sidebar), matching mobile's
              modal-like navigation out of the tab shell during a consultation. */}
          <Route element={<FullBleedLayout />}>
            <Route path="/consult" element={<ConsultWorkspace />} />
            <Route path="/prescriptions/:id/preview" element={<PrescriptionPreviewPage />} />
            <Route path="/prescriptions/:id" element={<PrescriptionPreviewPage />} />
            <Route path="/prescriptions/:id/success" element={<RxSuccessPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
