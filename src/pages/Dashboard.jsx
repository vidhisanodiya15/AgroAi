import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCcw, TrendingUp, CloudSun } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWeather } from '../contexts/WeatherContext';
import { dashboardService } from '../services/api';
import { motion } from 'framer-motion';
import { getConfidenceColor, normalizeImageUrl } from '../utils/helpers';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();
  const { weather, loading: weatherLoading } = useWeather();

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const stats = {
    total: history.length,
    healthy: history.filter(h => h.disease?.toLowerCase() === 'healthy').length,
    diseased: history.filter(h => h.disease && h.disease.toLowerCase() !== 'healthy').length,
  };

  if (isLoading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} color="var(--accent-color)" />
        </motion.div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t('gathering_data') || 'Synchronizing Dashboard...'}</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{t('welcome_back') || 'Welcome'}, {user?.name?.split(' ')[0]}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('dash_subtitle') || 'Here is your farm\'s health overview for today.'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={fetchHistory} className="glass-button">
            <RefreshCcw size={18} /> {t('sync_data') || 'Sync Data'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Weather Quick Glance */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-panel" 
          style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(43,209,94,0.1) 0%, transparent 100%)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CloudSun color="var(--accent-color)" /> {t('weather_focus') || 'Weather Focus'}
            </h3>
            <button onClick={() => navigate('/weather')} className="glass-button icon-only" style={{ width: '32px', height: '32px' }}>
              <TrendingUp size={14} />
            </button>
          </div>
          
          {weatherLoading ? (
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={24} color="var(--glass-border)" />
            </div>
          ) : weather ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{Math.round(weather.main.temp)}°</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{weather.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{weather.weather[0].main}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-color)', margin: 0, fontWeight: 600 }}>
                💡 {weather.recommendation}
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>{t('weather_unavailable') || 'Weather data unavailable.'}</p>
          )}
        </motion.div>

        {/* Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{stats.healthy}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dash_healthy')}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{stats.diseased}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dash_diseased')}</div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <Clock size={20} color="var(--accent-color)" /> {t('dash_recent')}
          </h3>
          <button onClick={() => navigate('/prediction')} className="glass-button" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {t('nav_start_analysis')}
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Leaf size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{t('dash_no_history')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))', gap: '1rem' }}>
            {history.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={item.id || item._id}
                className="glass-panel"
                style={{ 
                  padding: '1.25rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: `4px solid ${item.disease?.toLowerCase() === 'healthy' ? 'var(--accent-color)' : 'var(--danger)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                    {item.image ? (
                      <img
                        src={normalizeImageUrl(item.image)}
                        alt="Crop"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.parentElement.style.display = 'flex'; e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Leaf size={24} color="var(--text-secondary)" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{item.cropName}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.disease}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    padding: '0.4rem 1rem', 
                    borderRadius: '20px', 
                    background: 'rgba(255,255,255,0.05)', 
                    fontSize: '0.9rem', 
                    fontWeight: 700,
                    color: getConfidenceColor(item.confidence)
                  }}>
                    {item.confidence}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
