import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Clients from './pages/Clients';
import Stylists from './pages/Stylists';
import Services from './pages/Services';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <div className="flex">
        <nav className="w-64 h-screen bg-gray-200 p-4">
          <ul className="flex flex-col gap-2">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/clients">Clients</Link></li>
            <li><Link to="/stylists">Stylists</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/sales">Sales</Link></li>
          </ul>
        </nav>
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/stylists" element={<Stylists />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
