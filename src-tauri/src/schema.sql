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
    stress_current INTEGER NOT NULL DEFAULT 0,
    stress_max INTEGER NOT NULL DEFAULT 0,
    threshold_minor INTEGER NOT NULL,
    threshold_major INTEGER NOT NULL,
    threshold_severe INTEGER NOT NULL,
    visible_to_players INTEGER NOT NULL DEFAULT 0,
    entity_type TEXT NOT NULL DEFAULT 'adversary',
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
    auto_interval INTEGER NOT NULL DEFAULT 0,  -- Auto-countdown interval in seconds (0 = disabled)
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

-- Player characters
CREATE TABLE IF NOT EXISTS player_characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,

    -- Basic info
    name TEXT NOT NULL,
    ancestry TEXT,
    community TEXT,
    class TEXT,
    subclass TEXT,
    domain TEXT,
    level INTEGER NOT NULL DEFAULT 1,

    -- Attributes (each is a modifier, typically -1 to +4)
    attr_agility INTEGER NOT NULL DEFAULT 0,
    attr_strength INTEGER NOT NULL DEFAULT 0,
    attr_finesse INTEGER NOT NULL DEFAULT 0,
    attr_instinct INTEGER NOT NULL DEFAULT 0,
    attr_presence INTEGER NOT NULL DEFAULT 0,
    attr_knowledge INTEGER NOT NULL DEFAULT 0,

    -- Health
    hp_current INTEGER NOT NULL DEFAULT 6,
    hp_max INTEGER NOT NULL DEFAULT 6,
    threshold_minor INTEGER NOT NULL DEFAULT 1,
    threshold_major INTEGER NOT NULL DEFAULT 6,
    threshold_severe INTEGER NOT NULL DEFAULT 11,

    -- Defense
    armor_current INTEGER NOT NULL DEFAULT 0,
    armor_max INTEGER NOT NULL DEFAULT 0,
    evasion INTEGER NOT NULL DEFAULT 0,

    -- Resources
    hope INTEGER NOT NULL DEFAULT 0,
    stress_current INTEGER NOT NULL DEFAULT 0,
    stress_max INTEGER NOT NULL DEFAULT 6,

    -- Experiences (stored as JSON array of strings)
    experiences TEXT NOT NULL DEFAULT '[]',

    -- Background (free-form text)
    background TEXT,

    -- Notes
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_characters_campaign ON player_characters(campaign_id);

-- Dice rolls history
CREATE TABLE IF NOT EXISTS dice_rolls (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    notation TEXT NOT NULL,
    dice_data TEXT NOT NULL,  -- JSON: array of { sides, result, colorIndex }
    modifier INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    is_crit INTEGER NOT NULL DEFAULT 0,
    is_fumble INTEGER NOT NULL DEFAULT 0,
    shared_with_players INTEGER NOT NULL DEFAULT 0,
    rolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_campaign ON dice_rolls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_date ON dice_rolls(rolled_at);

-- Index for faster campaign-scoped queries
CREATE INDEX IF NOT EXISTS idx_entities_campaign ON entities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trackers_campaign ON countdown_trackers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_app_state_campaign ON app_state(campaign_id);
