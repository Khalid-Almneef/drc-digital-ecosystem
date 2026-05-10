-- Forms feature: HR-built questionnaires with text + multiple-choice questions.
-- Audience modes:
--   'members' → emailed to all active members + leaders, must be logged in to submit
--   'leaders' → emailed only to committee leaders (dept_leader/vice/sub + president/vp)
--   'public'  → no email; listed on /events, anyone can submit (name + email captured)

CREATE TYPE form_audience AS ENUM ('members', 'leaders', 'public');
CREATE TYPE form_question_type AS ENUM ('text', 'multiple_choice');

CREATE TABLE IF NOT EXISTS forms (
  form_id      SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  audience     form_audience NOT NULL DEFAULT 'members',
  is_open      BOOLEAN NOT NULL DEFAULT TRUE,
  closes_at    TIMESTAMPTZ,
  created_by   INTEGER REFERENCES users(member_id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_questions (
  question_id    SERIAL PRIMARY KEY,
  form_id        INTEGER NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  prompt         TEXT NOT NULL,
  question_type  form_question_type NOT NULL,
  options        JSONB,
  is_required    BOOLEAN NOT NULL DEFAULT TRUE,
  position       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_form_questions_form ON form_questions(form_id, position);

CREATE TABLE IF NOT EXISTS form_responses (
  response_id      SERIAL PRIMARY KEY,
  form_id          INTEGER NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  member_id        INTEGER REFERENCES users(member_id),
  respondent_name  TEXT,
  respondent_email TEXT,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses(form_id, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_form_responses_member ON form_responses(form_id, member_id) WHERE member_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS form_answers (
  answer_id    SERIAL PRIMARY KEY,
  response_id  INTEGER NOT NULL REFERENCES form_responses(response_id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES form_questions(question_id) ON DELETE CASCADE,
  answer_text  TEXT
);
CREATE INDEX IF NOT EXISTS idx_form_answers_response ON form_answers(response_id);
