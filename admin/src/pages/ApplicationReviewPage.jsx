import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, Banknote, ShieldAlert, FileSignature } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function ApplicationReviewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals state
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDisburse, setShowDisburse] = useState(false);
  
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [disburseData, setDisburseData] = useState({ bank_account: '', ifsc_code: '' });

  const load = () => {
    setLoading(true);
    api.get(`/admin/applications/${id}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Application not found</h3></div>;

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await api.put(`/admin/applications/${id}/approve`, { admin_remarks: remarks });
        toast.success('Application Approved');
        setShowApprove(false);
      } else if (action === 'reject') {
        await api.put(`/admin/applications/${id}/reject`, { rejection_reason: reason, admin_remarks: remarks });
        toast.success('Application Rejected');
        setShowReject(false);
      } else if (action === 'disburse') {
        await api.put(`/admin/applications/${id}/disburse`, disburseData);
        toast.success('Loan Disbursed Successfully');
        setShowDisburse(false);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const { eligibility, activityLog } = data;
  const rules = typeof eligibility?.rules_evaluated === 'string' ? JSON.parse(eligibility.rules_evaluated) : (eligibility?.rules_evaluated || []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/applications" className="btn btn-secondary btn-sm"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>Review Application</h1>
          <p style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: 14, marginTop: 2 }}>{data.application_number}</p>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {['submitted', 'under_review', 'eligible'].includes(data.status) && (
            <>
              <button className="btn btn-danger" onClick={() => setShowReject(true)}><XCircle size={16} /> Reject</button>
              <button className="btn btn-success" onClick={() => setShowApprove(true)}><CheckCircle size={16} /> Approve Loan</button>
            </>
          )}
          {data.status === 'approved' && (
            <button className="btn btn-primary" onClick={() => setShowDisburse(true)}><Banknote size={16} /> Process Disbursement</button>
          )}
          <span className={`badge badge-${data.status}`} style={{ fontSize: 14, padding: '6px 14px' }}>{data.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Customer Profile & Loan Request */}
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileSignature size={18} /> Applicant Profile</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Full Name</span> <span style={{ fontWeight: 600 }}>{data.full_name}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Email</span> <span>{data.email}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Phone</span> <span>{data.phone}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>PAN</span> <span style={{ textTransform: 'uppercase' }}>{data.pan_number || '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Employment</span> <span style={{ textTransform: 'capitalize' }}>{data.employment_type} ({data.employment_years} yrs)</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Income</span> <span style={{ fontWeight: 600 }}>{fmt(data.monthly_income)}/mo</span></div>
              </div>
            </div>
            
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Banknote size={18} /> Loan Request</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Type</span> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{data.loan_type}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Amount</span> <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(data.loan_amount)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Tenure</span> <span>{data.loan_tenure_months} months</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Interest Rate</span> <span>{data.interest_rate}% p.a.</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>EMI Amount</span> <span style={{ fontWeight: 600 }}>{fmt(data.emi_amount)}/mo</span></div>
              </div>
            </div>
          </div>

          {/* Engine Analysis */}
          {eligibility && (
            <div className="card" style={{ border: `1px solid ${eligibility.is_eligible ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={18} /> Eligibility Engine Analysis</h3>
                <div style={{ background: eligibility.is_eligible ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '6px 16px', borderRadius: 99, color: eligibility.is_eligible ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, fontSize: 15 }}>
                  Score: {eligibility.eligibility_score}/100
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CREDIT SCORE</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{eligibility.credit_score}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>DEBT-TO-INCOME (FOIR)</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: eligibility.debt_to_income_ratio > 45 ? 'var(--accent-red)' : 'inherit' }}>{eligibility.debt_to_income_ratio}%</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MAX ELIGIBLE AMOUNT</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(eligibility.max_eligible_amount)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, borderLeft: `3px solid ${rule.passed ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{rule.rule}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Val: {rule.value} | Req: {rule.threshold}</div>
                    </div>
                    {rule.passed ? <CheckCircle size={16} color="var(--accent-green)" /> : <XCircle size={16} color="var(--accent-red)" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Audit Log */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Activity Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activityLog.map(log => (
              <div key={log.id} style={{ fontSize: 12, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{log.action.replace(/_/g, ' ')}</div>
                <div style={{ color: 'var(--text-secondary)' }}>By: {log.actor_name} ({log.actor_type})</div>
                <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{new Date(log.created_at).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showApprove && (
        <div className="modal-overlay">
          <div className="modal fade-in">
            <h2 className="modal-title">Approve Loan</h2>
            <div className="form-group">
              <label className="form-label">Admin Remarks (Optional)</label>
              <textarea className="form-textarea" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add internal notes or customer message..." />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowApprove(false)}>Cancel</button>
              <button className="btn btn-success btn-full" onClick={() => handleAction('approve')} disabled={actionLoading}>Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {showReject && (
        <div className="modal-overlay">
          <div className="modal fade-in">
            <h2 className="modal-title">Reject Loan</h2>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Rejection Reason (Required)</label>
              <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="Low Credit Score">Low Credit Score</option>
                <option value="High Debt-to-Income Ratio">High Debt-to-Income Ratio</option>
                <option value="Inadequate Income">Inadequate Income</option>
                <option value="Employment Instability">Employment Instability</option>
                <option value="Information Mismatch">Information Mismatch</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Admin Remarks (Internal)</label>
              <textarea className="form-textarea" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn btn-danger btn-full" onClick={() => handleAction('reject')} disabled={!reason || actionLoading}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {showDisburse && (
        <div className="modal-overlay">
          <div className="modal fade-in">
            <h2 className="modal-title">Disburse Loan Amount</h2>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Disbursement Mode</label>
              <select className="form-select" value={disburseData.disbursement_mode} onChange={e => setDisburseData({...disburseData, disbursement_mode: e.target.value})}>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Customer Bank Account No.</label>
              <input className="form-input" value={disburseData.bank_account} onChange={e => setDisburseData({...disburseData, bank_account: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input className="form-input" value={disburseData.ifsc_code} onChange={e => setDisburseData({...disburseData, ifsc_code: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowDisburse(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={() => handleAction('disburse')} disabled={!disburseData.bank_account || !disburseData.ifsc_code || actionLoading}>Process Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
