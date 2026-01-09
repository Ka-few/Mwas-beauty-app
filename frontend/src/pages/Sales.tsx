import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { getSales, addSale } from '../services/sales.api';
import { getClients } from '../services/clients.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getStylists } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';

export default function Sales() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');

  const fetchAll = async () => {
    setSales(await getSales());
    setClients(await getClients());
    setServices(await getServices());
    setProducts(await getProducts());
    setStylists(await getStylists());
  };

  useEffect(() => { fetchAll(); }, []);

  const handleProductChange = (productId: number) => {
    const exists = selectedProducts.find(p => p.product_id === productId);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 1, selling_price: product.selling_price, name: product.name }]);
      }
    }
  };



  // ... existing code ...

  const updateProductQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Optional: Check stock limit
    if (newQuantity > product.stock_quantity) {
      showToast(`Only ${product.stock_quantity} items in stock!`, 'error');
      return;
    }

    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, quantity: newQuantity } : p
    ));
  };

  const handleAddSale = async () => {
    if (!selectedClient) {
      showToast('Please select a client', 'error');
      return;
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      showToast('Please select at least one service or product', 'error');
      return;
    }

    try {
      const response = await addSale({
        client_id: selectedClient,
        payment_method: paymentMethod,
        services: selectedServices,
        products: selectedProducts
      });

      // Reset form
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedProducts([]);
      setPaymentMethod('CASH');

      // Refresh data
      fetchAll();

      showToast('Sale completed successfully!', 'success');

      // Ask to print receipt
      if (confirm('Sale recorded! Do you want to print the receipt?')) {
        printReceipt(response.sale_id, response.totalAmount, selectedServices, selectedProducts, paymentMethod);
      }

    } catch (error) {
      console.error("Sale Error", error);
      showToast('Failed to record sale.', 'error');
    }
  };

  const printReceipt = (saleId: number, total: number, servicesList: any[], productsList: any[], method: string) => {
    const clientName = clients.find(c => c.id === selectedClient)?.name || 'Walk-in Client';
    const date = new Date().toLocaleString();

    const receiptContent = `
        <html>
          <head>
            <title>Receipt #${saleId}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 72mm; /* Slightly less than 80mm to avoid overflow */
                margin: 4mm auto; 
                padding: 0;
                color: black;
              }
              .header { 
                text-align: center; 
                margin-bottom: 8px; 
                padding-bottom: 8px; 
                border-bottom: 1px dashed black; 
              }
              h3 { margin: 5px 0; font-size: 16px; font-weight: bold; }
              p { margin: 2px 0; }
              .item { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 4px;
                font-size: 12px;
              }
              .item span:first-child { text-align: left; }
              .item span:last-child { text-align: right; min-width: 50px; }
              .total { 
                border-top: 1px dashed black; 
                margin-top: 8px; 
                padding-top: 6px; 
                font-weight: bold; 
                font-size: 14px;
                display: flex; 
                justify-content: space-between; 
              }
              .footer { 
                text-align: center; 
                margin-top: 15px; 
                font-size: 10px; 
                border-top: 1px dotted #ccc;
                padding-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>MWAS BEAUTY</h3>
              <p>Receipt #${saleId}</p>
              <p>${date}</p>
              <p>Client: ${clientName}</p>
              <p>Payment: ${method}</p>
            </div>
            
            <div class="items">
              ${servicesList.length > 0 ? '<p style="font-weight:bold; margin: 5px 0; font-size: 11px; text-decoration: underline;">SERVICES</p>' : ''}
              ${servicesList.map(s => `
                <div class="item">
                  <span>${s.name}</span>
                  <span>${s.price.toLocaleString()}</span>
                </div>
              `).join('')}
              
              ${productsList.length > 0 ? '<p style="font-weight:bold; margin: 10px 0 5px; font-size: 11px; text-decoration: underline;">PRODUCTS</p>' : ''}
              ${productsList.map(p => `
                <div class="item">
                  <span>${p.name} (x${p.quantity})</span>
                  <span>${(p.selling_price * p.quantity).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total">
              <span>TOTAL</span>
              <span>KES ${total.toLocaleString()}</span>
            </div>
            
            <div class="footer">
              <p>Thank you for visiting!</p>
              <p>Karibu Tena</p>
            </div>
          </body>
        </html>
      `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
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

      {/* Client & Payment Selection */}
      <div className="bg-white p-4 rounded shadow mb-6 border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-end">
        <div className="w-full md:w-1/2">
          <label className="block text-gray-700 font-bold mb-2">Client</label>
          <select value={selectedClient || ''} onChange={e => setSelectedClient(Number(e.target.value))} className="border p-2 rounded w-full bg-gray-50">
            <option value="">-- Select Client --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-gray-700 font-bold mb-2">Payment Method</label>
          <select value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)} className="border p-2 rounded w-full bg-gray-50 font-medium text-purple-900">
            <option value="CASH">Cash</option>
            <option value="MPESA">Mpesa</option>
          </select>
        </div>
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

          <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
            {filteredProducts.map(product => {
              const selectedItem = selectedProducts.find(p => p.product_id === product.id);
              const isSelected = !!selectedItem;

              return (
                <div key={product.id} className={`p-2 rounded border transition-colors ${isSelected ? 'bg-gold-50 border-gold-300' : 'hover:bg-gray-50 border-transparent'}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => handleProductChange(product.id)}>
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

                  {isSelected && (
                    <div className="mt-2 pl-6 flex items-center gap-3">
                      <span className="text-xs text-gray-500 uppercase font-bold">Quantity:</span>
                      <button
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                        onClick={() => updateProductQuantity(product.id, selectedItem.quantity - 1)}
                      >-</button>
                      <span className="font-bold w-6 text-center">{selectedItem.quantity}</span>
                      <button
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                        onClick={() => updateProductQuantity(product.id, selectedItem.quantity + 1)}
                      >+</button>

                      <div className="ml-auto text-sm font-bold text-purple-700">
                        Sub: KES {(selectedItem.selling_price * selectedItem.quantity).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredProducts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No products found</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={handleAddSale} className="btn-gold text-lg px-8 py-3 shadow-lg transform hover:scale-105 transition-transform font-bold text-purple-900">Complete Sale</button>
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
