import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { MpesaService } from '../services/mpesa.service';

const router = Router();

// Implementation detail: these should be injected or initialized via a container
const mpesaConfig = {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortCode: process.env.MPESA_SHORTCODE || '',
    passKey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
};

// Assuming 'db' is initialized elsewhere (e.g., Prisma)
const db = {};

const mpesaService = new MpesaService(mpesaConfig);
const paymentService = new PaymentService(mpesaService, db);
const paymentController = new PaymentController(paymentService);

// Payment Initiation
router.post('/payments/initiate', paymentController.initiate);

// Payment Status check (Polling)
router.get('/payments/:invoiceId/status', paymentController.getStatus);

// M-Pesa Callback
router.post('/mpesa/callback', paymentController.callback);

// Manual Reconciliation
router.get('/payments/reconcile/:invoiceId', paymentController.reconcile);

export default router;
