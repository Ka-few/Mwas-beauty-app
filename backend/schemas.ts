import { z } from 'zod';

export const createClientSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Client name is required'),
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
        notes: z.string().optional()
    })
});

export const createSaleSchema = z.object({
    body: z.object({
        client_id: z.number().int().nullable().optional(),
        payment_method: z.enum(['Cash', 'Mpesa', 'Card', 'Other', 'PENDING']),
        status: z.string().nullable().optional(),
        mpesa_code: z.string().nullable().optional(),
        services: z.array(z.object({
            service_id: z.number().int(),
            stylist_id: z.number().int(),
            price: z.number().positive()
        })).optional(),
        products: z.array(z.object({
            product_id: z.number().int(),
            quantity: z.number().int().positive(),
            selling_price: z.number().positive()
        })).optional()
    }).refine(data => {
        const hasServices = data.services && data.services.length > 0;
        const hasProducts = data.products && data.products.length > 0;
        return hasServices || hasProducts;
    }, { message: "Sale must include at least one service or product" })
});
export const createBookingSchema = z.object({
    body: z.object({
        client_id: z.number().optional().nullable(),
        customer_name: z.string().min(1),
        phone_number: z.string().min(1),
        services: z.array(z.object({
            service_id: z.number(),
            stylist_id: z.number().optional().nullable()
        })).min(1),
        stylist_id: z.number().optional().nullable(),
        booking_date: z.string(),
        booking_time: z.string(),
        source: z.enum(['whatsapp', 'facebook', 'instagram', 'call', 'physical']),
        booking_type: z.enum(['walk-in', 'scheduled']),
        status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']).optional(),
        notes: z.string().optional().nullable(),
    })
});

export const updateBookingSchema = z.object({
    body: z.object({
        client_id: z.number().optional().nullable(),
        customer_name: z.string().min(1).optional(),
        phone_number: z.string().min(1).optional(),
        services: z.array(z.object({
            service_id: z.number(),
            stylist_id: z.number().optional().nullable()
        })).min(1).optional(),
        stylist_id: z.number().optional().nullable(),
        booking_date: z.string().optional(),
        booking_time: z.string().optional(),
        source: z.enum(['whatsapp', 'facebook', 'instagram', 'call', 'physical']).optional(),
        booking_type: z.enum(['walk-in', 'scheduled']).optional(),
        status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']).optional(),
        notes: z.string().optional().nullable(),
    })
});
