import api from './api';
export const getProducts = () => api.get('/products').then(res => res.data);
export const addProduct = (s: any) => api.post('/products', s).then(res => res.data);
export const updateProduct = (id:number, s:any) => api.put(`/products/${id}`, s).then(res=>res.data);
export const deleteProduct = (id:number) => api.delete(`/products/${id}`).then(res=>res.data);
