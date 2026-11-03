import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'mobile', label: 'Mobile number', type: 'tel', autoComplete: 'tel' },
  { name: 'password', label: 'Password (min 8 characters)', type: 'password', autoComplete: 'new-password' },
  { name: 'referralCode', label: 'Referral code (optional)', type: 'text' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', referralCode: params.get('ref') || '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({ ...form, referralCode: form.referralCode.trim() || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.errors?.length) setFieldErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div className="brand-name">Nexachain</div>
        </div>
        <h1>Create your account</h1>
        <p className="lead">Start investing and earning referral income</p>

        <form className="form" onSubmit={submit} noValidate>
          {FIELDS.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={f.name}>{f.label}</label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                className={`input ${fieldErrors[f.name] ? 'invalid' : ''}`}
                value={form[f.name]}
                onChange={update}
                autoComplete={f.autoComplete}
              />
              {fieldErrors[f.name] && <span className="field-error">{fieldErrors[f.name]}</span>}
            </div>
          ))}
          {error && (
            <div className="field-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
