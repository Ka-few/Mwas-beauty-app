import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface LicenseStatus {
    isActivated: boolean;
    trialStartDate: string;
    daysRemaining: number;
    isExpired: boolean;
    licenseKey: string;
}

interface LicenseContextType {
    status: LicenseStatus | null;
    loading: boolean;
    refreshStatus: () => Promise<void>;
    activate: (key: string) => Promise<void>;
    isFeatureAllowed: (feature: string) => boolean;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3001/api';

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<LicenseStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshStatus = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/license/status`);
            setStatus(response.data);
        } catch (error) {
            console.error('Failed to fetch license status', error);
        } finally {
            setLoading(false);
        }
    };

    const activate = async (key: string) => {
        await axios.post(`${API_BASE_URL}/license/activate`, { key });
        await refreshStatus();
    };

    const isFeatureAllowed = (feature: string): boolean => {
        if (!status) return true; // Default to true if loading
        if (status.isActivated) return true;

        switch (feature) {
            case 'EXPENSES':
            case 'USER_MANAGEMENT':
                return false;
            case 'FULL_REPORTS':
                return false;
            case 'DAILY_COMMISSION_REPORT':
                return true;
            default:
                return true;
        }
    };

    useEffect(() => {
        refreshStatus();
    }, []);

    return (
        <LicenseContext.Provider value={{ status, loading, refreshStatus, activate, isFeatureAllowed }}>
            {children}
        </LicenseContext.Provider>
    );
};

export const useLicense = () => {
    const context = useContext(LicenseContext);
    if (context === undefined) {
        throw new Error('useLicense must be used within a LicenseProvider');
    }
    return context;
};
