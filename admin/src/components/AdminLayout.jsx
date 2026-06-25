import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Activity, LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applications', icon: FileText, label: 'Applications' },
  { to: '/users', icon: Users, label: 'Customers' },
  { to: '/audit-logs', icon: Activity, label: 'Audit Logs' },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Admin logged out');
    navigate('/login');
  };

  return (
    <div className="page-wrapper">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} color="#6366f1" />
            <h2>DirectCredit</h2>
          </div>
          <span>Admin Portal</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card)', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{admin?.full_name}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>{admin?.role.replace('_', ' ')}</div>
          </div>
          <button className="btn btn-secondary btn-full btn-sm" onClick={handleLogout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
