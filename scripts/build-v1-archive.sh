#!/bin/bash
# Rebuild the /archive/v1/ snapshot from the v1 tag.
#
# Two deliberate edits before building:
#   1. Withdrawn projects removed: the archive isn't a back door to work that
#      was deliberately pulled.
#   2. The profile photo repointed into the archive, because v1 references it by
#      absolute path and would otherwise show the *current* portrait.
set -e
REPO=/Users/baron/Developer/portfolio
WT=/tmp/v1-archive-build
cd "$REPO"

rm -rf "$WT"; git worktree remove "$WT" --force 2>/dev/null || true
git worktree add -q "$WT" v1
ln -s "$REPO/node_modules" "$WT/node_modules"

python3 - "$WT/src/data/projects.ts" "$WT/src/pages/Home.tsx" <<'PY'
import sys, re
proj, home = sys.argv[1], sys.argv[2]

s = open(proj).read()
for pid in ['08-freisteller', '09-fotogrammetrie', '10-projection-mapping']:
    i = s.index(f"id: '{pid}'")
    start = s.rindex('{', 0, i)
    depth, j = 0, start
    while True:
        if s[j] == '{': depth += 1
        elif s[j] == '}': depth -= 1
        if depth == 0: break
        j += 1
    end = j + 1
    while end < len(s) and s[end] in ', ': end += 1
    if end < len(s) and s[end] == '\n': end += 1
    s = s[:start].rstrip(' ') + s[end:]
s = re.sub(r'\n{3,}', '\n\n', s)
open(proj, 'w').write(s)
ids = re.findall(r"id: '([\w-]+)'", s)
assert len(ids) == 7, f"expected 7 projects, got {ids}"

h = open(home).read()
assert '/profile.webp?v=3' in h, "profile path not found, v1 source changed?"
h = h.replace('/profile.webp?v=3', '/archive/v1/profile.webp')
open(home, 'w').write(h)
print(f"patched: {len(ids)} projects, profile repointed")
PY

cd "$WT"
npx vite build --base=/archive/v1/ 2>&1 | grep -E "error|✓ built"

cd "$REPO"
rm -rf public/archive/v1; mkdir -p public/archive/v1
cp "$WT/dist/index.html" public/archive/v1/
cp -R "$WT/dist/assets" public/archive/v1/
# The portrait as it was, straight from the tag.
git show v1:public/profile.webp > public/archive/v1/profile.webp
git worktree remove "$WT" --force

echo "v1 archive: $(du -sh public/archive/v1 | cut -f1)"
grep -o '/archive/v1/profile.webp' public/archive/v1/assets/*.js | head -1
