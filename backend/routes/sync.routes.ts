import express from 'express';
import { pushData, pullData, triggerSync } from '../controllers/sync.controller';

const router = express.Router();

// Server-side endpoints (Owner PC)
router.post('/push', pushData);   // Branch -> Owner
router.get('/pull', pullData);    // Owner -> Branch

// Client-side endpoints (Branch App)
router.post('/trigger', triggerSync); // Trigger Manual Sync

export default router;
