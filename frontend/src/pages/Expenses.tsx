import { useEffect, useState } from 'react';
import { getExpenses, addExpense, deleteExpense } from '../services/expenses.api';

const EXPENSE_CATEGORIES = [
    'Rent',
    'Water Bill',
    'Power Bill',
    'Internet',
    'Licenses',
    'Salaries',
    'Product Restock',
    'Maintenance',
    'Other'
];

export default function Expenses() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    const fetchExpenses = () => {
        getExpenses().then(setExpenses).catch(console.error);
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !date) return;

        try {
            await addExpense({
                category,
                amount: Number(amount),
                date,
                description
            });
            setAmount('');
            setDescription('');
            fetchExpenses();
            alert('Expense recorded successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to record expense');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            try {
                await deleteExpense(id);
                fetchExpenses();
            } catch (error) {
                console.error(error);
                alert('Failed to delete expense');
            }
        }
    };

    // Custom cell renderer for Delete button
    const renderActions = (row: any) => (
        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 font-bold text-sm">
            Delete
        </button>
    );

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-6 text-purple-900 border-b-2 border-gold-500 inline-block">Manage Expenses</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Add Expense Form */}
                <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-md border border-gray-100 h-fit">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Record New Expense</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="border p-2 rounded w-full bg-gray-50 focus:bg-white transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="border p-2 rounded w-full bg-gray-50 focus:bg-white transition-colors"
                            >
                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">Amount (KES)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="border p-2 rounded w-full bg-gray-50 focus:bg-white transition-colors"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">Description (Optional)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Details..."
                                className="border p-2 rounded w-full bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>

                        <button type="submit" className="w-full bg-purple-900 text-gold-400 py-2 rounded font-bold hover:bg-purple-800 transition-colors shadow">
                            Record Expense
                        </button>
                    </form>
                </div>

                {/* Expenses Table */}
                <div className="w-full md:w-2/3">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Expenses</h2>
                    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800">{new Date(expense.date).toDateString()}</td>
                                        <td className="p-3">
                                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600 text-sm">{expense.description || '-'}</td>
                                        <td className="p-3 text-right font-bold text-gray-800">KES {expense.amount.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            {renderActions(expense)}
                                        </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">No expenses recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
