import { useEffect, useState } from 'react';
import api from '../services/api';
import { Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { page, limit: 12, search } });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <p className="page-subtitle">Manage registered customers on the platform</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search by name, email, or phone…" style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><h3>No users found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Employment</th>
                  <th>Income</th>
                  <th>Apps</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{u.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.phone}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{u.employment_type || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{u.monthly_income ? fmt(u.monthly_income) : '—'}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>{u.application_count}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
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
