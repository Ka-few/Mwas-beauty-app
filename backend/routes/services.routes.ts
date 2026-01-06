import express from 'express';
import {
  getServices,
  addService,
  updateService,
  deleteService
} from '../controllers/services.controller';

const router = express.Router();

router.get('/', getServices);
router.post('/', addService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
