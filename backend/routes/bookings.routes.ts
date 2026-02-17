import { Router } from 'express';
import * as bookingsController from '../controllers/bookings.controller';
import { validate } from '../middleware/validation';
import { createBookingSchema, updateBookingSchema } from '../schemas';

const router = Router();

router.get('/', bookingsController.getBookings);
router.post('/', validate(createBookingSchema), bookingsController.createBooking);
router.get('/calendar', bookingsController.getCalendarBookings);
router.get('/analytics', bookingsController.getBookingAnalytics);
router.get('/:id', bookingsController.getBookings); // Uses common list with ID filter
router.put('/:id', validate(updateBookingSchema), bookingsController.updateBooking);
router.delete('/:id', bookingsController.deleteBooking);

export default router;
