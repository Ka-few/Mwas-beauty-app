import { Request, Response, NextFunction } from 'express';
import { LicenseService } from '../services/license.service';

export async function checkLicense(req: Request, res: Response, next: NextFunction) {
    try {
        const status = await LicenseService.getLicenseStatus();

        // If expired, block almost everything except license/status and license/activate
        if (status.isExpired) {
            if (req.path.startsWith('/api/license')) {
                return next();
            }
            return res.status(403).json({
                message: 'Trial expired. Please enter a product key to continue using the system.',
                code: 'TRIAL_EXPIRED'
            });
        }

        // If in trial mode (not activated, but not expired), restrict specific features
        if (!status.isActivated) {
            const path = req.path;

            // Block Expenses
            if (path.startsWith('/api/expenses')) {
                return res.status(403).json({
                    message: 'Expenses management is not available in the trial version.',
                    code: 'FEATURE_RESTRICTED'
                });
            }

            // Block User Management
            if (path.startsWith('/api/users') || (path.startsWith('/api/auth') && !path.includes('login'))) {
                // Assuming /api/users is the path for user management
                return res.status(403).json({
                    message: 'User management is not available in the trial version.',
                    code: 'FEATURE_RESTRICTED'
                });
            }

            // Restrict Reports (handled in the controller or specific report routes)
            // But if we have a general /api/sales/reports, we might need more granular check
            if (path.startsWith('/api/sales/reports')) {
                const { startDate, endDate } = req.query;
                // If it's not a daily report (start === end === today) or if it's requesting more than just commissions
                // We'll let the controller handle the specific filtering for trial mode
                // But we can mark it here
                (req as any).isTrial = true;
            }
        }

        next();
    } catch (error) {
        console.error('License check error:', error);
        next(); // Allow on error to avoid locking out users if DB fails briefly, though this is risky
    }
}
