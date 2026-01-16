-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fear_level INTEGER NOT NULL DEFAULT 0,
    allow_massive_damage INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Campaign notes table
CREATE TABLE IF NOT EXISTS campaign_notes (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_campaign ON campaign_notes(campaign_id);

-- Entities table
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    hp_current INTEGER NOT NULL,
    hp_max INTEGER NOT NULL,
    threshold_minor INTEGER NOT NULL,
    threshold_major INTEGER NOT NULL,
    threshold_severe INTEGER NOT NULL,
    visible_to_players INTEGER NOT NULL DEFAULT 0,
    entity_type TEXT NOT NULL DEFAULT 'enemy',
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Countdown trackers table
CREATE TABLE IF NOT EXISTS countdown_trackers (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    current INTEGER NOT NULL,
    max INTEGER NOT NULL,
    visible_to_players INTEGER NOT NULL DEFAULT 0,
    hide_name_from_players INTEGER NOT NULL DEFAULT 0,
    tracker_type TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Tick labels for complex trackers
CREATE TABLE IF NOT EXISTS tick_labels (
    tracker_id TEXT NOT NULL,
    tick INTEGER NOT NULL,
    label TEXT NOT NULL,
    PRIMARY KEY (tracker_id, tick),
    FOREIGN KEY (tracker_id) REFERENCES countdown_trackers(id) ON DELETE CASCADE
);

-- App state for simple key-value storage (fear level, current campaign, etc.)
-- Now scoped to campaigns where applicable
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT NOT NULL,
    campaign_id TEXT,
    value TEXT NOT NULL,
    PRIMARY KEY (key, campaign_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Index for faster campaign-scoped queries
CREATE INDEX IF NOT EXISTS idx_entities_campaign ON entities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trackers_campaign ON countdown_trackers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_app_state_campaign ON app_state(campaign_id);
