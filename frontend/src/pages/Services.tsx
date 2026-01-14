import { useEffect, useState } from 'react';
import { getServices, addService, updateService, deleteService } from '../services/services.api';
import DataTable from '../components/tables/DataTable';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', price: 0, duration_minutes: 0 });
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
    if (editingId) {
      await updateService(editingId, form);
    } else {
      await addService(form);
    }
    setForm({ name: '', price: 0, duration_minutes: 0 });
    setEditingId(null);
    fetchServices();
  };

  const handleEdit = (service: any) => {
    setForm({
      name: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes
    });
    setEditingId(service.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete service?')) {
      await deleteService(id);
      fetchServices();
    }
  };

  const handleCancel = () => {
    setForm({ name: '', price: 0, duration_minutes: 0 });
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Services</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="border p-2 rounded" />
        <button onClick={handleSubmit} className="btn-purple">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors">Cancel</button>}
      </div>

      <DataTable
        columns={['name', 'price', 'duration_minutes']}
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
