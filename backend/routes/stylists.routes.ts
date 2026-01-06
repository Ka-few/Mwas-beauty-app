import express from 'express';
import {
  getStylists,
  addStylist,
  updateStylist,
  deleteStylist
} from '../controllers/stylists.controller';

const router = express.Router();

router.get('/', getStylists);
router.post('/', addStylist);
router.put('/:id', updateStylist);
router.delete('/:id', deleteStylist);

export default router;
