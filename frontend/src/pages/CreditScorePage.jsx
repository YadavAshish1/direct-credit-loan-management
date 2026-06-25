import { useEffect, useState } from 'react';
import api from '../services/api';
import { RefreshCw } from 'lucide-react';

const SCORE_BANDS = [
  { min: 800, max: 900, label: 'Excellent', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { min: 750, max: 799, label: 'Very Good', color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  { min: 700, max: 749, label: 'Good', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { min: 650, max: 699, label: 'Fair', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { min: 300, max: 649, label: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
];

const getBand = (score) => SCORE_BANDS.find(b => score >= b.min && score <= b.max) || SCORE_BANDS[4];

export default function CreditScorePage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/customers/credit-score').then(r => setReport(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const band = getBand(report?.credit_score);
  const pct = ((report?.credit_score - 300) / 600) * 100;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Credit Score</h1>
          <p className="page-subtitle">Simulated CIBIL Bureau Report</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Score Card */}
        <div className="card" style={{ textAlign: 'center', background: band.bg, border: `1px solid ${band.color}40` }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Your Credit Score</p>
          <div style={{ fontSize: 80, fontWeight: 900, color: band.color, lineHeight: 1, margin: '16px 0' }}>
            {report?.credit_score}
          </div>
          <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 99, background: `${band.color}20`, border: `1px solid ${band.color}40`, color: band.color, fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
            {band.label}
          </div>

          {/* Gauge bar */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 99, height: 12, margin: '0 8px 8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #ef4444, #f97316, #eab308, #84cc16, #22c55e)`, transition: 'width 1s ease', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', padding: '0 8px' }}>
            <span>300</span><span>Poor</span><span>Fair</span><span>Good</span><span>900</span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            Report date: {new Date(report?.report_date).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Report Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Account Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Total Accounts', report?.total_accounts],
                ['Active Accounts', report?.active_accounts],
                ['Closed Accounts', report?.closed_accounts],
                ['Overdue Accounts', report?.overdue_accounts],
                ['Total Outstanding', `₹${Number(report?.total_outstanding).toLocaleString('en-IN')}`],
                ['Credit Utilization', `${report?.credit_utilization}%`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                  <div style={{ fontWeight: 700, marginTop: 4, fontSize: 18 }}>{v ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Credit Factors</h3>
            {[
              { label: 'Payment History', value: report?.payment_history, score: report?.payment_history === 'excellent' ? 100 : report?.payment_history === 'good' ? 75 : report?.payment_history === 'fair' ? 50 : 25, color: '#22c55e' },
              { label: 'Credit Utilization', value: `${report?.credit_utilization}%`, score: Math.max(0, 100 - report?.credit_utilization * 1.5), color: '#3b82f6' },
              { label: 'Enquiries (6 months)', value: report?.enquiries_last_6months, score: Math.max(0, 100 - (report?.enquiries_last_6months || 0) * 15), color: '#8b5cf6' },
            ].map(({ label, value, score, color }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{value}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
