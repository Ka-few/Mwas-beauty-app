import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getSales(req: Request, res: Response) {
  const db = await initializeDB();
  try {
    const sales = await db.all('SELECT * FROM sales ORDER BY created_at DESC');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales' });
  }
}

export async function addSale(req: Request, res: Response) {
  const { client_id, payment_method, status, services, products } = req.body;
  // services: [{service_id, stylist_id, price}]
  // products: [{product_id, quantity, selling_price}]

  if (!client_id && client_id !== 0) {
    res.status(400).json({ message: 'Client is required' });
    return;
  }

  if ((!services || services.length === 0) && (!products || products.length === 0)) {
    res.status(400).json({ message: 'Sale must include services or products' });
    return;
  }

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
        COALESCE(SUM(sp.selling_price * sp.quantity), 0) as total_revenue,
        COALESCE(SUM((sp.selling_price - COALESCE(p.cost_price, 0)) * sp.quantity), 0) as total_profit
      FROM products p
      LEFT JOIN sale_products sp ON p.id = sp.product_id
      GROUP BY p.id
      ORDER BY total_profit DESC
      LIMIT 10
    `);

    // Sales Over Time (Last 30 days)
    const salesOverTime = await db.all(`
      SELECT 
        date(created_at) as date,
        SUM(total_amount) as total
      FROM sales
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `);

    res.json({
      stylistPerformance: stylistStats.map(s => ({
        ...s,
        commission_earned: (s.total_revenue * (s.commission_rate || 20)) / 100
      })),
      topProducts: productStats,
      salesOverTime
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

export async function getReports(req: Request, res: Response) {
  const { startDate, endDate } = req.query;
  const db = await initializeDB();

  try {
    let dateFilter = "";
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = "WHERE date(sales.created_at) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    // 1. Overall Totals (Filtered)
    const revenueResult = await db.get(`
            SELECT COALESCE(SUM(total_amount), 0) as total 
            FROM sales 
            ${dateFilter}
        `, ...params);

    const totalRevenue = revenueResult.total;

    // 2. Product Profit
    // Need to join sales to filter by date
    const productProfitResult = await db.get(`
            SELECT COALESCE(SUM((sp.selling_price - COALESCE(p.cost_price, 0)) * sp.quantity), 0) as profit
            FROM sale_products sp
            JOIN products p ON sp.product_id = p.id
            JOIN sales ON sp.sale_id = sales.id
            ${dateFilter}
        `, ...params);
    const productProfit = productProfitResult.profit;

    // 3. Service Financials
    const serviceFinancials = await db.get(`
            SELECT 
                COALESCE(SUM(ss.price), 0) as gross_service_revenue,
                COALESCE(SUM(ss.price * (COALESCE(s.commission_rate, 20) / 100.0)), 0) as total_commissions
            FROM sale_services ss
            JOIN stylists s ON ss.stylist_id = s.id
            JOIN sales ON ss.sale_id = sales.id
            ${dateFilter}
        `, ...params);

    const grossServiceRevenue = serviceFinancials.gross_service_revenue;
    const totalCommissions = serviceFinancials.total_commissions;
    const serviceNetIncome = grossServiceRevenue - totalCommissions;

    // 4. Daily Breakdown
    // Group by Date
    const dailyReports = await db.all(`
            SELECT 
                date(sales.created_at) as date,
                COALESCE(SUM(sales.total_amount), 0) as gross_revenue,
                
                -- Product Profit for this day
                (SELECT COALESCE(SUM((sp2.selling_price - COALESCE(p2.cost_price, 0)) * sp2.quantity), 0)
                 FROM sale_products sp2
                 JOIN products p2 ON sp2.product_id = p2.id
                 JOIN sales s2 ON sp2.sale_id = s2.id
                 WHERE date(s2.created_at) = date(sales.created_at)
                ) as product_profit,

                -- Commissions for this day
                (SELECT COALESCE(SUM(ss2.price * (COALESCE(st2.commission_rate, 20) / 100.0)), 0)
                 FROM sale_services ss2
                 JOIN stylists st2 ON ss2.stylist_id = st2.id
                 JOIN sales s3 ON ss2.sale_id = s3.id
                 WHERE date(s3.created_at) = date(sales.created_at)
                ) as daily_commissions

            FROM sales
            ${dateFilter}
            GROUP BY date(sales.created_at)
            ORDER BY date(sales.created_at) DESC
        `, ...params);

    // Calculate net income for each day in JS to simplify SQL
    const dailyReportsWithNet = dailyReports.map(day => {
      return day;
    });

    // Let's fetch Service Revenue per day to be precise
    const dailyServices = await db.all(`
            SELECT 
                date(sales.created_at) as date,
                COALESCE(SUM(ss.price), 0) as service_revenue
            FROM sale_services ss
            JOIN sales ON ss.sale_id = sales.id
            ${dateFilter}
            GROUP BY date(sales.created_at)
        `, ...params);

    const serviceRevMap = new Map(dailyServices.map(d => [d.date, d.service_revenue]));

    // Fetch Expenses grouped by day
    let expenseFilter = "";
    const expenseParams: any[] = [];
    if (startDate && endDate) {
      expenseFilter = "WHERE date BETWEEN ? AND ?";
      expenseParams.push(startDate, endDate);
    }

    const dailyExpenses = await db.all(`
            SELECT date, COALESCE(SUM(amount), 0) as total_expense
            FROM expenses
            ${expenseFilter}
            GROUP BY date
        `, ...expenseParams);

    const expenseMap = new Map(dailyExpenses.map(d => [d.date, d.total_expense]));

    // Total Expenses
    const totalExpensesResult = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${expenseFilter}`, ...expenseParams);
    const totalExpenses = totalExpensesResult.total;


    const finalDailyReports = dailyReports.map(day => {
      const serviceRevenue = serviceRevMap.get(day.date) || 0;
      const expense = expenseMap.get(day.date) || 0;

      const serviceNet = serviceRevenue - day.daily_commissions;
      const totalNet = serviceNet + day.product_profit - expense;

      return {
        date: day.date,
        grossRevenue: day.gross_revenue,
        productProfit: day.product_profit,
        commissions: day.daily_commissions,
        expenses: expense,
        netIncome: totalNet
      };
    });

    // 5. Daily Commissions (Today) - Keep existing functionality just in case
    const dailyCommissions = await db.all(`
            SELECT 
                s.name,
                COALESCE(SUM(ss.price * (COALESCE(s.commission_rate, 20) / 100.0)), 0) as commission
            FROM stylists s
            JOIN sale_services ss ON s.id = ss.stylist_id
            JOIN sales sa ON ss.sale_id = sa.id
            WHERE date(sa.created_at) = date('now', 'localtime')
            GROUP BY s.id
            HAVING commission > 0
        `);

    res.json({
      summary: {
        totalRevenue,
        productProfit,
        grossServiceRevenue,
        totalCommissions,
        serviceNetIncome,
        totalExpenses,
        totalNetIncome: productProfit + serviceNetIncome - totalExpenses
      },
      daily: finalDailyReports,
      todayCommissions: dailyCommissions
    });

  } catch (error) {
    console.error('Reports Error:', error);
    res.status(500).json({ message: 'Failed to generate reports' });
  }
}
