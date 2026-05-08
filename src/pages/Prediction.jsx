import { useState } from 'react';
import ImageUploader from '../components/ImageUploader';
import { Camera, AlertTriangle, FileText, Activity, Save, RefreshCw, CheckCircle, Info, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { dashboardService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getConfidenceColor } from '../utils/helpers';

export default function Prediction() {
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const { t } = useLanguage();

  const clearResult = () => {
    setResult(null);
    setError('');
    setSaved(false);
    setShowHindi(false);
  };

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    clearResult();
  };

  const handleAnalysisComplete = (analysisResult) => {
    setIsAnalyzing(false);
    if (analysisResult?.error) {
      setError(analysisResult.error);
    } else {
      setResult(analysisResult);
      setError('');
      if (analysisResult?.saved) {
        setSaved(true);
      }
    }
  };

  const saveToHistory = async () => {
    if (!result || saved) return;
    try {
      await dashboardService.savePrediction(result);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save prediction:', err);
      alert('Failed to save result. Please log in first.');
    }
  };

  const isHealthy = result?.disease_name?.toLowerCase() === 'healthy';

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 0' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '4rem' }}
      >
        <span style={{ color: 'var(--accent-color)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.9rem' }}>{t('pred_header_badge')}</span>
        <h1 className="section-title" style={{ marginTop: '0.5rem' }}>{t('pred_header_title')}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          {t('pred_header_desc')}
        </p>
      </motion.div>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Upload Panel */}
        <motion.div 
          className="glass-panel" 
          style={{ padding: '3rem', marginBottom: '3rem', border: '2px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
          whileHover={{ borderColor: 'var(--accent-color)' }}
        >
          <ImageUploader
            onAnalysisComplete={handleAnalysisComplete}
            onAnalysisStart={handleAnalysisStart}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        </motion.div>

        <AnimatePresence>
          {/* Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel" 
              style={{
                padding: '1.5rem',
                marginBottom: '2rem',
                borderLeft: `4px solid var(--danger)`,
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', gap: '1rem'
              }}
            >
              <AlertTriangle color="var(--danger)" size={24} />
              <div>
                <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 700 }}>{t('pred_issue_title')}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel" 
              style={{ padding: '4rem', textAlign: 'center', marginBottom: '2rem' }}
            >
              <div className="animate-pulse-slow">
                <Zap size={48} color="var(--accent-color)" style={{ marginBottom: '1.5rem' }} />
              </div>
              <h3 style={{ margin: '0 0 1rem 0' }}>{t('pred_analyzing_neural')}</h3>
              <div style={{ width: '200px', height: '4px', background: 'var(--glass-border)', margin: '0 auto', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: '100%', height: '100%', background: 'var(--accent-color)' }}
                />
              </div>
            </motion.div>
          )}

          {/* Results */}
          {result && !isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel" 
              style={{ padding: '3rem', borderTop: `6px solid ${isHealthy ? 'var(--accent-color)' : 'var(--danger)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <Activity color="var(--accent-color)" /> {t('pred_diagnosis_result')}
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowHindi(!showHindi)} className="glass-button">
                    <RefreshCw size={16} /> {showHindi ? t('pred_view_english') : t('pred_view_hindi')}
                  </button>
                  <button onClick={saveToHistory} disabled={saved} className="glass-button">
                    {saved ? <CheckCircle color="var(--accent-color)" /> : <Save />} {saved ? t('pred_saved') : t('pred_save_report')}
                  </button>
                </div>
              </div>

              {/* Grid Result */}
              <div className="grid-auto" style={{ marginBottom: '3rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('pred_identified_crop')}</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.5rem' }}>{result.crop_name}</div>
                </div>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('pred_health_status')}</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isHealthy ? 'var(--accent-color)' : 'var(--danger)', marginTop: '0.5rem' }}>
                    {result.disease_name}
                  </div>
                </div>
              </div>

              {/* Confidence Meter */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                  <span style={{ fontWeight: 600 }}>{t('pred_confidence_level')}</span>
                  <span style={{ color: getConfidenceColor(result.confidence), fontWeight: 800 }}>{result.confidence}%</span>
                </div>
                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ height: '100%', background: getConfidenceColor(result.confidence) }}
                  />
                </div>
              </div>

              {/* Detailed Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
                    <Info size={20} /> {t('pred_observations')}
                  </h4>
                  <p style={{ lineHeight: 1.8, opacity: 0.9 }}>
                    {showHindi ? result.description_hi : result.description}
                  </p>
                </div>

                {!isHealthy && (
                  <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--danger)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                      <AlertTriangle size={20} /> {t('pred_pathogen')}
                    </h4>
                    <p style={{ lineHeight: 1.8, opacity: 0.9 }}>{result.cause}</p>
                  </div>
                )}

                <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--accent-color)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
                    <ShieldCheck size={20} /> {t('pred_treatment_strategy')}
                  </h4>
                  <p style={{ lineHeight: 1.8, opacity: 0.9, whiteSpace: 'pre-line' }}>
                    {showHindi ? result.treatment_hi : result.treatment}
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    🛡️ {t('pred_prevention')}
                  </h4>
                  <p style={{ lineHeight: 1.8, opacity: 0.9, whiteSpace: 'pre-line' }}>{result.prevention}</p>
                </div>
              </div>

              <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <button onClick={clearResult} className="glass-button" style={{ margin: '0 auto' }}>
                  <RefreshCw size={16} /> {t('pred_new_analysis')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
