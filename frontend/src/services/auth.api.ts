import api from './api';

export const login = (credentials: any) => api.post('/auth/login', credentials).then(res => res.data);
export const getUsers = () => api.get('/auth/users').then(res => res.data);
export const createUser = (user: any) => api.post('/auth/users', user).then(res => res.data);
export const changePassword = (id: number, password: string) => api.put(`/auth/users/${id}/password`, { password }).then(res => res.data);
export const deleteUser = (id: number) => api.delete(`/auth/users/${id}`).then(res => res.data);
