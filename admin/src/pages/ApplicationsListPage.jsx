import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, ArrowRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const badge = (s) => <span className={`badge badge-${s}`}>{s.replace('_', ' ')}</span>;

export default function ApplicationsListPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({});

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/applications', { params: { page, limit: 12, search, status } });
      setApps(res.data.data);
      setPagination(res.data.pagination);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, status]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">All Applications</h1>
        <p className="page-subtitle">Manage and review all customer loan applications</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search by ID, name, or email…" style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 200 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['submitted','under_review','eligible','ineligible','approved','rejected','disbursed'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : apps.length === 0 ? (
          <div className="empty-state"><h3>No applications found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>App No.</th>
                  <th>Applicant</th>
                  <th>Loan Details</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 12 }}>{app.application_number}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{app.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{app.email}</div>
                    </td>
                    <td>
                      <div style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 13 }}>{app.loan_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmt(app.loan_amount)} • {app.loan_tenure_months}mo</div>
                    </td>
                    <td>{badge(app.status)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(app.submitted_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {app.eligibility_score ? (
                        <div style={{ fontWeight: 700, color: app.is_eligible ? 'var(--accent-green)' : 'var(--accent-red)' }}>{app.eligibility_score}/100</div>
                      ) : '—'}
                    </td>
                    <td>
                      <Link to={`/applications/${app.id}`} className="btn btn-secondary btn-sm">
                        Review <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => load(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
