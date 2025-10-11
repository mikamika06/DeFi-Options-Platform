-- Initial schema for DeFi Options Platform (placeholder)

CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    decimals INT NOT NULL DEFAULT 18,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY,
    underlying TEXT NOT NULL,
    strike NUMERIC(38, 18) NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    is_call BOOLEAN NOT NULL,
    iv NUMERIC(10, 6),
    base_fee_bps INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,
    series_id UUID REFERENCES series (id),
    ts TIMESTAMPTZ NOT NULL,
    premium_bid NUMERIC(38, 18),
    premium_ask NUMERIC(38, 18),
    iv NUMERIC(10, 6),
    greeks JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    series_id UUID REFERENCES series (id),
    side TEXT NOT NULL,
    size NUMERIC(38, 18) NOT NULL,
    premium NUMERIC(38, 18) NOT NULL,
    fee NUMERIC(38, 18) NOT NULL DEFAULT 0,
    tx_hash TEXT,
    account TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    account TEXT NOT NULL,
    series_id UUID NOT NULL REFERENCES series (id),
    size NUMERIC(38, 18) NOT NULL,
    avg_price NUMERIC(38, 18),
    pnl_unrealized NUMERIC(38, 18),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account, series_id)
);
