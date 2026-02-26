import { Request, Response } from "express";
import { pool } from "../db/postgres";
import { MpesaService } from "../services/mpesa.service";

const mpesaService = new MpesaService({
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortCode: process.env.MPESA_SHORTCODE || '',
    passKey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
});

export class PaymentsController {

    public static async initiate(req: Request, res: Response) {
        const { branchId, invoiceId, amount, phoneNumber } = req.body;

        try {
            // 1. Log payment in DB
            const query = `
        INSERT INTO payments (branch_id, invoice_id, amount, phone_number, status)
        VALUES ($1, $2::uuid, $3, $4, 'PENDING')
        RETURNING id;
      `;
            const result = await pool.query(query, [branchId, invoiceId, amount, phoneNumber]);
            const paymentId = result.rows[0].id;

            // 2. Trigger STK Push
            const mpesaResponse = await mpesaService.initiateStkPush(
                phoneNumber,
                amount,
                invoiceId,
                `Payment for ${invoiceId}`
            );

            // 3. Log attempt
            await pool.query(
                `INSERT INTO payment_attempts (payment_id, merchant_request_id, checkout_request_id, amount, status)
         VALUES ($1, $2, $3, $4, 'INITIATED')`,
                [paymentId, mpesaResponse.MerchantRequestID, mpesaResponse.CheckoutRequestID, amount]
            );

            res.status(200).json({ success: true, checkoutRequestId: mpesaResponse.CheckoutRequestID });
        } catch (error: any) {
            console.error('Initiate error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    public static async callback(req: Request, res: Response) {
        try {
            const parsed = mpesaService.parseCallback(req.body);

            // Acknowledge Safaricom immediately
            res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

            const status = parsed.resultCode === 0 ? 'PAID' : 'FAILED';

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Find payment attempt
                const attempt = await client.query(
                    "SELECT payment_id FROM payment_attempts WHERE checkout_request_id = $1",
                    [parsed.checkoutRequestId]
                );

                if (attempt.rows.length > 0) {
                    const paymentId = attempt.rows[0].payment_id;

                    await client.query(
                        "UPDATE payments SET status = $1, mpesa_receipt = $2, updated_at = NOW() WHERE id = $3",
                        [status, parsed.mpesaReceiptNumber, paymentId]
                    );

                    await client.query(
                        "INSERT INTO mpesa_callbacks (checkout_request_id, merchant_request_id, result_code, result_description, raw_payload) VALUES ($1, $2, $3, $4, $5)",
                        [parsed.checkoutRequestId, parsed.merchantRequestId, parsed.resultCode, parsed.resultDesc, JSON.stringify(req.body)]
                    );
                }

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Callback error:', error);
        }
    }

    public static async getStatus(req: Request, res: Response) {
        const { invoiceId } = req.params;
        try {
            const result = await pool.query(
                "SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT 1",
                [invoiceId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(result.rows[0]);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
