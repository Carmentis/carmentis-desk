PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wallets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    node_endpoint TEXT NOT NULL,
    indexer       TEXT
);

CREATE TABLE IF NOT EXISTS user_profile (
    id     INTEGER PRIMARY KEY DEFAULT 1,
    pseudo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operators (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    http_endpoint TEXT NOT NULL,
    wallet_id     INTEGER,
    public_key    TEXT,
    pseudo        TEXT
);

CREATE TABLE IF NOT EXISTS organizations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id    INTEGER NOT NULL REFERENCES wallets(id),
    name         TEXT NOT NULL,
    vb_id        TEXT,
    country_code TEXT,
    city         TEXT,
    website      TEXT
);

CREATE TABLE IF NOT EXISTS nodes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organizations(id),
    name         TEXT NOT NULL,
    vb_id        TEXT,
    rpc_endpoint TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organizations(id),
    name        TEXT NOT NULL,
    vb_id       TEXT,
    description TEXT,
    website     TEXT
);

CREATE TABLE IF NOT EXISTS app_participations (
    id        TEXT    NOT NULL,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id),
    PRIMARY KEY (id, wallet_id)
);

CREATE TABLE IF NOT EXISTS app_ledger_entries (
    id                     TEXT    NOT NULL,
    app_participation_id   TEXT    NOT NULL,
    wallet_id              INTEGER NOT NULL,
    operator_endpoint      TEXT    NOT NULL,
    b64_encoded_microblock TEXT    NOT NULL,
    PRIMARY KEY (id, app_participation_id, wallet_id),
    FOREIGN KEY (app_participation_id, wallet_id) REFERENCES app_participations(id, wallet_id)
);

CREATE TABLE IF NOT EXISTS credentials (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id),
    name      TEXT NOT NULL,
    data      TEXT NOT NULL
);
