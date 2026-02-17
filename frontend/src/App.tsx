import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logo from './assets/logo.png';
import Clients from './pages/Clients';
import Stylists from './pages/Stylists';
import Services from './pages/Services';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Users from './pages/Users';
import Expenses from './pages/Expenses';
import Bookings from './pages/Bookings';
import Help from './pages/Help';
import LicenseLock from './pages/LicenseLock';
import { LicenseProvider, useLicense } from './context/LicenseContext';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect staff to their main page (Sales) if they try to access restricted pages
    return <Navigate to="/sales" replace />;
  }

  return <>{children}</>;
}

function Sidebar() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const navigate = useNavigate();

  const { isFeatureAllowed, status, activate } = useLicense();
  const [showActivate, setShowActivate] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [actLoading, setActLoading] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActLoading(true);
    try {
      await activate(activationKey);
      setShowActivate(false);
      setActivationKey('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Activation failed');
    } finally {
      setActLoading(false);
    }
  };

  return (
    <nav className="w-64 min-h-screen bg-purple-900 p-4 text-purple-100 flex flex-col justify-between shadow-xl">
      <div>
        <div className="mb-8 p-2 text-center border-b border-purple-800 pb-4">
          <img src={logo} alt="Mwas Beauty" className="w-24 h-24 mx-auto rounded-full mb-3 border-4 border-gold-500 shadow-lg object-cover" />
          <h1 className="text-2xl font-bold text-gold-500 tracking-wider">MWAS BEAUTY</h1>
          <p className="text-xs text-purple-300 mt-2 uppercase">{user.role}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {user.role === 'admin' && (
            <li>
              <Link to="/" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Dashboard
              </Link>
            </li>
          )}
          <li>
            <Link to="/clients" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
              Clients
            </Link>
          </li>
          {user.role === 'admin' && (
            <li>
              <Link to="/stylists" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Stylists
              </Link>
            </li>
          )}
          {user.role === 'admin' && (
            <>
              <li>
                <Link to="/services" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/products" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                  Products
                </Link>
              </li>
            </>
          )}
          <li>
            <Link to="/sales" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
              Sales
            </Link>
          </li>
          <li>
            <Link to="/bookings" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
              Bookings
            </Link>
          </li>
          {user.role === 'admin' && (
            <li>
              <Link to="/reports" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Reports
              </Link>
            </li>
          )}
          {user.role === 'admin' && isFeatureAllowed('EXPENSES') && (
            <li>
              <Link to="/expenses" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Expenses
              </Link>
            </li>
          )}
          {user.role === 'admin' && isFeatureAllowed('USER_MANAGEMENT') && (
            <li>
              <Link to="/users" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Users
              </Link>
            </li>
          )}
          <li>
            <Link to="/help" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
              Help / Guide
            </Link>
          </li>
        </ul>
      </div>
      <div>
        {status && !status.isActivated && (
          <div className="mb-4 p-3 bg-purple-800 rounded-lg border border-purple-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-purple-300 uppercase">Trial Status</span>
              <span className="text-xs bg-gold-600 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                {status.daysRemaining} days left
              </span>
            </div>
            {!showActivate ? (
              <button
                onClick={() => setShowActivate(true)}
                className="w-full bg-gold-500 hover:bg-gold-600 text-purple-900 text-xs font-black py-2 rounded transition-colors uppercase"
              >
                Activate Pro
              </button>
            ) : (
              <form onSubmit={handleActivate} className="space-y-2 anim-fade-in">
                <input
                  type="text"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                  placeholder="MB-XXXX-XXXX-XXXX"
                  className="w-full bg-purple-900 border border-purple-600 text-white text-xs p-2 rounded outline-none focus:border-gold-500 font-mono"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={actLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 rounded disabled:opacity-50"
                  >
                    {actLoading ? '...' : 'SUBMIT'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActivate(false)}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-1.5 px-3 rounded"
                  >
                    X
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <button onClick={handleLogout} className="w-full text-left p-3 rounded hover:bg-red-800 text-red-200 transition-colors mb-4 block">
          Logout
        </button>
        <div className="text-xs text-purple-400 text-center pb-4">
          &copy; 2024 Mwas Beauty
        </div>
      </div>
    </nav>
  );
}

function Layout() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  // If no user, we might be on login page, so sidebar handles its own null check or we conditionally render layout

  const { status, loading, isFeatureAllowed } = useLicense();

  if (loading) return null;

  return (
    <div className="flex">
      {status?.isExpired && <LicenseLock />}
      {user && <Sidebar />}
      <main className={`flex-1 p-4 ${!user ? 'w-full' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/clients" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Clients />
            </ProtectedRoute>
          } />

          <Route path="/stylists" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Stylists />
            </ProtectedRoute>
          } />

          <Route path="/services" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Services />
            </ProtectedRoute>
          } />

          <Route path="/products" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Products />
            </ProtectedRoute>
          } />

          <Route path="/sales" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Sales />
            </ProtectedRoute>
          } />

          <Route path="/bookings" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Bookings />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute allowedRoles={['admin']}>
              {isFeatureAllowed('EXPENSES') ? <Expenses /> : <Navigate to="/sales" replace />}
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              {isFeatureAllowed('USER_MANAGEMENT') ? <Users /> : <Navigate to="/sales" replace />}
            </ProtectedRoute>
          } />

          <Route path="/help" element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Help />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

import { ToastProvider } from './components/ui/Toast';

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <LicenseProvider>
          <Layout />
        </LicenseProvider>
      </ToastProvider>
    </Router>
  );
}
