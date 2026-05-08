import { useState, useEffect } from 'react';

export default function TypingEffect({ text, speed = 50 }) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return (
    <span style={{ borderRight: '2px solid var(--accent-color)', paddingRight: '4px', animation: 'blink 1s step-end infinite' }}>
      {displayedText}
      <style>{`
        @keyframes blink {
          0%, 100% { border-color: transparent; }
          50% { border-color: var(--accent-color); }
        }
      `}</style>
    </span>
  );
}
