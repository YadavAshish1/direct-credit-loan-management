import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Save, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers/profile').then(r => { setForm(r.data.data); setLoading(false); });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/customers/profile', form);
      updateUser({ ...user, ...res.data.data });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Keep your details up to date for accurate loan processing</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Personal Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700 }}>Personal Information</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your basic profile details</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.full_name || ''} onChange={set('full_name')} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={set('phone')} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email || ''} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.date_of_birth ? form.date_of_birth.split('T')[0] : ''} onChange={set('date_of_birth')} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">PAN Number</label><input className="form-input" placeholder="ABCDE1234F" value={form.pan_number || ''} onChange={set('pan_number')} maxLength={10} style={{ textTransform: 'uppercase' }} /></div>
              <div className="form-group"><label className="form-label">Aadhaar Number</label><input className="form-input" placeholder="1234 5678 9012" value={form.aadhaar_number || ''} onChange={set('aadhaar_number')} maxLength={12} /></div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Address</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group"><label className="form-label">Street Address</label><textarea className="form-textarea" value={form.address || ''} onChange={set('address')} rows={2} /></div>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city || ''} onChange={set('city')} /></div>
              <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state || ''} onChange={set('state')} /></div>
              <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" value={form.pincode || ''} onChange={set('pincode')} /></div>
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Employment Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select className="form-select" value={form.employment_type || ''} onChange={set('employment_type')}>
                  <option value="">Select type</option>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="business">Business Owner</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Employer / Company</label><input className="form-input" value={form.employer_name || ''} onChange={set('employer_name')} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Monthly Income (₹)</label><input className="form-input" type="number" value={form.monthly_income || ''} onChange={set('monthly_income')} /></div>
              <div className="form-group"><label className="form-label">Years Employed</label><input className="form-input" type="number" value={form.employment_years || ''} onChange={set('employment_years')} /></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
            <Save size={18} /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
