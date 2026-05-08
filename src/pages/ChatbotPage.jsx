import Chatbot from '../components/Chatbot';
import { Sparkles } from 'lucide-react';

export default function ChatbotPage() {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Sparkles color="var(--accent-color)" /> AI Farming Assistant
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
          Ask anything about crop diseases, fertilizers, treatments, and farming practices. Powered by Gemini AI.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '720px', height: '620px' }}>
        <Chatbot inline={true} />
      </div>
    </div>
  );
}
