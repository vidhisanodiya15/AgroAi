import { useState, useEffect } from 'react';
import { 
  Users, Activity, Settings as SettingsIcon, AlertCircle, 
  Trash2, Eye, Shield, User, Clock, Search, Filter, RefreshCcw, Loader2, Database
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { adminService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getConfidenceColor, normalizeImageUrl } from '../utils/helpers';

export default function Admin() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ stats: null, users: [], predictions: [], recentActivity: [] });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, usersRes, predictionsRes, feedbackRes] = await Promise.all([
        adminService.getStats(),
        adminService.getAllUsers(),
        adminService.getAllPredictions(),
        adminService.getAllFeedback()
      ]);

      setData({
        stats: statsRes.stats,
        recentActivity: statsRes.recentActivity,
        users: usersRes,
        predictions: predictionsRes,
        feedback: feedbackRes
      });
    } catch (err) {
      console.error('Admin fetch error:', err);
      setError(err.message || 'Failed to connect to administrative services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? All their records will also be removed.')) return;
    try {
      await adminService.deleteUser(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePrediction = async (id) => {
    if (!window.confirm('Delete this diagnostic record?')) return;
    try {
      await adminService.deletePrediction(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await adminService.deleteFeedback(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--accent-color)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Administrative Console...</p>
      </div>
    );
  }

  const filteredUsers = data.users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPredictions = data.predictions.filter(p => 
    p.crop?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.diseaseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFeedback = (data.feedback || []).filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '3rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Database color="var(--accent-color)" /> System Administration
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Management console for AgroAI ecosystem.</p>
        </div>
        <button onClick={fetchData} className="glass-button">
          <RefreshCcw size={18} /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {['overview', 'users', 'predictions', 'messages'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
            className={`glass-button ${activeTab === tab ? 'active' : ''}`}
            style={{ 
              background: activeTab === tab ? 'var(--accent-color)' : 'transparent',
              color: activeTab === tab ? '#000' : 'var(--text-primary)',
              border: 'none',
              padding: '0.8rem 1.5rem'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)', background: 'rgba(239,68,68,0.1)' }}>
          <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="overview">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <Users color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Registered Users</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{data.stats?.users}</div>
              </div>
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <Activity color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total AI Diagnostics</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{data.stats?.predictions}</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '1.5rem' }}>Recent System Activity</h3>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              {data.recentActivity.map((p, idx) => (
                <div key={p._id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1rem', borderBottom: idx === data.recentActivity.length - 1 ? 'none' : '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={normalizeImageUrl(p.imageUrl)} alt="Crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.crop}: {p.diseaseName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>by {p.userId?.name || 'Guest'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(p.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="users">
            <div className="glass-input-wrapper" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search users by name or email..." 
                className="glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1.2rem' }}>User</th>
                    <th style={{ padding: '1.2rem' }}>Role</th>
                    <th style={{ padding: '1.2rem' }}>Joined</th>
                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '1.2rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                          background: u.role === 'admin' ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                          color: u.role === 'admin' ? '#000' : 'inherit'
                        }}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteUser(u._id)} 
                          className="glass-button icon-only" 
                          style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                          disabled={u.role === 'admin'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="predictions">
            <div className="glass-input-wrapper" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search by crop, disease, or user..." 
                className="glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1.2rem' }}>Diagnostic</th>
                    <th style={{ padding: '1.2rem' }}>User</th>
                    <th style={{ padding: '1.2rem' }}>Confidence</th>
                    <th style={{ padding: '1.2rem' }}>Date</th>
                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                            <img src={normalizeImageUrl(p.imageUrl)} alt="Crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.crop}</div>
                            <div style={{ fontSize: '0.85rem', color: p.diseaseName?.toLowerCase() === 'healthy' ? 'var(--accent-color)' : 'var(--danger)' }}>
                              {p.diseaseName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>
                        {p.userId?.name || <span style={{ opacity: 0.5 }}>Guest</span>}
                      </td>
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ fontWeight: 700, color: getConfidenceColor(p.confidenceScore) }}>{p.confidenceScore}%</div>
                      </td>
                      <td style={{ padding: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeletePrediction(p._id)} 
                          className="glass-button icon-only" 
                          style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="messages">
            <div className="glass-input-wrapper" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1.2rem' }}>From</th>
                    <th style={{ padding: '1.2rem' }}>Subject</th>
                    <th style={{ padding: '1.2rem' }}>Message</th>
                    <th style={{ padding: '1.2rem' }}>Date</th>
                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedback.map(f => (
                    <tr key={f._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.email}</div>
                      </td>
                      <td style={{ padding: '1.2rem', fontWeight: 600 }}>{f.subject}</td>
                      <td style={{ padding: '1.2rem' }}>
                        <div style={{ maxWidth: '300px', fontSize: '0.9rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.message}>
                          {f.message}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteFeedback(f._id)} 
                          className="glass-button icon-only" 
                          style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFeedback.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No messages found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
