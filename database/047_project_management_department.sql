-- 047: Add Project Management as a standalone department.

ALTER TYPE department_type
  ADD VALUE IF NOT EXISTS 'project_management';

INSERT INTO departments (slug, name, name_ar, description)
VALUES (
  'project_management',
  'Project Management',
  'لجنة إدارة المشاريع',
  'Project planning, coordination, and management.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;
