#!/usr/bin/env bash
# Local preview: shows what the next version would be without committing.
# Actual releases are triggered via GitHub Actions → Actions → Release → Run workflow.
set -euo pipefail

BUMP="${1:-patch}"

LAST_TAG=$(git tag --list 'v*' | sort -V | tail -1)
CURRENT="${LAST_TAG#v}"
CURRENT="${CURRENT:-0.0.0}"

MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *)     echo "Usage: $0 [patch|minor|major]" >&2; exit 1 ;;
esac

VERSION="${MAJOR}.${MINOR}.${PATCH}"
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "Current : ${CURRENT:-none}"
echo "Next    : ${VERSION}  (versionCode ${VERSION_CODE})"
echo ""
echo "To release, go to:"
echo "  GitHub → Actions → Release → Run workflow → bump=${BUMP}"
