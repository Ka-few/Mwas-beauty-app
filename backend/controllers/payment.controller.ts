import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
    private paymentService: PaymentService;

    constructor(paymentService: PaymentService) {
        this.paymentService = paymentService;
    }

    /**
     * POST /api/payments/initiate
     */
    public initiate = async (req: Request, res: Response) => {
        try {
            const { branchId, invoiceId, amount, phoneNumber } = req.body;

            if (!branchId || !invoiceId || !amount || !phoneNumber) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const result = await this.paymentService.initiatePayment(
                branchId,
                invoiceId,
                amount,
                phoneNumber
            );

            return res.status(200).json({
                message: 'STK Push initiated',
                paymentId: result.paymentId,
                checkoutRequestId: result.checkoutRequestId,
            });
        } catch (error: any) {
            console.error('Payment initiation error:', error);
            return res.status(500).json({ error: 'Failed to initiate payment', details: error.message });
        }
    };

    /**
     * POST /api/mpesa/callback
     */
    public callback = async (req: Request, res: Response) => {
        try {
            console.log('M-Pesa Callback received:', JSON.stringify(req.body));

            // We should respond with 200 immediately to Safaricom
            // Processing happens after acknowledgment
            res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

            await this.paymentService.handleMpesaCallback(req.body);
        } catch (error: any) {
            console.error('M-Pesa callback error:', error);
            // Even if we fail, we already sent 200 to Safaricom
        }
    };

    /**
     * GET /api/payments/:invoiceId/status
     */
    public getStatus = async (req: Request, res: Response) => {
        try {
            const { invoiceId } = req.params;
            const payment = await this.paymentService.getPaymentStatus(invoiceId as string);

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            return res.status(200).json(payment);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch status', details: error.message });
        }
    };

    /**
     * GET /api/payments/reconcile/:invoiceId
     * Manual reconciliation endpoint in case callback was missed.
     */
    public reconcile = async (req: Request, res: Response) => {
        try {
            const { invoiceId } = req.params;
            // logic to query Daraja Query API and update Postgres
            // return res.status(200).json({ message: 'Reconciled successfully', invoiceId: invoiceId as string });
            return res.status(501).json({ error: 'Not implemented: Daraja Query logic' });
        } catch (error: any) {
            return res.status(500).json({ error: 'Reconciliation failed', details: error.message });
        }
    };
}
