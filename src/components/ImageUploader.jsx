import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, Clock, WifiOff, Zap, Camera, RefreshCw, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_ENDPOINTS } from '../config';
import LoadingSpinner from './LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

const ERROR_CONFIG = {
  rate_limit: {
    icon: Clock,
    color: '#f59e0b',
    title: 'AI Service Busy',
    tip: 'The free-tier AI has per-minute limits. Wait 1-2 minutes and try again.',
  },
  overload: {
    icon: Clock,
    color: '#f59e0b',
    title: 'AI Service Overloaded',
    tip: 'High demand right now. Please try again in a few minutes.',
  },
  network: {
    icon: WifiOff,
    color: '#f59e0b',
    title: 'Network Error',
    tip: 'Could not reach the server. Check your internet connection.',
  },
  image_missing: {
    icon: AlertCircle,
    color: 'var(--danger)',
    title: 'No Image',
    tip: 'Please select an image before clicking Analyze.',
  },
  image_invalid: {
    icon: AlertCircle,
    color: 'var(--danger)',
    title: 'Invalid Image',
    tip: 'The image could not be read. Try a different file.',
  },
  crop_not_detected: {
    icon: AlertCircle,
    color: 'var(--danger)',
    title: 'Crop Not Recognized',
    tip: 'Crop not recognized clearly, please upload a clearer image.',
  },
  camera_error: {
    icon: AlertCircle,
    color: 'var(--danger)',
    title: 'Camera Error',
    tip: 'Could not access the camera. Please check permissions.',
  },
  default: {
    icon: AlertCircle,
    color: 'var(--danger)',
    title: 'Analysis Failed',
    tip: 'Please try again with a clearer image.',
  },
};

export default function ImageUploader({ onAnalysisComplete, onAnalysisStart, isAnalyzing, setIsAnalyzing }) {
  const [image, setImage] = useState(null);
  const [fileObject, setFileObject] = useState(null);
  const [error, setError] = useState(null);
  const [analysisStage, setAnalysisStage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  
  // Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [stream, setStream] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const { t } = useLanguage();

  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 10;

  const clearError = () => setError(null);

  // ── Camera Logic ────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      clearError();
      // Try simplest possible constraints first for maximum compatibility
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
        
      setStream(newStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setError({ message: 'Could not access camera. Please check permissions and ensure no other app is using it.', type: 'camera_error' });
    }
  };

  // Attach stream and ensure playback
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch(e => console.error('Play failed:', e));
      };
    }
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImage(dataUrl);
      
      // Convert dataUrl to File object for analysis
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera_photo.jpg", { type: "image/jpeg" });
          setFileObject(file);
        });
        
      stopCamera();
      clearError();
    }
  };

  const switchCamera = async () => {
    if (stream) {
      stopCamera();
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: newMode } 
        });
        setStream(newStream);
        setShowCamera(true);
      } catch (e) {
        startCamera(); // Fallback to basic
      }
    }
  };

  // ── Image Handling ──────────────────────────────────────────────────────────

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError({ message: 'Invalid file type. Please upload a JPEG or PNG image.', type: 'image_invalid' });
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError({ message: 'Image is too large. Maximum size is 10MB.', type: 'image_invalid' });
        return;
      }

      setFileObject(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        clearError();
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setFileObject(null);
    clearError();
  };

  const handleAnalyze = async () => {
    if (!fileObject) {
      setError({ message: 'Please upload an image first.', type: 'image_missing' });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStage('optimizing');
    clearError();
    onAnalysisStart?.();

    // 1. Compress Image before sending
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max 1200px width/height for efficiency
            const MAX_DIM = 1200;
            if (width > height && width > MAX_DIM) {
              height = (height * MAX_DIM) / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width = (width * MAX_DIM) / height;
              height = MAX_DIM;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.8);
          };
        };
      });
    };

    try {
      const compressedFile = await compressImage(fileObject);
      const formData = new FormData();
      formData.append('image', compressedFile, compressedFile.name || 'crop.jpg');

      setAnalysisStage('scanning');
      const token = localStorage.getItem('agro_ai_token') || '';
      
      const response = await fetch(API_ENDPOINTS.predictions.analyze, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Server error';
        try {
          const resJson = await response.json();
          errorMsg = resJson.error || errorMsg;
          const errType = resJson.errorType || 'default';
          throw { message: errorMsg, type: errType };
        } catch (e) {
          if (response.status === 429) {
            throw { message: 'AI service busy (429). Please wait a moment.', type: 'rate_limit' };
          }
          if (response.status === 504 || response.status === 502) {
            throw { message: 'Backend server is not responding. Please ensure it is running.', type: 'network' };
          }
          throw { message: e.message || `Request failed with status ${response.status}`, type: e.type || 'default' };
        }
      }

      setAnalysisStage('finalizing');
      const data = await response.json();
      
      // Simulate slight delay for UI impact
      setTimeout(() => {
        onAnalysisComplete(data.data);
      }, 800);

    } catch (err) {
      console.error('[ImageUploader] Error:', err);
      setError({ message: err.message || 'Analysis failed', type: err.type || 'default' });
      
      // Trigger cooldown for rate limits
      if (err.type === 'rate_limit') {
        setCooldown(10);
        const timer = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const ActiveError = error ? ERROR_CONFIG[error.type] || ERROR_CONFIG.default : null;

  return (
    <div className="image-uploader-container">
      <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Header Section - Camera Button Only */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
          {!image && !showCamera && (
            <button onClick={startCamera} className="glass-button-sm" title="Use Camera">
              <Camera size={18} />
            </button>
          )}
        </div>

        {/* Camera View */}
        {showCamera && (
          <div className="camera-view animate-fade-in" style={{ 
            position: 'relative', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            background: '#000',
            aspectRatio: '4/3',
            marginBottom: '1.5rem'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={switchCamera} className="camera-action-btn" title="Switch Camera">
                <RefreshCw size={20} />
              </button>
              <button onClick={stopCamera} className="camera-action-btn" style={{ background: 'rgba(239, 68, 68, 0.6)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ position: 'absolute', bottom: '1.5rem', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
              <button onClick={capturePhoto} className="capture-btn">
                <div className="capture-btn-inner" />
              </button>
            </div>
          </div>
        )}

        {/* Dropzone/Preview Area */}
        {!showCamera && (
          <div 
            onClick={() => !image && !isAnalyzing && fileInputRef.current.click()}
            className={`dropzone ${!image ? 'active' : ''} ${isAnalyzing ? 'analyzing' : ''}`}
            style={{
              border: image ? 'none' : '2px dashed var(--glass-border)',
              borderRadius: '16px',
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: image ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: image ? 'none' : 'rgba(255, 255, 255, 0.02)',
              marginBottom: '1.5rem'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept={ACCEPTED_TYPES.join(',')} 
              style={{ display: 'none' }} 
            />

            {image ? (
              <>
                <img 
                  src={image} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }} 
                />
                {!isAnalyzing && (
                  <button 
                    onClick={clearImage}
                    className="clear-image-btn"
                  >
                    <X size={20} />
                  </button>
                )}
                
                {isAnalyzing && (
                  <div className="analysis-overlay">
                    <div className="scanning-line" />
                    <div className="analysis-content">
                      <LoadingSpinner size={48} color="var(--accent-color)" />
                      <span className="analysis-status">
                        {analysisStage === 'optimizing' && 'Optimizing Image...'}
                        {analysisStage === 'scanning' && 'Scanning with AI...'}
                        {analysisStage === 'finalizing' && 'Finalizing Results...'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="upload-icon-wrapper">
                  <Upload size={32} />
                </div>
                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Click to select or Drop image
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Supports JPG, PNG, WEBP (Max 10MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && ActiveError && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="error-card" style={{ borderLeftColor: ActiveError.color }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ color: ActiveError.color, marginTop: '2px' }}>
                    <ActiveError.icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{ActiveError.title}</h4>
                    <p style={{ margin: '0.2rem 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {error.message}
                    </p>
                    <div className="error-tip">
                      <Zap size={12} style={{ marginRight: '4px' }} />
                      {ActiveError.tip}
                    </div>
                    {error.type === 'rate_limit' && (
                       <button onClick={handleAnalyze} className="retry-btn">
                         <RotateCcw size={14} style={{ marginRight: '6px' }} />
                         Try Again
                       </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button 
          onClick={handleAnalyze}
          disabled={!image || isAnalyzing || cooldown > 0}
          className={`analyze-btn ${isAnalyzing ? 'loading' : ''} ${cooldown > 0 ? 'disabled' : ''}`}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '14px',
            border: 'none',
            background: (isAnalyzing || cooldown > 0) ? 'rgba(255, 255, 255, 0.05)' : 'var(--accent-color)',
            color: (isAnalyzing || cooldown > 0) ? 'var(--text-secondary)' : '#000',
            fontWeight: 700,
            fontSize: '1.05rem',
            cursor: (isAnalyzing || !image || cooldown > 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.3s',
            boxShadow: (isAnalyzing || !image || cooldown > 0) ? 'none' : '0 8px 24px rgba(43, 209, 94, 0.3)'
          }}
        >
          {isAnalyzing ? (
            <>Processing...</>
          ) : cooldown > 0 ? (
            <>Cooling down ({cooldown}s)...</>
          ) : (
            <>
              <Zap size={20} />
              Analyze This Image
            </>
          )}
        </button>

        {/* Canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <style>{`
        .dropzone { position: relative; }
        .dropzone.active:hover {
          border-color: var(--accent-color) !important;
          background: rgba(43, 209, 94, 0.05) !important;
        }
        .upload-icon-wrapper {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(255,255,255,0.05); color: var(--accent-color);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.5rem; transition: transform 0.3s;
        }
        .dropzone:hover .upload-icon-wrapper { transform: translateY(-5px); }
        .clear-image-btn {
          position: absolute; top: 1rem; right: 1rem;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(0,0,0,0.6); color: #fff;
          border: none; cursor: pointer; display: flex;
          align-items: center; justify-content: center; backdrop-filter: blur(4px);
        }
        .analysis-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .analysis-content { display: flex; flexDirection: column; align-items: center; gap: 1rem; }
        .analysis-status { color: var(--accent-color); font-weight: 600; font-size: 1.1rem; }
        .scanning-line {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--accent-color); box-shadow: 0 0 20px var(--accent-color);
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(320px); }
        }
        .error-card {
          background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15);
          border-left: 4px solid; padding: 1.25rem; border-radius: 12px;
          margin-bottom: 1.5rem;
        }
        .error-tip {
          font-size: 0.75rem; color: var(--text-secondary);
          display: flex; align-items: center;
        }
        .retry-btn {
          margin-top: 0.75rem; background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border); color: var(--text-primary);
          padding: 0.4rem 0.8rem; borderRadius: 6px; cursor: pointer;
          font-size: 0.8rem; display: flex; align-items: center;
        }
        .retry-btn:hover { background: rgba(255,255,255,0.1); }
        .camera-action-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: none;
          color: #fff; cursor: pointer; display: flex;
          align-items: center; justify-content: center; backdrop-filter: blur(10px);
        }
        .capture-btn {
          width: 72px; height: 72px; border-radius: 50%;
          background: #fff; border: 4px solid rgba(255,255,255,0.3);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .capture-btn-inner {
          width: 54px; height: 54px; border-radius: 50%;
          border: 2px solid #000;
        }
        .analyze-btn:not(.disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        .analyze-btn:not(.disabled):active { transform: translateY(0); }
      `}</style>
    </div>
  );
}
