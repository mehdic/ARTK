#!/usr/bin/env node

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'bazinga.db');
const db = sqlite3(dbPath);

// Session parameters
const sessionId = process.argv[2] || '4136ad56';
const userRequirements = process.argv[3] || 'Create two test projects to demonstrate tetris and a simple calculator in a tmp folder, use parallel agents';
const mode = process.argv[4] || 'parallel';
const testingMode = process.argv[5] || 'full';
const branch = process.argv[6] || 'main';

try {
  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_requirements TEXT NOT NULL,
      mode TEXT NOT NULL,
      testing_mode TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_groups (
      task_group_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      task_group_id TEXT,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id),
      FOREIGN KEY (task_group_id) REFERENCES task_groups(task_group_id)
    );

    CREATE TABLE IF NOT EXISTS reasoning_artifacts (
      artifact_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS context_packages (
      package_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);

  // Insert session record
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO sessions (session_id, user_requirements, mode, testing_mode, branch, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertSession.run(sessionId, userRequirements, mode, testingMode, branch);

  // Create artifacts directory
  const artifactDir = path.join(__dirname, '..', 'artifacts', sessionId);
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Return success JSON
  const result = {
    success: true,
    session_id: sessionId,
    artifact_dir: `bazinga/artifacts/${sessionId}/`
  };

  console.log(JSON.stringify(result, null, 2));
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));
  db.close();
  process.exit(1);
}
