import { Router } from 'express';
import * as AccountingController from '../controllers/accounting.controller';

const router = Router();

router.get('/status', AccountingController.getAccountingStatus);
router.get('/profit-loss', AccountingController.getProfitAndLoss);
router.get('/journal', AccountingController.getJournalEntries);
router.post('/backfill', AccountingController.postBackfill);
router.post('/purge-backfill', AccountingController.purgeBackfill);

export default router;
