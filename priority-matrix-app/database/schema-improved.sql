-- GLX Systems Network Database Schema - IMPROVED
-- PostgreSQL 12+
-- All critical race conditions and edge cases fixed

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with token versioning
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    token_version INTEGER DEFAULT 0, -- For invalidating all tokens on logout
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table (hashed keys, never store plaintext)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    usage_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Blockchain blocks table
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    id BIGSERIAL PRIMARY KEY,
    block_index INTEGER UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nonce BIGINT NOT NULL,
    difficulty INTEGER NOT NULL,
    data JSONB NOT NULL,
    merkle_root VARCHAR(64),
    validator_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_block_index CHECK (block_index >= 0)
);

-- Blockchain transactions table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id UUID PRIMARY KEY,
    block_id BIGINT REFERENCES blockchain_blocks(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(64) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Supply Chain tracking
CREATE TABLE IF NOT EXISTS supply_chain_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    origin_location JSONB NOT NULL,
    destination_location JSONB NOT NULL,
    current_location JSONB,
    carrier VARCHAR(255),
    expected_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    blockchain_tx_id UUID REFERENCES blockchain_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_delivery_times CHECK (
        actual_delivery IS NULL OR actual_delivery >= created_at
    )
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location JSONB NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    current_utilization INTEGER DEFAULT 0 CHECK (current_utilization >= 0),
    status VARCHAR(50) DEFAULT 'operational',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_warehouse_utilization CHECK (current_utilization <= capacity)
);

-- Air Traffic Control flights
CREATE TABLE IF NOT EXISTS atc_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number VARCHAR(20) NOT NULL,
    aircraft_id VARCHAR(50),
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    scheduled_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_departure TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    current_position JSONB,
    altitude INTEGER,
    speed INTEGER,
    flight_plan_hash VARCHAR(64),
    blockchain_tx_id UUID REFERENCES blockchain_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_arrival_after_departure CHECK (
        scheduled_arrival > scheduled_departure
    )
);

-- Logistics vehicles
CREATE TABLE IF NOT EXISTS logistics_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'available',
    current_location JSONB,
    assigned_route_id UUID,
    capacity_kg INTEGER CHECK (capacity_kg > 0),
    current_load_kg INTEGER DEFAULT 0 CHECK (current_load_kg >= 0),
    driver_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_load_within_capacity CHECK (
        current_load_kg IS NULL OR capacity_kg IS NULL OR current_load_kg <= capacity_kg
    )
);

-- Logistics routes
CREATE TABLE IF NOT EXISTS logistics_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned',
    waypoints JSONB NOT NULL,
    optimized BOOLEAN DEFAULT false,
    total_distance_km DECIMAL(10,2) CHECK (total_distance_km >= 0),
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes >= 0),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    blockchain_tx_id UUID REFERENCES blockchain_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Logistics deliveries
CREATE TABLE IF NOT EXISTS logistics_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id VARCHAR(50) UNIQUE NOT NULL,
    route_id UUID REFERENCES logistics_routes(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES logistics_vehicles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    pickup_location JSONB NOT NULL,
    delivery_location JSONB NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_completion_time CHECK (
        completed_time IS NULL OR completed_time >= created_at
    )
);

-- System alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    module VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    message TEXT NOT NULL,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    blockchain_tx_id UUID REFERENCES blockchain_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post-quantum cryptographic keys
CREATE TABLE IF NOT EXISTS pqc_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id VARCHAR(100) UNIQUE NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    key_purpose VARCHAR(50) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    rotated_to UUID REFERENCES pqc_keys(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),
    metadata JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Realtime connections tracking
CREATE TABLE IF NOT EXISTS realtime_connections (
    connection_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP WITH TIME ZONE
);

-- Room members for realtime messaging
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_token_version ON users(id, token_version);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE is_active = true;

CREATE INDEX idx_blockchain_blocks_hash ON blockchain_blocks(block_hash);
CREATE INDEX idx_blockchain_blocks_index ON blockchain_blocks(block_index DESC);
CREATE INDEX idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX idx_blockchain_transactions_entity ON blockchain_transactions(entity_type, entity_id);
CREATE INDEX idx_blockchain_transactions_block ON blockchain_transactions(block_id);

CREATE INDEX idx_shipments_status ON supply_chain_shipments(status);
CREATE INDEX idx_shipments_id ON supply_chain_shipments(shipment_id);
CREATE INDEX idx_warehouses_status ON warehouses(status);

CREATE INDEX idx_flights_number ON atc_flights(flight_number);
CREATE INDEX idx_flights_status ON atc_flights(status);
CREATE INDEX idx_flights_departure ON atc_flights(scheduled_departure);

CREATE INDEX idx_vehicles_status ON logistics_vehicles(status);
CREATE INDEX idx_vehicles_id ON logistics_vehicles(vehicle_id);
CREATE INDEX idx_routes_status ON logistics_routes(status);
CREATE INDEX idx_deliveries_status ON logistics_deliveries(status);

CREATE INDEX idx_alerts_severity ON system_alerts(severity, acknowledged, resolved);
CREATE INDEX idx_alerts_module ON system_alerts(module) WHERE resolved = false;

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(created_at DESC);

CREATE INDEX idx_metrics_type ON performance_metrics(metric_type, module, recorded_at DESC);

CREATE INDEX idx_realtime_connections_user ON realtime_connections(user_id) WHERE disconnected_at IS NULL;
CREATE INDEX idx_realtime_connections_heartbeat ON realtime_connections(last_heartbeat) WHERE disconnected_at IS NULL;
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);

-- Partial indexes for active records
CREATE INDEX idx_pqc_keys_active ON pqc_keys(key_id) WHERE is_active = true;
CREATE INDEX idx_active_shipments ON supply_chain_shipments(status, created_at DESC)
    WHERE status IN ('pending', 'in_transit', 'active');

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON supply_chain_shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON atc_flights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON logistics_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON logistics_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON logistics_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
