import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function NotFound() {
  return (
    <div className="container" style={{ 
      height: '70vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <FaExclamationTriangle size={80} color="var(--danger)" style={{ marginBottom: '2rem' }} />
      <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
      <h2 style={{ marginBottom: '2rem' }}>Oops! Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '500px' }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link to="/" className="glass-button" style={{ background: 'var(--accent-color)', color: '#fff', textDecoration: 'none' }}>
        Back to Home
      </Link>
    </div>
  );
}
