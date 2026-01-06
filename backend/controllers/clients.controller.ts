import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getClients(req: Request, res: Response) {
  const db = await initializeDB();
  const clients = await db.all('SELECT * FROM clients ORDER BY created_at DESC;');
  await db.close();
  res.json(clients);
}

export async function addClient(req: Request, res: Response) {
  const { name, phone, notes } = req.body;
  const db = await initializeDB();
  const result = await db.run(
    'INSERT INTO clients (name, phone, notes) VALUES (?, ?, ?)',
    name, phone, notes
  );
  await db.close();
  res.json({ id: result.lastID });
}
