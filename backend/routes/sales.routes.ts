import express from 'express';
import { getSales, addSale, getAnalytics, getReports } from '../controllers/sales.controller';

import { validate } from '../middleware/validation';
import { createSaleSchema } from '../schemas';

const router = express.Router();

router.get('/analytics', getAnalytics);
router.get('/reports', getReports);
router.get('/', getSales);
router.post('/', validate(createSaleSchema), addSale);

export default router;
