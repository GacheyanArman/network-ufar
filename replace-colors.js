const fs = require('fs');
const path = require('path');

const DIR = 'c:\\network\\src';

const REPLACEMENTS = [
  { regex: /#2563eb/gi, replace: 'var(--french-blue)' },
  { regex: /#1d4ed8/gi, replace: 'var(--french-navy)' },
  { regex: /#3b82f6/gi, replace: 'var(--french-blue-hover)' },
  { regex: /#bfdbfe/gi, replace: 'var(--french-blue-soft)' },
  { regex: /#eff6ff/gi, replace: 'var(--french-blue-soft)' },
  { regex: /#1e40af/gi, replace: 'var(--french-navy)' },
  { regex: /#1e3a8a/gi, replace: 'var(--french-navy)' },
  { regex: /#0ea5e9/gi, replace: 'var(--french-blue)' },
];

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      walk(filePath);
    } else {
      if (!/\.(tsx|ts|js|jsx|css)$/.test(filePath)) continue;
      
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      for (const rep of REPLACEMENTS) {
        if (rep.regex.test(content)) {
          content = content.replace(rep.regex, rep.replace);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
      }
    }
  }
}

walk(DIR);
console.log('Done!');
