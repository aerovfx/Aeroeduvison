-- Add migration script here

-- 🎥 Table: cameras
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rtsp_url TEXT NOT NULL,
    brand VARCHAR(100),
    location VARCHAR(255),
    location_type VARCHAR(50),
    assigned_to VARCHAR(100),
    class_id VARCHAR(100),
    room_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'offline',
    hls_url TEXT,
    stream_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 🤖 Table: iot_devices
CREATE TABLE IF NOT EXISTS iot_devices (
    id UUID PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    firmware_version VARCHAR(50),
    location VARCHAR(255),
    class_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'offline',
    capabilities TEXT[], -- Array of sensor types
    device_token TEXT NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 📊 Table: device_telemetry
CREATE TABLE IF NOT EXISTS device_telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL REFERENCES iot_devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    metadata JSONB
);

CREATE INDEX idx_telemetry_device_time ON device_telemetry(device_id, timestamp DESC);

-- ✉️ Table: device_commands
CREATE TABLE IF NOT EXISTS device_commands (
    id UUID PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL REFERENCES iot_devices(device_id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 🔔 Table: iot_alerts
CREATE TABLE IF NOT EXISTS iot_alerts (
    id UUID PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    class_id VARCHAR(100),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    value DOUBLE PRECISION,
    threshold DOUBLE PRECISION,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
