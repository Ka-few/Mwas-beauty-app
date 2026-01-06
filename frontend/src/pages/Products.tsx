import { useEffect, useState } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/products.api';
import DataTable from '../components/tables/DataTable';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', category: '', selling_price: 0, stock_quantity: 0 });

  const fetchProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAdd = async () => {
    await addProduct(form);
    setForm({ name: '', category: '', selling_price: 0, stock_quantity: 0 });
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    await deleteProduct(id);
    fetchProducts();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Products</h1>

      <div className="mb-4 flex gap-2">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2" />
        <input type="text" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border p-2" />
        <input type="number" placeholder="Selling Price" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: Number(e.target.value) })} className="border p-2" />
        <input type="number" placeholder="Stock Qty" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: Number(e.target.value) })} className="border p-2" />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 rounded">Add</button>
      </div>

      <DataTable
        columns={['name', 'category', 'selling_price', 'stock_quantity']}
        data={products}
        actions={(row: any) => (
          <button onClick={() => handleDelete(row.id)} className="text-red-500">Delete</button>
        )}
      />
    </div>
  );
}
