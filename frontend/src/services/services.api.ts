import api from './api';
export const getServices = () => api.get('/services').then(res => res.data);
export const addService = (s: any) => api.post('/services', s).then(res => res.data);
export const updateService = (id:number, s:any) => api.put(`/services/${id}`, s).then(res=>res.data);
export const deleteService = (id:number) => api.delete(`/services/${id}`).then(res=>res.data);
