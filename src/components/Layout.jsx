import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ user, setUser }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} setUser={setUser} />
      <main className="container animate-fade-in delay-100" style={{ flex: 1, padding: '6rem 1rem 2rem 1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
