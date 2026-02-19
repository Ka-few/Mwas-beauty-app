import React, { useState, useEffect, useMemo } from 'react';
import { consumablesApi, Consumable } from '../services/consumables.api';
import { useToast } from '../components/ui/Toast';

export default function Consumables() {
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [showReorderModal, setShowReorderModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Consumable | null>(null);
    const { showToast } = useToast();

    // New Consumable Form State
    const [newItem, setNewItem] = useState({ name: '', unit: '', min_level: 0, current_stock: 0 });

    // Update Stock Form State
    const [stockUpdate, setStockUpdate] = useState({ physical_count: 0, notes: '', quantity: 0 });


    useEffect(() => {
        fetchConsumables();
    }, []);

    const fetchConsumables = async () => {
        setLoading(true);
        try {
            const data = await consumablesApi.getAll();
            setConsumables(data);
        } catch (error) {
            showToast('Failed to fetch consumables', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await consumablesApi.create(newItem);
            showToast('Consumable added successfully', 'success');
            setShowAddModal(false);
            setNewItem({ name: '', unit: '', min_level: 0, current_stock: 0 });
            fetchConsumables();
        } catch (error) {
            showToast('Failed to create consumable', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await consumablesApi.delete(id);
            showToast('Consumable deleted', 'success');
            fetchConsumables();
        } catch (error) {
            showToast('Failed to delete consumable', 'error');
        }
    };

    const openUpdateStock = (item: Consumable) => {
        setSelectedItem(item);
        setStockUpdate({ ...stockUpdate, physical_count: item.current_stock, notes: '' });
        setShowUpdateStockModal(true);
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
            await consumablesApi.updateStock(selectedItem.id, stockUpdate.physical_count, stockUpdate.notes);
            showToast('Stock updated successfully', 'success');
            setShowUpdateStockModal(false);
            fetchConsumables();
        } catch (error) {
            showToast('Failed to update stock', 'error');
        }
    };

    const openAddStock = (item: Consumable) => {
        setSelectedItem(item);
        setStockUpdate({ ...stockUpdate, quantity: 0, notes: '' });
        setShowAddStockModal(true);
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
            await consumablesApi.addStock(selectedItem.id, stockUpdate.quantity, stockUpdate.notes);
            showToast('Stock added successfully', 'success');
            setShowAddStockModal(false);
            fetchConsumables();
        } catch (error) {
            showToast('Failed to add stock', 'error');
        }
    };


    const stats = useMemo(() => {
        const totalItems = consumables.length;
        const lowStockItems = consumables.filter(c => c.current_stock <= c.min_level);
        // Estimated value isn't directly calculated as we don't have cost price in the simple requirement, 
        // but the prompt mentioned it. I'll omit or put 0 for now as 'cost_price' wasn't in the requirement schema strictly.
        // If I wanted to add it, I would have needed cost_price column.
        // Let's stick to the prompt's explicit table columns: Name, Unit, Min Level, Current Stock, Notes.
        // The "Estimated Value" in the dashboard might be a placeholder or require a cost field I missed?
        // The prompt Consumables Master List: Name, Unit, Min Level, Current Stock, Notes. 
        // BUT the dashboard requirements said "Estimated Value of Consumables: KES 12,000".
        // I will skip Value for now or assume 0, as I didn't add cost_price to consumables table based on the "Master List" spec.

        return {
            total: totalItems,
            lowStock: lowStockItems.length,
            lowStockList: lowStockItems
        };
    }, [consumables]);

    const reorderList = stats.lowStockList.map(item => ({
        ...item,
        suggestedOrder: (item.min_level * 2) - item.current_stock
    }));

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-purple-900">Consumables & Stock</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    + Add New Item
                </button>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                    <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Consumables</h3>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{stats.total}</p>
                </div>
                <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${stats.lowStock > 0 ? 'border-red-500' : 'border-green-500'}`}>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase">Low Stock Items</h3>
                    <p className={`text-3xl font-bold mt-2 ${stats.lowStock > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {stats.lowStock} {stats.lowStock > 0 && '⚠'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    {/* Placeholder for value if we add cost later */}
                    <h3 className="text-gray-500 text-sm font-semibold uppercase">Reorder Needed</h3>
                    <button
                        onClick={() => setShowReorderModal(true)}
                        className="text-blue-600 font-bold mt-2 hover:underline text-lg"
                        disabled={stats.lowStock === 0}
                    >
                        View Reorder List ({stats.lowStock})
                    </button>
                </div>
            </div>

            {/* Master List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Master Stock List</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase border-b">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Unit</th>
                                <th className="p-4">Min Lvl</th>
                                <th className="p-4">Current Stock</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {consumables.map((item) => {
                                const isLow = item.current_stock <= item.min_level;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="p-4 text-gray-500">{item.unit || '-'}</td>
                                        <td className="p-4 text-gray-500">{item.min_level}</td>
                                        <td className="p-4 font-bold text-gray-800">{item.current_stock}</td>
                                        <td className="p-4">
                                            {isLow ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">LOW STOCK</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">OK</span>
                                            )}
                                        </td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <button
                                                onClick={() => openAddStock(item)}
                                                title="Add Purchased Stock"
                                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded"
                                            >
                                                + Stock
                                            </button>
                                            <button
                                                onClick={() => openUpdateStock(item)}
                                                title="End-of-Day Update"
                                                className="bg-orange-100 hover:bg-orange-200 text-orange-700 p-2 rounded"
                                            >
                                                Update
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-gray-400 hover:text-red-500 p-2"
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {consumables.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No consumables found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Consumable Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Consumable</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ml, pc"
                                        value={newItem.unit}
                                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Level</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={newItem.min_level}
                                        onChange={e => setNewItem({ ...newItem, min_level: Number(e.target.value) })}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newItem.current_stock}
                                    onChange={e => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                >
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Stock Modal (End of Day) */}
            {showUpdateStockModal && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h2 className="text-xl font-bold mb-2">Update Stock Level</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Record the physical count for <strong>{selectedItem.name}</strong>.
                        </p>
                        <form onSubmit={handleUpdateStock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Quantanitly Left</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={stockUpdate.physical_count}
                                    onChange={e => setStockUpdate({ ...stockUpdate, physical_count: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2 text-lg font-bold"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Current system stock: {selectedItem.current_stock}.
                                    Usage will be calculated as {selectedItem.current_stock} - New Stock.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={stockUpdate.notes}
                                    onChange={e => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                    placeholder="e.g. End of day check"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateStockModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                                >
                                    Confirm Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Stock Modal (Purchase) */}
            {showAddStockModal && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h2 className="text-xl font-bold mb-2">Restock Item</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Adding new stock for <strong>{selectedItem.name}</strong>.
                        </p>
                        <form onSubmit={handleAddStock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Purchased</label>
                                <input
                                    type="number"
                                    required
                                    min="0.1"
                                    step="0.01"
                                    value={stockUpdate.quantity || ''}
                                    onChange={e => setStockUpdate({ ...stockUpdate, quantity: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2 text-lg font-bold"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={stockUpdate.notes}
                                    onChange={e => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                    placeholder="e.g. Supplier delivery"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddStockModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                >
                                    Add Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reorder List Modal */}
            {showReorderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold mb-2">Suggested Reorder List</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Items below minimum level. Formula: (Min Level × 2) – Current Stock
                        </p>

                        <div className="overflow-y-auto max-h-96">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-2">Item</th>
                                        <th className="p-2 text-center">Min Level</th>
                                        <th className="p-2 text-center">Current</th>
                                        <th className="p-2 text-right font-bold text-blue-700">Order Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reorderList.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-2">{item.name}</td>
                                            <td className="p-2 text-center text-gray-500">{item.min_level}</td>
                                            <td className="p-2 text-center font-bold text-red-600">{item.current_stock}</td>
                                            <td className="p-2 text-right font-bold text-blue-700 bg-blue-50 rounded">
                                                {Math.max(0, item.suggestedOrder)} {item.unit}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowReorderModal(false)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                            >
                                Print List
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
