-- ═══════════════════════════════════════════════════════════════════════════════
-- 026: Expand the cross-department request system.
--
-- Before: 4 hardcoded request types (design, workshop, project_media,
-- company_visit) targeting only 3 departments (media, development, pr).
--
-- After: 8 request types covering the full menu of cross-team needs, and
-- targets opened to all 9 departments. The validity matrix (which type can
-- target which department) is enforced in app code (src/lib/service-requests.ts)
-- so it stays editable without a migration each time the org adjusts.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Request type whitelist
ALTER TABLE department_service_requests
  DROP CONSTRAINT IF EXISTS department_service_requests_request_type_check;

ALTER TABLE department_service_requests
  ADD CONSTRAINT department_service_requests_request_type_check
  CHECK (request_type IN (
    'design',
    'workshop',
    'project_media',
    'company_visit',
    'event_creation',
    'media_request',
    'content_modification',
    'other'
  ));

-- Target department whitelist — opened to every committee.
ALTER TABLE department_service_requests
  DROP CONSTRAINT IF EXISTS department_service_requests_target_department_slug_check;

ALTER TABLE department_service_requests
  ADD CONSTRAINT department_service_requests_target_department_slug_check
  CHECK (target_department_slug IN (
    'executive',
    'hr',
    'development',
    'innovation',
    'media',
    'pr',
    'finance',
    'logistics',
    'madarat'
  ));
