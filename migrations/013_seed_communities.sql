-- Seed data: Create default communities for UFAR
-- Run this after the main migration

-- Faculty Communities
INSERT INTO "community" (id, name, description, creator_id, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'Law Faculty', 'Community for Law students - discuss cases, share materials, and connect', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Finance Faculty', 'Finance students community - market analysis, career tips, internships', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Marketing Faculty', 'Marketing students - campaigns, trends, creative projects', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Management Faculty', 'Management students - leadership, strategy, business cases', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Informatics Faculty', 'IT and CS students - coding, projects, tech discussions', (SELECT id FROM "user" LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Year Communities
INSERT INTO "community" (id, name, description, creator_id, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, '1st Year Students', 'First year students - orientation, tips, making friends', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, '2nd Year Students', 'Second year students - share experiences and study together', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, '3rd Year Students', 'Third year students - internships, career planning', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, '4th Year Students', 'Final year students - graduation, job search, thesis help', (SELECT id FROM "user" LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Clubs
INSERT INTO "community" (id, name, description, creator_id, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'French Club', 'Practice French, cultural events, language exchange', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Coding Club', 'Programming competitions, hackathons, tech workshops', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Finance Club', 'Investment analysis, trading simulations, finance careers', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Law Debate Club', 'Mock trials, debates, legal discussions', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Football Club', 'UFAR football team - matches, training, tournaments', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Erasmus Club', 'Exchange programs, travel tips, international opportunities', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Career Club', 'CV workshops, interview prep, networking events', (SELECT id FROM "user" LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Help & Support Communities
INSERT INTO "community" (id, name, description, creator_id, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'Ask UFAR', 'General questions about university life, procedures, campus', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Lost & Found', 'Lost or found something on campus? Post it here', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Housing & Accommodation', 'Find roommates, share apartment listings, housing tips', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Internship Help', 'Share internship opportunities, application tips, experiences', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Language Exchange', 'Practice languages with other students', (SELECT id FROM "user" LIMIT 1), NOW(), NOW()),
  (gen_random_uuid()::text, 'Exam Help', 'Study groups, exam tips, past papers discussion', (SELECT id FROM "user" LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;
