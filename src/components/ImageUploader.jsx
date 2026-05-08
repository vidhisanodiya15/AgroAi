import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, Clock, WifiOff, Zap, Camera, RefreshCw, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
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
    let active = true;
    let videoElement = videoRef.current;

    if (showCamera && stream && videoElement) {
      console.log('Attaching stream to video element');
      
      // Some browsers prefer this event
      const handleCanPlay = () => {
        if (active) {
          videoElement.play().catch(e => console.error("Play failed:", e));
        }
      };

      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.srcObject = stream;

      // Backup: Try playing after a short delay
      const timer = setTimeout(() => {
        if (active && videoElement.paused) {
          videoElement.play().catch(() => {});
        }
      }, 500);

      return () => {
        active = false;
        videoElement.removeEventListener('canplay', handleCanPlay);
        clearTimeout(timer);
      };
    }
  }, [showCamera, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (showCamera) {
      stopCamera();
      setTimeout(() => startCameraWithMode(nextMode), 100);
    }
  };

  const startCameraWithMode = async (mode) => {
    try {
      const constraints = { video: { facingMode: mode } };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
      setStream(newStream);
      setShowCamera(true);
    } catch (err) {
      setError({ message: 'Camera switch failed.', type: 'camera_error' });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFileObject(file);
      setImage(URL.createObjectURL(file));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  // ── File Logic ──────────────────────────────────────────────────────────────

  const processFile = (file) => {
    if (!file) return;
    clearError();

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError({ message: 'Please upload a JPG, PNG, or WEBP image.', type: 'image_invalid' });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError({ message: `Image is too large (max ${MAX_SIZE_MB} MB).`, type: 'image_invalid' });
      return;
    }

    setFileObject(file);
    setImage(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isAnalyzing) return;
    processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    if (isAnalyzing) return;
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleRemove = () => {
    setImage(null);
    setFileObject(null);
    clearError();
    setAnalysisStage('');
  };

  const handleAnalyze = async () => {
    if (!fileObject) {
      setError({ message: 'Please select an image first.', type: 'image_missing' });
      return;
    }
    if (isAnalyzing) return;
    if (error) clearError();

    if (onAnalysisStart) onAnalysisStart();
    setIsAnalyzing(true);
    setAnalysisStage('Optimizing image for neural analysis...');

    // Image Compression/Resizing Step
    const compressImage = async (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
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

    const compressedFile = await compressImage(fileObject);
    const formData = new FormData();
    formData.append('image', compressedFile, compressedFile.name || 'crop.jpg');

    try {
      const token = localStorage.getItem('agro_ai_token') || '';
      const response = await fetch('/api/analyze-image', {
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
          if (response.status === 504 || response.status === 502) {
            throw { message: 'Backend server is not responding. Please ensure it is running.', type: 'network' };
          }
          throw { message: `Request failed with status ${response.status}`, type: 'default' };
        }
      }

      const resJson = await response.json();
      
      if (!resJson.success) {
        const errType = resJson.errorType || 'default';
        throw { message: resJson.error || 'Server error', type: errType };
      }

      const d = resJson.data;
      onAnalysisComplete({ ...d, saved: resJson.saved });
    } catch (err) {
      console.error('[ImageUploader] Error:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({ message: 'Cannot connect to backend. Please start the server.', type: 'network' });
      } else {
        setError({ message: err.message || 'Analysis failed', type: err.type || 'default' });
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const errConfig = error ? (ERROR_CONFIG[error.type] || ERROR_CONFIG.default) : null;

  return (
    <div style={{ width: '100%' }}>
      <AnimatePresence mode="wait">
        {!image && !showCamera ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              width: '100%', minHeight: '300px',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div 
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className="glass-panel hover-light"
                style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center', width: '200px' }}
              >
                <Upload size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: 600 }}>Upload File</div>
              </div>
              
              <div 
                onClick={startCamera}
                className="glass-panel hover-light"
                style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center', width: '200px' }}
              >
                <Camera size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: 600 }}>Take Photo</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>JPG, PNG or WEBP up to 10MB</p>
            <input type="file" ref={fileInputRef} onChange={handleChange} accept="image/*" style={{ display: 'none' }} />
          </motion.div>
        ) : showCamera ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}
          >
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '600px', 
              height: '400px', /* Fixed height fallback */
              background: '#000', 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  background: '#000',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' 
                }}
              />
              <div style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <button onClick={switchCamera} className="glass-button icon-only" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <RotateCcw size={20} />
                </button>
                <button onClick={capturePhoto} className="glass-button" style={{ background: '#fff', color: '#000', width: '64px', height: '64px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}>
                  <div style={{ width: '48px', height: '48px', border: '2px solid #000', borderRadius: '50%' }}></div>
                </button>
                <button onClick={stopCamera} className="glass-button icon-only" style={{ background: 'rgba(239, 68, 68, 0.5)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Position the plant leaf clearly in the center</p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <img src={image} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }} />
              
              {isAnalyzing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '2rem' }}>
                  <LoadingSpinner size={40} color="var(--accent-color)" />
                  <p style={{ marginTop: '1.5rem', fontWeight: 600, textAlign: 'center' }}>{analysisStage}</p>
                </div>
              )}

              {!isAnalyzing && (
                <button 
                  onClick={handleRemove}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {error && (
              <div style={{ width: '100%', maxWidth: '500px', padding: '1rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <AlertCircle color="var(--danger)" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--danger)' }}>{errConfig.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error.message}</div>
                </div>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="glass-button"
              style={{ width: '100%', maxWidth: '500px', padding: '1rem', justifyContent: 'center', fontSize: '1.1rem', background: isAnalyzing ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)', color: isAnalyzing ? 'var(--text-secondary)' : '#000' }}
            >
              {isAnalyzing ? 'Processing...' : <><Zap size={20} /> Analyze Plant Health</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

