#!/usr/bin/env bash

set -euo pipefail

ROOT="src/app/(dashboard)/[teamSlug]"

# Route pages should use DashboardContainer for page-level width/gutters.
# We block legacy outer wrappers that caused layout ratio drift.
VIOLATIONS="$(rg -n "max-w-[0-9]+xl\\s+mx-auto|mx-auto\\s+px-12|px-12\\s+py-" "$ROOT" --glob '**/page.tsx' || true)"

if [[ -n "$VIOLATIONS" ]]; then
  echo "Dashboard layout contract violations found:"
  echo "$VIOLATIONS"
  echo
  echo "Use DashboardContainer for route-level wrappers instead of manual max-width + px-12 wrappers."
  exit 1
fi

echo "Dashboard layout contract check passed."
