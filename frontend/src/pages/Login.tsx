import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = await login({ username, password });
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-gold-500">
                <h1 className="text-3xl font-bold text-center text-purple-900 mb-8 tracking-wider">MWAS BEAUTY</h1>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder="Enter username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder="Enter password"
                        />
                    </div>
                    <button type="submit" className="w-full bg-purple-900 text-white p-3 rounded font-bold hover:bg-purple-800 transition-colors uppercase tracking-wide">
                        Sign In
                    </button>
                </form>
                <p className="mt-6 text-center text-xs text-gray-400">&copy; 2024 Mwas Beauty</p>
            </div>
        </div>
    );
}
