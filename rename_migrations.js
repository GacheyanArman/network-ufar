const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
if (!fs.existsSync(migrationsDir)) process.exit(0);

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

// Define the correct order
const orderedFiles = [
  "006_add_photo_features.sql",
  "007_campus_moments.sql",
  "013_events_hub.sql",
  "014_onboarding_fields.sql",
  "015_onboarding_profile_fields.sql",
  "016_comment_features.sql",
  "016_smart_notifications.sql",
  "018_admin_dashboard.sql",
  "019_security_audit.sql",
  "020_image_thumbnails.sql",
  "021_password_reset_soft_delete.sql",
  "add_community_features.sql",
  "seed_communities.sql"
];

// Verify all files match
const existingFiles = new Set(files);
orderedFiles.forEach((file, index) => {
  if (existingFiles.has(file)) {
    const numStr = String(index + 1).padStart(3, '0');
    const newName = file.replace(/^(?:\d+_)?/, `${numStr}_`);
    if (file !== newName) {
      fs.renameSync(path.join(migrationsDir, file), path.join(migrationsDir, newName));
      console.log(`Renamed ${file} -> ${newName}`);
    } else {
      console.log(`Kept ${file}`);
    }
  }
});
