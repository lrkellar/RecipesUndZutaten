/**
 * Ordered migrations. Index + 1 is the schema version stored in PRAGMA user_version.
 * Never edit a shipped migration; append a new one.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE dish_family (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    aliases TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE recipe (
    id INTEGER PRIMARY KEY,
    dish_family_id INTEGER NOT NULL REFERENCES dish_family(id),
    name TEXT NOT NULL,
    current_version_id INTEGER,
    forked_from_version_id INTEGER,
    status TEXT NOT NULL DEFAULT 'want to try',
    rating INTEGER,
    times_cooked INTEGER NOT NULL DEFAULT 0,
    last_cooked TEXT,
    display_photo_id INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE version (
    id INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipe(id),
    parent_version_id INTEGER REFERENCES version(id),
    label TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    source_text TEXT NOT NULL DEFAULT '',
    needs_review INTEGER NOT NULL DEFAULT 0,
    yield_text TEXT NOT NULL DEFAULT '',
    active_min INTEGER,
    passive_min INTEGER,
    total_min INTEGER,
    course TEXT NOT NULL DEFAULT '',
    cuisine TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    tips TEXT NOT NULL DEFAULT '',
    storage TEXT NOT NULL DEFAULT '',
    UNIQUE (recipe_id, label)
  );

  CREATE TABLE ingredient_row (
    id INTEGER PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES version(id),
    position INTEGER NOT NULL,
    grp TEXT NOT NULL DEFAULT '',
    quantity REAL,
    unit TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    prep TEXT NOT NULL DEFAULT '',
    optional INTEGER NOT NULL DEFAULT 0,
    grams REAL,
    ml REAL,
    sub_recipe_id INTEGER REFERENCES recipe(id)
  );

  CREATE TABLE step (
    id INTEGER PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES version(id),
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    timer_seconds INTEGER,
    temperature TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE step_ingredient (
    step_id INTEGER NOT NULL REFERENCES step(id),
    ingredient_row_id INTEGER NOT NULL REFERENCES ingredient_row(id),
    PRIMARY KEY (step_id, ingredient_row_id)
  );

  CREATE TABLE tool (
    id INTEGER PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES version(id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    spec TEXT NOT NULL DEFAULT '',
    optional INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE note (
    id INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipe(id),
    version_id INTEGER NOT NULL REFERENCES version(id),
    version_label TEXT NOT NULL,
    created_at TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    rating INTEGER,
    chips TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE photo (
    id INTEGER PRIMARY KEY,
    note_id INTEGER REFERENCES note(id),
    version_id INTEGER REFERENCES version(id),
    step_id INTEGER REFERENCES step(id),
    file_ref TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE ingredient_alias (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    alias_of TEXT NOT NULL COLLATE NOCASE,
    density_g_per_ml REAL
  );

  CREATE TABLE pantry_item (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    is_staple INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE setting (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX idx_version_recipe ON version(recipe_id);
  CREATE INDEX idx_ing_version ON ingredient_row(version_id);
  CREATE INDEX idx_step_version ON step(version_id);
  CREATE INDEX idx_note_recipe ON note(recipe_id);
  `
];
