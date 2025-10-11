-- Seed reference data (placeholder)

INSERT INTO assets (symbol, decimals)
VALUES
    ('ETH', 18),
    ('USDC', 6)
ON CONFLICT (symbol) DO NOTHING;
