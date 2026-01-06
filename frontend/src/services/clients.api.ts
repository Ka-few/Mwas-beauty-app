import api from './api';

export const getClients = () => api.get('/clients').then(res => res.data);
export const addClient = (client: any) => api.post('/clients', client).then(res => res.data);
export const updateClient = (id: number, client: any) => api.put(`/clients/${id}`, client).then(res => res.data);
export const deleteClient = (id: number) => api.delete(`/clients/${id}`).then(res => res.data);
