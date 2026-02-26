import { MpesaService } from './mpesa.service';
import axios from 'axios';
import { initializeDB } from '../db/database';

// In-memory map of invoiceId (record_id UUID) → checkoutRequestId
const pendingPayments = new Map<string, string>();

export class PaymentService {
    private mpesaService: MpesaService;
    private cloudUrl: string;

    constructor(mpesaService: MpesaService) {
        this.mpesaService = mpesaService;
        this.cloudUrl = process.env.SYNC_SERVER_URL || '';
    }

    /**
     * Initiates a payment.
     * If cloudUrl is set, delegates to the cloud backend.
     * Otherwise initiates locally and stores checkoutRequestId for polling.
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

        // Local STK push — store checkoutRequestId for Query API polling
        console.log(`[PAYMENT] Local STK Push for invoiceId: ${invoiceId}`);
        const mpesaResponse = await this.mpesaService.initiateStkPush(
            phoneNumber,
            amount,
            invoiceId.substring(0, 12),
            `Pay ${invoiceId}`.substring(0, 13)
        );

        const checkoutRequestId = mpesaResponse.CheckoutRequestID;
        pendingPayments.set(invoiceId, checkoutRequestId);
        console.log(`[PAYMENT] Stored CheckoutRequestID ${checkoutRequestId} for invoice ${invoiceId}`);

        return { paymentId: null, checkoutRequestId };
    }

    /**
     * Polls Safaricom's Query API for STK push status.
     * Updates local SQLite sale to COMPLETED when payment is confirmed.
     */
    public async getPaymentStatus(invoiceId: string) {
        const checkoutRequestId = pendingPayments.get(invoiceId);

        if (checkoutRequestId) {
            try {
                const queryResult = await this.mpesaService.queryStkPush(checkoutRequestId);
                console.log(`[PAYMENT] Query result for ${invoiceId}: ResultCode=${queryResult.ResultCode}`);

                const resultCode = Number(queryResult.ResultCode);

                if (resultCode === 0) {
                    pendingPayments.delete(invoiceId);
                    const items: any[] = queryResult.CallbackMetadata?.Item || [];
                    const mpesaReceipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || 'STK_PAID';

                    // Mark local sale as COMPLETED
                    try {
                        const db = await initializeDB();
                        await db.run(
                            `UPDATE sales SET status = 'COMPLETED', payment_method = 'Mpesa', mpesa_code = ? WHERE record_id = ?`,
                            mpesaReceipt,
                            invoiceId
                        );
                        console.log(`[PAYMENT] Sale ${invoiceId} marked COMPLETED. Receipt: ${mpesaReceipt}`);
                    } catch (dbErr) {
                        console.error('[PAYMENT] DB update error:', dbErr);
                    }

                    return { status: 'PAID', mpesa_receipt: mpesaReceipt };
                }

                if (resultCode === 1032) { pendingPayments.delete(invoiceId); return { status: 'CANCELLED' }; }
                if (resultCode === 1037) { pendingPayments.delete(invoiceId); return { status: 'FAILED' }; }

                return { status: 'PENDING' };

            } catch (queryError: any) {
                // Sandbox returns an error while STK is still awaiting user input
                console.log(`[PAYMENT] Query still pending for ${invoiceId}`);
                return { status: 'PENDING' };
            }
        }

        // Fallback: check cloud or local DB
        if (this.cloudUrl) {
            try {
                const response = await axios.get(`${this.cloudUrl}/api/payments/${invoiceId}/status`);
                return response.data;
            } catch (error: any) {
                console.error('[PAYMENT] Cloud status check failed:', error.message);
            }
        }

        // Check local DB (for sales already completed by callback)
        try {
            const db = await initializeDB();
            const sale = await db.get(
                `SELECT status, mpesa_code FROM sales WHERE record_id = ?`,
                invoiceId
            );
            if (sale && sale.status === 'COMPLETED') {
                return { status: 'PAID', mpesa_receipt: sale.mpesa_code };
            }
        } catch (e) { /* ignore */ }

        return { status: 'PENDING' };
    }

    public async handleMpesaCallback(payload: any) {
        console.log('[PAYMENT] Callback received:', JSON.stringify(payload));
        const callback = payload?.Body?.stkCallback;
        if (callback && Number(callback.ResultCode) === 0) {
            const items = callback.CallbackMetadata?.Item || [];
            const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
            for (const [invoiceId, cid] of pendingPayments.entries()) {
                if (cid === callback.CheckoutRequestID) {
                    pendingPayments.delete(invoiceId);
                    try {
                        const db = await initializeDB();
                        await db.run(
                            `UPDATE sales SET status = 'COMPLETED', payment_method = 'Mpesa', mpesa_code = ? WHERE record_id = ?`,
                            receipt || 'STK_PAID', invoiceId
                        );
                    } catch (e) { /* best effort */ }
                    break;
                }
            }
        }
    }
}
