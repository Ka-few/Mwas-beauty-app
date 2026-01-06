import express from 'express';
import { getSales, addSale, getAnalytics, getReports } from '../controllers/sales.controller';

const router = express.Router();

router.get('/analytics', getAnalytics);
router.get('/reports', getReports);
router.get('/', getSales);
router.post('/', addSale);

export default router;
