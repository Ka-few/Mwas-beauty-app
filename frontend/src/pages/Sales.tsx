import { useEffect, useState } from 'react';
import { getSales, addSale } from '../services/sales.api';
import { getClients } from '../services/clients.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getStylists } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const fetchAll = async () => {
    setSales(await getSales());
    setClients(await getClients());
    setServices(await getServices());
    setProducts(await getProducts());
    setStylists(await getStylists());
  };

  useEffect(() => { fetchAll(); }, []);

  // handleServiceChange removed in favor of addService/removeService/updateServiceStylist

  const handleProductChange = (productId: number) => {
    const exists = selectedProducts.find(p => p.product_id === productId);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 1, selling_price: product.selling_price }]);
      }
    }
  };

  const handleAddSale = async () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    await addSale({
      client_id: selectedClient,
      payment_method: 'CASH',
      services: selectedServices,
      products: selectedProducts
    });
    setSelectedClient(null);
    setSelectedServices([]);
    setSelectedProducts([]);
    fetchAll();
  };


  const [productSearch, setProductSearch] = useState('');

  const availableServices = services.filter(s => !selectedServices.find(ss => ss.service_id === s.id));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const addService = (serviceId: string) => {
    if (!serviceId) return;
    const sId = Number(serviceId);
    const service = services.find(s => s.id === sId);
    if (service) {
      setSelectedServices([...selectedServices, { service_id: sId, stylist_id: stylists[0]?.id, price: service.price, name: service.name }]);
    }
  };

  const removeService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter(s => s.service_id !== serviceId));
  };

  const updateServiceStylist = (serviceId: number, stylistId: number) => {
    setSelectedServices(selectedServices.map(s => s.service_id === serviceId ? { ...s, stylist_id: stylistId } : s));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-6 text-purple-900 border-b-2 border-gold-500 inline-block">Record Sales</h1>

      {/* Client Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 font-bold mb-2">Client</label>
        <select value={selectedClient || ''} onChange={e => setSelectedClient(Number(e.target.value))} className="border p-2 rounded w-full max-w-md bg-white">
          <option value="">-- Select Client --</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Services Selection */}
        <div className="bg-white p-4 rounded shadow border border-gray-100">
          <h2 className="font-bold mb-4 text-purple-800 border-b pb-2">Services</h2>

          <div className="mb-4">
            <select
              className="border p-2 rounded w-full mb-2 bg-gray-50"
              onChange={(e) => addService(e.target.value)}
              value=""
            >
              <option value="">+ Add Service...</option>
              {availableServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} - KES {s.price}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {selectedServices.map(item => (
              <div key={item.service_id} className="flex flex-col p-3 bg-purple-50 rounded border border-purple-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-purple-900">{item.name}</span>
                  <button onClick={() => removeService(item.service_id)} className="text-red-500 text-sm hover:text-red-700 font-medium">Remove</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Stylist:</label>
                  <select
                    value={item.stylist_id}
                    onChange={(e) => updateServiceStylist(item.service_id, Number(e.target.value))}
                    className="border p-1 rounded text-sm bg-white flex-1"
                  >
                    {stylists.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {selectedServices.length === 0 && <p className="text-gray-400 text-sm italic">No services selected</p>}
          </div>
        </div>

        {/* Products Selection */}
        <div className="bg-white p-4 rounded shadow border border-gray-100">
          <h2 className="font-bold mb-4 text-purple-800 border-b pb-2">Products</h2>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="border p-2 rounded w-full bg-gray-50"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1 pr-2">
            {filteredProducts.map(product => {
              const isSelected = !!selectedProducts.find(p => p.product_id === product.id);
              return (
                <div key={product.id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-gold-100 border-gold-300 border' : 'hover:bg-gray-50 border border-transparent'}`} onClick={() => handleProductChange(product.id)}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }} // handled by div click
                      className="pointer-events-none"
                    />
                    <span className={isSelected ? 'font-medium text-purple-900' : 'text-gray-700'}>{product.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">KES {product.selling_price}</span>
                </div>
              );
            })}
            {filteredProducts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No products found</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={handleAddSale} className="btn-gold text-lg px-8 py-3 shadow-lg transform hover:scale-105 transition-transform">Complete Sale</button>
      </div>

      {/* Sales Table */}
      <div className="mt-6">
        <h2 className="font-bold mb-2">All Sales</h2>
        <DataTable
          columns={['id', 'client_id', 'total_amount', 'payment_method', 'status']}
          data={sales}
        />
      </div>
    </div>
  );
}
