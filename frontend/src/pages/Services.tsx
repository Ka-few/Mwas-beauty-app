import { useEffect, useState } from 'react';
import { getServices, addService, updateService, deleteService } from '../services/services.api';
import DataTable from '../components/tables/DataTable';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', price: 0, duration_minutes: 0 });

  const fetchServices = async () => {
    const data = await getServices();
    setServices(data);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleAdd = async () => {
    await addService(form);
    setForm({ name: '', price: 0, duration_minutes: 0 });
    fetchServices();
  };

  const handleDelete = async (id: number) => {
    await deleteService(id);
    fetchServices();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Services</h1>

      <div className="mb-4 flex gap-2">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2" />
        <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="border p-2" />
        <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="border p-2" />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 rounded">Add</button>
      </div>

      <DataTable
        columns={['name', 'price', 'duration_minutes']}
        data={services}
        actions={(row: any) => (
          <button onClick={() => handleDelete(row.id)} className="text-red-500">Delete</button>
        )}
      />
    </div>
  );
}
