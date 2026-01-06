import { useEffect, useState } from 'react';
import { getUsers, createUser, changePassword } from '../services/auth.api';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'staff' });
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await createUser(createForm);
            setShowCreateModal(false);
            setCreateForm({ username: '', password: '', role: 'staff' });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error creating user');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;
        setError('');
        try {
            await changePassword(selectedUserId, newPassword);
            setShowPasswordModal(false);
            setNewPassword('');
            setSelectedUserId(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error changing password');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-purple-900 border-b-4 border-gold-500 inline-block pb-2">User Management</h1>
                <button onClick={() => setShowCreateModal(true)} className="btn-purple">
                    Create New User
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-purple-900 text-white">
                        <tr>
                            <th className="p-4 text-left">ID</th>
                            <th className="p-4 text-left">Username</th>
                            <th className="p-4 text-left">Role</th>
                            <th className="p-4 text-left">Created At</th>
                            <th className="p-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="p-4">{user.id}</td>
                                <td className="p-4 font-semibold">{user.username}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-gold-400 text-purple-900' : 'bg-purple-100 text-purple-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <button
                                        onClick={() => {
                                            setSelectedUserId(user.id);
                                            setShowPasswordModal(true);
                                        }}
                                        className="text-purple-900 hover:text-purple-700 font-medium"
                                    >
                                        Change Password
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold text-purple-900 mb-6">Create New User</h2>
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={createForm.username}
                                    onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={createForm.password}
                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={createForm.role}
                                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="submit" className="flex-1 bg-purple-900 text-white p-3 rounded font-bold hover:bg-purple-800 transition-colors">
                                    Create User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setError('');
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 p-3 rounded font-bold hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold text-purple-900 mb-6">Change Password</h2>
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="submit" className="flex-1 bg-purple-900 text-white p-3 rounded font-bold hover:bg-purple-800 transition-colors">
                                    Update Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setNewPassword('');
                                        setSelectedUserId(null);
                                        setError('');
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 p-3 rounded font-bold hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
