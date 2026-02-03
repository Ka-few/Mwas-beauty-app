import api from './api';
export const getSales = () => api.get('/sales').then(res => res.data);
export const addSale = (s: any) => api.post('/sales', s).then(res => res.data);
export const updateSale = (id: number, s: any) => api.put(`/sales/${id}`, s).then(res => res.data);
export const deleteSale = (id: number) => api.delete(`/sales/${id}`).then(res => res.data);
export const getAnalytics = () => api.get('/sales/analytics').then(res => res.data);
export const getReports = (startDate?: string, endDate?: string) => api.get('/sales/reports', { params: { startDate, endDate } }).then(res => res.data);
export const getSaleDetails = (id: number) => api.get(`/sales/${id}`).then(res => res.data);
export const completeSale = (id: number, data: any) => api.put(`/sales/${id}/complete`, data).then(res => res.data);
