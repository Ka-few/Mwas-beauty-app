import express from 'express';
import { getSales, addSale } from '../controllers/sales.controller';

const router = express.Router();

router.get('/', getSales);
router.post('/', addSale);

export default router;
