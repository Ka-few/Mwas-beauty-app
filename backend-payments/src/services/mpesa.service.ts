import axios from 'axios';

export interface MpesaConfig {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    passKey: string;
    callbackUrl: string;
}

export class MpesaService {
    private config: MpesaConfig;

    constructor(config: MpesaConfig) {
        this.config = config;
    }

    /**
     * Formats phone number to 254XXXXXXXXX format
     */
    public static formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.substring(1);
        } else if (cleaned.startsWith('+254')) {
            cleaned = cleaned.substring(1);
        } else if (cleaned.length === 9) {
            cleaned = '254' + cleaned;
        }
        return cleaned;
    }

    private async getAccessToken(): Promise<string> {
        const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
        const response = await axios.get(`${this.config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` },
        });
        return response.data.access_token;
    }

    public async initiateStkPush(phoneNumber: string, amount: number, accountReference: string, transactionDesc: string) {
        const formattedPhone = MpesaService.formatPhoneNumber(phoneNumber);
        const token = await this.getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${this.config.shortCode}${this.config.passKey}${timestamp}`).toString('base64');

        const payload = {
            BusinessShortCode: this.config.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: this.config.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: this.config.callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc,
        };

        const response = await axios.post(
            `${this.config.baseUrl}/mpesa/stkpush/v1/processrequest`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data;
    }

    public parseCallback(body: any) {
        const result = body.Body.stkCallback;
        const metadata = result.CallbackMetadata?.Item || [];

        return {
            merchantRequestId: result.MerchantRequestID,
            checkoutRequestId: result.CheckoutRequestID,
            resultCode: result.ResultCode,
            resultDesc: result.ResultDesc,
            mpesaReceiptNumber: metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value,
            transactionDate: metadata.find((i: any) => i.Name === 'TransactionDate')?.Value,
            phoneNumber: metadata.find((i: any) => i.Name === 'PhoneNumber')?.Value,
            amount: metadata.find((i: any) => i.Name === 'Amount')?.Value,
        };
    }
}
