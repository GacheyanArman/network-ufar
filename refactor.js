const fs = require('fs');
const path = require('path');

const moves = [
  // Dashboard
  { src: 'src/lib/dashboard.ts', dest: 'src/features/dashboard/server/queries.ts', ext: '.ts' },
  { src: 'src/components/TodayDashboardClient.tsx', dest: 'src/features/dashboard/components/TodayDashboardClient.tsx', ext: '.tsx' },
  
  // Auth
  { src: 'src/app/actions/auth.js', dest: 'src/features/auth/server/actions.ts', ext: '.js' }, // Note: renamed to .ts in dest, so import might not change extension but let's handle it
  { src: 'src/components/AuthShell.tsx', dest: 'src/features/auth/components/AuthShell.tsx', ext: '.tsx' },
  { src: 'src/lib/session.js', dest: 'src/shared/auth/session.ts', ext: '.js' },
  
  // Materials
  { src: 'src/components/MaterialsPageClient.tsx', dest: 'src/features/materials/components/MaterialsPageClient.tsx', ext: '.tsx' },
  { src: 'src/app/actions/materials.ts', dest: 'src/features/materials/server/actions.ts', ext: '.ts' },
  
  // Events
  { src: 'src/components/EventsPageClient.tsx', dest: 'src/features/events/components/EventsPageClient.tsx', ext: '.tsx' },
  { src: 'src/components/EventDetailClient.tsx', dest: 'src/features/events/components/EventDetailClient.tsx', ext: '.tsx' },
  { src: 'src/app/actions/events.ts', dest: 'src/features/events/server/actions.ts', ext: '.ts' },
  
  // Shared
  { src: 'src/components/UiIcon.js', dest: 'src/shared/ui/UiIcon.js', ext: '.js' },
  { src: 'src/lib/db.js', dest: 'src/shared/db/db.js', ext: '.js' },
  { src: 'src/lib/schema.js', dest: 'src/shared/db/schema.js', ext: '.js' },
  { src: 'src/lib/i18n.ts', dest: 'src/shared/i18n/i18n.ts', ext: '.ts' },
  { src: 'src/lib/validations.ts', dest: 'src/shared/validations/validations.ts', ext: '.ts' },
  { src: 'src/components/LanguageSwitcher.tsx', dest: 'src/shared/ui/LanguageSwitcher.tsx', ext: '.tsx' },
];

const importReplacements = moves.map(move => {
  let oldPath = move.src.replace(/^src\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
  let newPath = move.dest.replace(/^src\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
  return { oldPath, newPath };
});

// Helper to walk directory
function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

function processFiles() {
  // Move files
  moves.forEach(move => {
    if (fs.existsSync(move.src)) {
      const destDir = path.dirname(move.dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(move.src, move.dest);
      console.log(`Moved ${move.src} -> ${move.dest}`);
    } else {
      console.log(`Warning: ${move.src} not found.`);
    }
  });

  // Replace imports
  walk(path.join(__dirname, 'src'), function(err, results) {
    if (err) throw err;
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    
    results.forEach(file => {
      if (!extensions.includes(path.extname(file))) return;
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      importReplacements.forEach(({ oldPath, newPath }) => {
        // Replace exact imports like import { x } from "@/components/UiIcon"
        const regex1 = new RegExp(`(['"])@\/${oldPath}\\1`, 'g');
        if (regex1.test(content)) {
          content = content.replace(regex1, `$1@/${newPath}$1`);
          modified = true;
        }

        // Sometimes imports might have extensions e.g., "@/components/UiIcon.js"
        // Let's replace those too just in case
        const regex2 = new RegExp(`(['"])@\/${oldPath}\\.(js|ts|jsx|tsx)\\1`, 'g');
        if (regex2.test(content)) {
          content = content.replace(regex2, `$1@/${newPath}$1`); // Remove extension as well if it had one, or keep new extension? Modern bundlers are fine with no extension
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated imports in ${file.replace(__dirname, '')}`);
      }
    });
    
    console.log('Refactoring complete.');
  });
}

processFiles();
