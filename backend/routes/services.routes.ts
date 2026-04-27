import express from 'express';
import {
  getServices,
  addService,
  updateService,
  deleteService,
  getServiceStylists
} from '../controllers/services.controller';

const router = express.Router();

router.get('/', getServices);
router.post('/', addService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);
router.get('/:id/stylists', getServiceStylists);

export default router;
