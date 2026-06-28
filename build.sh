#!/usr/bin/env bash
# POSIX build wrapper: produces a single self-contained index.html and copies
# the runtime artifacts into release/.
set -e
cd "$(dirname "$0")"
node build.mjs
echo "Done. Artifacts are in ./release"
