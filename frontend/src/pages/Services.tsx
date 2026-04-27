import { useEffect, useState } from 'react';
import { getServices, addService, updateService, deleteService } from '../services/services.api';
import DataTable from '../components/tables/DataTable';
import { useToast } from '../components/ui/Toast';

export default function Services() {
  const { showToast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', price: 0, duration_minutes: 0, category: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      if (Array.isArray(data)) {
        setServices(data);
        setError(null);
      } else {
        setServices([]);
        setError('Received invalid data');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load services');
      setServices([]);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateService(editingId, form);
        showToast('Service updated successfully', 'success');
      } else {
        await addService(form);
        showToast('Service added successfully', 'success');
      }
      setForm({ name: '', price: 0, duration_minutes: 0, category: '' });
      setEditingId(null);
      fetchServices();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      showToast(err.response?.data?.message || 'Failed to save service', 'error');
    }
  };

  const handleEdit = (service: any) => {
    setForm({
      name: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes,
      category: service.category || ''
    });
    setEditingId(service.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete service?')) {
      try {
        await deleteService(id);
        showToast('Service deleted successfully', 'success');
        fetchServices();
      } catch (err: any) {
        console.error('Failed to delete service:', err);
        showToast(err.response?.data?.message || 'Failed to delete service', 'error');
      }
    }
  };

  const handleCancel = () => {
    setForm({ name: '', price: 0, duration_minutes: 0, category: '' });
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Services</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Service Name</label>
          <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Category</label>
          <input type="text" placeholder="e.g. Hair, Nails" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Price (KES)</label>
          <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 ml-1">Duration (Min)</label>
          <input type="number" placeholder="Duration" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="border p-2 rounded" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit} className="btn-purple h-10">{editingId ? 'Update' : 'Add'}</button>
          {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors h-10">Cancel</button>}
        </div>
      </div>

      <DataTable
        columns={['name', 'category', 'price', 'duration_minutes']}
        data={services}
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
