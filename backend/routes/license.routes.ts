import { Router } from 'express';
import { getLicenseStatus, activateLicense } from '../controllers/license.controller';

const router = Router();

router.get('/status', getLicenseStatus);
router.post('/activate', activateLicense);

export default router;
