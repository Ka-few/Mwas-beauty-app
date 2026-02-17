-- Add Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  stylist_id INTEGER,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  end_time TIME, -- Calculated based on service duration
  source TEXT NOT NULL CHECK(source IN ('whatsapp', 'facebook', 'instagram', 'call')),
  booking_type TEXT NOT NULL DEFAULT 'scheduled' CHECK(booking_type IN ('walk-in', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'in-progress')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
