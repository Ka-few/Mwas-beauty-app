import express from 'express';
import { getSales, addSale, getAnalytics, getReports, completeSale, getSaleDetails } from '../controllers/sales.controller';

import { validate } from '../middleware/validation';
import { createSaleSchema } from '../schemas';

const router = express.Router();

router.get('/analytics', getAnalytics);
router.get('/reports', getReports);
router.get('/', getSales);
router.get('/:id', getSaleDetails);
router.post('/', validate(createSaleSchema), addSale);
router.put('/:id/complete', completeSale);

export default router;
