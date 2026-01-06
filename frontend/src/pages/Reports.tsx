import { useEffect, useState } from 'react';
import { getReports } from '../services/sales.api';

export default function Reports() {
    const [reports, setReports] = useState<any>(null);

    useEffect(() => {
        getReports().then(setReports).catch(console.error);
    }, []);

    if (!reports) return <div className="p-8">Loading reports...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-purple-900 border-b-4 border-gold-500 inline-block pb-2">Financial Reports</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {/* Total Revenue */}
                <div className="bg-purple-900 text-gold-400 p-6 rounded-xl shadow-lg border border-gold-500">
                    <h2 className="text-lg font-medium text-purple-200 uppercase tracking-wide mb-2">Total Revenue</h2>
                    <p className="text-4xl font-bold">KES {reports.totalRevenue.toLocaleString()}</p>
                </div>

                {/* Total Profit (Net Income) */}
                <div className="bg-gradient-to-br from-gold-400 to-gold-600 text-purple-900 p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Total Net Profit</h2>
                    <p className="text-4xl font-bold">KES {reports.totalNetIncome.toLocaleString()}</p>
                    <p className="text-sm font-medium mt-1 opacity-80">(Product Profit + Service Net Income)</p>
                </div>

                {/* Spacer or another main metric */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-500 text-sm uppercase font-bold">Gross Service Revenue</p>
                    <p className="text-2xl font-bold text-gray-800 mb-2">KES {reports.grossServiceRevenue.toLocaleString()}</p>
                    <p className="text-gray-500 text-sm uppercase font-bold">Total Commissions Paid</p>
                    <p className="text-2xl font-bold text-red-500">KES {reports.totalCommissions.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Product Profitability */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Products Profitability</h2>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-gray-600 text-sm">Revenue from Products</p>
                            {/* Note: Calculated roughly as Total Revenue - Gross Service Revenue for simplicity validation, strictly it comes from its own sum */}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-700 font-medium">Product Profit (Revenue - Cost)</span>
                            <span className="text-xl font-bold text-green-600">KES {reports.productProfit.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400">Total profit generated from product sales after deducting cost price.</p>
                    </div>
                </div>

                {/* Services Profitability */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-purple-900 border-b pb-2">Services Net Income</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Gross Revenue</span>
                            <span className="font-semibold">KES {reports.grossServiceRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                            <span className="text-red-500">Less: Commissions Paid</span>
                            <span className="font-semibold">- KES {reports.totalCommissions.toLocaleString()}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between items-center">
                            <span className="text-lg font-bold text-purple-900">Net Service Income</span>
                            <span className="text-xl font-bold text-purple-900">KES {reports.serviceNetIncome.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
