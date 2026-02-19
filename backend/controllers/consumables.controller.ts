import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getConsumables(req: Request, res: Response) {
    const db = await initializeDB();
    try {
        const consumables = await db.all('SELECT * FROM consumables ORDER BY name ASC');
        res.json(consumables);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching consumables' });
    }
}

export async function addConsumable(req: Request, res: Response) {
    const { name, unit, min_level, current_stock } = req.body;
    const db = await initializeDB();
    try {
        const result = await db.run(
            'INSERT INTO consumables (name, unit, min_level, current_stock) VALUES (?, ?, ?, ?)',
            name, unit, min_level || 0, current_stock || 0
        );
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        console.error('Error adding consumable:', error);
        res.status(500).json({ message: 'Error adding consumable' });
    }
}

export async function updateConsumable(req: Request, res: Response) {
    const { id } = req.params;
    const { name, unit, min_level } = req.body;
    const db = await initializeDB();
    try {
        await db.run(
            'UPDATE consumables SET name=?, unit=?, min_level=? WHERE id=?',
            name, unit, min_level, id
        );
        res.json({ message: 'Consumable updated' });
    } catch (error) {
        console.error('Error updating consumable:', error);
        res.status(500).json({ message: 'Error updating consumable' });
    }
}

export async function deleteConsumable(req: Request, res: Response) {
    const { id } = req.params;
    const db = await initializeDB();
    try {
        await db.run('DELETE FROM consumables WHERE id = ?', id);
        res.json({ message: 'Consumable deleted' });
    } catch (error) {
        console.error('Error deleting consumable:', error);
        res.status(500).json({ message: 'Error deleting consumable' });
    }
}

// "Update End-of-Day" flow
export async function updateStock(req: Request, res: Response) {
    const { id } = req.params;
    const { physical_count, notes } = req.body;
    const db = await initializeDB();

    try {
        const consumable = await db.get('SELECT * FROM consumables WHERE id = ?', id);
        if (!consumable) {
            res.status(404).json({ message: 'Consumable not found' });
            return;
        }

        const previous_stock = consumable.current_stock;
        // Usage = Previous - Current(new)
        // If physical_count is GREATER than previous, usage is negative (implies addition/correction)
        // usage > 0 means stock reduced (consumed).
        const usage = previous_stock - physical_count;

        await db.transaction(async (tx: any) => {
            await tx.run(
                'UPDATE consumables SET current_stock = ? WHERE id = ?',
                physical_count, id
            );

            await tx.run(
                'INSERT INTO consumable_usage (consumable_id, previous_stock, current_stock, usage_amount, notes) VALUES (?, ?, ?, ?, ?)',
                id, previous_stock, physical_count, usage, notes || 'End-of-Day Update'
            );
        });

        res.json({ message: 'Stock updated and usage logged', usage });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Error updating stock' });
    }
}

// "Add Stock" flow - purchase
export async function addStock(req: Request, res: Response) {
    const { id } = req.params;
    const { quantity, notes } = req.body;
    const db = await initializeDB();

    try {
        const consumable = await db.get('SELECT * FROM consumables WHERE id = ?', id);
        if (!consumable) {
            res.status(404).json({ message: 'Consumable not found' });
            return;
        }

        const previous_stock = consumable.current_stock;
        const new_stock = previous_stock + quantity;
        const usage = previous_stock - new_stock; // will be negative, representing addition

        await db.transaction(async (tx: any) => {
            await tx.run(
                'UPDATE consumables SET current_stock = ? WHERE id = ?',
                new_stock, id
            );

            await tx.run(
                'INSERT INTO consumable_usage (consumable_id, previous_stock, current_stock, usage_amount, notes) VALUES (?, ?, ?, ?, ?)',
                id, previous_stock, new_stock, usage, notes || 'Stock Addition'
            );
        });

        res.json({ message: 'Stock added successfully', new_stock });
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ message: 'Error adding stock' });
    }
}
