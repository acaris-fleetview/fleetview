import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import FuelPage from './pages/FuelPage';
import FleetPage from './pages/FleetPage';
import DriversPage from './pages/DriversPage';
import AlertsPage from './pages/AlertsPage';
import TourneesPage from './pages/TourneesPage';
import EntretienPage from './pages/EntretienPage';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout><Outlet /></Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="fuel" element={<FuelPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="tournees" element={<TourneesPage />} />
        <Route path="entretien" element={<EntretienPage />} />
      </Route>
    </Routes>
  );
}
