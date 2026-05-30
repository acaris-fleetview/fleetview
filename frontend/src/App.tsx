import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import FuelPage from './pages/FuelPage';
import FleetPage from './pages/FleetPage';
import AlertsPage from './pages/AlertsPage';
import TourneesPage from './pages/TourneesPage';
import EntretienPage from './pages/EntretienPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <Protected>
          <Layout>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="fuel" element={<FuelPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="tournees" element={<TourneesPage />} />
              <Route path="entretien" element={<EntretienPage />} />
            </Routes>
          </Layout>
        </Protected>
      } />
    </Routes>
  );
}
