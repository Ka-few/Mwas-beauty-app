import { useEffect, useState } from 'react';
import { getClients } from '../services/clients.api';
import { getStylists } from '../services/stylists.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getSales, getAnalytics } from '../services/sales.api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    stylists: 0,
    services: 0,
    products: 0,
    sales: 0
  });
  const [analytics, setAnalytics] = useState<any>({ stylistPerformance: [], topProducts: [], salesOverTime: [] });

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
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
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h2 className="text-lg font-bold uppercase tracking-wide">Daily Sales</h2>
          <p className="text-4xl font-bold mt-2">{analytics.dailySales?.count || 0}</p>
          <p className="text-sm mt-1 opacity-90">KES {(analytics.dailySales?.revenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gold-500 text-purple-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h2 className="text-lg font-bold text-purple-900 uppercase tracking-wide">Total Sales</h2>
          <p className="text-4xl font-bold mt-2">{stats.sales}</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-10">
        <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Sales Over Time</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.salesOverTime}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
          {(!analytics.salesOverTime || analytics.salesOverTime.length === 0) && (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-400 italic">No sales data recorded yet.</p>
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Stylist Performance</h2>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
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
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {analytics.topProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-5 rounded">
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
    </div>
  );
}

