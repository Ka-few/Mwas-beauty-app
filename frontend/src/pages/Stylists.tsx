import { useEffect, useState } from 'react';
import { getStylists, addStylist, updateStylist, deleteStylist } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';
import { useToast } from '../components/ui/Toast';

export default function Stylists() {
  const { showToast } = useToast();
  const [stylists, setStylists] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', commission_rate: 20, speciality: '' });
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
    try {
      if (editingId) {
        await updateStylist(editingId, form);
        showToast('Stylist updated successfully', 'success');
      } else {
        await addStylist(form);
        showToast('Stylist added successfully', 'success');
      }
      setForm({ name: '', phone: '', commission_rate: 20, speciality: '' });
      setEditingId(null);
      fetchStylists();
    } catch (err: any) {
      console.error('Failed to save stylist:', err);
      showToast(err.response?.data?.message || 'Failed to save stylist', 'error');
    }
  };

  const handleEdit = (stylist: any) => {
    setForm({
      name: stylist.name,
      phone: stylist.phone,
      commission_rate: stylist.commission_rate || 20,
      speciality: stylist.speciality || ''
    });
    setEditingId(stylist.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete stylist?')) {
      try {
        await deleteStylist(id);
        showToast('Stylist deleted successfully', 'success');
        fetchStylists();
      } catch (err: any) {
        console.error('Failed to delete stylist:', err);
        showToast(err.response?.data?.message || 'Failed to delete stylist', 'error');
      }
    }
  };

  const handleCancel = () => {
    setForm({ name: '', phone: '', commission_rate: 20, speciality: '' });
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Stylists</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Name</label>
          <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Phone</label>
          <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Specialities (comma separated)</label>
          <input type="text" placeholder="e.g. Hair, Nails, Makeup" value={form.speciality} onChange={e => setForm({ ...form, speciality: e.target.value })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Commission %</label>
          <div className="flex items-center gap-1 border p-2 rounded bg-gray-50">
            <input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })} className="w-16 bg-transparent outline-none border-b border-gray-300" />
            <span className="text-gray-500">%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit} className="btn-purple h-10">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors h-10">Cancel</button>}
        </div>

      </div>

      <DataTable
        columns={['name', 'phone', 'speciality', 'commission_rate']}
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
