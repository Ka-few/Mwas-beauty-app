import { useEffect, useState } from 'react';
import { getReports } from '../services/sales.api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Fix for jspdf-autotable type definition if needed
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function Reports() {
    const [reports, setReports] = useState<any>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchReports = () => {
        getReports(startDate, endDate).then(setReports).catch(console.error);
    };

    useEffect(() => {
        fetchReports();
    }, [startDate, endDate]);

    const exportCSV = () => {
        if (!reports || !reports.daily) return;

        const headers = ['Date', 'Gross Revenue', 'Product Profit', 'Commissions', 'Net Income'];
        const rows = reports.daily.map((r: any) => [
            r.date,
            r.grossRevenue,
            r.productProfit,
            r.commissions,
            r.netIncome
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map((e: any[]) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reports_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = () => {
        if (!reports || !reports.daily) return;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Financial Report", 14, 22);

        doc.setFontSize(11);
        doc.text(`Period: ${startDate || 'All Time'} to ${endDate || 'All Time'}`, 14, 30);
        doc.text(`Total Net Income: KES ${reports.summary?.totalNetIncome.toLocaleString()}`, 14, 38);

        const tableColumn = ["Date", "Gross Rev.", "Prod. Profit", "Comm.", "Net Income"];
        const tableRows: any[] = [];

        reports.daily.forEach((r: any) => {
            const rowData = [
                r.date,
                r.grossRevenue.toLocaleString(),
                r.productProfit.toLocaleString(),
                r.commissions.toLocaleString(),
                r.netIncome.toLocaleString(),
            ];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
        });

        doc.save(`report_${startDate}_${endDate}.pdf`);
    };

    if (!reports) return <div className="p-8">Loading reports...</div>;

    const { summary, daily, todayCommissions } = reports;

    return (
        <div className="p-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-purple-900 border-b-4 border-gold-500 inline-block pb-2">Financial Reports</h1>

                <div className="flex flex-wrap gap-4 items-end bg-white p-3 rounded shadow-sm border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded text-sm" />
                    </div>
                    <button onClick={fetchReports} className="bg-purple-900 text-white px-4 py-2 rounded text-sm font-bold hover:bg-purple-800">Filter</button>
                    {(startDate || endDate) &&
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-gray-500 text-sm hover:underline">Clear</button>
                    }
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {/* Total Revenue */}
                <div className="bg-purple-900 text-gold-400 p-6 rounded-xl shadow-lg border border-gold-500 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-lg font-medium text-purple-200 uppercase tracking-wide mb-2">Total Gross Revenue</h2>
                        <p className="text-4xl font-bold">KES {summary?.totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Total Profit (Net Income) */}
                <div className="bg-gradient-to-br from-gold-400 to-gold-600 text-purple-900 p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Total Net Profit</h2>
                    <p className="text-4xl font-bold">KES {summary?.totalNetIncome.toLocaleString()}</p>
                    <div className="flex gap-4 mt-2 text-sm font-semibold opacity-80">
                        <span>Prod: {summary?.productProfit.toLocaleString()}</span>
                        <span>|</span>
                        <span>Svc: {summary?.serviceNetIncome.toLocaleString()}</span>
                    </div>
                </div>

                {/* Commissions Paid */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-500 text-sm uppercase font-bold">Commissions Paid</p>
                    <p className="text-2xl font-bold text-red-500 mb-2">KES {summary?.totalCommissions.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs">Paid to stylists/technicians</p>
                </div>
            </div>

            {/* Daily Reports Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-10 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-purple-900">Daily Breakdown</h2>
                    <div className="flex gap-2">
                        <button onClick={exportCSV} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700">
                            CSV
                        </button>
                        <button onClick={exportPDF} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-700">
                            PDF
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Gross Rev.</th>
                                <th className="p-4 text-right">Prod. Profit</th>
                                <th className="p-4 text-right">Commissions</th>
                                <th className="p-4 text-right bg-purple-100 text-purple-900">Net Income</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {daily && daily.map((day: any) => (
                                <tr key={day.date} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{new Date(day.date).toDateString()}</td>
                                    <td className="p-4 text-right text-gray-600">{day.grossRevenue.toLocaleString()}</td>
                                    <td className="p-4 text-right text-green-600">+{day.productProfit.toLocaleString()}</td>
                                    <td className="p-4 text-right text-red-500">-{day.commissions.toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-purple-900 bg-purple-50">{day.netIncome.toLocaleString()}</td>
                                </tr>
                            ))}
                            {(!daily || daily.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">No records found for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Daily Payouts / Commissions (Today) */}
            <div className="bg-white p-8 rounded-xl shadow-md border-t-4 border-gold-500">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-purple-900">Today's Stylist Payouts</h2>
                        <p className="text-gray-500 italic">Expected commissions to be paid out by end of day ({new Date().toLocaleDateString()})</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todayCommissions && todayCommissions.map((c: any) => (
                        <div key={c.name} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gold-300 transition-colors">
                            <span className="font-bold text-gray-700">{c.name}</span>
                            <span className="text-lg font-bold text-purple-700">KES {c.commission.toLocaleString()}</span>
                        </div>
                    ))}
                    {(!todayCommissions || todayCommissions.length === 0) && (
                        <p className="text-gray-400 italic col-span-full py-4 text-center bg-gray-50 rounded">No service sales recorded for today yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
