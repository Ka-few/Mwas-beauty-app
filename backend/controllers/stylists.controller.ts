import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getStylists(req: Request, res: Response) {
  const db = await initializeDB();
  try {
    const stylists = await db.all('SELECT * FROM stylists ORDER BY name ASC');
    res.json(stylists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stylists' });
  }
}

export async function addStylist(req: Request, res: Response) {
  const { name, phone, commission_rate } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Stylist name is required' });
    return;
  }
  const db = await initializeDB();
  try {
    const result = await db.run('INSERT INTO stylists (name, phone, commission_rate) VALUES (?, ?, ?)', name, phone, commission_rate || 20.0);
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ message: 'Error adding stylist' });
  }
}

export async function updateStylist(req: Request, res: Response) {
  const { id } = req.params;
  const { name, phone, is_active, commission_rate } = req.body;
  const db = await initializeDB();
  try {
    await db.run(
      'UPDATE stylists SET name = ?, phone = ?, is_active = ?, commission_rate = ? WHERE id = ?',
      name, phone, is_active ? 1 : 0, commission_rate, id
    );
    res.json({ message: 'Stylist updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating stylist' });
  }
}

export async function deleteStylist(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  try {
    await db.run('DELETE FROM stylists WHERE id = ?', id);
    res.json({ message: 'Stylist deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting stylist' });
  }
}
