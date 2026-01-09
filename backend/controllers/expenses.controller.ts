import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getExpenses(req: Request, res: Response) {
    const db = await initializeDB();
    try {
        const expenses = await db.all('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching expenses' });
    } finally {
        await db.close();
    }
}

export async function addExpense(req: Request, res: Response) {
    const { category, amount, date, description } = req.body;

    if (!category || !amount || !date) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
    }

    const db = await initializeDB();
    try {
        const result = await db.run(
            'INSERT INTO expenses (category, amount, date, description) VALUES (?, ?, ?, ?)',
            category, amount, date, description || ''
        );
        res.status(201).json({ id: result.lastID, message: 'Expense added' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding expense' });
    } finally {
        await db.close();
    }
}

export async function deleteExpense(req: Request, res: Response) {
    const { id } = req.params;
    const db = await initializeDB();
    try {
        await db.run('DELETE FROM expenses WHERE id = ?', id);
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting expense' });
    } finally {
        await db.close();
    }
}
