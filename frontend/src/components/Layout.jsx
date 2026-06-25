import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileText, CreditCard, User, LogOut, Banknote } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apply', icon: FilePlus, label: 'Apply for Loan' },
  { to: '/applications', icon: FileText, label: 'My Applications' },
  { to: '/credit-score', icon: CreditCard, label: 'Credit Score' },
  { to: '/profile', icon: User, label: 'My Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="page-wrapper">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Banknote size={24} color="#3b82f6" />
            <h2>DirectCredit</h2>
          </div>
          <span>Customer Portal</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg-card)', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
          </div>
          <button className="btn btn-secondary btn-full btn-sm" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
