import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getSales(req: Request, res: Response) {
  const db = await initializeDB();
  const sales = await db.all('SELECT * FROM sales ORDER BY created_at DESC');
  await db.close();
  res.json(sales);
}

export async function addSale(req: Request, res: Response) {
  const { client_id, payment_method, status, services, products } = req.body;
  // services: [{service_id, stylist_id, price}]
  // products: [{product_id, quantity, selling_price}]
  
  const db = await initializeDB();
  try {
    await db.run('BEGIN TRANSACTION');

    // Insert sale
    const result = await db.run(
      'INSERT INTO sales (client_id, total_amount, payment_method, status) VALUES (?, ?, ?, ?)',
      client_id || null,
      0, // temp total
      payment_method,
      status || 'COMPLETED'
    );
    const sale_id = result.lastID;

    let totalAmount = 0;

    // Insert sale_services
    if (services && services.length) {
      for (const s of services) {
        await db.run(
          'INSERT INTO sale_services (sale_id, service_id, stylist_id, price) VALUES (?, ?, ?, ?)',
          sale_id, s.service_id, s.stylist_id, s.price
        );
        totalAmount += s.price;
      }
    }

    // Insert sale_products
    if (products && products.length) {
      for (const p of products) {
        await db.run(
          'INSERT INTO sale_products (sale_id, product_id, quantity, selling_price) VALUES (?, ?, ?, ?)',
          sale_id, p.product_id, p.quantity, p.selling_price
        );
        totalAmount += p.selling_price * p.quantity;

        // Update product stock
        await db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', p.quantity, p.product_id);
      }
    }

    // Update total
    await db.run('UPDATE sales SET total_amount = ? WHERE id = ?', totalAmount, sale_id);

    await db.run('COMMIT');
    res.json({ sale_id, totalAmount });

  } catch (err) {
    await db.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Error creating sale', error: err });
  } finally {
    await db.close();
  }
}
