-- Transport Groups Management Schema
-- Migration 009: Create tables for transport group optimization and management

-- Transport Groups table
CREATE TABLE IF NOT EXISTS transport_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_id UUID,
    driver_id UUID,
    capacity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' 
        CHECK (status IN ('planning', 'assigned', 'in_transit', 'completed', 'cancelled')),
    estimated_duration INTEGER, -- minutes
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transport_groups_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Transport Group Passengers table
CREATE TABLE IF NOT EXISTS transport_group_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    guest_id UUID NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    pickup_location VARCHAR(500),
    dropoff_location VARCHAR(500),
    special_requirements JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transport_passengers_group 
        FOREIGN KEY (group_id) REFERENCES transport_groups(id) ON DELETE CASCADE,
    
    -- Ensure one passenger per group (prevent duplicates)
    UNIQUE(group_id, guest_id)
);

-- Transport Group Routes table
CREATE TABLE IF NOT EXISTS transport_group_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    location VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pickup', 'dropoff', 'waypoint')),
    sequence INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE,
    coordinates JSONB, -- {lat: number, lng: number}
    estimated_duration INTEGER, -- minutes to this stop
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transport_routes_group 
        FOREIGN KEY (group_id) REFERENCES transport_groups(id) ON DELETE CASCADE,
    
    -- Ensure proper route sequencing
    UNIQUE(group_id, sequence)
);

-- Vehicles table (for transport optimization)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bus', 'van', 'car', 'limousine', 'shuttle')),
    capacity INTEGER NOT NULL,
    features JSONB DEFAULT '[]', -- Array of feature strings
    is_accessible BOOLEAN DEFAULT false,
    cost_per_km DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'assigned', 'in_use', 'maintenance', 'unavailable')),
    available_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    available_until TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 day',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_vehicles_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_drivers_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transport_groups_event_id ON transport_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_transport_groups_status ON transport_groups(status);
CREATE INDEX IF NOT EXISTS idx_transport_group_passengers_group_id ON transport_group_passengers(group_id);
CREATE INDEX IF NOT EXISTS idx_transport_group_passengers_guest_id ON transport_group_passengers(guest_id);
CREATE INDEX IF NOT EXISTS idx_transport_group_routes_group_id ON transport_group_routes(group_id);
CREATE INDEX IF NOT EXISTS idx_transport_group_routes_sequence ON transport_group_routes(group_id, sequence);
CREATE INDEX IF NOT EXISTS idx_vehicles_event_id ON vehicles(event_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_event_id ON drivers(event_id);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_transport_groups_updated_at ON transport_groups;
CREATE TRIGGER update_transport_groups_updated_at 
    BEFORE UPDATE ON transport_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transport_group_passengers_updated_at ON transport_group_passengers;
CREATE TRIGGER update_transport_group_passengers_updated_at 
    BEFORE UPDATE ON transport_group_passengers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development/testing
INSERT INTO vehicles (id, event_id, name, type, capacity, features, is_accessible, cost_per_km, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Luxury Bus 1', 'bus', 25, '["AC", "WiFi", "Wheelchair Accessible"]', true, 2.50, 'available'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Minivan Fleet A', 'van', 8, '["AC", "GPS Tracking"]', false, 1.80, 'available'),
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Premium Sedan 1', 'car', 4, '["AC", "Leather Seats", "GPS Tracking"]', false, 1.20, 'available'),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Executive Shuttle', 'shuttle', 12, '["AC", "WiFi", "Comfortable Seating"]', true, 2.00, 'available')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, event_id, name, phone, rating, is_active) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Rajesh Kumar', '+91 98765 43210', 4.8, true),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Mohammed Ali', '+91 87654 32109', 4.6, true),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Suresh Patel', '+91 76543 21098', 4.9, true),
    ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Priya Singh', '+91 65432 10987', 4.7, true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE transport_groups IS 'Transport groups for organizing passenger transportation';
COMMENT ON TABLE transport_group_passengers IS 'Passengers assigned to transport groups';
COMMENT ON TABLE transport_group_routes IS 'Route information for transport groups';
COMMENT ON TABLE vehicles IS 'Available vehicles for transport optimization';
COMMENT ON TABLE drivers IS 'Available drivers for transport groups';