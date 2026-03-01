import { useState, useEffect } from 'react';
import { syncService, SyncConfig, SyncResult } from '../services/sync.service';
import { useToast } from '../components/ui/Toast';

export default function SyncSettings() {
    const [config, setConfig] = useState<SyncConfig>(syncService.getConfig());
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<SyncResult | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        // Load initial config
        setConfig(syncService.getConfig());
    }, []);

    const handleSave = () => {
        syncService.saveConfig(config);
        showToast('Sync settings saved', 'success');

        // Restart auto-sync if in branch mode
        if (config.mode === 'BRANCH') {
            syncService.startAutoSync();
        } else {
            syncService.stopAutoSync();
        }
    };

    const handleManualSync = async () => {
        setLoading(true);
        try {
            const result = await syncService.triggerSync();
            setLastResult(result);
            showToast(`Sync Completed: Push ${result.push}, Pull ${result.pull}`, 'success');
        } catch (error: any) {
            showToast('Sync failed: ' + error.message, 'error');
            setLastResult({ push: 0, pull: 0, status: 'FAILED', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Multi-Branch Sync Settings</h1>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Configuration</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Operation Mode</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="OWNER"
                                    checked={config.mode === 'OWNER'}
                                    onChange={() => setConfig({ ...config, mode: 'OWNER' })}
                                    className="w-4 h-4 text-purple-600"
                                />
                                <span className="font-medium">Owner PC (Central Server)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="BRANCH"
                                    checked={config.mode === 'BRANCH'}
                                    onChange={() => setConfig({ ...config, mode: 'BRANCH' })}
                                    className="w-4 h-4 text-purple-600"
                                />
                                <span className="font-medium">Branch App</span>
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Owner PC receives data. Branch App sends data to Owner PC.
                        </p>
                    </div>

                    {config.mode === 'BRANCH' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Central Server URL</label>
                                <input
                                    type="text"
                                    value={config.serverUrl}
                                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                                    placeholder="http://192.168.1.100:3001"
                                    className="w-full border rounded-lg p-2 font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    IP Address and Port of the Owner PC.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch ID</label>
                                <input
                                    type="text"
                                    value={config.branchId}
                                    onChange={(e) => setConfig({ ...config, branchId: e.target.value })}
                                    placeholder="BRANCH_01"
                                    className="w-full border rounded-lg p-2 font-mono text-sm uppercase"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Unique identifier for this branch.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>

            {config.mode === 'BRANCH' && (
                <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Sync Status</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Manually trigger synchronization or view last sync status.
                                Auto-sync runs every hour.
                            </p>
                            {lastResult && (
                                <div className={`mb-4 p-3 rounded-lg text-sm ${lastResult.status === 'SUCCESS' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    <p className="font-bold">Last Sync: {lastResult.status}</p>
                                    <p>Pushed: {lastResult.push} records</p>
                                    <p>Pulled: {lastResult.pull} records</p>
                                    {lastResult.message && <p className="mt-1 italic">{lastResult.message}</p>}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin">↻</span> Syncing...
                                </>
                            ) : (
                                <>
                                    <span>↻</span> Sync Now
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
