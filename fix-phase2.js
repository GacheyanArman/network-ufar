const fs = require('fs');
const path = require('path');

// Move Avatar.js
if (fs.existsSync('src/components/Avatar.js')) {
    fs.renameSync('src/components/Avatar.js', 'src/shared/ui/Avatar.js');
}

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
      { regex: /from\s+['"](?:\.\/|\.\.\/)+Avatar['"]/g, replacement: 'from "@/shared/ui/Avatar"' },
      { regex: /from\s+['"](?:\.\/|\.\.\/)+GroupMembersPanel['"]/g, replacement: 'from "@/features/profile/components/GroupMembersPanel"' },
      { regex: /from\s+['"](?:\.\/|\.\.\/)+MediaViewer['"]/g, replacement: 'from "@/features/photos/components/MediaViewer"' },
      // Catch imports that used '@/components/Avatar'
      { regex: /from\s+['"]@\/components\/Avatar['"]/g, replacement: 'from "@/shared/ui/Avatar"' }
    ];

    replacements.forEach(({ regex, replacement }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed imports in ${file.replace(__dirname, '')}`);
    }
  });
  console.log('Done.');
});
