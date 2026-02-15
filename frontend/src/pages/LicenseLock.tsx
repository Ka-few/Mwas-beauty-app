import React, { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import logo from '../assets/logo.png';

export default function LicenseLock() {
    const { activate, refreshStatus } = useLicense();
    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await activate(key);
            // After activation, the status will update and the lock screen should disappear
            await refreshStatus();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid product key. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-purple-900 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-gradient-to-r from-purple-800 to-purple-600 p-8 text-center border-b-4 border-gold-500">
                    <img src={logo} alt="Mwas Beauty" className="w-24 h-24 mx-auto rounded-full mb-4 border-4 border-gold-500 shadow-xl" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">System Locked</h2>
                    <p className="text-purple-100 mt-2 opacity-90">Trial period has expired</p>
                </div>

                <div className="p-8">
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded">
                        <p className="text-sm text-amber-700 leading-relaxed">
                            Your 7-day trial period of <strong>Mwas Beauty Salon Management System</strong> has ended. To continue using the software, please enter your valid product key.
                        </p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm uppercase tracking-wide">Product Key</label>
                            <input
                                type="text"
                                value={key}
                                onChange={(e) => setKey(e.target.value.toUpperCase())}
                                placeholder="MB-XXXX-XXXX-XXXX"
                                className="w-full border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 p-4 rounded-xl outline-none transition-all font-mono text-center text-lg uppercase"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 animate-pulse text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gold-500 hover:bg-gold-600 text-purple-900 font-black py-4 rounded-xl shadow-lg transform active:scale-95 transition-all text-lg uppercase tracking-wider ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Validating...' : 'Activate System'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-500">
                        <p>Need a product key? Contact us at:</p>
                        <p className="font-bold text-purple-700 mt-1">njorovista@gmail.com | +254 750 979 233</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
