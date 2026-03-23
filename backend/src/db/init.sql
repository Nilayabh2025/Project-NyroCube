PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_minutes INTEGER NOT NULL DEFAULT 25,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  distraction_count INTEGER NOT NULL DEFAULT 0,
  focus_score REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS distraction_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  intensity INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'esp32',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ir_detected INTEGER NOT NULL DEFAULT 0,
  led_mode TEXT NOT NULL DEFAULT 'idle',
  vibration_active INTEGER NOT NULL DEFAULT 0,
  oled_status TEXT NOT NULL DEFAULT 'idle',
  focus_level REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_distraction_events_user_id ON distraction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_device_events_user_id ON device_events(user_id);
