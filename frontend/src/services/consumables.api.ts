import api from './api';

export interface Consumable {
    id: number;
    name: string;
    unit?: string;
    min_level: number;
    current_stock: number;
    created_at?: string;
}

export const consumablesApi = {
    getAll: async () => {
        const response = await api.get<Consumable[]>('/consumables');
        return response.data;
    },

    create: async (data: Partial<Consumable>) => {
        const response = await api.post<{ id: number }>('/consumables', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Consumable>) => {
        const response = await api.put(`/consumables/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete(`/consumables/${id}`);
        return response.data;
    },

    updateStock: async (id: number, physical_count: number, notes?: string) => {
        const response = await api.post<{ message: string, usage: number }>(`/consumables/${id}/stock/update`, {
            physical_count,
            notes
        });
        return response.data;
    },

    addStock: async (id: number, quantity: number, notes?: string) => {
        const response = await api.post<{ message: string, new_stock: number }>(`/consumables/${id}/stock/add`, {
            quantity,
            notes
        });
        return response.data;
    }
};
