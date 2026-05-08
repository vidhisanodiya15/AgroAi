import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Prediction from './pages/Prediction';
import Admin from './pages/Admin';
import ChatbotPage from './pages/ChatbotPage';
import Contact from './pages/Contact';
import Weather from './pages/Weather';
import NotFound from './pages/NotFound';
import { auth } from './utils/auth';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WeatherProvider } from './contexts/WeatherContext';

// Navigation Guard Component: Ensures only authorized users can access specific routes
const ProtectedRoute = ({ children, user, roleRequired }) => {
  // If user is not logged in, redirect them to the Auth (Login) page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  // If a specific role is required (like 'admin') and the user doesn't have it, redirect to Home
  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to="/" replace />;
  }
  // Otherwise, allow access to the page
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const session = auth.getCurrentUser();
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  return (
    <ThemeProvider>
      <LanguageProvider>
        <WeatherProvider>
          <Router>
          <Routes>
            <Route path="/" element={<Layout user={user} setUser={setUser} />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="auth" element={!user ? <Auth setUser={setUser} /> : <Navigate to="/dashboard" />} />
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute user={user}>
                    <Dashboard user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="prediction" 
                element={
                  <ProtectedRoute user={user}>
                    <Prediction user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route path="chatbot" element={<ChatbotPage />} />
              <Route path="contact" element={<Contact />} />
              <Route path="weather" element={<Weather />} />
              <Route 
                path="admin" 
                element={
                  <ProtectedRoute user={user} roleRequired="admin">
                    <Admin user={user} />
                  </ProtectedRoute>
                } 
              />
              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Router>
        </WeatherProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
