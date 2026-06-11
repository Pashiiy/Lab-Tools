import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(__dirname, '../src/apps/colony-counter/colony-counter.css');
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(
  /\*[\s\S]*?box-sizing: border-box;[\s\S]*?padding: 0;\s*\}/,
  `.colony-counter,\n.colony-counter *,\n.colony-counter *::before,\n.colony-counter *::after {\n  box-sizing: border-box;\n}\n\n.colony-counter {\n  margin: 0;\n  padding: 0;\n}`
);

css = css.replace(/\[data-theme='dark'\]/g, ".colony-counter[data-theme='dark']");
css = css.replace(/\[data-theme='light'\]/g, ".colony-counter[data-theme='light']");

css = css.replace(
  /:root\s*\{[^}]+\}/,
  `.colony-counter {\n  --font-mono: 'DM Mono', monospace;\n  --font-body: 'Inter', system-ui, sans-serif;\n  font-family: var(--font-body);\n  -webkit-font-smoothing: antialiased;\n}`
);

css = css.replace(/html,\s*body,\s*#root\s*\{[^}]+\}/, '');
css = css.replace(/body\s*\{[^}]+\}/, '');

css = css.replace(/^\.app\s*\{/m, '.colony-counter.app {');
css = css.replace(/^\.is-electron \.header/m, '.is-electron .colony-counter .header');

const skipPrefixes = new Set([
  '.colony-counter',
  '@keyframes',
  '@media',
]);

css = css.replace(/(^|\n)(@media[\s\S]*?\{)([\s\S]*?)(\n\})/g, (match, before, mediaOpen, body, close) => {
  const scopedBody = body.replace(/(^|\n)(\s*)(\.[a-zA-Z_-][\w-]*)/g, (m, lb, indent, sel) => {
    if (sel.startsWith('.colony-counter')) return m;
    return `${lb}${indent}.colony-counter ${sel}`;
  });
  return `${before}${mediaOpen}${scopedBody}${close}`;
});

const lines = css.split('\n');
const out = [];
let inKeyframes = false;
let braceDepth = 0;

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
    if (!selector.startsWith('.colony-counter') && !skipPrefixes.has(selector.split(/[ .:[]/)[0])) {
      out.push(`${indent}.colony-counter ${selector} {`);
      continue;
    }
  }

  out.push(line);
}

css = out.join('\n');

css = `.colony-counter {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-height: 0;\n  overflow: hidden;\n  height: 100%;\n}\n\n${css}`;

fs.writeFileSync(cssPath, css);
