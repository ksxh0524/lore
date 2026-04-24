import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

let sqlite: Database.Database;

function getDbPath(): string {
  const dataDir = process.env.LORE_DATA_DIR || join(homedir(), '.lore');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'lore.db');
}

function initSqlite(): Database.Database {
  if (sqlite && sqlite.open) return sqlite;
  
  const dbPath = getDbPath();
  sqlite = new Database(dbPath);
  
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  return sqlite;
}

export const db = drizzle(initSqlite(), { schema });
export type DB = typeof db;

export function closeDb() {
  if (sqlite && sqlite.open) {
    sqlite.close();
  }
}

export function initTables() {
  const db = initSqlite();
  db.exec(`
    CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      history_preset TEXT,
      status TEXT NOT NULL,
      config TEXT,
      current_tick INTEGER DEFAULT 0,
      world_time INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES worlds(id),
      type TEXT NOT NULL,
      profile TEXT NOT NULL,
      state TEXT NOT NULL,
      stats TEXT NOT NULL,
      alive INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      died_at INTEGER,
      user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      importance REAL DEFAULT 0.5,
      memory_type TEXT,
      timestamp INTEGER NOT NULL,
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      target_agent_id TEXT NOT NULL,
      world_id TEXT NOT NULL,
      type TEXT NOT NULL,
      intimacy INTEGER DEFAULT 0,
      history TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES worlds(id),
      type TEXT NOT NULL,
      category TEXT,
      description TEXT NOT NULL,
      involved_agents TEXT,
      consequences TEXT,
      timestamp INTEGER NOT NULL,
      processed INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      from_agent_id TEXT,
      to_agent_id TEXT,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS economy (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      balance REAL DEFAULT 0,
      income REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      creator_id TEXT,
      user_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_posts (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      world_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_type TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      comments TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      name TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitor_logs (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      tick INTEGER NOT NULL,
      event_type TEXT,
      agent_id TEXT,
      message TEXT,
      duration INTEGER,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_chains (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES worlds(id),
      trigger_event_id TEXT NOT NULL,
      next_event_id TEXT,
      condition TEXT,
      delay_ticks INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL REFERENCES worlds(id),
      name TEXT NOT NULL,
      description TEXT,
      leader_id TEXT,
      members TEXT,
      reputation INTEGER DEFAULT 50,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_providers (
      id TEXT PRIMARY KEY,
      preset_id TEXT NOT NULL,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 50,
      models TEXT,
      default_model TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_agents_world_id ON agents(world_id);
    CREATE INDEX IF NOT EXISTS idx_agents_alive ON agents(alive);
    CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type);
    CREATE INDEX IF NOT EXISTS idx_relationships_agent_id ON relationships(agent_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_agent_id);
    CREATE INDEX IF NOT EXISTS idx_events_world_id ON events(world_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON messages(to_agent_id);
    CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON messages(from_agent_id);
    CREATE INDEX IF NOT EXISTS idx_economy_agent_id ON economy(agent_id);
    CREATE INDEX IF NOT EXISTS idx_platforms_world_id ON platforms(world_id);
    CREATE INDEX IF NOT EXISTS idx_platform_posts_platform ON platform_posts(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_posts_world ON platform_posts(world_id);
    CREATE INDEX IF NOT EXISTS idx_saves_world_id ON saves(world_id);
    CREATE INDEX IF NOT EXISTS idx_monitor_logs_world_id ON monitor_logs(world_id);
    CREATE INDEX IF NOT EXISTS idx_event_chains_world_id ON event_chains(world_id);
    CREATE INDEX IF NOT EXISTS idx_event_chains_status ON event_chains(status);
    CREATE INDEX IF NOT EXISTS idx_factions_world_id ON factions(world_id);
  `);
}
