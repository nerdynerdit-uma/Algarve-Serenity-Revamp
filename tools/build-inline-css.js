/*
 * Inlines assets/css/style.css into every page.
 *
 * WHY: style.css was the last render-blocking request, creating the critical chain
 * html -> style.css that Lighthouse flags under "Network dependency tree". Inlining
 * removes the round trip so the page can paint as soon as the HTML arrives.
 *
 * assets/css/style.css REMAINS THE SOURCE OF TRUTH. Edit that file, then run:
 *
 *     node tools/build-inline-css.js
 *
 * The generated block sits between the BEGIN/END markers below and is rewritten in
 * place on each run, so it is safe to run repeatedly.
 */
const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join('assets', 'css', 'style.css');
const BEGIN = '<!-- BEGIN generated: inlined from assets/css/style.css - run tools/build-inline-css.js after editing that file -->';
const END = '<!-- END generated -->';
const LINK = '<link rel="stylesheet" href="assets/css/style.css" />';

const css = fs.readFileSync(CSS_PATH, 'utf8').trim();
if (css.includes('</style')) throw new Error('CSS contains a </style sequence; refusing to inline.');

const root = process.cwd();
let updated = 0;

for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const block = [BEGIN, '  <style>', css, '  </style>', '  ' + END].join(eol);

  const existing = new RegExp(
    BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  if (existing.test(html)) {
    html = html.replace(existing, block);            // refresh an existing block
  } else if (html.includes('  ' + LINK)) {
    html = html.replace('  ' + LINK, '  ' + block);  // first run: replace the <link>
  } else {
    console.log('!! no stylesheet link or marker found:', file);
    continue;
  }

  fs.writeFileSync(file, html);
  updated++;
}

console.log(`inlined ${(css.length / 1024).toFixed(1)}KB of CSS into ${updated} pages`);
