import { Request, Response } from 'express';
import { LicenseService } from '../services/license.service';

export async function getLicenseStatus(req: Request, res: Response) {
    try {
        const status = await LicenseService.getLicenseStatus();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching license status', error: error.message });
    }
}

export async function activateLicense(req: Request, res: Response) {
    const { key } = req.body;
    if (!key) {
        res.status(400).json({ message: 'License key is required' });
        return;
    }

    try {
        const result = await LicenseService.activateLicense(key);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
}
