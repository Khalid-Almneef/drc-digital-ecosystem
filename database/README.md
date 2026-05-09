# DRC Database Setup

## Files

| File | Purpose | Run Order |
|------|---------|-----------|
| `001_schema.sql` | All tables, types, indexes, triggers | 1st |
| `002_migrate_from_old.sql` | Migrates 57 existing members, creates leader accounts, seeds data | 2nd |
| `003_security.sql` | Password functions, role helpers, audit logging, views | 3rd |

## Quick Setup

```bash
# 1. Create the database
createdb drc_ecosystem

# 2. Run all scripts in order
psql -d drc_ecosystem -f database/001_schema.sql
psql -d drc_ecosystem -f database/002_migrate_from_old.sql
psql -d drc_ecosystem -f database/003_security.sql

# 3. Verify
psql -d drc_ecosystem -c "SELECT COUNT(*) FROM users;"
# Should return 65 (57 members + 8 leaders)
```

## Tables Overview (16 tables)

| Table | Purpose |
|-------|---------|
| `departments` | 8 departments with Arabic names |
| `users` | Authentication — email, bcrypt password, role |
| `profiles` | Personal info — name, university ID, major, socials |
| `membership_applications` | Application pipeline with review workflow |
| `projects` | Club projects with status tracking |
| `project_members` | M:N users ↔ projects |
| `tasks` | Kanban task board per project |
| `hackathons` | Competition history |
| `hackathon_participants` | M:N users ↔ hackathons |
| `events` | Workshops, competitions, meetups |
| `event_registrations` | Event sign-ups with attendance |
| `volunteer_hours` | Hour logging with approval workflow |
| `sponsors` | Sponsorship management with tiers |
| `budget_categories` / `expenses` | Budget tracking and expense approval |
| `media_content` | Content calendar and social media assets |
| `announcements` | Club-wide and department announcements |
| `equipment` / `equipment_checkouts` | Lab inventory and checkout log |
| `sessions` | Server-side session management |
| `audit_log` | Security audit trail |

## Security Features

- **Passwords**: bcrypt with cost factor 12 (never stored in plaintext)
- **Password change**: Requires old password verification
- **Admin reset**: Only leaders/HR, logged to audit trail
- **Role changes**: Leader-only, logged to audit trail
- **Login tracking**: IP + timestamp logged
- **Views**: `v_members` never exposes `password_hash`
- **Application processing**: Auto-creates user account on acceptance

## Key Functions

```sql
-- Verify login
SELECT * FROM verify_password('user@email.com', 'password123');

-- Change password
SELECT change_password(1, 'oldpass', 'newpass123');

-- Admin reset password
SELECT admin_reset_password(58, 1, 'TempPass123!');

-- Change role (leader only)
SELECT change_user_role(58, 1, 'development');

-- Process application (auto-creates user on accept)
SELECT process_application(59, 1, 'accepted', 'Strong candidate');

-- Approve volunteer hours
SELECT approve_volunteer_hours(59, 1, 'approved');
```

## Default Accounts After Migration

| Email | Role | Temp Password |
|-------|------|---------------|
| member1–57@drc.com | member | drc2026 |
| president@drc.club | leader | ChangeMeNow!2026 |
| hr@drc.club | hr | ChangeMeNow!2026 |
| dev@drc.club | development | ChangeMeNow!2026 |
| innovation@drc.club | innovation | ChangeMeNow!2026 |
| media@drc.club | media | ChangeMeNow!2026 |
| pr@drc.club | pr | ChangeMeNow!2026 |
| finance@drc.club | finance | ChangeMeNow!2026 |
| logistics@drc.club | logistics | ChangeMeNow!2026 |

**IMPORTANT**: Force all users to change passwords on first real deployment!
