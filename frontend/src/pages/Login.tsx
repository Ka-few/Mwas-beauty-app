import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        try {
            const res = await api.post('/auth/login', { username, password });
            localStorage.setItem('user', JSON.stringify(res.data));

            const from = (location.state as any)?.from?.pathname || '/';
            // If admin, go to dashboard (or from), if staff go to sales
            if (res.data.role !== 'admin' && from === '/') {
                navigate('/sales');
            } else {
                navigate(from);
            }

        } catch (err: any) {
            console.error('Login error:', err);

            // Show specific error messages based on error type
            if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
                setError('Cannot connect to server. Please ensure the application is running correctly.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Connection timeout. Please try again.');
            } else if (err.response?.status === 401) {
                setError('Invalid username or password');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError(err.message || 'An error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-black">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gold-400 to-gold-600"></div>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center mb-3 shadow-inner border-2 border-gold-200">
                        <img src={logo} alt="Mwas Beauty" className="w-20 h-20 object-contain rounded-full" />
                    </div>
                    <h2 className="text-3xl font-bold text-purple-900 tracking-tight">MWAS BEAUTY</h2>
                    <p className="text-sm text-purple-400 uppercase tracking-widest mt-1">Salon Management</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100 flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-700 to-purple-900 text-white p-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:from-purple-800 hover:to-purple-950 transition-all transform hover:-translate-y-0.5"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Mwas Beauty Systems
                </div>
            </div>
        </div>
    );
}
