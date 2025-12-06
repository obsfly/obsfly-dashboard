-- ObsFly Dashboard Configuration Table
-- This table stores custom dashboard layouts and widget configurations

CREATE TABLE IF NOT EXISTS metrics.dashboards
(
    DashboardId        UUID CODEC(ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    Name               String CODEC(ZSTD(1)),
    Description        String CODEC(ZSTD(1)),
    Config             String CODEC(ZSTD(1)),  -- JSON configuration of widgets and layout
    CreatedAt          DateTime64(3) CODEC(Delta, ZSTD(1)),
    UpdatedAt          DateTime64(3) CODEC(Delta, ZSTD(1))
)
ENGINE = MergeTree
PARTITION BY AccountId
ORDER BY (AccountId, DashboardId)
SETTINGS index_granularity = 8192;

-- Create indexes for faster queries
-- Note: MergeTree doesn't support traditional indexes, ordering is the key
