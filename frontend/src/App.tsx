import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

  if (!user) return null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="w-64 h-screen bg-purple-900 p-4 text-purple-100 flex flex-col justify-between shadow-xl">
      <div>
        <div className="mb-8 p-2 text-center border-b border-purple-800 pb-4">
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
          {user.role === 'admin' && (
            <li>
              <Link to="/reports" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Reports
              </Link>
            </li>
          )}
          {user.role === 'admin' && (
            <li>
              <Link to="/expenses" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Expenses
              </Link>
            </li>
          )}
          {user.role === 'admin' && (
            <li>
              <Link to="/users" className="block p-3 rounded hover:bg-purple-800 hover:text-gold-400 transition-colors">
                Users
              </Link>
            </li>
          )}
        </ul>
      </div>
      <div>
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

  return (
    <div className="flex">
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

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Expenses />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
