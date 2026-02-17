import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function getBookings(req: Request, res: Response) {
    const db = await initializeDB();
    const { startDate, endDate, stylist_id, status, booking_type } = req.query;

    try {
        let query = `
      SELECT b.*, st_main.name as stylist_name,
             GROUP_CONCAT(s.name, ', ') as service_names,
             SUM(s.price) as total_price,
             SUM(s.duration_minutes) as total_duration,
             (SELECT json_group_array(
                json_object('service_id', bs2.service_id, 'stylist_id', bs2.stylist_id)
              ) FROM booking_services bs2 WHERE bs2.booking_id = b.id) as services
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      LEFT JOIN stylists st_serv ON bs.stylist_id = st_serv.id
      LEFT JOIN stylists st_main ON b.stylist_id = st_main.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (startDate) {
            query += " AND b.booking_date >= ?";
            params.push(startDate);
        }
        if (endDate) {
            query += " AND b.booking_date <= ?";
            params.push(endDate);
        }
        if (stylist_id) {
            query += " AND (b.stylist_id = ? OR bs.stylist_id = ?)";
            params.push(stylist_id, stylist_id);
        }
        if (status) {
            query += " AND b.status = ?";
            params.push(status);
        }
        if (booking_type) {
            query += " AND b.booking_type = ?";
            params.push(booking_type);
        }

        query += " GROUP BY b.id ORDER BY b.booking_date DESC, b.booking_time DESC";

        const bookings = await db.all(query, ...params);

        // Parse the JSON services string returned by SQLite
        const formattedBookings = bookings.map((b: any) => ({
            ...b,
            services: b.services ? JSON.parse(b.services) : []
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
}

async function checkStylistOverlap(
    tx: any,
    booking_date: string,
    booking_time: string,
    end_time: string,
    involvedStylistIds: number[],
    excludeBookingId?: number
): Promise<string | null> {
    if (involvedStylistIds.length === 0) return null;

    // Filter out nulls and get unique IDs
    const uniqueStylists = Array.from(new Set(involvedStylistIds.filter(id => id != null)));
    if (uniqueStylists.length === 0) return null;

    const placeholders = uniqueStylists.map(() => '?').join(',');

    // We check both the main booking stylist and the service-specific stylists
    const query = `
        SELECT b.customer_name, b.booking_time, b.end_time, st.name as stylist_name
        FROM bookings b
        LEFT JOIN booking_services bs ON b.id = bs.booking_id
        LEFT JOIN stylists st ON st.id = ? -- We'll bind the specific overlapping stylist ID here later if needed, 
                                          -- but for now we just want to know if ANY overlap exists.
        WHERE b.booking_date = ? 
          AND (? < b.end_time AND b.booking_time < ?)
          AND (b.stylist_id IN (${placeholders}) OR bs.stylist_id IN (${placeholders}))
          AND b.status NOT IN ('cancelled', 'no-show')
          ${excludeBookingId ? 'AND b.id != ?' : ''}
        LIMIT 1
    `;

    // To get the stylist name correctly in the error, we might need a slightly different query 
    // or just a generic error. Let's make it specific.
    const specificQuery = `
        SELECT b.customer_name, b.booking_time, b.end_time, 
               COALESCE(st_main.name, st_serv.name) as stylist_name
        FROM bookings b
        LEFT JOIN booking_services bs ON b.id = bs.booking_id
        LEFT JOIN stylists st_main ON b.stylist_id = st_main.id
        LEFT JOIN stylists st_serv ON bs.stylist_id = st_serv.id
        WHERE b.booking_date = ? 
          AND (? < b.end_time AND b.booking_time < ?)
          AND (
            (b.stylist_id IN (${placeholders})) OR 
            (bs.stylist_id IN (${placeholders}))
          )
          AND b.status NOT IN ('cancelled', 'no-show')
          ${excludeBookingId ? 'AND b.id != ?' : ''}
        LIMIT 1
    `;

    const params = [
        booking_date, booking_time, end_time,
        ...uniqueStylists, ...uniqueStylists
    ];
    if (excludeBookingId) params.push(excludeBookingId);

    const overlap = await tx.get(specificQuery, ...params);
    if (overlap) {
        return `Stylist ${overlap.stylist_name} is already booked for ${overlap.customer_name} from ${overlap.booking_time} to ${overlap.end_time}`;
    }
    return null;
}

export async function createBooking(req: Request, res: Response) {
    const {
        client_id, customer_name, phone_number, services, stylist_id,
        booking_date, booking_time, source, booking_type, notes
    } = req.body;

    const db = await initializeDB();
    try {
        if (!services || !Array.isArray(services) || services.length === 0) {
            res.status(400).json({ message: 'At least one service is required' });
            return;
        }

        await db.transaction(async (tx: any) => {
            const serviceIds = services.map(s => s.service_id);
            const placeholders = serviceIds.map(() => '?').join(',');
            const serviceDetails = await tx.all(`SELECT id, duration_minutes FROM services WHERE id IN (${placeholders})`, ...serviceIds);

            const totalDuration = services.reduce((total: number, s: any) => {
                const detail = serviceDetails.find((d: any) => d.id === s.service_id);
                return total + (detail?.duration_minutes || 0);
            }, 0);

            // Calculate end_time
            const [hours, minutes] = booking_time.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0);
            date.setMinutes(date.getMinutes() + totalDuration);
            const end_time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            // Check for stylist overlap
            const involvedStylists = [stylist_id, ...services.map((s: any) => s.stylist_id)];
            const overlapError = await checkStylistOverlap(
                tx, booking_date, booking_time, end_time, involvedStylists
            );

            if (overlapError) {
                throw new Error(overlapError);
            }

            const result = await tx.run(
                `INSERT INTO bookings (
                    client_id, customer_name, phone_number, stylist_id, 
                    booking_date, booking_time, end_time, source, booking_type, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                client_id || null, customer_name, phone_number, stylist_id || null,
                booking_date, booking_time, end_time, source, booking_type || 'scheduled', 'scheduled', notes || null
            );

            const bookingId = result.lastID;

            // Insert service associations
            for (const s of services) {
                await tx.run(
                    'INSERT INTO booking_services (booking_id, service_id, stylist_id) VALUES (?, ?, ?)',
                    bookingId, s.service_id, s.stylist_id || null
                );
            }

            return bookingId;
        });

        res.status(201).json({ message: 'Booking created successfully' });
    } catch (error: any) {
        console.error('Error creating booking:', error);
        const message = error.message.includes('Stylist') ? error.message : 'Error creating booking';
        res.status(400).json({ message: 'Error creating booking', error: message });
    }
}

export async function updateBooking(req: Request, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    const db = await initializeDB();

    try {
        const existing = await db.get('SELECT * FROM bookings WHERE id = ?', id);
        if (!existing) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        await db.transaction(async (tx: any) => {
            // Recalculate end_time if time or services changed
            let end_time = existing.end_time;
            if (updates.booking_time || updates.services) {
                const bTime = updates.booking_time || existing.booking_time;
                let totalDuration = 0;

                if (updates.services) {
                    const serviceIds = updates.services.map((s: any) => s.service_id);
                    const placeholders = serviceIds.map(() => '?').join(',');
                    const serviceDetails = await tx.all(`SELECT id, duration_minutes FROM services WHERE id IN (${placeholders})`, ...serviceIds);
                    totalDuration = updates.services.reduce((total: number, s: any) => {
                        const detail = serviceDetails.find((d: any) => d.id === s.service_id);
                        return total + (detail?.duration_minutes || 0);
                    }, 0);
                } else {
                    const serviceDetails = await tx.all(`
                        SELECT s.duration_minutes 
                        FROM services s 
                        JOIN booking_services bs ON s.id = bs.service_id 
                        WHERE bs.booking_id = ?`, id);
                    totalDuration = serviceDetails.reduce((total: number, s: any) => total + (s.duration_minutes || 0), 0);
                }

                const [hours, minutes] = bTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0);
                date.setMinutes(date.getMinutes() + totalDuration);
                end_time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            }

            // Check for stylist overlap on update
            const involvedStylists = [
                updates.stylist_id !== undefined ? updates.stylist_id : existing.stylist_id,
                ...(updates.services ? updates.services.map((s: any) => s.stylist_id) : [])
            ];

            // If services weren't updated, we should fetch existing service stylists
            if (!updates.services) {
                const existingServiceStylists = await tx.all(
                    'SELECT stylist_id FROM booking_services WHERE booking_id = ?', id
                );
                involvedStylists.push(...existingServiceStylists.map((s: any) => s.stylist_id));
            }

            const overlapError = await checkStylistOverlap(
                tx,
                updates.booking_date || existing.booking_date,
                updates.booking_time || existing.booking_time,
                end_time,
                involvedStylists,
                parseInt(id as string)
            );

            if (overlapError) {
                throw new Error(overlapError);
            }

            if (updates.services) {
                // Update service links
                await tx.run('DELETE FROM booking_services WHERE booking_id = ?', id);
                for (const s of updates.services) {
                    await tx.run(
                        'INSERT INTO booking_services (booking_id, service_id, stylist_id) VALUES (?, ?, ?)',
                        id, s.service_id, s.stylist_id || null
                    );
                }
            }

            const fields = [
                'client_id', 'customer_name', 'phone_number', 'stylist_id',
                'booking_date', 'booking_time', 'source', 'booking_type', 'status', 'notes'
            ];

            let query = 'UPDATE bookings SET updated_at = CURRENT_TIMESTAMP';
            const params: any[] = [];

            fields.forEach(field => {
                if (updates[field] !== undefined) {
                    query += `, ${field} = ?`;
                    params.push(updates[field]);
                }
            });

            if (updates.booking_time || updates.services) {
                query += `, end_time = ?`;
                params.push(end_time);
            }

            query += ' WHERE id = ?';
            params.push(id as string);

            await tx.run(query, ...params);
        });

        res.json({ message: 'Booking updated successfully' });
    } catch (error: any) {
        console.error('Error updating booking:', error);
        const message = error.message.includes('Stylist') ? error.message : 'Error updating booking';
        res.status(400).json({ message: 'Error updating booking', error: message });
    }
}

export async function deleteBooking(req: Request, res: Response) {
    const { id } = req.params;
    const db = await initializeDB();
    try {
        await db.run('DELETE FROM bookings WHERE id = ?', id);
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting booking' });
    }
}

export async function getCalendarBookings(req: Request, res: Response) {
    const db = await initializeDB();
    const { startDate, endDate } = req.query;

    try {
        const bookings = await db.all(`
      SELECT b.*, st.name as stylist_name,
             GROUP_CONCAT(s.name, ', ') as service_names
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      LEFT JOIN stylists st ON b.stylist_id = st.id
      WHERE b.booking_date BETWEEN ? AND ?
      GROUP BY b.id
    `, startDate, endDate);

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching calendar bookings' });
    }
}

export async function getBookingAnalytics(req: Request, res: Response) {
    const db = await initializeDB();
    try {
        // Bookings by Source
        const sourceStats = await db.all(`
      SELECT source, COUNT(*) as count
      FROM bookings
      GROUP BY source
    `);

        // Staff Utilization
        const staffStats = await db.all(`
      SELECT st.name, COUNT(DISTINCT involvement.booking_id) as appointment_count
      FROM stylists st
      LEFT JOIN (
          SELECT id as booking_id, stylist_id FROM bookings WHERE stylist_id IS NOT NULL
          UNION ALL
          SELECT booking_id, stylist_id FROM booking_services WHERE stylist_id IS NOT NULL
      ) involvement ON st.id = involvement.stylist_id
      GROUP BY st.id
    `);

        // Revenue by Service Type
        const revenueByService = await db.all(`
      SELECT s.name as service_name, SUM(s.price) as revenue
      FROM booking_services bs
      JOIN services s ON bs.service_id = s.id
      JOIN bookings b ON bs.booking_id = b.id
      WHERE b.status = 'completed'
      GROUP BY s.id
    `);

        // Revenue by Booking Type
        const revenueByType = await db.all(`
      SELECT b.booking_type, SUM(s.price) as revenue
      FROM bookings b
      JOIN booking_services bs ON b.id = bs.booking_id
      JOIN services s ON bs.service_id = s.id
      WHERE b.status = 'completed'
      GROUP BY b.booking_type
    `);

        res.json({
            sourceStats,
            staffStats,
            revenueByService,
            revenueByType
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching booking analytics' });
    }
}
