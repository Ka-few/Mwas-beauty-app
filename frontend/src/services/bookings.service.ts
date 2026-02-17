import api from './api';
import { Booking, BookingAnalytics } from '../types/booking';

export const bookingService = {
    getBookings: async (filters: any = {}) => {
        const response = await api.get<Booking[]>('/bookings', { params: filters });
        return response.data;
    },

    createBooking: async (data: Partial<Booking>) => {
        const response = await api.post('/bookings', data);
        return response.data;
    },

    updateBooking: async (id: number, data: Partial<Booking>) => {
        const response = await api.put(`/bookings/${id}`, data);
        return response.data;
    },

    deleteBooking: async (id: number) => {
        const response = await api.delete(`/bookings/${id}`);
        return response.data;
    },

    getCalendarBookings: async (startDate: string, endDate: string) => {
        const response = await api.get<Booking[]>('/bookings/calendar', {
            params: { startDate, endDate }
        });
        return response.data;
    },

    getBookingAnalytics: async () => {
        const response = await api.get<BookingAnalytics>('/bookings/analytics');
        return response.data;
    }
};
