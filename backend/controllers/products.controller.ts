import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getProducts(req: Request, res: Response) {
  const db = await initializeDB();
  try {
    const products = await db.all('SELECT * FROM products ORDER BY name ASC');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
}

export async function addProduct(req: Request, res: Response) {
  const { name, category, cost_price, selling_price, stock_quantity, reorder_level } = req.body;
  if (!name || (!selling_price && selling_price !== 0)) {
    res.status(400).json({ message: 'Invalid product data: Name and Selling Price are required' });
    return;
  }

  const db = await initializeDB();
  try {
    const result = await db.run(
      'INSERT INTO products (name, category, cost_price, selling_price, stock_quantity, reorder_level) VALUES (?, ?, ?, ?, ?, ?)',
      name, category, cost_price || 0, selling_price, stock_quantity || 0, reorder_level || 5
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product' });
  }
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const { name, category, cost_price, selling_price, stock_quantity, reorder_level } = req.body;
  const db = await initializeDB();
  try {
    await db.run(
      'UPDATE products SET name=?, category=?, cost_price=?, selling_price=?, stock_quantity=?, reorder_level=? WHERE id=?',
      name, category, cost_price, selling_price, stock_quantity, reorder_level, id
    );
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product' });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  const db = await initializeDB();
  try {
    await db.run('DELETE FROM products WHERE id = ?', id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product' });
  }
}
