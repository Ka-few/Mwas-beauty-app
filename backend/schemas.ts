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
