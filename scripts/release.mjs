#!/usr/bin/env node
/**
 * release.mjs — single-source, tag-driven release.
 *
 * This is the ONLY way to cut a release. It does NOT publish anything itself;
 * it produces exactly one version-bump commit + one git tag and pushes them.
 * The pushed `v*` tag is what triggers .github/workflows/release.yml, which is
 * the ONLY workflow that builds installers and creates the GitHub Release.
 *
 * Steps (in order):
 *   1. Local build sanity check ........ npm run dist   (no publish)
 *   2. Commit stray working changes .... "release"      (only if dirty)
 *   3. Bump version (no tag) ........... npm version <bump> --no-git-tag-version
 *   4. Commit the bump ................. "v<version>"
 *   5. Create the tag ONLY ............. v<version>
 *   6. Push branch, then push tag
 *
 * Usage:
 *   node scripts/release.mjs [patch|minor|major]   (default: patch)
 *   npm run release -- minor
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};
const capture = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
};

const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(bump)) {
  fail(`Invalid version bump "${bump}". Use one of: patch | minor | major.`);
}

// Preconditions: real branch, in sync with remote.
const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch === 'HEAD') fail('Detached HEAD — checkout a branch before releasing.');

run('git fetch origin --tags --quiet');
const behind = capture(`git rev-list --count HEAD..origin/${branch}`);
if (behind !== '0') {
  fail(`Local ${branch} is ${behind} commit(s) behind origin/${branch}. Pull first.`);
}

// 1. Local build sanity check — make sure the app actually packages before
//    we tag. Uses --publish never (configured in the dist script) so nothing
//    is uploaded from a developer machine.
run('npm run dist');

// 2. Commit any leftover working-tree changes as a plain "release" commit.
if (capture('git status --porcelain')) {
  run('git add -A');
  run('git commit -m "release"');
} else {
  console.log('\nNo working-tree changes to commit before bump.');
}

// 3. Bump the version WITHOUT letting npm create a tag (we own tagging).
run(`npm version ${bump} --no-git-tag-version`);
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = `v${version}`;

// Refuse to clobber an existing tag.
const existing = capture('git tag --list ' + tag);
if (existing) fail(`Tag ${tag} already exists. Bump to a new version.`);

// 4. Commit the version bump.
run('git add package.json package-lock.json');
run(`git commit -m "${tag}"`);

// 5. Create the tag ONLY (no push-from-version step, no CI poke).
run(`git tag ${tag}`);

// 6. Push branch, then the tag (the tag push is the single release trigger).
run(`git push origin ${branch}`);
run(`git push origin ${tag}`);

console.log(`\n✔ Released ${tag}.`);
console.log('  → GitHub Actions "release.yml" will build installers and publish the Release.');
console.log('  → Watch it:  gh run watch   (or the repo Actions tab)');
