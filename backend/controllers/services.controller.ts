import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getServices(req: Request, res: Response) {
  const db = await initializeDB();
  const services = await db.all('SELECT * FROM services ORDER BY name ASC');
  await db.close();
  res.json(services);
}

export async function addService(req: Request, res: Response) {
  const { name, price, duration_minutes } = req.body;
  const db = await initializeDB();
  const result = await db.run(
    'INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)',
    name, price, duration_minutes
  );
  await db.close();
  res.json({ id: result.lastID });
}

export async function updateService(req: Request, res: Response) {
  const { id } = req.params;
  const { name, price, duration_minutes } = req.body;
  const db = await initializeDB();
  await db.run(
    'UPDATE services SET name = ?, price = ?, duration_minutes = ? WHERE id = ?',
    name, price, duration_minutes, id
  );
  await db.close();
  res.json({ message: 'Service updated' });
}

export async function deleteService(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  await db.run('DELETE FROM services WHERE id = ?', id);
  await db.close();
  res.json({ message: 'Service deleted' });
}
