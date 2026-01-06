import { useEffect, useState } from 'react';
import { getClients, addClient, updateClient, deleteClient } from '../services/clients.api';
import DataTable from '../components/tables/DataTable';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  const fetchClients = async () => {
    const data = await getClients();
    setClients(data);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async () => {
    await addClient(form);
    setForm({ name: '', phone: '', notes: '' });
    fetchClients();
  };

  const handleDelete = async (id: number) => {
    await deleteClient(id);
    fetchClients();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Clients</h1>
      <div className="mb-4 flex gap-2">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} className="border p-2"/>
        <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} className="border p-2"/>
        <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} className="border p-2"/>
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 rounded">Add</button>
      </div>
      <DataTable columns={['name','phone','notes']} data={clients} actions={(row:any)=><button onClick={()=>handleDelete(row.id)} className="text-red-500">Delete</button>} />
    </div>
  );
}
