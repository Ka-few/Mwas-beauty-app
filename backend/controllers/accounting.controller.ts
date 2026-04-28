import { Request, Response } from 'express';
import { AccountingService } from '../services/accounting.service';

export async function getAccountingStatus(req: Request, res: Response) {
    try {
        const { startDate, endDate } = req.query;
        const balances = await AccountingService.getAccountBalances(
            undefined,
            startDate as string | undefined,
            endDate as string | undefined
        );
        const today = new Date().toISOString().split('T')[0];
        const summary = await AccountingService.getDailySummary(today);

        res.json({
            balances,
            todaySummary: summary
        });
    } catch (error) {
        console.error('Accounting Status Error:', error);
        res.status(500).json({ message: 'Failed to fetch accounting status' });
    }
}

export async function postBackfill(req: Request, res: Response) {
    try {
        const results = await AccountingService.backfillHistoricalData();
        res.json({ message: 'Backfill completed', ...results });
    } catch (error: any) {
        console.error('Backfill Error:', error);
        res.status(500).json({ message: 'Backfill failed', error: error.message });
    }
}

export async function getProfitAndLoss(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    try {
        const pl = await AccountingService.getProfitAndLoss(startDate as string, endDate as string);
        res.json(pl);
    } catch (error) {
        console.error('P&L Error:', error);
        res.status(500).json({ message: 'Failed to generate P&L report' });
    }
}

export async function getJournalEntries(req: Request, res: Response) {
    // Basic implementation to list recent journal entries
    // Usually for audit trail
    const { limit = 50 } = req.query;
    try {
        const db = await (require('../db/database').initializeDB());
        const entries = await db.all(`
            SELECT e.*, 
                   (SELECT COUNT(*) FROM journal_lines WHERE journal_entry_id = e.id) as line_count,
                   (SELECT SUM(debit) FROM journal_lines WHERE journal_entry_id = e.id) as total_amount
            FROM journal_entries e
            ORDER BY e.date DESC
            LIMIT ?
        `, limit);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch journal entries' });
    }
}

export async function purgeBackfill(req: Request, res: Response) {
    try {
        const db = await (require('../db/database').initializeDB());
        await db.run("DELETE FROM journal_entries WHERE id > 4");
        await db.run("DELETE FROM journal_lines WHERE journal_entry_id > 4");
        res.json({ message: 'Purged incorrect backfill entries successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to purge backfill', error: error.message });
    }
}
