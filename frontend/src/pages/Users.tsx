import { useEffect, useState } from 'react';
import { getUsers, createUser, changePassword, deleteUser } from '../services/auth.api';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'staff' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

        if (createForm.password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await createUser(createForm);
            setShowCreateModal(false);
            setCreateForm({ username: '', password: '', role: 'staff' });
            setConfirmPassword('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error creating user');
        }
    };

    const handleDeleteUser = (id: number) => {
        setUserToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete);
            setShowDeleteModal(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error deleting user');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;
        setError('');

        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await changePassword(selectedUserId, newPassword);
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmNewPassword('');
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
                                        className="text-purple-900 hover:text-purple-700 font-medium mr-4"
                                    >
                                        Change Password
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Delete
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
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={createForm.password}
                                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-purple-700 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
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
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-purple-700 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete User</h2>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDeleteUser}
                                className="flex-1 bg-red-600 text-white p-3 rounded font-bold hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="flex-1 bg-gray-300 text-gray-700 p-3 rounded font-bold hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
