import { MpesaService } from './mpesa.service';
import axios from 'axios';
// Assuming a DB client like Prisma or similar is available
// For this example, I'll use placeholders for the repository calls

export class PaymentService {
    private mpesaService: MpesaService;
    private db: any;
    private cloudUrl: string;

    constructor(mpesaService: MpesaService, db: any) {
        this.mpesaService = mpesaService;
        this.db = db;
        // In a real app, this should come from settings DB or environment
        this.cloudUrl = process.env.SYNC_SERVER_URL || '';
    }

    /**
     * Initiates a payment. 
     * If cloudUrl is available, delegates to the cloud backend (Render) 
     * so that the callback is correctly received globally.
     */
    public async initiatePayment(branchId: string, invoiceId: string, amount: number, phoneNumber: string) {
        if (this.cloudUrl) {
            console.log(`[PAYMENT] Delegating initiation to Cloud: ${this.cloudUrl}`);
            try {
                const response = await axios.post(`${this.cloudUrl}/api/payments/initiate`, {
                    branchId,
                    invoiceId: invoiceId.toString(),
                    amount,
                    phoneNumber
                });
                return response.data;
            } catch (error: any) {
                console.error('[PAYMENT] Cloud delegation failed:', error.response?.data || error.message);
                throw new Error('Cloud payment initiation failed');
            }
        }

        // Fallback to local initiation (Callbacks will likely fail if behind NAT)
        console.warn('[PAYMENT] No SYNC_SERVER_URL configured. Using local initiation.');
        const mpesaResponse = await this.mpesaService.initiateStkPush(
            phoneNumber,
            amount,
            invoiceId,
            `Payment for ${invoiceId}`
        );
        return { checkoutRequestId: mpesaResponse.CheckoutRequestID };
    }

    /**
     * Check payment status.
     * Proxies to Cloud if available for real-time result from callbacks.
     */
    public async getPaymentStatus(invoiceId: string) {
        if (this.cloudUrl) {
            try {
                const response = await axios.get(`${this.cloudUrl}/api/payments/${invoiceId}/status`);
                return response.data;
            } catch (error: any) {
                console.error('[PAYMENT] Cloud status check failed:', error.message);
            }
        }

        // Check local SQLite (if synced)
        if (this.db && typeof this.db.get === 'function') {
            const sale = await this.db.get('SELECT status, mpesa_code FROM sales WHERE record_id = ? OR id = ?', invoiceId, invoiceId);
            if (sale && sale.status === 'COMPLETED') {
                return { status: 'PAID', mpesa_receipt: sale.mpesa_code };
            }
        }

        return { status: 'PENDING' };
    }

    public async handleMpesaCallback(payload: any) {
        console.log('[PAYMENT] Local callback received:', JSON.stringify(payload));
    }
}
