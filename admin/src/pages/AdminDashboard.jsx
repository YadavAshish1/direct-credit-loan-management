import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FileText, CheckCircle, Clock, Banknote, Users, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const badge = (s) => <span className={`badge badge-${s}`}>{s.replace('_', ' ')}</span>;
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const { stats, recentApplications, loanTypeDistribution, totalUsers } = data;

  const cards = [
    { label: 'Total Applications', value: stats.total_applications, icon: FileText, color: '#3b82f6' },
    { label: 'Pending Review', value: parseInt(stats.submitted) + parseInt(stats.under_review) + parseInt(stats.assessed), icon: Clock, color: '#f59e0b' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: '#22c55e' },
    { label: 'Total Disbursed', value: fmt(stats.total_disbursed_amount), icon: Banknote, color: '#8b5cf6' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and recent activity</p>
        </div>
        <div className="card" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Users size={24} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{totalUsers}</div>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Recent Applications */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Applications</h2>
            <Link to="/applications" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>App No.</th>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 12 }}>{app.application_number}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{app.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{app.email}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{app.loan_type}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(app.loan_amount)}</td>
                    <td>{badge(app.status)}</td>
                    <td><Link to={`/applications/${app.id}`} className="btn btn-secondary btn-sm"><ArrowRight size={13}/></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loan Distribution */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Loan Distribution</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loanTypeDistribution} dataKey="count" nameKey="loan_type" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5}>
                  {loanTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} itemStyle={{ textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {loanTypeDistribution.map((l, i) => (
              <div key={l.loan_type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{l.loan_type}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{ fontWeight: 700 }}>{l.count} {parseInt(l.count) === 1 ? 'App' : 'Apps'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{fmt(l.total_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
