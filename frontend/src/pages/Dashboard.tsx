import { useEffect, useState } from 'react';
import { getClients } from '../services/clients.api';
import { getStylists } from '../services/stylists.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getSales, getAnalytics } from '../services/sales.api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    stylists: 0,
    services: 0,
    products: 0,
    sales: 0
  });
  const [analytics, setAnalytics] = useState<any>({ stylistPerformance: [], topProducts: [] });

  const fetchStats = async () => {
    const clients = await getClients();
    const stylists = await getStylists();
    const services = await getServices();
    const products = await getProducts();
    const sales = await getSales();
    const analyticsData = await getAnalytics();

    setStats({
      clients: clients.length,
      stylists: stylists.length,
      services: services.length,
      products: products.length,
      sales: sales.length
    });
    setAnalytics(analyticsData);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-purple-900 border-b-4 border-gold-500 inline-block pb-2">Salon Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        <div className="bg-purple-800 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200 border border-purple-700">
          <h2 className="text-lg font-medium text-purple-200 uppercase tracking-wide">Clients</h2>
          <p className="text-4xl font-bold text-gold-400 mt-2">{stats.clients}</p>
        </div>
        <div className="bg-white text-purple-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200 border border-purple-100">
          <h2 className="text-lg font-medium text-purple-600 uppercase tracking-wide">Stylists</h2>
          <p className="text-4xl font-bold text-purple-900 mt-2">{stats.stylists}</p>
        </div>
        <div className="bg-purple-800 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200 border border-purple-700">
          <h2 className="text-lg font-medium text-purple-200 uppercase tracking-wide">Services</h2>
          <p className="text-4xl font-bold text-gold-400 mt-2">{stats.services}</p>
        </div>
        <div className="bg-white text-purple-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200 border border-purple-100">
          <h2 className="text-lg font-medium text-purple-600 uppercase tracking-wide">Products</h2>
          <p className="text-4xl font-bold text-purple-900 mt-2">{stats.products}</p>
        </div>
        <div className="bg-gold-500 text-purple-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h2 className="text-lg font-bold text-purple-900 uppercase tracking-wide">Sales</h2>
          <p className="text-4xl font-bold mt-2">{stats.sales}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Stylist Performance</h2>
          <div className="space-y-4">
            {analytics.stylistPerformance.map((s: any, index: number) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-gold-400 text-purple-900' : 'bg-purple-100 text-purple-800'}`}>{index + 1}</div>
                  <div>
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.service_count} Services</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-900">KES {s.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 font-medium">Comm: {s.commission_earned.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {analytics.stylistPerformance.length === 0 && <p className="text-gray-400 italic">No performance data yet.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Top Products</h2>
          <div className="space-y-4">
            {analytics.topProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">Stock: {p.stock_quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-900">{p.units_sold} Sold</p>
                  <p className="text-xs text-green-600 font-medium">Profit: KES {p.total_profit.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Rev: KES {p.total_revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {analytics.topProducts.length === 0 && <p className="text-gray-400 italic">No product sales yet.</p>}
          </div>
        </div>
      </div>

      <div className="p-8 bg-white rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-purple-900">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <a href="/clients" className="btn-purple">Manage Clients</a>
          <a href="/stylists" className="btn-purple">Manage Stylists</a>
          <a href="/services" className="btn-purple">Manage Services</a>
          <a href="/products" className="btn-purple">Manage Products</a>
          <a href="/sales" className="btn-gold shadow-md">View Sales</a>
        </div>
      </div>
    </div>
  );
}
