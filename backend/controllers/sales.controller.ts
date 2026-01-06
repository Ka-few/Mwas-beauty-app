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


export async function getAnalytics(req: Request, res: Response) {
  const db = await initializeDB();

  try {
    // Stylist Performance
    const stylistStats = await db.all(`
      SELECT 
        s.id, 
        s.name, 
        s.commission_rate,
        COUNT(ss.id) as service_count,
        COALESCE(SUM(ss.price), 0) as total_revenue
      FROM stylists s
      LEFT JOIN sale_services ss ON s.id = ss.stylist_id
      GROUP BY s.id
      ORDER BY total_revenue DESC
    `);

    // Product Performance
    const productStats = await db.all(`
      SELECT 
        p.id, 
        p.name, 
        p.stock_quantity,
        COALESCE(SUM(sp.quantity), 0) as units_sold,
        COALESCE(SUM(sp.selling_price * sp.quantity), 0) as total_revenue
      FROM products p
      LEFT JOIN sale_products sp ON p.id = sp.product_id
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 10
    `);

    res.json({
      stylistPerformance: stylistStats.map(s => ({
        ...s,
        commission_earned: (s.total_revenue * (s.commission_rate || 20)) / 100
      })),
      topProducts: productStats
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  } finally {
    await db.close();
  }
}

export async function getReports(req: Request, res: Response) {
  const db = await initializeDB();
  try {
    // 1. Total Sales Revenue
    const revenueResult = await db.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales');
    const totalRevenue = revenueResult.total;

    // 2. Product Profit: (Selling Price - Cost Price) * Quantity
    const productProfitResult = await db.get(`
      SELECT COALESCE(SUM((sp.selling_price - COALESCE(p.cost_price, 0)) * sp.quantity), 0) as profit
      FROM sale_products sp
      JOIN products p ON sp.product_id = p.id
    `);
    const productProfit = productProfitResult.profit;

    // 3. Service Financials
    const serviceFinancials = await db.get(`
      SELECT 
        COALESCE(SUM(ss.price), 0) as gross_service_revenue,
        COALESCE(SUM(ss.price * (COALESCE(s.commission_rate, 20) / 100.0)), 0) as total_commissions
      FROM sale_services ss
      JOIN stylists s ON ss.stylist_id = s.id
    `);

    const grossServiceRevenue = serviceFinancials.gross_service_revenue;
    const totalCommissions = serviceFinancials.total_commissions;
    const serviceNetIncome = grossServiceRevenue - totalCommissions;

    res.json({
      totalRevenue,
      productProfit,
      grossServiceRevenue,
      totalCommissions,
      serviceNetIncome,
      totalNetIncome: productProfit + serviceNetIncome
    });

  } catch (error) {
    console.error('Reports Error:', error);
    res.status(500).json({ message: 'Failed to generate reports' });
  } finally {
    await db.close();
  }
}
