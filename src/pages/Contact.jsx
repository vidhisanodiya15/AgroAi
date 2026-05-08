import React, { useState } from 'react';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaPaperPlane } from 'react-icons/fa';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send message.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Contact Us</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto 4rem' }}>
        Have questions? We're here to help. Reach out to our agricultural experts and technical team.
      </p>

      {status.message && (
        <div style={{ 
          maxWidth: '600px', 
          margin: '0 auto 2rem', 
          padding: '1rem', 
          borderRadius: '12px', 
          background: status.type === 'success' ? 'rgba(43, 209, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${status.type === 'success' ? 'var(--accent-color)' : 'var(--danger)'}`,
          color: status.type === 'success' ? 'var(--accent-color)' : 'var(--danger)',
          textAlign: 'center'
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
            <FaPhoneAlt size={24} />
          </div>
          <h3>Phone</h3>
          <p style={{ color: 'var(--text-secondary)' }}>+91 1800-AGRO-AI</p>
          <p style={{ color: 'var(--text-secondary)' }}>+91 98765 43210</p>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
            <FaEnvelope size={24} />
          </div>
          <h3>Email</h3>
          <p style={{ color: 'var(--text-secondary)' }}>support@agroai.com</p>
          <p style={{ color: 'var(--text-secondary)' }}>info@agroai.com</p>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
            <FaMapMarkerAlt size={24} />
          </div>
          <h3>Location</h3>
          <p style={{ color: 'var(--text-secondary)' }}>123 Agri-Tech Park, Sector 45</p>
          <p style={{ color: 'var(--text-secondary)' }}>New Delhi, India</p>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '4rem', padding: '3rem' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Send us a Message</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="glass-input" 
              placeholder="Name" 
              required 
            />
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="glass-input" 
              placeholder="Email" 
              required 
            />
          </div>
          <input 
            type="text" 
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="glass-input" 
            placeholder="Subject" 
            required 
          />
          <textarea 
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="glass-input" 
            placeholder="Message" 
            style={{ height: '150px', resize: 'none' }}
            required
          ></textarea>
          <button 
            type="submit" 
            disabled={loading}
            className="glass-button" 
            style={{ background: 'var(--accent-color)', color: '#000', fontWeight: 'bold', justifyContent: 'center' }}
          >
            {loading ? 'Sending...' : <><FaPaperPlane /> Send Message</>}
          </button>
        </form>
      </div>
    </div>
  );
}
