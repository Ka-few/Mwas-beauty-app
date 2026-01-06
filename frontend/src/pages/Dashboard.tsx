import { useEffect, useState } from 'react';
import { getClients } from '../services/clients.api';
import { getStylists } from '../services/stylists.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getSales } from '../services/sales.api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    stylists: 0,
    services: 0,
    products: 0,
    sales: 0
  });

  const fetchStats = async () => {
    const clients = await getClients();
    const stylists = await getStylists();
    const services = await getServices();
    const products = await getProducts();
    const sales = await getSales();

    setStats({
      clients: clients.length,
      stylists: stylists.length,
      services: services.length,
      products: products.length,
      sales: sales.length
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Salon Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-blue-500 text-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-3xl">{stats.clients}</p>
        </div>
        <div className="bg-green-500 text-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Stylists</h2>
          <p className="text-3xl">{stats.stylists}</p>
        </div>
        <div className="bg-yellow-500 text-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Services</h2>
          <p className="text-3xl">{stats.services}</p>
        </div>
        <div className="bg-purple-500 text-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-3xl">{stats.products}</p>
        </div>
        <div className="bg-red-500 text-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Sales</h2>
          <p className="text-3xl">{stats.sales}</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded shadow">
        <h2 className="font-bold mb-2">Quick Links</h2>
        <div className="flex gap-4">
          <a href="/clients" className="bg-blue-500 text-white px-4 py-2 rounded">Clients</a>
          <a href="/stylists" className="bg-green-500 text-white px-4 py-2 rounded">Stylists</a>
          <a href="/services" className="bg-yellow-500 text-white px-4 py-2 rounded">Services</a>
          <a href="/products" className="bg-purple-500 text-white px-4 py-2 rounded">Products</a>
          <a href="/sales" className="bg-red-500 text-white px-4 py-2 rounded">Sales</a>
        </div>
      </div>
    </div>
  );
}
