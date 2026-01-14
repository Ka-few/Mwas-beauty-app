import { useEffect, useState } from 'react';
import { getStylists, addStylist, updateStylist, deleteStylist } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';

export default function Stylists() {
  const [stylists, setStylists] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', commission_rate: 20 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStylists = async () => {
    try {
      const data = await getStylists();
      if (Array.isArray(data)) {
        setStylists(data);
        setError(null);
      } else {
        setStylists([]);
        setError('Received invalid data');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load stylists');
      setStylists([]);
    }
  };

  useEffect(() => { fetchStylists(); }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await updateStylist(editingId, form);
    } else {
      await addStylist(form);
    }
    setForm({ name: '', phone: '', commission_rate: 20 });
    setEditingId(null);
    fetchStylists();
  };

  const handleEdit = (stylist: any) => {
    setForm({
      name: stylist.name,
      phone: stylist.phone,
      commission_rate: stylist.commission_rate || 20
    });
    setEditingId(stylist.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete stylist?')) {
      await deleteStylist(id);
      fetchStylists();
    }
  };

  const handleCancel = () => {
    setForm({ name: '', phone: '', commission_rate: 20 });
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Stylists</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border p-2 rounded" />
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Commission %</label>
          <div className="flex items-center gap-1 border p-2 rounded bg-gray-50">
            <input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })} className="w-16 bg-transparent outline-none border-b border-gray-300" />
            <span className="text-gray-500">%</span>
          </div>
        </div>
        <button onClick={handleSubmit} className="btn-purple">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors">Cancel</button>}

      </div>

      <DataTable
        columns={['name', 'phone', 'commission_rate']}
        data={stylists}
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
