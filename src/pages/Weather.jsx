import React, { useState } from 'react';
import { FaCloudSun, FaWind, FaTint, FaThermometerHalf, FaMapMarkerAlt, FaSyncAlt, FaInfoCircle, FaSearch } from 'react-icons/fa';
import { useWeather } from '../contexts/WeatherContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

export default function Weather() {
  const { weather, loading, error, refreshWeather, isMock } = useWeather();
  const { t } = useLanguage();
  const [searchCity, setSearchCity] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCity.trim()) {
      refreshWeather(null, null, searchCity.trim());
      setSearchCity('');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FaSyncAlt size={40} color="var(--accent-color)" />
        </motion.div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{t('weather_gathering')}</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 800 }}>{t('weather_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('weather_subtitle')}</p>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="glass-input-wrapper" style={{ width: '250px' }}>
            <FaSearch size={14} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder={t('weather_search_placeholder')} 
              className="glass-input"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
          </div>
          <button type="submit" className="glass-button" style={{ padding: '0.5rem 1rem' }}>
            {t('weather_search_btn')}
          </button>
        </form>
      </div>

      {isMock && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
          <FaInfoCircle color="#f59e0b" />
          <div style={{ fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{t('weather_demo_mode')}</span> {t('weather_demo_desc')}
          </div>
        </div>
      )}

      {error ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaInfoCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h2>Weather Error</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error}</p>
          <button onClick={() => refreshWeather()} className="glass-button" style={{ margin: '0 auto' }}>
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Main Weather Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel" 
            style={{ padding: '3rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-color)', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', marginBottom: '1rem', fontWeight: 600 }}>
                <FaMapMarkerAlt /> {weather.name}, {weather.sys?.country || 'IN'}
              </div>
              <button onClick={() => refreshWeather()} className="glass-button icon-only" title="Refresh">
                <FaSyncAlt />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <FaCloudSun size={120} color="var(--accent-color)" />
              </motion.div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1 }}>{Math.round(weather.main.temp)}°C</div>
                <div style={{ fontSize: '1.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {weather.weather[0].description}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <FaTint size={24} color="var(--accent-color)" style={{ marginBottom: '0.8rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('weather_humidity')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{weather.main.humidity}%</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <FaWind size={24} color="var(--accent-color)" style={{ marginBottom: '0.8rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('weather_wind')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{weather.wind.speed} m/s</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <FaThermometerHalf size={24} color="var(--accent-color)" style={{ marginBottom: '0.8rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('weather_pressure')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{weather.main.pressure} hPa</div>
              </div>
            </div>
          </motion.div>

          {/* AI Recommendation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel"
            style={{ padding: '2rem', borderLeft: '5px solid var(--accent-color)', background: 'linear-gradient(90deg, rgba(43,209,94,0.1), transparent)' }}
          >
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <FaInfoCircle color="var(--accent-color)" /> {t('weather_advice_title')}
            </h3>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{weather.recommendation}</p>
          </motion.div>
        </>
      )}
    </div>
  );
}

