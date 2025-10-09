import React from 'react';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import HoroscopePage from './pages/HoroscopePage';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="container">
    <h2>{title}</h2>
    <p>Coming soon in v2…</p>
  </div>
);

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user?.token) {
    const returnTo = encodeURIComponent(`${loc.pathname}${loc.search || ''}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const { items } = useCart();
  const { user } = useAuth();
  const count = items.reduce((s, i) => s + i.qty, 0);
  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-inner">
          <h1 className="brand">Your daily AI-horoscope</h1>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            {user?.token ? (
              <Link to="/profile">User profile</Link>
            ) : (
              <Link to="/login?returnTo=%2Fprofile">User profile</Link>
            )}
            <Link to="/cart" style={{ position: 'relative' }}>
              Cart
              {count > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -10, background: '#38bdf8', color: '#00111c', borderRadius: 999, padding: '0 6px', fontSize: 12 }}>{count}</span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '1rem' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/products" element={<Products />} />
          <Route path="/checkout" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/horoscope" element={<HoroscopePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">© {new Date().getFullYear()} AI‑horoscope</div>
      </footer>
    </div>
  );
};

export default App;
