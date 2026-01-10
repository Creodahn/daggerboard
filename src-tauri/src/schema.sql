-- Entities table
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hp_current INTEGER NOT NULL,
    hp_max INTEGER NOT NULL,
    threshold_minor INTEGER NOT NULL,
    threshold_major INTEGER NOT NULL,
    threshold_severe INTEGER NOT NULL,
    visible_to_players INTEGER NOT NULL DEFAULT 0,
    entity_type TEXT NOT NULL DEFAULT 'enemy'
);

-- Countdown trackers table
CREATE TABLE IF NOT EXISTS countdown_trackers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current INTEGER NOT NULL,
    max INTEGER NOT NULL,
    visible_to_players INTEGER NOT NULL DEFAULT 0,
    hide_name_from_players INTEGER NOT NULL DEFAULT 0,
    tracker_type TEXT NOT NULL
);

-- Tick labels for complex trackers
CREATE TABLE IF NOT EXISTS tick_labels (
    tracker_id TEXT NOT NULL,
    tick INTEGER NOT NULL,
    label TEXT NOT NULL,
    PRIMARY KEY (tracker_id, tick),
    FOREIGN KEY (tracker_id) REFERENCES countdown_trackers(id) ON DELETE CASCADE
);

-- App state for simple key-value storage (fear level, etc.)
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
