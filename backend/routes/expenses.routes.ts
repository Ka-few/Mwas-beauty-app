import { Router } from 'express';
import { getExpenses, addExpense, deleteExpense } from '../controllers/expenses.controller';

const router = Router();

router.get('/', getExpenses);
router.post('/', addExpense);
router.delete('/:id', deleteExpense);

export default router;
