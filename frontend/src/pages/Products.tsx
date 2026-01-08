import { useEffect, useState } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/products.api';
import DataTable from '../components/tables/DataTable';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', category: '', cost_price: 0, selling_price: 0, stock_quantity: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await updateProduct(editingId, form);
    } else {
      await addProduct(form);
    }
    setForm({ name: '', category: '', cost_price: 0, selling_price: 0, stock_quantity: 0 });
    setEditingId(null);
    fetchProducts();
  };

  const handleEdit = (product: any) => {
    setForm({
      name: product.name,
      category: product.category,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity
    });
    setEditingId(product.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete product?')) {
      await deleteProduct(id);
      fetchProducts();
    }
  };

  const handleCancel = () => {
    setForm({ name: '', category: '', cost_price: 0, selling_price: 0, stock_quantity: 0 });
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Products</h1>

      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        <input type="text" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border p-2 rounded" />
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Cost Price</label>
          <input type="number" placeholder="Cost Price" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Selling Price</label>
          <input type="number" placeholder="Selling Price" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: Number(e.target.value) })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Stock</label>
          <input type="number" placeholder="Stock Qty" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: Number(e.target.value) })} className="border p-2 rounded" />
        </div>
        <button onClick={handleSubmit} className="btn-purple">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors">Cancel</button>}
      </div>

      <DataTable
        columns={['name', 'category', 'cost_price', 'selling_price', 'profit', 'stock_quantity']}
        data={products.map(p => ({
          ...p,
          profit: (p.selling_price - p.cost_price).toFixed(2)
        }))}
        actions={(row: any) => (
          <div className="flex gap-2">
            <button onClick={() => handleEdit(row)} className="text-gold-600 font-medium hover:text-gold-700">Edit</button>
            <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700">Delete</button>
          </div>
        )}
      />
    </div>
  );
}
