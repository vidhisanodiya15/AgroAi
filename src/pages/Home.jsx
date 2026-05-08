import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Shield, TrendingUp, Target, Award, Users } from 'lucide-react';
import TypingEffect from '../components/TypingEffect';
import { useLanguage } from '../contexts/LanguageContext';

const HERO_IMAGE_URL = "/agro_hero_image_1777555481739.png"; // Using the generated image

export default function Home() {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem', paddingBottom: '6rem' }}>
      {/* Hero Section */}
      <section id="home" style={{ position: 'relative', minHeight: '80vh', display: 'flex', alignItems: 'center', borderRadius: '24px', overflow: 'hidden', padding: '2rem' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
          <img src={HERO_IMAGE_URL} alt="Agriculture Hero" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, var(--bg-primary), transparent)' }}></div>
        </div>

        <div style={{ maxWidth: '700px' }} className="animate-slide-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(43, 209, 94, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'var(--accent-color)', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
            <Leaf size={16} /> <span>{t('nav_smart_farming')}</span>
          </div>
          
          <h1 className="hero-title" style={{ fontSize: '4.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.1 }}>
            {t('home_title')}
          </h1>
          
          <h2 className="hero-subtitle" style={{ fontSize: '2rem', color: 'var(--accent-color)', marginBottom: '2rem' }}>
            <TypingEffect text={t('home_subtitle')} />
          </h2>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6, maxWidth: '600px' }}>
            {t('home_description')}
          </p>
          
          <div className="hero-buttons" style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/prediction" className="glass-button" style={{ fontSize: '1.1rem', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--accent-color)', color: '#000', fontWeight: 'bold' }}>
              {t('home_start_btn')} <ArrowRight size={20} />
            </Link>
            <Link to="/dashboard" className="glass-button" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              {t('home_history_btn')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', textAlign: 'center', animationDelay: '100ms' }}>
          <Shield size={48} color="var(--accent-color)" style={{ marginBottom: '1.5rem' }} />
          <h3>{t('feat_title_1')}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{t('feat_desc_1')}</p>
        </div>
        <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', textAlign: 'center', animationDelay: '200ms' }}>
          <Leaf size={48} color="var(--accent-color)" style={{ marginBottom: '1.5rem' }} />
          <h3>{t('feat_title_2')}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{t('feat_desc_2')}</p>
        </div>
        <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', textAlign: 'center', animationDelay: '300ms' }}>
          <TrendingUp size={48} color="var(--accent-color)" style={{ marginBottom: '1.5rem' }} />
          <h3>{t('feat_title_3')}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{t('feat_desc_3')}</p>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="glass-panel animate-slide-up" style={{ padding: '4rem 2rem', scrollMarginTop: '100px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
            {t('about_title')}
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '4rem' }}>
            {t('about_intro')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', textAlign: 'left' }}>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Target size={24} color="var(--accent-color)" />
                <h3 style={{ margin: 0 }}>{t('about_mission_title')}</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t('about_mission_text')}</p>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Award size={24} color="var(--accent-color)" />
                <h3 style={{ margin: 0 }}>{t('about_vision_title')}</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t('about_vision_text')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
