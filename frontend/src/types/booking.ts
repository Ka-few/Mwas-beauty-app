export type BookingSource = 'whatsapp' | 'facebook' | 'instagram' | 'call' | 'physical';
export type BookingType = 'walk-in' | 'scheduled';
export type BookingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'in-progress';

export interface Booking {
    id: number;
    client_id?: number | null;
    customer_name: string;
    phone_number: string;
    services: Array<{
        service_id: number;
        stylist_id?: number | null;
    }>;
    service_names?: string;
    total_price?: number;
    total_duration?: number;
    stylist_id?: number | null;
    stylist_name?: string;
    booking_date: string;
    booking_time: string;
    end_time: string;
    source: BookingSource;
    booking_type: BookingType;
    status: BookingStatus;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface BookingAnalytics {
    sourceStats: Array<{ source: BookingSource; count: number }>;
    staffStats: Array<{ name: string; appointment_count: number }>;
    revenueByService: Array<{ service_name: string; revenue: number }>;
    revenueByType: Array<{ booking_type: BookingType; revenue: number }>;
}
