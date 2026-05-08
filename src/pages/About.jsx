import { Leaf, Target, Users, Award } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
          {t('about_title')}
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {t('about_intro')}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Target size={32} color="var(--accent-color)" />
            <h2 style={{ margin: 0 }}>{t('about_mission_title')}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('about_mission_text')}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Leaf size={32} color="var(--accent-color)" />
            <h2 style={{ margin: 0 }}>{t('about_vision_title')}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('about_vision_text')}
          </p>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>{t('about_team_title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={40} color="var(--accent-color)" />
            </div>
            <h4 style={{ margin: 0 }}>Experts</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AI & Agriculture</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={40} color="var(--accent-color)" />
            </div>
            <h4 style={{ margin: 0 }}>Innovation</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Top-tier AI Models</p>
          </div>
        </div>
      </section>
    </div>
  );
}
