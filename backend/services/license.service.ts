import { initializeDB } from '../db/database';

export class LicenseService {
    private static TRIAL_DAYS = 7;

    static async getLicenseStatus() {
        const db = await initializeDB();
        const settings = await db.all('SELECT * FROM settings');
        const status: any = {};
        settings.forEach((s: any) => {
            status[s.key] = s.value;
        });

        const isActivated = status.is_activated === 'true';
        const trialStartDate = new Date(status.trial_start_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, this.TRIAL_DAYS - diffDays);
        const isExpired = !isActivated && diffDays >= this.TRIAL_DAYS;

        return {
            isActivated,
            trialStartDate: status.trial_start_date,
            daysRemaining,
            isExpired,
            licenseKey: status.license_key
        };
    }

    static async activateLicense(key: string) {
        // Simple validation logic: MB-XXXX-XXXX-XXXX
        // For a real app, this would be more complex and likely involve a server
        const isValid = this.validateKey(key);
        if (!isValid) {
            throw new Error('Invalid product key');
        }

        const db = await initializeDB();
        await db.run("UPDATE settings SET value = 'true', updated_at = CURRENT_TIMESTAMP WHERE key = 'is_activated'");
        await db.run("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'license_key'", key);

        return { message: 'License activated successfully' };
    }

    private static validateKey(key: string): boolean {
        // Mock validation: starts with "MB-" and has 3 segments of 4 chars
        const regex = /^MB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return regex.test(key);
    }
}
