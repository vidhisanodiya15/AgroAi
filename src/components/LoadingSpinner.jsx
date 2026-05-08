import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 48, color = 'var(--accent-color)', message }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 size={size} color={color} />
      </motion.div>
      {message && <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
