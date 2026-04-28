import { initializeDB, generateUUID } from '../db/database';

export interface JournalLine {
    account_code: string;
    debit: number;
    credit: number;
}

export interface JournalEntry {
    date?: string;
    reference: string;
    description: string;
    source_module: string;
    lines: JournalLine[];
}

export class AccountingService {
    /**
     * Posts a double-entry journal entry to the database.
     * Validates that debits == credits and at least 2 lines exist.
     */
    static async postJournalEntry(entry: JournalEntry, dbContext?: any) {
        if (!entry.lines || entry.lines.length < 2) {
            throw new Error('Journal entry must have at least 2 lines');
        }

        const totalDebits = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredits = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

        // Allow for small floating point differences
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Journal entry does not balance: Debits (${totalDebits}) != Credits (${totalCredits})`);
        }

        const db = dbContext || (await initializeDB());

        const work = async (tx: any) => {
            // 1. Get account IDs for codes
            const linesWithIds = [];
            for (const line of entry.lines) {
                const account = await tx.get('SELECT id FROM accounts WHERE code = ?', line.account_code);
                if (!account) {
                    throw new Error(`Account code not found: ${line.account_code}`);
                }
                linesWithIds.push({ ...line, account_id: account.id });
            }

            // 2. Insert Journal Entry
            const entryResult = await tx.run(
                'INSERT INTO journal_entries (date, reference, description, source_module, record_id) VALUES (?, ?, ?, ?, ?)',
                entry.date || new Date().toISOString(),
                entry.reference,
                entry.description,
                entry.source_module,
                generateUUID()
            );
            const journalEntryId = entryResult.lastID;

            // 3. Insert Journal Lines
            for (const line of linesWithIds) {
                await tx.run(
                    'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, record_id) VALUES (?, ?, ?, ?, ?)',
                    journalEntryId,
                    line.account_id,
                    line.debit || 0,
                    line.credit || 0,
                    generateUUID()
                );
            }

            return journalEntryId;
        };

        if (dbContext) {
            // If dbContext is already a transaction/wrapper, use it directly
            return await work(db);
        } else {
            // Start a new transaction
            return await db.transaction(work);
        }
    }

    /**
     * Integration: Post a Sale (Service or Product)
     */
    static async postSale(saleData: {
        id: number;
        total_amount: number;
        payment_method: string;
        date?: string;
        services: any[];
        products: any[];
    }, db?: any) {
        const lines: JournalLine[] = [];

        // Debit: Cash or M-Pesa
        const paymentAccount = saleData.payment_method.toUpperCase() === 'MPESA' ? '1100' : '1000';
        lines.push({ account_code: paymentAccount, debit: saleData.total_amount, credit: 0 });

        // Credit: Revenue
        let serviceTotal = 0;
        let productTotal = 0;

        for (const s of saleData.services) {
            serviceTotal += s.price;
        }
        for (const p of saleData.products) {
            productTotal += (p.selling_price * p.quantity);
        }

        if (serviceTotal > 0 || productTotal === 0) {
            // Allocate to service revenue, adjusted to match the debit exactly 
            // (fixes imbalances caused by discounts or dirty historical data)
            const remainingToBalance = saleData.total_amount - productTotal;
            lines.push({ account_code: '4000', debit: 0, credit: Math.max(0, remainingToBalance) });
        }
        if (productTotal > 0) {
            // If total_amount was less than productTotal (huge discount), cap product revenue to total_amount
            const actualProductRevenue = Math.min(productTotal, saleData.total_amount);
            lines.push({ account_code: '4100', debit: 0, credit: actualProductRevenue });
        }

        await this.postJournalEntry({
            date: saleData.date,
            reference: `SALE-${saleData.id}`,
            description: `Sale #${saleData.id}`,
            source_module: 'POS',
            lines
        }, db);

        // Commission Accrual (Liability)
        for (const s of saleData.services) {
            if (s.commission_rate && s.commission_rate > 0) {
                const commissionAmount = (s.price * s.commission_rate) / 100;
                await this.postJournalEntry({
                    date: saleData.date,
                    reference: `COMM-ACC-${saleData.id}-${s.stylist_id}`,
                    description: `Commission Accrual for ${s.stylist_name} - Sale #${saleData.id}`,
                    source_module: 'COMMISSIONS',
                    lines: [
                        { account_code: '6200', debit: commissionAmount, credit: 0 }, // Commission Expense
                        { account_code: '2100', debit: 0, credit: commissionAmount }  // Commission Payable
                    ]
                }, db);
            }
        }

        // COGS (if products sold)
        for (const p of saleData.products) {
            if (p.cost_price && p.cost_price > 0) {
                await this.postJournalEntry({
                    date: saleData.date,
                    reference: `COGS-${saleData.id}-${p.product_id}`,
                    description: `COGS for ${p.name} - Sale #${saleData.id}`,
                    source_module: 'POS',
                    lines: [
                        { account_code: '5000', debit: p.quantity * p.cost_price, credit: 0 }, // COGS
                        { account_code: '1300', debit: 0, credit: p.quantity * p.cost_price }  // Inventory
                    ]
                }, db);
            }
        }
    }

    /**
     * Integration: Post an Expense
     */
    static async postExpense(expenseData: {
        id: number;
        category: string;
        amount: number;
        description: string;
        date: string;
    }, db?: any) {
        // Map category to COA code if possible, default to 6000 (Miscellaneous/Rent)
        // For simplicity in this demo, we'll use a mapping or default
        const categoryMap: Record<string, string> = {
            'Rent': '6000',
            'Salaries': '6100',
            'Utilities': '6300',
            'Marketing': '6400',
            'M-Pesa Fees': '6500'
        };

        const accountCode = categoryMap[expenseData.category] || '6000'; // Default to Rent or Misc

        await this.postJournalEntry({
            date: expenseData.date,
            reference: `EXP-${expenseData.id}`,
            description: expenseData.description || `Expense: ${expenseData.category}`,
            source_module: 'EXPENSES',
            lines: [
                { account_code: accountCode, debit: expenseData.amount, credit: 0 },
                { account_code: '1000', debit: 0, credit: expenseData.amount } // Credit Cash
            ]
        }, db);
    }

    /**
     * Integration: Post Consumable Usage
     */
    static async postConsumableUsage(usageData: {
        id: number;
        name: string;
        cost_impact: number;
    }, db?: any) {
        if (usageData.cost_impact <= 0) return;

        await this.postJournalEntry({
            reference: `CONS-${usageData.id}`,
            description: `Consumable Usage: ${usageData.name}`,
            source_module: 'INVENTORY',
            lines: [
                { account_code: '5100', debit: usageData.cost_impact, credit: 0 }, // Cost of Consumables
                { account_code: '1400', debit: 0, credit: usageData.cost_impact }  // Inventory - Consumables
            ]
        }, db);
    }

    /**
     * Integration: Post M-Pesa Payment Confirmation & Fee
     */
    static async postMpesaPaymentConfirmation(saleData: {
        id: number;
        amount: number;
        receipt: string;
    }, db?: any) {
        // Assume a simplified fee calculation or a flat rate for this demo
        // For example: 0.5% or a minimum
        const fee = Math.max(10, saleData.amount * 0.005);

        await this.postJournalEntry({
            reference: `MPESA-FEE-${saleData.id}`,
            description: `M-Pesa Fee for Transaction ${saleData.receipt}`,
            source_module: 'PAYMENTS',
            lines: [
                { account_code: '6500', debit: fee, credit: 0 }, // M-Pesa Fees (Expense)
                { account_code: '1100', debit: 0, credit: fee }  // M-Pesa (Asset)
            ]
        }, db);
    }

    /**
     * Helper to find a sale by record_id (UUID used in sync/payments)
     */
    static async getSaleByRecordId(recordId: string, tx: any) {
        return await tx.get('SELECT * FROM sales WHERE record_id = ?', recordId);
    }

    /**
     * Reporting: Get Account Balances (optionally filtered by date range)
     */
    static async getAccountBalances(dbOrTx?: any, startDate?: string, endDate?: string) {
        const db = dbOrTx || (await initializeDB());

        const query = startDate && endDate ? `
            SELECT 
                a.code, 
                a.name, 
                a.type,
                COALESCE(SUM(l.debit - l.credit), 0) as balance
            FROM accounts a
            LEFT JOIN journal_lines l ON a.id = l.account_id
            LEFT JOIN journal_entries e ON l.journal_entry_id = e.id AND date(e.date) BETWEEN '${startDate}' AND '${endDate}'
            GROUP BY a.id
            ORDER BY a.code ASC
        ` : `
            SELECT 
                a.code, 
                a.name, 
                a.type,
                COALESCE(SUM(l.debit - l.credit), 0) as balance
            FROM accounts a
            LEFT JOIN journal_lines l ON a.id = l.account_id
            GROUP BY a.id
            ORDER BY a.code ASC
        `;
        return await db.all(query);
    }

    /**
     * Reporting: Profit & Loss Statement
     */
    static async getProfitAndLoss(startDate: string, endDate: string, dbOrTx?: any) {
        const db = dbOrTx || (await initializeDB());

        const lines = await db.all(`
            SELECT 
                a.code, 
                a.name, 
                a.type,
                SUM(l.debit) as total_debit,
                SUM(l.credit) as total_credit
            FROM journal_lines l
            JOIN journal_entries e ON l.journal_entry_id = e.id
            JOIN accounts a ON l.account_id = a.id
            WHERE date(e.date) BETWEEN ? AND ?
            GROUP BY a.id
        `, startDate, endDate);

        let revenue = 0;
        let cogs = 0;
        let expenses = 0;

        const breakdown = lines.map((l: any) => {
            const balance = l.total_credit - l.total_debit; // Revenue is credit-based
            if (l.type === 'Revenue') revenue += balance;
            if (l.code.startsWith('5')) cogs += (l.total_debit - l.total_credit);
            if (l.code.startsWith('6')) expenses += (l.total_debit - l.total_credit);

            return {
                code: l.code,
                name: l.name,
                type: l.type,
                amount: l.type === 'Revenue' ? balance : (l.total_debit - l.total_credit)
            };
        });

        return {
            period: { startDate, endDate },
            revenue,
            cogs,
            expenses,
            netProfit: revenue - cogs - expenses,
            details: breakdown
        };
    }

    /**
     * Reporting: Daily Summary
     */
    static async getDailySummary(date: string, dbOrTx?: any) {
        const db = dbOrTx || (await initializeDB());

        const result = await db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN a.type = 'Revenue' THEN l.credit - l.debit ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN a.code LIKE '6%' THEN l.debit - l.credit ELSE 0 END), 0) as expenses
            FROM journal_lines l
            JOIN journal_entries e ON l.journal_entry_id = e.id
            JOIN accounts a ON l.account_id = a.id
            WHERE date(e.date) = ?
        `, date);

        return {
            date,
            revenue: result.revenue,
            expenses: result.expenses,
            netIncome: result.revenue - result.expenses
        };
    }

    /**
     * Maintenance: Backfill Historical Data
     * Uses sequential queue-safe writes (NO transaction wrapper to avoid nested-enqueue deadlock).
     * Each postSale/postExpense goes through the queue independently.
     */
    static async backfillHistoricalData() {
        const db = await initializeDB();
        const results = { salesBackfilled: 0, expensesBackfilled: 0, errors: [] as string[] };

        // 1. Read all sales first (outside any transaction)
        const sales = await db.all('SELECT * FROM sales');

        for (const sale of sales) {
            const existing = await db.get('SELECT id FROM journal_entries WHERE reference = ?', `SALE-${sale.id}`);
            if (!existing) {
                try {
                    const services = await db.all(`
                        SELECT ss.price, ss.stylist_id, s.name as stylist_name, s.commission_rate
                        FROM sale_services ss
                        LEFT JOIN stylists s ON ss.stylist_id = s.id
                        WHERE ss.sale_id = ?
                    `, sale.id);
                    const products = await db.all(`
                        SELECT sp.quantity, sp.selling_price, sp.product_id, p.name, p.cost_price
                        FROM sale_products sp
                        LEFT JOIN products p ON sp.product_id = p.id
                        WHERE sp.sale_id = ?
                    `, sale.id);

                    // Do NOT pass a db context — let each write go through the queue naturally
                    await AccountingService.postSale({
                        id: sale.id,
                        total_amount: sale.total_amount,
                        payment_method: sale.payment_method || 'CASH',
                        date: sale.created_at,
                        services,
                        products
                    });
                    results.salesBackfilled++;
                } catch (err: any) {
                    results.errors.push(`Sale #${sale.id}: ${err.message}`);
                }
            }
        }

        // 2. Backfill Expenses
        const expenses = await db.all('SELECT * FROM expenses');
        for (const exp of expenses) {
            const existing = await db.get('SELECT id FROM journal_entries WHERE reference = ?', `EXP-${exp.id}`);
            if (!existing) {
                try {
                    await AccountingService.postExpense({
                        id: exp.id,
                        category: exp.category,
                        amount: exp.amount,
                        description: exp.description,
                        date: exp.date || exp.created_at
                    });
                    results.expensesBackfilled++;
                } catch (err: any) {
                    results.errors.push(`Expense #${exp.id}: ${err.message}`);
                }
            }
        }

        return results;
    }
}

