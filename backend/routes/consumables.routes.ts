import express from 'express';
import {
    getConsumables,
    addConsumable,
    updateConsumable,
    deleteConsumable,
    updateStock,
    addStock
} from '../controllers/consumables.controller';
import { validate } from '../middleware/validation';
import {
    createConsumableSchema,
    updateConsumableStockSchema,
    addConsumableStockSchema
} from '../schemas';

const router = express.Router();

router.get('/', getConsumables);
router.post('/', validate(createConsumableSchema), addConsumable);
router.put('/:id', updateConsumable);
router.delete('/:id', deleteConsumable);

// Specialized stock operations
// POST /api/consumables/:id/stock/update -> End-of-Day logic
router.post('/:id/stock/update', validate(updateConsumableStockSchema), updateStock);

// POST /api/consumables/:id/stock/add -> Repos/Purchase logic
router.post('/:id/stock/add', validate(addConsumableStockSchema), addStock);

export default router;
