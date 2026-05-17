-- One level of subtasks under project tasks.
-- Subtasks cascade-delete with their parent; the application layer rejects
-- creating a subtask of a subtask, so depth is fixed at 1.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id INTEGER NULL
    REFERENCES tasks(task_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx
  ON tasks(parent_task_id);
