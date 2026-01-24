-- Insert session record (using existing schema)
INSERT OR REPLACE INTO sessions (
  session_id, 
  mode, 
  original_requirements, 
  status, 
  initial_branch,
  metadata,
  start_time,
  created_at
)
VALUES (
  '4136ad56',
  'parallel',
  'Create two test projects to demonstrate tetris and a simple calculator in a tmp folder, use parallel agents',
  'active',
  'main',
  json_object('testing_mode', 'full'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
