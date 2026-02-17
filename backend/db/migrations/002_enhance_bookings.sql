-- Add client_id to bookings table
ALTER TABLE bookings ADD COLUMN client_id INTEGER REFERENCES clients(id);

-- Create booking_services junction table
CREATE TABLE IF NOT EXISTS booking_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Migrate existing service_id from bookings to booking_services
INSERT INTO booking_services (booking_id, service_id)
SELECT id, service_id FROM bookings WHERE service_id IS NOT NULL;

-- Note: In SQLite we can't easily drop columns, so we'll keep service_id for now 
-- to maintain backward compatibility during migration, but we'll stop using it in the code.
