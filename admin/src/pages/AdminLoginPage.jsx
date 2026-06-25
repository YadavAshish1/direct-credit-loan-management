import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await login(form.email, form.password);
      toast.success('Admin login successful');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Invalid email or password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const fillDemo = () => setForm({ email: 'admin@directcredit.in', password: 'Admin@123' });

  return (
    <div className="auth-page">
      <div className="auth-card card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <ShieldCheck size={32} color="#6366f1" />
            <h1 style={{ fontSize: 28, fontWeight: 800, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Portal</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Authorized Personnel Only</p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, fontWeight: 500, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form className="form-group" style={{ gap: 16 }} onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input className="form-input" type="email" placeholder="admin@directcredit.in" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            <LogIn size={18} /> {loading ? 'Authenticating…' : 'Secure Login'}
          </button>
        </form>
        
        {/* <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-full btn-sm" type="button" onClick={fillDemo}>
            Fill Demo Super Admin
          </button>
        </div> */}
      </div>
    </div>
  );
}
