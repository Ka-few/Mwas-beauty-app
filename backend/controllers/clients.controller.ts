import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getClients(req: Request, res: Response) {
  const db = await initializeDB();
  try {
    const clients = await db.all('SELECT * FROM clients ORDER BY created_at DESC;');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients' });
  }
}

export async function addClient(req: Request, res: Response) {
  const { name, phone, notes } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Client name is required' });
    return;
  }
  const db = await initializeDB();
  try {
    const result = await db.run(
      'INSERT INTO clients (name, phone, notes) VALUES (?, ?, ?)',
      name, phone, notes
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ message: 'Error adding client' });
  }
}

export async function updateClient(req: Request, res: Response) {
  const { id } = req.params;
  const { name, phone, notes } = req.body;
  const db = await initializeDB();
  try {
    await db.run(
      'UPDATE clients SET name = ?, phone = ?, notes = ? WHERE id = ?',
      name, phone, notes, id
    );
    res.json({ message: 'Client updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating client' });
  }
}

export async function deleteClient(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  try {
    await db.run('DELETE FROM clients WHERE id = ?', id);
    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting client' });
  }
}
