import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { getSales, addSale, completeSale, getSaleDetails } from '../services/sales.api';
import { getClients } from '../services/clients.api';
import { getServices } from '../services/services.api';
import { getProducts } from '../services/products.api';
import { getStylists } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/logo.png';

// Fix for jspdf-autotable type definition if needed
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function Sales() {
  const location = useLocation();
  const { showToast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Mpesa'>('Cash');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [mpesaCode, setMpesaCode] = useState('');
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);
  const [hasInitialFilled, setHasInitialFilled] = useState(false);

  const fetchAll = async () => {
    try {
      const [salesData, clientsData, servicesData, productsData, stylistsData] = await Promise.all([
        getSales().catch(err => { console.error('Sales fetch error', err); return []; }),
        getClients().catch(err => { console.error('Clients fetch error', err); return []; }),
        getServices().catch(err => { console.error('Services fetch error', err); return []; }),
        getProducts().catch(err => { console.error('Products fetch error', err); return []; }),
        getStylists().catch(err => { console.error('Stylists fetch error', err); return []; })
      ]);

      setSales(Array.isArray(salesData) ? salesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setStylists(Array.isArray(stylistsData) ? stylistsData : []);

    } catch (error) {
      console.error("Critical error loading sales data", error);
      showToast('Failed to load some data modules. Check connection.', 'error');
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Handle auto-fill from booking redirection
  useEffect(() => {
    const bookingData = location.state?.bookingData;
    if (bookingData && stylists.length > 0 && services.length > 0 && !hasInitialFilled) {
      console.log('Auto-filling sale from booking:', bookingData);

      // Fill client - if client_id is null, it's a walk-in, so leave selectedClient null
      if (bookingData.client_id) {
        setSelectedClient(bookingData.client_id);
      }

      // Fill services
      if (bookingData.services && Array.isArray(bookingData.services)) {
        const mappedServices = bookingData.services.map((bs: any) => {
          const serviceInfo = services.find(s => s.id === bs.service_id);
          return {
            service_id: bs.service_id,
            stylist_id: bs.stylist_id || stylists[0]?.id,
            price: serviceInfo?.price || 0,
            name: serviceInfo?.name || 'Unknown Service'
          };
        });
        setSelectedServices(mappedServices);
      }

      setHasInitialFilled(true);
      showToast(`Loaded details from ${bookingData.customer_name}'s booking`, 'success');
    }
  }, [location.state, stylists, services, hasInitialFilled, showToast]);

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

  const handleRecordSale = async (isPending: boolean) => {
    if (!selectedClient) {
      showToast('Please select a client', 'error');
      return;
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      showToast('Please select at least one service or product', 'error');
      return;
    }

    if (!isPending && paymentMethod === 'Mpesa' && !mpesaCode) {
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      const saleData = {
        client_id: selectedClient,
        payment_method: isPending ? 'PENDING' : paymentMethod,
        status: isPending ? 'PENDING' : 'COMPLETED',
        services: selectedServices.map(s => ({ service_id: s.service_id, stylist_id: s.stylist_id, price: s.price })),
        products: selectedProducts.map(p => ({ product_id: p.product_id, quantity: p.quantity, selling_price: p.selling_price })),
        mpesa_code: (!isPending && paymentMethod === 'Mpesa') ? mpesaCode : null
      };

      const response = await addSale(saleData);

      // Print receipt
      printReceipt(
        response.sale_id,
        response.totalAmount,
        selectedServices,
        selectedProducts,
        isPending ? 'PENDING' : paymentMethod
      );

      // Reset form
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedProducts([]);
      setPaymentMethod('Cash');
      setMpesaCode('');
      setIsPaymentModalOpen(false);

      // Refresh data
      fetchAll();

      showToast(isPending ? 'Billing recorded and receipt generated!' : 'Sale completed successfully!', 'success');

    } catch (error) {
      console.error("Sale Error", error);
      showToast('Failed to record sale.', 'error');
    }
  };

  const handleCompleteExistingSale = async (sale: any) => {
    setSelectedSaleForPayment(sale);
    setIsPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    if (paymentMethod === 'Mpesa' && !mpesaCode) {
      showToast('M-Pesa confirmation code is required', 'error');
      return;
    }

    try {
      if (selectedSaleForPayment) {
        // Completing an existing pending sale
        await completeSale(selectedSaleForPayment.id, {
          payment_method: paymentMethod,
          mpesa_code: mpesaCode
        });
        showToast('Payment completed!', 'success');

        // Auto-print receipt
        try {
          const details = await getSaleDetails(selectedSaleForPayment.id);
          printReceipt(
            details.id,
            details.total_amount,
            details.services,
            details.products,
            details.payment_method,
            details.client_name
          );
        } catch (printErr) {
          console.error("Failed to print receipt after completion", printErr);
          // Don't block the success toast for printing errors
        }

        showToast('Payment completed and receipt generated!', 'success');
        setSelectedSaleForPayment(null);
      } else {
        // Completing a new sale from scratch
        await handleRecordSale(false);
      }
      setIsPaymentModalOpen(false);
      setMpesaCode('');
      fetchAll();
    } catch (error) {
      showToast('Failed to complete payment', 'error');
    }
  };


  const printReceipt = (saleId: number, total: number, servicesList: any[], productsList: any[], method: string, clientNameOverride?: string) => {
    const clientName = clientNameOverride || clients.find(c => c.id === selectedClient)?.name || 'Walk-in Client';
    const date = new Date().toLocaleString();

    // Support both dev server and production paths
    const logoUrl = logoImg.startsWith('http') ? logoImg : window.location.origin + (logoImg.startsWith('/') ? '' : '/') + logoImg;

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
              .logo {
                width: 40px;
                height: auto;
                margin-bottom: 5px;
                display: block;
                margin-left: auto;
                margin-right: auto;
              }
              h3 { margin: 5px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
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
              <img src="${logoUrl}" class="logo" alt="Logo" />
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

            <script>
            window.onload = function() {
              const images = document.getElementsByTagName('img');
              let loaded = 0;
              if (images.length === 0) {
                window.print();
                setTimeout(() => window.close(), 500);
                return;
              }
              for (let img of images) {
                if (img.complete) {
                  loaded++;
                  if (loaded === images.length) {
                    window.print();
                    setTimeout(() => window.close(), 500);
                  }
                } else {
                  img.onload = function() {
                    loaded++;
                    if (loaded === images.length) {
                      window.print();
                      setTimeout(() => window.close(), 500);
                    }
                  };
                  img.onerror = function() {
                    loaded++;
                    if (loaded === images.length) {
                      window.print();
                      setTimeout(() => window.close(), 500);
                    }
                  };
                }
              }
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
    }
  };


  const [productSearch, setProductSearch] = useState('');

  const availableServices = services.filter(s => !selectedServices.find(ss => ss.service_id === s.id));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const addService = (serviceId: string) => {
    if (!serviceId) return;

    // Check if stylists exist
    if (stylists.length === 0) {
      showToast('No stylists available! Please add a stylist in the Staff section first.', 'error');
      return;
    }

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
            <option value="Cash">Cash</option>
            <option value="Mpesa">Mpesa</option>
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

      <div className="mt-8 flex justify-end gap-4">
        <button onClick={() => handleRecordSale(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-3 rounded shadow-lg transform hover:scale-105 transition-transform font-bold">Billing (Pending)</button>
        <button onClick={() => handleRecordSale(false)} className="btn-gold text-lg px-8 py-3 shadow-lg transform hover:scale-105 transition-transform font-bold text-purple-900">Complete Sale</button>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl text-purple-900">All Sales</h2>
          <div className="flex gap-2">
            <button onClick={() => {
              const headers = ['ID', 'Client', 'Amount', 'Payment', 'Status', 'Date'];
              const rows = sales.map(s => [
                s.id,
                clients.find(c => c.id === s.client_id)?.name || 'Unknown',
                s.total_amount,
                s.payment_method,
                s.status || 'Completed',
                new Date(s.created_at || Date.now()).toLocaleDateString()
              ]);
              const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", "sales_data.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700">Export CSV</button>
            <button onClick={() => {
              const doc = new jsPDF();
              const pageWidth = doc.internal.pageSize.width;
              doc.setFontSize(18);
              doc.setTextColor(88, 28, 135);
              doc.text("MWAS BEAUTY - Sales Report", pageWidth / 2, 20, { align: 'center' });
              doc.setFontSize(10);
              doc.setTextColor(100);
              doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

              const tableColumn = ["ID", "Client", "Amount", "Method", "Date"];
              const tableRows: any[] = [];
              sales.forEach(s => {
                const rowData = [
                  s.id,
                  clients.find(c => c.id === s.client_id)?.name || 'Unknown',
                  s.total_amount.toLocaleString(),
                  s.payment_method,
                  new Date(s.created_at || Date.now()).toLocaleDateString()
                ];
                tableRows.push(rowData);
              });

              autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
                headStyles: { fillColor: [88, 28, 135] },
                alternateRowStyles: { fillColor: [243, 244, 246] },
                theme: 'grid'
              });
              doc.save('sales_report.pdf');
            }} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-700">Export PDF</button>
          </div>
        </div>
        <DataTable
          columns={['id', 'client_name', 'total_amount', 'payment_method', 'status']}
          data={sales.map(s => ({
            ...s,
            client_name: clients.find(c => c.id === s.client_id)?.name || 'Walk-in'
          }))}
          actions={(row) => (
            <div className="flex gap-2">
              {row.status === 'PENDING' && (
                <button
                  onClick={() => handleCompleteExistingSale(row)}
                  className="bg-gold-500 hover:bg-gold-600 text-purple-900 px-2 py-1 rounded text-xs font-bold"
                >
                  Complete Payment
                </button>
              )}
              <button
                onClick={() => {
                  getSaleDetails(row.id).then(details => {
                    printReceipt(details.id, details.total_amount, details.services, details.products, details.payment_method, details.client_name);
                  });
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-bold"
              >
                Print Receipt
              </button>
            </div>
          )}
        />
      </div>

      {/* Payment Confirmation Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-purple-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Confirm Payment</h3>
              <button onClick={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} className="text-white hover:text-gold-400">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {selectedSaleForPayment
                  ? `Completing payment for Sale #${selectedSaleForPayment.id} (KES ${selectedSaleForPayment.total_amount.toLocaleString()})`
                  : 'Complete the current sale transaction.'}
              </p>

              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="border p-2 rounded w-full bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Mpesa">Mpesa</option>
                </select>
              </div>

              {paymentMethod === 'Mpesa' && (
                <div className="mb-6 animate-in slide-in-from-top duration-300">
                  <label className="block text-gray-700 font-bold mb-2">M-Pesa Confirmation Code</label>
                  <input
                    type="text"
                    placeholder="Enter code (e.g. SGR8ABC123)"
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                    className="border p-2 rounded w-full bg-white focus:ring-2 focus:ring-purple-500 outline-none uppercase font-mono"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }}
                  className="flex-1 border border-gray-300 py-3 rounded font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 text-purple-900 py-3 rounded font-bold shadow-md transform active:scale-95 transition-all text-center"
                >
                  Confirm & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
