import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Users, ClipboardList, BarChart3, LogOut, BookOpen, Menu, X,
  UserCog, KeyRound, Layers, BookOpenCheck, GraduationCap, TrendingUp,
  Building2, PenTool, Users2, Heart, AlertTriangle, Eye
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import AIAssistant from './AIAssistant';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/assess', icon: ClipboardList, label: 'Assess' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/mtss', icon: Layers, label: 'MTSS' },
  { to: '/interventions', icon: BookOpenCheck, label: 'Interventions' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/predictions', icon: AlertTriangle, label: 'Predictions' },
  { to: '/sel', icon: Heart, label: 'SEL' },
  { to: '/workspaces', icon: Users2, label: 'Workspaces' },
  { to: '/pd', icon: GraduationCap, label: 'PD Hub' },
  { to: '/test-builder', icon: PenTool, label: 'Test Builder' },
  { to: '/executive', icon: Building2, label: 'Executive', adminOnly: true },
  { to: '/users', icon: UserCog, label: 'Users', adminOnly: true },
  { to: '/licenses', icon: KeyRound, label: 'Licenses' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('highContrast') === 'true');

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem('highContrast', String(next));
    document.documentElement.classList.toggle('high-contrast', next);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${highContrast ? 'high-contrast' : ''}`}>
      {/* Skip Navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">
        Skip to main content
      </a>

      {/* Sidebar */}
      <aside
        role="complementary"
        aria-label="Navigation sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-primary-800 text-white transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sideOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary-200" />
            <div>
              <h1 className="text-xl font-bold">Insight</h1>
              <p className="text-xs text-primary-300">CUBED-3 Assessment</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        <nav aria-label="Main navigation" className="mt-6 space-y-1 px-3 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.filter(n => !n.adminOnly || user?.role === 'admin').map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSideOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-primary-300 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex items-center gap-2 text-primary-300 hover:text-white text-sm px-2 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
            </button>
            <button
              onClick={toggleHighContrast}
              aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
              className={`p-1.5 rounded-lg text-xs transition-colors ${highContrast ? 'bg-yellow-500 text-black' : 'text-primary-300 hover:text-white'}`}
              title="Toggle high contrast"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 md:hidden">
          <button onClick={() => setSideOpen(true)} aria-label="Open navigation menu">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-primary-800">Insight</h1>
        </header>

        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <AIAssistant />
      </div>
    </div>
  );
}
