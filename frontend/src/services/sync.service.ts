import api from './api';

export interface SyncConfig {
    mode: 'OWNER' | 'BRANCH';
    serverUrl: string;
    branchId: string;
    lastSync?: string;
}

export interface SyncResult {
    push: number;
    pull: number;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    message: string;
}

const STORAGE_KEY = 'mwas_sync_config';

export const syncService = {
    getConfig: (): SyncConfig => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        return {
            mode: 'OWNER', // Default
            serverUrl: 'http://localhost:3001',
            branchId: 'BRANCH_01'
        };
    },

    saveConfig: (config: SyncConfig) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    },

    triggerSync: async (): Promise<SyncResult> => {
        const config = syncService.getConfig();
        if (config.mode !== 'BRANCH') {
            return { push: 0, pull: 0, status: 'FAILED', message: 'Only Branch mode can trigger sync' };
        }

        try {
            // Call the local backend trigger endpoint
            // The local backend will then communicate with the Remote Server URL 
            // We need to pass the Remote Server URL to the local backend so it knows where to sync TO.
            const response = await api.post<SyncResult>('/sync/trigger', {
                server_url: config.serverUrl,
                branch_id: config.branchId
            });
            return response.data;
        } catch (error: any) {
            console.error('Sync failed', error);
            throw new Error(error.response?.data?.message || 'Sync failed');
        }
    },

    // Timer handle
    _timer: null as any,

    startAutoSync: (intervalMs: number = 3600000) => { // Default 1 hour
        if (syncService._timer) clearInterval(syncService._timer);

        const config = syncService.getConfig();
        if (config.mode === 'BRANCH') {
            console.log(`[SYNC] Auto-sync started (Interval: ${intervalMs}ms)`);
            syncService._timer = setInterval(async () => {
                console.log('[SYNC] Triggering auto-sync...');
                try {
                    await syncService.triggerSync();
                    console.log('[SYNC] Auto-sync completed');
                } catch (e) {
                    console.error('[SYNC] Auto-sync failed', e);
                }
            }, intervalMs);
        }
    },

    stopAutoSync: () => {
        if (syncService._timer) {
            clearInterval(syncService._timer);
            syncService._timer = null;
        }
    }
};
