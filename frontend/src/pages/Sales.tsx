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

  const handleServiceChange = (serviceId: number, stylistId: number) => {
    const existing = selectedServices.find(s => s.service_id === serviceId);
    if (existing) {
      setSelectedServices(selectedServices.map(s => s.service_id === serviceId ? { ...s, stylist_id: stylistId } : s));
    } else {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setSelectedServices([...selectedServices, { service_id: serviceId, stylist_id: stylistId, price: service.price }]);
      }
    }
  };

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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Sales</h1>

      {/* Client Selection */}
      <div className="mb-4">
        <select value={selectedClient || ''} onChange={e => setSelectedClient(Number(e.target.value))} className="border p-2">
          <option value="">Select Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Services Selection */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Services</h2>
        {services.map(service => (
          <div key={service.id} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={!!selectedServices.find(s => s.service_id === service.id)}
              onChange={e => handleServiceChange(service.id, selectedServices.find(s => s.service_id === service.id)?.stylist_id || stylists[0]?.id)}
            />
            <span>{service.name} (KES {service.price})</span>
            {selectedServices.find(s => s.service_id === service.id) && (
              <select
                value={selectedServices.find(s => s.service_id === service.id)?.stylist_id || stylists[0]?.id}
                onChange={e => handleServiceChange(service.id, Number(e.target.value))}
                className="border p-1 ml-2"
              >
                {stylists.map(stylist => (
                  <option key={stylist.id} value={stylist.id}>{stylist.name}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Products Selection */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Products</h2>
        {products.map(product => (
          <div key={product.id} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={!!selectedProducts.find(p => p.product_id === product.id)}
              onChange={() => handleProductChange(product.id)}
            />
            <span>{product.name} (KES {product.selling_price})</span>
          </div>
        ))}
      </div>

      <button onClick={handleAddSale} className="bg-green-500 text-white px-4 py-2 rounded">Add Sale</button>

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
