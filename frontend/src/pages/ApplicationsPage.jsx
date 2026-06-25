import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowRight, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const badge = (s) => <span className={`badge badge-${s}`}>{s.replace('_', ' ')}</span>;

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [pagination, setPagination] = useState({});

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/applications', { params: { page, limit: 10 } });
      setApps(res.data.data);
      setPagination(res.data.pagination);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = apps.filter(a =>
    (filter ? a.status === filter : true) &&
    (search ? a.application_number.toLowerCase().includes(search.toLowerCase()) || a.loan_type.includes(search.toLowerCase()) : true)
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">My Applications</h1>
        <p className="page-subtitle">Track all your loan applications and their statuses</p>
      </div>

      <div className="card">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search applications…" style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['submitted','under_review','eligible','ineligible','approved','rejected','disbursed'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <Link to="/apply" className="btn btn-primary">+ New Application</Link>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No applications found</h3>
            <p>Try adjusting your filters or apply for a new loan</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Application No.</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>EMI</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 13 }}>{app.application_number}</td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{app.loan_type}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(app.loan_amount)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{app.loan_tenure_months} mo</td>
                    <td>{app.emi_amount ? fmt(app.emi_amount) + '/mo' : '—'}</td>
                    <td>{badge(app.status)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(app.submitted_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link to={`/applications/${app.id}`} className="btn btn-secondary btn-sm">
                        Details <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
