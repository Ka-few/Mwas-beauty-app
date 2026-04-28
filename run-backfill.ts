import { AccountingService } from './backend/services/accounting.service';

async function runBackfill() {
    try {
        await AccountingService.backfillHistoricalData();
        console.log('Backfill process finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
}

runBackfill();
