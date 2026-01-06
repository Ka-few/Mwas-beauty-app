import { useEffect, useState } from 'react';
import { getStylists, addStylist, updateStylist, deleteStylist } from '../services/stylists.api';
import DataTable from '../components/tables/DataTable';

export default function Stylists() {
  const [stylists, setStylists] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', is_active: true });

  const fetchStylists = async () => {
    const data = await getStylists();
    setStylists(data);
  };

  useEffect(() => { fetchStylists(); }, []);

  const handleAdd = async () => {
    await addStylist(form);
    setForm({ name: '', phone: '', is_active: true });
    fetchStylists();
  };

  const handleDelete = async (id: number) => {
    await deleteStylist(id);
    fetchStylists();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Stylists</h1>

      <div className="mb-4 flex gap-2">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2" />
        <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border p-2" />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 rounded">Add</button>
      </div>

      <DataTable
        columns={['name', 'phone', 'is_active']}
        data={stylists}
        actions={(row: any) => (
          <button onClick={() => handleDelete(row.id)} className="text-red-500">Delete</button>
        )}
      />
    </div>
  );
}
