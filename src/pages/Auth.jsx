import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';

export default function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let result;
      if (isLogin || isAdminLogin) {
        result = await auth.login(email, password, isAdminLogin);
      } else {
        result = await auth.signup(name, email, password);
      }

      if (result.success) {
        setUser(result.user);
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--accent-color)' }}>
          {isAdminLogin ? t('auth_admin_login') : isLogin ? t('auth_login_title') : t('auth_signup_title')}
        </h2>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && !isAdminLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('auth_name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                required
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('auth_email')}</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
              placeholder={isAdminLogin ? "Admin ID" : "Email"}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('auth_pass')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
              required
            />
          </div>

          <button type="submit" className="glass-button" style={{ marginTop: '1rem', background: 'var(--accent-color)', color: '#000', fontWeight: 'bold' }}>
            {isAdminLogin ? t('nav_login') : isLogin ? t('auth_login_btn') : t('auth_signup_btn')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!isAdminLogin && (
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLogin ? t('auth_switch_signup') : t('auth_switch_login')}
            </button>
          )}
          <button
            onClick={() => setIsAdminLogin(!isAdminLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {isAdminLogin ? 'User Login' : t('auth_admin_login')}
          </button>
        </div>
      </div>
    </div>
  );
}
