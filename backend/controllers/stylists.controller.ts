import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getStylists(req: Request, res: Response) {
  const db = await initializeDB();
  const stylists = await db.all('SELECT * FROM stylists ORDER BY name ASC');
  await db.close();
  res.json(stylists);
}

export async function addStylist(req: Request, res: Response) {
  const { name, phone, commission_rate } = req.body;
  const db = await initializeDB();
  const result = await db.run('INSERT INTO stylists (name, phone, commission_rate) VALUES (?, ?, ?)', name, phone, commission_rate || 20.0);
  await db.close();
  res.json({ id: result.lastID });
}

export async function updateStylist(req: Request, res: Response) {
  const { id } = req.params;
  const { name, phone, is_active, commission_rate } = req.body;
  const db = await initializeDB();
  await db.run(
    'UPDATE stylists SET name = ?, phone = ?, is_active = ?, commission_rate = ? WHERE id = ?',
    name, phone, is_active ? 1 : 0, commission_rate, id
  );
  await db.close();
  res.json({ message: 'Stylist updated' });
}

export async function deleteStylist(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  await db.run('DELETE FROM stylists WHERE id = ?', id);
  await db.close();
  res.json({ message: 'Stylist deleted' });
}
