-- Learning Time Tracker
-- PostgreSQL + TimescaleDB / Hypercore setup

-- ============================================================
-- 1. Create the database
-- ============================================================
-- Run this separately while connected to the PostgreSQL server.
-- CREATE DATABASE LTT_EXTN;

-- ============================================================
-- 2. Connect to the LTT_EXTN database
-- ============================================================
-- Connect to LTT_EXTN in DBeaver before running the commands below.

-- ============================================================
-- 3. Enable TimescaleDB
-- ============================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- 4. Create the website_usage hypertable
-- ============================================================

CREATE TABLE website_usage (
event_id            UUID NOT NULL,
time                TIMESTAMPTZ NOT NULL,
website             TEXT NOT NULL,
duration_seconds    INTEGER NOT NULL,
category            TEXT NOT NULL
) WITH (
tsdb.hypertable,
tsdb.segmentby = 'website',
tsdb.orderby = 'time DESC'
);

-- ============================================================
-- 5. Verify the table
-- ============================================================

SELECT *
FROM website_usage
LIMIT 10;

