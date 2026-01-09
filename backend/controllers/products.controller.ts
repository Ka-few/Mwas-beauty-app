import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getProducts(req: Request, res: Response) {
  const db = await initializeDB();
  const products = await db.all('SELECT * FROM products ORDER BY name ASC');
  await db.close();
  res.json(products);
}

export async function addProduct(req: Request, res: Response) {
  const { name, category, cost_price, selling_price, stock_quantity, reorder_level } = req.body;
  if (!name || !selling_price || selling_price < 0) {
    res.status(400).json({ message: 'Invalid product data' });
    return;
  }

  const db = await initializeDB();
  const result = await db.run(
    'INSERT INTO products (name, category, cost_price, selling_price, stock_quantity, reorder_level) VALUES (?, ?, ?, ?, ?, ?)',
    name, category, cost_price || 0, selling_price, stock_quantity || 0, reorder_level || 5
  );
  await db.close();
  res.json({ id: result.lastID });
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const { name, category, cost_price, selling_price, stock_quantity, reorder_level } = req.body;
  const db = await initializeDB();
  await db.run(
    'UPDATE products SET name=?, category=?, cost_price=?, selling_price=?, stock_quantity=?, reorder_level=? WHERE id=?',
    name, category, cost_price, selling_price, stock_quantity, reorder_level, id
  );
  await db.close();
  res.json({ message: 'Product updated' });
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  await db.run('DELETE FROM products WHERE id = ?', id);
  await db.close();
  res.json({ message: 'Product deleted' });
}
