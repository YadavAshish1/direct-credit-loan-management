import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FilePlus, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan', desc: 'For any personal expense', icon: '👤', max: '₹25 Lakhs' },
  { value: 'home', label: 'Home Loan', desc: 'Buy or build your dream home', icon: '🏠', max: '₹5 Crores' },
  { value: 'vehicle', label: 'Vehicle Loan', desc: 'Car, bike, or commercial vehicle', icon: '🚗', max: '₹50 Lakhs' },
  { value: 'education', label: 'Education Loan', desc: 'Invest in your future', icon: '🎓', max: '₹1 Crore' },
  { value: 'business', label: 'Business Loan', desc: 'Grow your business', icon: '💼', max: '₹1 Crore' },
];

const fmt = (n) => new Intl.NumberFormat('en-IN').format(n);

export default function ApplyLoanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    loan_type: '', loan_amount: '', loan_tenure_months: '36', purpose: '',
    monthly_income: user?.monthly_income || '', employment_type: user?.employment_type || 'salaried',
    employer_name: user?.employer_name || '', employment_years: user?.employment_years || '',
    existing_emis: '0',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const calcEMI = () => {
    const p = parseFloat(form.loan_amount) || 0;
    const t = parseInt(form.loan_tenure_months) || 1;
    const r = 10.5 / 12 / 100;
    if (!p) return 0;
    return Math.round(p * r * Math.pow(1 + r, t) / (Math.pow(1 + r, t) - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/applications', form);
      toast.success('Application submitted successfully!');
      navigate(`/applications/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Apply for a Loan</h1>
        <p className="page-subtitle">Complete the form below — eligibility is assessed instantly</p>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
        {['Loan Type', 'Loan Details', 'Employment', 'Review'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent)' : 'var(--bg-card)',
              border: `2px solid ${step >= i + 1 ? (step > i + 1 ? 'var(--accent-green)' : 'var(--accent)') : 'var(--border)'}`,
              fontSize: 13, fontWeight: 700, color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 13, color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
            {i < 3 && <ChevronRight size={16} color="var(--text-muted)" />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 1: Loan Type */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Select Loan Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {LOAN_TYPES.map(lt => (
                <div key={lt.value} onClick={() => setForm({...form, loan_type: lt.value})}
                  style={{ padding: 20, borderRadius: 12, border: `2px solid ${form.loan_type === lt.value ? 'var(--accent)' : 'var(--border)'}`, background: form.loan_type === lt.value ? 'var(--accent-glow)' : 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{lt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{lt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{lt.desc}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8, fontWeight: 600 }}>Up to {lt.max}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Loan Details */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Loan Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Loan Amount (₹)</label>
                  <input className="form-input" type="number" placeholder="500000" value={form.loan_amount} onChange={set('loan_amount')} />
                  {form.loan_amount && <span style={{ fontSize: 12, color: 'var(--accent)' }}>₹{fmt(form.loan_amount)}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Tenure (Months)</label>
                  <select className="form-select" value={form.loan_tenure_months} onChange={set('loan_tenure_months')}>
                    {[12,24,36,48,60,84,120,180,240,360].map(t => <option key={t} value={t}>{t} months ({(t/12).toFixed(0)} yr{t>12?'s':''})</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Purpose of Loan</label>
                <textarea className="form-textarea" placeholder="Briefly describe why you need this loan…" value={form.purpose} onChange={set('purpose')} />
              </div>
              {form.loan_amount && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Estimated EMI (at ~10.5%)</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>₹{fmt(calcEMI())}/mo</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Employment */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Employment & Financial Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Employment Type</label>
                  <select className="form-select" value={form.employment_type} onChange={set('employment_type')}>
                    <option value="salaried">Salaried</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="business">Business Owner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employer / Company Name</label>
                  <input className="form-input" placeholder="Infosys Ltd." value={form.employer_name} onChange={set('employer_name')} />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Monthly Income (₹)</label>
                  <input className="form-input" type="number" placeholder="75000" value={form.monthly_income} onChange={set('monthly_income')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Years Employed</label>
                  <input className="form-input" type="number" placeholder="3" value={form.employment_years} onChange={set('employment_years')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Existing EMIs (₹/mo)</label>
                  <input className="form-input" type="number" placeholder="0" value={form.existing_emis} onChange={set('existing_emis')} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Review Your Application</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Loan Type', LOAN_TYPES.find(l => l.value === form.loan_type)?.label],
                ['Loan Amount', `₹${fmt(form.loan_amount)}`],
                ['Tenure', `${form.loan_tenure_months} months`],
                ['Est. EMI', `₹${fmt(calcEMI())}/month`],
                ['Employment', form.employment_type],
                ['Employer', form.employer_name],
                ['Monthly Income', `₹${fmt(form.monthly_income)}`],
                ['Existing EMIs', `₹${fmt(form.existing_emis)}/month`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
              ℹ️ By submitting, your eligibility will be assessed instantly based on your credit profile and the information provided.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            <ChevronLeft size={16} /> Back
          </button>
          {step < 4 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.loan_type || step === 2 && !form.loan_amount}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              <CheckCircle size={18} /> {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
