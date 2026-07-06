PRAGMA foreign_keys = ON;

-- Add schemeId column to wallets table
ALTER TABLE wallets ADD COLUMN schemeId INTEGER DEFAULT 0;

-- Create virtual_blockchain table
CREATE TABLE IF NOT EXISTS virtual_blockchain (
    vb_id      TEXT PRIMARY KEY,
    wallet_id  INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    vb_type    INTEGER NOT NULL
);

-- Create microblock table
CREATE TABLE IF NOT EXISTS microblock (
    microblock_hash          TEXT PRIMARY KEY,
    vb_id                    TEXT NOT NULL REFERENCES virtual_blockchain(vb_id) ON DELETE CASCADE,
    b64_encoded_microblock   TEXT,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    height                   INTEGER NOT NULL,
    published_by_me          INTEGER NOT NULL DEFAULT 1,
    published_to_operator    TEXT
);
