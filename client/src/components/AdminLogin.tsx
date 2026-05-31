import { useState, type FormEvent } from 'react';
import { adminLogin, setToken } from '../api';
import { Modal } from './Modal';

interface AdminLoginProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLogin({ onClose, onSuccess }: AdminLoginProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await adminLogin(email.trim(), password);
      setToken(token);
      onSuccess();
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal titleId="admin-login-title" title="Admin login" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Modal>
  );
}
