import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getServices(req: Request, res: Response) {
  const db = await initializeDB();
  const services = await db.all('SELECT * FROM services ORDER BY name ASC');
  res.json(services);
}

export async function addService(req: Request, res: Response) {
  const { name, price, duration_minutes } = req.body;
  const db = await initializeDB();
  const result = await db.run(
    'INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)',
    name, price, duration_minutes
  );
  res.json({ id: result.lastID });
}

export async function updateService(req: Request, res: Response) {
  const { id } = req.params;
  const { name, price, duration_minutes, category } = req.body;
  const db = await initializeDB();
  await db.run(
    'UPDATE services SET name = ?, price = ?, duration_minutes = ?, category = ? WHERE id = ?',
    name, price, duration_minutes, category, id
  );
  res.json({ message: 'Service updated' });
}

export async function getServiceStylists(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  try {
    // 1. Try to get stylists from junction table
    let stylists = await db.all(`
      SELECT st.* FROM stylists st
      JOIN stylist_services ss ON st.id = ss.stylist_id
      WHERE ss.service_id = ? AND st.is_active = 1
    `, id);

    // 2. If no explicit associations, fallback to matching speciality with service category
    if (stylists.length === 0) {
      const service = await db.get('SELECT category FROM services WHERE id = ?', id);
      if (service && service.category) {
        stylists = await db.all(`
          SELECT * FROM stylists 
          WHERE (speciality LIKE '%' || ? || '%' OR speciality IS NULL OR speciality = "") 
          AND is_active = 1
        `, service.category);
      } else {
        // If no category, just return all active stylists
        stylists = await db.all('SELECT * FROM stylists WHERE is_active = 1');
      }
    }

    res.json(stylists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stylists for service' });
  }
}

export async function deleteService(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  await db.run('DELETE FROM services WHERE id = ?', id);
  res.json({ message: 'Service deleted' });
}
