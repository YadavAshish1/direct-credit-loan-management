import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, Banknote } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/applications/${id}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Application not found</h3></div>;

  const { eligibility } = data;
  const rules = typeof eligibility?.rules_evaluated === 'string' ? JSON.parse(eligibility.rules_evaluated) : (eligibility?.rules_evaluated || []);

  const timelineSteps = [
    { label: 'Submitted', time: data.submitted_at, done: true, icon: CheckCircle },
    { label: 'Under Review', time: data.reviewed_at, done: !!data.reviewed_at, icon: Clock },
    { label: 'Eligibility Assessed', time: data.reviewed_at, done: ['eligible','ineligible','approved','rejected','disbursed'].includes(data.status), icon: AlertCircle },
    { label: 'Approved / Rejected', time: data.decision_at, done: ['approved','rejected','disbursed'].includes(data.status), icon: data.status === 'approved' || data.status === 'disbursed' ? CheckCircle : XCircle },
    { label: 'Disbursed', time: data.disbursed_at, done: data.status === 'disbursed', icon: Banknote },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/applications" className="btn btn-secondary btn-sm"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>Application Details</h1>
          <p style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: 14, marginTop: 2 }}>{data.application_number}</p>
        </div>
        <span className={`badge badge-${data.status}`} style={{ marginLeft: 'auto', fontSize: 14, padding: '6px 14px' }}>
          {data.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Loan Summary */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Loan Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Loan Type', data.loan_type],
                ['Loan Amount', fmt(data.loan_amount)],
                ['Tenure', `${data.loan_tenure_months} months`],
                ['Interest Rate', data.interest_rate ? `${data.interest_rate}% p.a.` : '—'],
                ['EMI Amount', data.emi_amount ? fmt(data.emi_amount) + '/month' : '—'],
                ['Total Repayment', data.emi_amount ? fmt(data.emi_amount * data.loan_tenure_months) : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, textTransform: 'capitalize' }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility Results */}
          {eligibility && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700 }}>Eligibility Assessment</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eligibility Score</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: eligibility.is_eligible ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {eligibility.eligibility_score}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 99, height: 8, marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${eligibility.eligibility_score}%`, background: eligibility.is_eligible ? 'var(--accent-green)' : 'var(--accent-red)', transition: 'width 1s ease', borderRadius: 99 }} />
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, fontStyle: 'italic' }}>{eligibility.remarks}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 8, background: rule.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${rule.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{rule.rule}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Your value: <strong>{rule.value}</strong> | Required: <strong>{rule.threshold}</strong></div>
                    </div>
                    {rule.passed ? <CheckCircle size={20} color="var(--accent-green)" /> : <XCircle size={20} color="var(--accent-red)" />}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credit Score</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{eligibility.credit_score}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FOIR</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: parseFloat(eligibility.debt_to_income_ratio) > 45 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{eligibility.debt_to_income_ratio}%</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Eligible</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-green)' }}>{fmt(eligibility.max_eligible_amount)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Remarks */}
          {(data.admin_remarks || data.rejection_reason) && (
            <div className="card" style={{ border: `1px solid ${data.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Bank Communication</h3>
              {data.rejection_reason && <p style={{ color: 'var(--accent-red)', marginBottom: 8 }}><strong>Reason for rejection:</strong> {data.rejection_reason}</p>}
              {data.admin_remarks && <p style={{ color: 'var(--text-secondary)' }}><strong>Remarks:</strong> {data.admin_remarks}</p>}
            </div>
          )}
        </div>

        {/* Right: Timeline + Disbursement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Application Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {timelineSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < timelineSteps.length - 1 ? 20 : 0, position: 'relative' }}>
                  {i < timelineSteps.length - 1 && (
                    <div style={{ position: 'absolute', left: 15, top: 32, width: 2, height: 'calc(100% - 12px)', background: step.done ? 'var(--accent-green)' : 'var(--border)' }} />
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: step.done ? 'rgba(34,197,94,0.2)' : 'var(--bg-secondary)', border: `2px solid ${step.done ? 'var(--accent-green)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <step.icon size={16} color={step.done ? 'var(--accent-green)' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: step.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {step.time ? new Date(step.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.disbursement && (
            <div className="card" style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--accent)' }}>🎉 Disbursement Details</h3>
              {[
                ['Amount', fmt(data.disbursement.disbursed_amount)],
                ['Mode', data.disbursement.disbursement_mode],
                ['Transaction Ref', data.disbursement.transaction_reference],
                ['First EMI Date', data.disbursement.first_emi_date ? new Date(data.disbursement.first_emi_date).toLocaleDateString('en-IN') : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
