import { MpesaService } from './backend/services/mpesa.service';
import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function test() {
    const mpesa = new MpesaService({
        consumerKey: process.env.MPESA_CONSUMER_KEY!,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
        shortCode: process.env.MPESA_SHORTCODE!,
        passKey: process.env.MPESA_PASSKEY!,
        callbackUrl: process.env.MPESA_CALLBACK_URL!,
        baseUrl: process.env.MPESA_BASE_URL!
    });

    try {
        const res = await mpesa.queryStkPush('ws_CO_1703202309424012345'); // random invalid request ID
        console.log("Success:", res);
    } catch (e: any) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", e.response?.data);
    }
}
test();
