const fs = require('fs');
const path = require('path');

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

walk(path.join(__dirname, 'src'), function(err, results) {
  if (err) throw err;
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  results.forEach(file => {
    if (!extensions.includes(path.extname(file))) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    const replacements = [
      { regex: /from\s+["'](\.\/|\.\.\/)UiIcon["']/g, replacement: 'from "@/shared/ui/UiIcon"' },
      { regex: /from\s+["'](\.\/|\.\.\/|\.\.\/\.\.\/)lib\/db["']/g, replacement: 'from "@/shared/db/db"' },
      { regex: /from\s+["'](\.\/|\.\.\/|\.\.\/\.\.\/)lib\/schema["']/g, replacement: 'from "@/shared/db/schema"' },
      { regex: /from\s+["']\.\/db["']/g, replacement: 'from "@/shared/db/db"' },
      { regex: /from\s+["']\.\/schema["']/g, replacement: 'from "@/shared/db/schema"' },
      { regex: /from\s+["']\.\/i18n["']/g, replacement: 'from "@/shared/i18n/i18n"' },
      { regex: /from\s+["']\.\/validations["']/g, replacement: 'from "@/shared/validations/validations"' },
      { regex: /from\s+["']\.\/dashboard["']/g, replacement: 'from "@/features/dashboard/server/queries"' },
      { regex: /from\s+["']\.\/session["']/g, replacement: 'from "@/shared/auth/session"' },
    ];

    replacements.forEach(({ regex, replacement }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated relative imports in ${file.replace(__dirname, '')}`);
    }
  });
  console.log('Done.');
});
