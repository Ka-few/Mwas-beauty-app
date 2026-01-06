import { useEffect, useState } from 'react';
import { getClients, addClient, updateClient, deleteClient } from '../services/clients.api';
import DataTable from '../components/tables/DataTable';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchClients = async () => {
    const data = await getClients();
    setClients(data);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await updateClient(editingId, form);
    } else {
      await addClient(form);
    }
    setForm({ name: '', phone: '', notes: '' });
    setEditingId(null);
    fetchClients();
  };

  const handleEdit = (client: any) => {
    setForm({ name: client.name, phone: client.phone, notes: client.notes });
    setEditingId(client.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      fetchClients();
    }
  };

  const handleCancel = () => {
    setForm({ name: '', phone: '', notes: '' });
    setEditingId(null);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-purple-900 border-b-2 border-gold-500 inline-block">Clients</h1>
      <div className="mb-6 flex gap-2 flex-wrap bg-white p-4 rounded shadow border border-gray-100">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border p-2 rounded" />
        <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border p-2 rounded" />
        <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="border p-2 rounded" />
        <button onClick={handleSubmit} className="btn-purple">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors">Cancel</button>}
      </div>
      <DataTable
        columns={['name', 'phone', 'notes']}
        data={clients}
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
