import api from './api';

export const getExpenses = () => api.get('/expenses').then(res => res.data);
export const addExpense = (expense: any) => api.post('/expenses', expense).then(res => res.data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`).then(res => res.data);
