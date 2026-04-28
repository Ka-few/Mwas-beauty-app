import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Accounting: React.FC = () => {
    const [balances, setBalances] = useState<any[]>([]);
    const [todaySummary, setTodaySummary] = useState<any>(null);
    const [pl, setPl] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [backfillStatus, setBackfillStatus] = useState<{ running: boolean, message: string | null }>({ running: false, message: null });
    const today = new Date().toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({
        startDate: today,
        endDate: today
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statusRes, plRes] = await Promise.all([
                api.get('/accounting/status', { params: dateRange }),
                api.get('/accounting/profit-loss', {
                    params: dateRange
                })
            ]);

            setBalances(statusRes.data.balances);
            setTodaySummary(statusRes.data.todaySummary);
            setPl(plRes.data);
        } catch (error) {
            console.error('Failed to fetch accounting data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackfill = async () => {
        if (!window.confirm('This will process all historical sales and expenses into the journal. Proceed?')) return;

        setBackfillStatus({ running: true, message: 'Processing historical data... please wait.' });
        try {
            const res = await api.post('/accounting/backfill');
            setBackfillStatus({ running: false, message: `Success: ${res.data.salesBackfilled} sales and ${res.data.expensesBackfilled} expenses backfilled.` });
            fetchData();
        } catch (error: any) {
            setBackfillStatus({ running: false, message: `Error: ${error.message}` });
        }
    };

    const setAllTime = () => {
        setDateRange({
            startDate: '2024-01-01',
            endDate: new Date().toISOString().split('T')[0]
        });
    };

    const setThisMonth = () => {
        const now = new Date();
        setDateRange({
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
        });
    };

    const setToday = () => {
        const t = new Date().toISOString().split('T')[0];
        setDateRange({ startDate: t, endDate: t });
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    if (loading && !pl) return <div className="p-8 text-center text-purple-300">Loading Financial Data...</div>;

    return (
        <div className="p-6 space-y-8 bg-purple-50 min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-purple-900">Accounting Dashboard</h1>
                    <p className="text-purple-600">Financial health at a glance</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={setToday}
                        className="bg-purple-100 text-purple-900 px-3 py-2 rounded hover:bg-purple-200 transition text-sm"
                    >
                        Today
                    </button>
                    <button
                        onClick={setThisMonth}
                        className="bg-purple-100 text-purple-900 px-3 py-2 rounded hover:bg-purple-200 transition text-sm"
                    >
                        This Month
                    </button>
                    <button
                        onClick={setAllTime}
                        className="bg-purple-100 text-purple-900 px-3 py-2 rounded hover:bg-purple-200 transition text-sm"
                    >
                        All Time
                    </button>
                    <button
                        onClick={handleBackfill}
                        disabled={backfillStatus.running}
                        className="bg-yellow-500 text-purple-900 px-4 py-2 rounded hover:bg-yellow-600 transition font-bold disabled:opacity-50"
                    >
                        {backfillStatus.running ? 'Backfilling...' : 'Backfill History'}
                    </button>
                    <button
                        onClick={fetchData}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                    >
                        Refresh Data
                    </button>
                </div>
            </header>

            {backfillStatus.message && (
                <div className={`p-4 rounded-lg font-bold text-center ${backfillStatus.message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {backfillStatus.message}
                    <button onClick={() => setBackfillStatus({ ...backfillStatus, message: null })} className="ml-4 text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Daily Summary Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Today's Revenue</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {todaySummary?.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Today's Expenses</h3>
                    <p className="text-2xl font-bold text-gray-900">KES {todaySummary?.expenses.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Today's Net Income</h3>
                    <p className={`text-2xl font-bold ${todaySummary?.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        KES {todaySummary?.netIncome.toLocaleString()}
                    </p>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profit and Loss Statement */}
                <section className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-purple-900">Profit & Loss</h2>
                            <p className="text-xs text-gray-400">{dateRange.startDate} → {dateRange.endDate}</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                className="text-sm border rounded p-1"
                            />
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                className="text-sm border rounded p-1"
                            />
                        </div>
                    </div>


                    <div className="space-y-4">
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                            <span className="font-semibold">Revenue</span>
                            <span className="font-bold text-green-700">KES {pl?.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                            <span>Cost of Sales</span>
                            <span className="text-red-600">(KES {pl?.cogs.toLocaleString()})</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                            <span>Gross Profit</span>
                            <span className="font-bold">KES {(pl?.revenue - pl?.cogs).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-2 border-b">
                            <span>Operating Expenses</span>
                            <span className="text-red-600">(KES {pl?.expenses.toLocaleString()})</span>
                        </div>
                        <div className="flex justify-between p-3 bg-purple-900 text-white rounded mt-4">
                            <span className="font-bold uppercase">Net Profit</span>
                            <span className="text-xl font-black">KES {pl?.netProfit.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                {/* Account Balances */}
                <section className="bg-white p-6 rounded-xl shadow-md overflow-hidden">
                    <h2 className="text-xl font-bold text-purple-900 mb-6">Chart of Accounts - Balances</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-gray-400 text-sm uppercase">
                                    <th className="pb-3">Code</th>
                                    <th className="pb-3">Account</th>
                                    <th className="pb-3 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {balances.map((acc) => (
                                    <tr key={acc.code} className="hover:bg-gray-50">
                                        <td className="py-3 font-mono text-xs">{acc.code}</td>
                                        <td className="py-3 font-medium">{acc.name}</td>
                                        <td className={`py-3 text-right font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                            {acc.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Integration Tips */}
            <div className="bg-gold-50 p-4 rounded-lg border border-gold-200 text-gold-800 text-sm italic">
                Tip: All entries are generated automatically from POS, Expenses, and M-Pesa. Use the Journal to audit specific transactions.
            </div>
        </div>
    );
};

export default Accounting;
