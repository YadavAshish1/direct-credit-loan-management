import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FilePlus, TrendingUp, CheckCircle, XCircle, Clock, Banknote, ArrowRight } from 'lucide-react';

const statusBadge = (s) => <span className={`badge badge-${s}`}>{s.replace('_', ' ')}</span>;
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customers/dashboard').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const { stats, recentApplications } = data || {};

  const statCards = [
    { label: 'Total Applications', value: stats?.total || 0, icon: FilePlus, color: '#3b82f6' },
    { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: '#22c55e' },
    { label: 'Pending Review', value: stats?.pending || 0, icon: Clock, color: '#f59e0b' },
    { label: 'Disbursed', value: stats?.disbursed || 0, icon: Banknote, color: '#8b5cf6' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]}! 👋</h1>
            <p className="page-subtitle">Here's an overview of your loan portfolio</p>
          </div>
          <Link to="/apply" className="btn btn-primary">
            <FilePlus size={18} /> Apply for Loan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card stat-card" style={{ '--grad': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-value" style={{ color }}>{value}</div>
                <div className="stat-label">{label}</div>
              </div>
              <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
                <Icon size={22} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Applications</h2>
          <Link to="/applications" className="btn btn-secondary btn-sm">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        {recentApplications?.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>No applications yet</h3>
            <p>Apply for your first loan to get started</p>
            <Link to="/apply" className="btn btn-primary" style={{ marginTop: 16 }}>Apply Now</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Application No.</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentApplications?.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>{app.application_number}</td>
                    <td style={{ textTransform: 'capitalize' }}>{app.loan_type}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(app.loan_amount)}</td>
                    <td>{statusBadge(app.status)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(app.submitted_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link to={`/applications/${app.id}`} className="btn btn-secondary btn-sm">
                        View <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
