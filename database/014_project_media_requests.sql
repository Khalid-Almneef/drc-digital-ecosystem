ALTER TABLE department_service_requests
  DROP CONSTRAINT IF EXISTS department_service_requests_request_type_check;

ALTER TABLE department_service_requests
  ADD CONSTRAINT department_service_requests_request_type_check
  CHECK (request_type IN ('design', 'workshop', 'project_media'));
