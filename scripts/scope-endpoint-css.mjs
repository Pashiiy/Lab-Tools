import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(__dirname, '../src/apps/endpoint-analysis/App.css');
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/^:root\s*\{/m, '.endpoint-analysis {');
css = css.replace(/^body\s*\{[\s\S]*?\}/m, '');
css = css.replace(/^\.app\s*\{/m, '.endpoint-analysis.app {');

const lines = css.split('\n');
const out = [];
let inKeyframes = false;

for (const line of lines) {
  const trimmed = line.trim();

  if (trimmed.startsWith('@keyframes')) {
    inKeyframes = true;
    out.push(line);
    continue;
  }

  if (inKeyframes) {
    out.push(line);
    if (trimmed === '}') inKeyframes = false;
    continue;
  }

  if (trimmed.startsWith('@media')) {
    out.push(line);
    continue;
  }

  const ruleMatch = line.match(/^(\s*)(\.[a-zA-Z_-][\w-]*(?:\.[a-zA-Z_-][\w-]*)*)\s*\{/);
  if (ruleMatch) {
    const [, indent, selector] = ruleMatch;
    if (!selector.startsWith('.endpoint-analysis')) {
      out.push(`${indent}.endpoint-analysis ${selector} {`);
      continue;
    }
  }

  out.push(line);
}

css = `.endpoint-analysis {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-height: 0;\n  overflow: hidden;\n  height: 100%;\n}\n\n${out.join('\n')}`;

fs.writeFileSync(cssPath, css);
