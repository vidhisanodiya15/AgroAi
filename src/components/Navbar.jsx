import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaLeaf, FaBell, FaUserCircle, FaGlobe, FaMoon, FaSun, 
  FaBars, FaTimes, FaHistory, FaSignOutAlt, 
  FaRobot, FaInfoCircle, FaHome, FaPhoneAlt, FaCloudSun, FaShieldAlt
} from 'react-icons/fa';
import { auth } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Dropdown States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New disease outbreak reported in your area", read: false, time: "2h ago" },
    { id: 2, text: "Weather alert: Heavy rain expected tomorrow", read: false, time: "5h ago" },
    { id: 3, text: "Your prediction history has been updated", read: true, time: "1d ago" }
  ]);

  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userMenuRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${(totalScroll / windowHeight) * 100}%`;
      setScrollProgress(scroll);
      setIsScrolled(totalScroll > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to handle user logout
  const handleLogout = () => {
    auth.logout(); 
    setUser(null); 
    navigate('/'); 
    setIsMenuOpen(false); 
  };

  // Configuration for Navigation Links
  const navItems = [
    { name: t('nav_home'), path: '/', icon: <FaHome /> },
    { name: t('nav_about'), path: '/about', icon: <FaInfoCircle /> },
    { name: t('nav_prediction'), path: '/prediction', icon: <FaLeaf /> },
    { name: t('nav_chatbot'), path: '/chatbot', icon: <FaRobot /> },
    { name: t('nav_weather'), path: '/weather', icon: <FaCloudSun /> },
    { name: t('nav_contact'), path: '/contact', icon: <FaPhoneAlt /> }
  ];

  return (
    <nav className={`glass-panel ${isScrolled ? 'scrolled' : ''}`} 
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
        borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        padding: isScrolled ? '0.6rem 2rem' : '1rem 2rem',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" style={{ width: scrollProgress }}></div>
      </div>

      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '100%' }}>
        {/* Logo Section */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'var(--accent-color)', flexShrink: 0 }}>
          <FaLeaf size={28} />
          <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)' }}>
            Agro<span style={{ color: 'var(--accent-color)' }}>AI</span>
          </h2>
        </Link>

        {/* Center: Desktop Navigation */}
        <div className="desktop-nav" style={{ display: 'flex', gap: '2rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {navItems.map((item, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {item.name}
              </NavLink>
            </div>
          ))}
          {user && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaHistory /> {t('nav_history')}
            </NavLink>
          )}
        </div>

        {/* Right Section Tools */}
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexShrink: 0 }}>

          {/* Quick Actions Group */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notificationRef}>
              <button 
                className="glass-button icon-only" 
                style={{ 
                  padding: '0.6rem', 
                  borderColor: isNotificationsOpen ? 'var(--accent-color)' : 'var(--glass-border)',
                  background: isNotificationsOpen ? 'rgba(43, 209, 94, 0.2)' : 'rgba(43, 209, 94, 0.1)'
                }} 
                onClick={toggleNotifications}
                data-tooltip="Notifications"
              >
                <div style={{ position: 'relative' }}>
                  <FaBell size={18} style={{ color: isNotificationsOpen ? 'var(--accent-color)' : 'inherit' }} />
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </div>
              </button>

              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <div className="dropdown-menu animate-slide-down" 
                  style={{ 
                    display: 'block', 
                    opacity: 1, 
                    visibility: 'visible', 
                    right: 0, 
                    left: 'auto', 
                    width: '320px', 
                    padding: 0,
                    transform: 'translateY(0)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>{t('nav_notifications')}</h4>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', transition: 'background 0.3s' }}
                        className="hover-light"
                      >
                        {t('nav_mark_read')}
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          }}
                          style={{ 
                            padding: '1rem', 
                            borderBottom: '1px solid var(--glass-border)', 
                            background: notif.read ? 'transparent' : 'rgba(43, 209, 94, 0.08)',
                            transition: 'all 0.3s',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          className="notification-item"
                        >
                          {!notif.read && (
                            <div style={{ position: 'absolute', left: '8px', top: '1.2rem', width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%' }}></div>
                          )}
                          <div style={{ paddingLeft: notif.read ? '0' : '12px' }}>
                            <div style={{ fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '0.3rem', color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: notif.read ? 'normal' : '600' }}>
                              {notif.text}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', opacity: 0.8 }}>
                              {notif.time}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                        <FaBell size={32} style={{ color: 'var(--glass-border)', marginBottom: '1rem' }} />
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('nav_no_notifications')}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.8rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                    <Link to="/dashboard" onClick={() => setIsNotificationsOpen(false)} style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>
                      {t('nav_view_all')}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button className="glass-button icon-only hide-mobile" onClick={toggleTheme} style={{ padding: '0.6rem' }} data-tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>

            <button className="glass-button hide-mobile" onClick={toggleLanguage} style={{ padding: '0.6rem 1rem' }}>
              <FaGlobe size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{language.toUpperCase()}</span>
            </button>
          </div>

          {/* User Section */}
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>

            {user ? (
              <div className="has-dropdown" style={{ position: 'relative' }} ref={userMenuRef}>
                <div 
                  className="glass-button profile-btn" 
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '50px',
                    borderColor: isUserMenuOpen ? 'var(--accent-color)' : 'var(--glass-border)',
                    background: isUserMenuOpen ? 'rgba(43, 209, 94, 0.2)' : 'rgba(43, 209, 94, 0.1)'
                  }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <FaUserCircle size={22} />
                  <span className="hide-mobile" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name?.split(' ')[0]}</span>
                </div>
                <div className="dropdown-menu animate-slide-down" style={{ 
                  left: 'auto', 
                  right: 0,
                  display: isUserMenuOpen ? 'block' : 'none',
                  opacity: isUserMenuOpen ? 1 : 0,
                  visibility: isUserMenuOpen ? 'visible' : 'hidden',
                  transform: isUserMenuOpen ? 'translateY(0)' : 'translateY(10px)'
                }}>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setIsUserMenuOpen(false)}><FaUserCircle /> {t('nav_profile')}</Link>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setIsUserMenuOpen(false)}><FaHistory /> {t('nav_history')}</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="dropdown-item" onClick={() => setIsUserMenuOpen(false)} style={{ color: 'var(--accent-color)' }}>
                      <FaShieldAlt /> Admin Panel
                    </Link>
                  )}
                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>
                  <div onClick={handleLogout} className="dropdown-item" style={{ color: 'var(--danger)' }}>
                    <FaSignOutAlt /> {t('nav_logout')}
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="glass-button" style={{ textDecoration: 'none', fontWeight: 600 }}>
                {t('nav_login')}
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="mobile-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            position: 'fixed', top: '75px', left: '1rem', right: '1rem', 
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem',
            zIndex: 1999, maxHeight: '85vh', overflowY: 'auto'
          }}
        >
          {navItems.map((item, idx) => (
            <div key={idx}>
              <NavLink to={item.path} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }} onClick={() => setIsMenuOpen(false)}>
                {item.icon} {item.name}
              </NavLink>
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="glass-button" style={{ justifyContent: 'center' }}>
              {theme === 'dark' ? <FaSun /> : <FaMoon />} {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button onClick={() => { toggleLanguage(); setIsMenuOpen(false); }} className="glass-button" style={{ justifyContent: 'center' }}>
              <FaGlobe /> {language.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1200px) {
          .desktop-nav { gap: 1rem !important; }
        }
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
          .cta-button { display: none !important; }
        }
        @media (max-width: 600px) {
          .profile-btn span { display: none; }
          .glass-button { padding: 0.5rem !important; }
        }
      `}</style>
    </nav>
  );
}
