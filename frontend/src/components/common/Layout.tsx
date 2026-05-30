import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/',          label: 'Tableau de bord', icon: '📊' },
  { to: '/map',       label: 'Carte & GPS',     icon: '🗺️' },
  { to: '/fuel',      label: 'Carburant',        icon: '⛽' },
  { to: '/fleet',     label: 'Flotte',           icon: '🚗' },
  { to: '/alerts',    label: 'Alertes',          icon: '🔔' },
  { to: '/tournees',  label: 'Tournées MTS-1',   icon: '🚚' },
  { to: '/entretien', label: 'Entretien',         icon: '🔧' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-blue-900 text-white flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-blue-800">
          <h1 className="text-xl font-bold">FleetView</h1>
          <p className="text-blue-300 text-xs mt-0.5">Pilotage de flotte</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(item => (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === item.to ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-blue-800">
          <p className="text-blue-200 text-xs">{user?.name}</p>
          <p className="text-blue-400 text-xs">{user?.role}</p>
          <button onClick={handleLogout}
            className="mt-2 text-xs text-blue-300 hover:text-white transition-colors">
            Déconnexion
          </button>
        </div>
      </as