#!/usr/bin/env bash
# Vite with --base=/lappycap/ emits HTML that references /lappycap/assets/...
# but the default publish layout is flat at the artifact root. For mounted
# subpaths like https://misuse.net/lappycap/ we need those files to exist at
# dist/lappycap/... while still keeping the slug root usable.
set -euo pipefail

DIST="${1:?dist directory}"
SEGMENT="${2:?base path segment without slashes}"

if [[ ! -d "$DIST" ]]; then
  echo "error: not a directory: $DIST" >&2
  exit 1
fi

TARGET="${DIST}/${SEGMENT}"
rm -rf "$TARGET"
mkdir "$TARGET"

shopt -s dotglob nullglob
copied=0
for path in "$DIST"/*; do
  name="$(basename "$path")"
  if [[ "$name" == "$SEGMENT" ]]; then
    continue
  fi

  if [[ -d "$path" ]]; then
    cp -R "$path" "$TARGET/"
    copied=$((copied + 1))
    continue
  fi

  cp "$path" "$TARGET/"
  copied=$((copied + 1))
done

if [[ "$copied" -eq 0 ]]; then
  echo "error: nothing copied from ${DIST}" >&2
  exit 1
fi

echo "Duplicated ${copied} item(s) into ${TARGET}; slug root and /${SEGMENT}/ now share the same app." >&2
