import api from './api';
export const getStylists = () => api.get('/stylists').then(res => res.data);
export const addStylist = (s: any) => api.post('/stylists', s).then(res => res.data);
export const updateStylist = (id:number, s:any) => api.put(`/stylists/${id}`, s).then(res=>res.data);
export const deleteStylist = (id:number) => api.delete(`/stylists/${id}`).then(res=>res.data);
