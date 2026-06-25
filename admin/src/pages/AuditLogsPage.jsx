import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', { params: { page, limit: 15 } });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">System Audit Logs</h1>
        <p className="page-subtitle">Track all administrative and system actions</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state"><h3>No audit logs found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{log.actor_name || 'System'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{log.actor_type}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{log.entity_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.entity_id?.substring(0, 8)}...</div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{log.ip_address}</td>
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
