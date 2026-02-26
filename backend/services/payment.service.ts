import { MpesaService } from './mpesa.service';
// Assuming a DB client like Prisma or similar is available
// For this example, I'll use placeholders for the repository calls

export class PaymentService {
    private mpesaService: MpesaService;
    private db: any; // Placeholder for PrismaClient

    constructor(mpesaService: MpesaService, db: any) {
        this.mpesaService = mpesaService;
        this.db = db;
    }

    /**
     * Initiates a payment from a local branch.
     * This record starts in the cloud PostgreSQL.
     */
    public async initiatePayment(branchId: string, invoiceId: string, amount: number, phoneNumber: string) {
        // 1. Create payment record in PENDING state
        const payment = await this.db.payments.create({
            data: {
                branch_id: branchId,
                invoice_id: invoiceId,
                amount,
                phone_number: phoneNumber,
                status: 'PENDING',
            },
        });

        try {
            // 2. Trigger M-Pesa STK Push
            const mpesaResponse = await this.mpesaService.initiateStkPush(
                phoneNumber,
                amount,
                invoiceId,
                `Payment for ${invoiceId}`
            );

            // 3. Log the attempt
            await this.db.payment_attempts.create({
                data: {
                    payment_id: payment.id,
                    merchant_request_id: mpesaResponse.MerchantRequestID,
                    checkout_request_id: mpesaResponse.CheckoutRequestID,
                    amount,
                    status: 'INITIATED',
                    raw_initiation_response: mpesaResponse,
                },
            });

            return { paymentId: payment.id, checkoutRequestId: mpesaResponse.CheckoutRequestID };
        } catch (error) {
            // Update status to FAILED if initiation fails
            await this.db.payments.update({
                where: { id: payment.id },
                data: { status: 'FAILED' },
            });
            throw error;
        }
    }

    /**
     * Handles the callback from M-Pesa.
     * Includes idempotency check.
     */
    public async handleMpesaCallback(payload: any) {
        // 1. Log raw callback for audit
        const parsed = this.mpesaService.parseCallback(payload);

        await this.db.mpesa_callbacks.create({
            data: {
                checkout_request_id: parsed.checkoutRequestId,
                merchant_request_id: parsed.merchantRequestId,
                result_code: parsed.resultCode,
                result_description: parsed.resultDesc,
                raw_payload: payload,
            },
        });

        // 2. Transactional update to payment status
        return await this.db.$transaction(async (tx: any) => {
            // Find payment via checkoutRequestId
            const attempt = await tx.payment_attempts.findUnique({
                where: { checkout_request_id: parsed.checkoutRequestId },
                include: { payment: true },
            });

            if (!attempt) throw new Error('Payment attempt not found');
            if (attempt.payment.status === 'PAID') return attempt.payment; // Already processed (Idempotency)

            const newStatus = parsed.resultCode === 0 ? 'PAID' : 'FAILED';

            const updatedPayment = await tx.payments.update({
                where: { id: attempt.payment_id },
                data: {
                    status: newStatus,
                    mpesa_receipt: parsed.mpesaReceiptNumber || null,
                },
            });

            return updatedPayment;
        });
    }

    /**
     * Check payment status (used by Electron polling)
     */
    public async getPaymentStatus(invoiceId: string) {
        return await this.db.payments.findFirst({
            where: { invoice_id: invoiceId },
            orderBy: { created_at: 'desc' },
        });
    }
}
