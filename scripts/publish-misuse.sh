#!/usr/bin/env bash
# Build Vite with base /lappycap/, upload dist/ to here.now, link slug to https://misuse.net/lappycap/
# (requires verified custom domain on your here.now account).
#
# Prune behavior matches rescurejack: set HERENOW_PRUNE_UNLINKED_PUBLISHES=0 to skip account-wide
# cleanup of unlinked publishes after deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUBLISH_SH="${HOME}/.agents/skills/here-now/scripts/publish.sh"
if [[ ! -f "$PUBLISH_SH" ]]; then
  echo "error: missing ${PUBLISH_SH} (install here-now skill or set PUBLISH_SH)" >&2
  exit 1
fi

CRED="${HERENOW_CREDENTIALS_FILE:-$HOME/.herenow/credentials}"
if [[ -z "${HERENOW_API_KEY:-}" && ! -f "$CRED" ]]; then
  echo "error: set HERENOW_API_KEY or create ~/.herenow/credentials" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || {
  echo "error: jq is required for link step" >&2
  exit 1
}

DOMAIN="${HERENOW_DOMAIN:-misuse.net}"
LOCATION="${HERENOW_LOCATION:-lappycap}"

API_KEY="${HERENOW_API_KEY:-}"
if [[ -z "$API_KEY" && -f "$CRED" ]]; then
  API_KEY="$(tr -d '[:space:]' <"$CRED")"
fi

AUTH_HEADER="Authorization: Bearer ${API_KEY}"
PRUNE_UNLINKED="${HERENOW_PRUNE_UNLINKED_PUBLISHES:-${HERENOW_DELETE_PREVIOUS_PUBLISH:-1}}"

echo "Building with base /${LOCATION}/ ..." >&2
npm run build -- --base="/${LOCATION}/"

# Mounted subpaths are resolved as real paths on the publish, so the Vite build
# also needs a duplicate copy under dist/${LOCATION}/ for misuse.net/lappycap/.
bash "$ROOT/scripts/nest-vite-dist-for-here.sh" "$ROOT/dist" "$LOCATION"

echo "Uploading dist/ to here.now ..." >&2
SITE_URL="$("$PUBLISH_SH" "$ROOT/dist" --client "cursor/lappycap" | head -1)"
if [[ "$SITE_URL" != https://*.here.now* ]]; then
  echo "error: unexpected site URL from publish: ${SITE_URL}" >&2
  exit 1
fi

SLUG="$(printf '%s\n' "$SITE_URL" | sed -E 's#^https://([^./]+)\.here\.now/?#\1#')"
if [[ -z "$SLUG" || "$SLUG" == "$SITE_URL" ]]; then
  echo "error: could not parse slug from ${SITE_URL}" >&2
  exit 1
fi

echo "New publish slug: ${SLUG}" >&2

LINK_JSON="$(jq -nc --arg slug "$SLUG" --arg loc "$LOCATION" --arg dom "$DOMAIN" \
  '{slug: $slug, location: $loc, domain: $dom}')"

echo "Linking ${DOMAIN}/${LOCATION}/ -> slug ${SLUG} ..." >&2
RESP="$(curl -sS -X POST "https://here.now/api/v1/links" \
  -H "$AUTH_HEADER" \
  -H "content-type: application/json" \
  -H "X-HereNow-Client: cursor/lappycap-link" \
  -d "$LINK_JSON")"

if echo "$RESP" | jq -e '.error' >/dev/null 2>&1; then
  ERR="$(echo "$RESP" | jq -r '.error')"
  if echo "$ERR" | grep -qi "already exists"; then
    echo "Mount exists; removing then recreating link ..." >&2
    curl -sS -X DELETE "https://here.now/api/v1/links/${LOCATION}?domain=${DOMAIN}" \
      -H "$AUTH_HEADER" \
      -H "X-HereNow-Client: cursor/lappycap-link" >/dev/null
    RESP="$(curl -sS -X POST "https://here.now/api/v1/links" \
      -H "$AUTH_HEADER" \
      -H "content-type: application/json" \
      -H "X-HereNow-Client: cursor/lappycap-link" \
      -d "$LINK_JSON")"
  fi
fi

if echo "$RESP" | jq -e '.error' >/dev/null 2>&1; then
  echo "error: link step failed:" >&2
  echo "$RESP" | jq -r '.' >&2
  exit 1
fi

PUBLIC_URL="https://${DOMAIN}/${LOCATION}/"
echo "Domain now serves: ${PUBLIC_URL}" >&2

prune_unlinked_publishes() {
  local new_slug="$1"
  if [[ "$PRUNE_UNLINKED" == "0" ]]; then
    echo "HERENOW_PRUNE_UNLINKED_PUBLISHES=0 — skipping unlinked publish cleanup." >&2
    return 0
  fi

  echo "Listing publishes and active links (brief pause for registry) ..." >&2
  sleep 2

  local pub_resp links_resp domains_resp handle_resp
  pub_resp="$(curl -sS "https://here.now/api/v1/publishes" \
    -H "$AUTH_HEADER" \
    -H "X-HereNow-Client: cursor/lappycap-prune")"
  if echo "$pub_resp" | jq -e '.error' >/dev/null 2>&1; then
    echo "warning: GET /api/v1/publishes failed; not pruning:" >&2
    echo "$pub_resp" | jq -r '.' >&2
    return 0
  fi

  links_resp="$(curl -sS "https://here.now/api/v1/links" \
    -H "$AUTH_HEADER" \
    -H "X-HereNow-Client: cursor/lappycap-prune")"
  domains_resp="$(curl -sS "https://here.now/api/v1/domains" \
    -H "$AUTH_HEADER" \
    -H "X-HereNow-Client: cursor/lappycap-prune")"
  handle_resp="$(curl -sS "https://here.now/api/v1/handle" \
    -H "$AUTH_HEADER" \
    -H "X-HereNow-Client: cursor/lappycap-prune")"

  local linked_tmp
  linked_tmp="$(mktemp)"
  {
    printf '%s\n' "$new_slug"
    echo "$links_resp" | jq -r '[.. | objects | select(has("slug")) | .slug | strings] | unique | .[]' 2>/dev/null || true
    echo "$domains_resp" | jq -r '.domains[]? | (.mounts // [])[]? | .slug? | strings' 2>/dev/null || true
    echo "$handle_resp" | jq -r '[.. | objects | select(has("slug")) | .slug | strings] | unique | .[]' 2>/dev/null || true
  } | grep -E '^[a-z0-9][a-z0-9-]{2,63}$' | sort -u >"$linked_tmp"

  local nlinked npub
  nlinked="$(wc -l <"$linked_tmp" | tr -d ' ')"
  npub="$(echo "$pub_resp" | jq -r '.publishes | length' 2>/dev/null || echo 0)"
  if [[ "${nlinked:-0}" -lt 1 ]]; then
    echo "warning: could not resolve any linked slugs; not pruning." >&2
    rm -f "$linked_tmp"
    return 0
  fi
  if ! grep -qxF "$new_slug" "$linked_tmp"; then
    echo "warning: linked set missing new slug; adding ${new_slug}" >&2
    echo "$new_slug" >>"$linked_tmp"
    sort -u -o "$linked_tmp" "$linked_tmp"
  fi

  echo "Linked slugs (${nlinked}): keeping these publishes; checking ${npub} total ..." >&2

  local to_delete=0
  while IFS= read -r ps; do
    [[ -z "$ps" ]] && continue
    if grep -qxF "$ps" "$linked_tmp"; then
      continue
    fi
    echo "Deleting unlinked publish: ${ps} ..." >&2
    local del_resp
    del_resp="$(curl -sS -X DELETE "https://here.now/api/v1/publish/${ps}" \
      -H "$AUTH_HEADER" \
      -H "X-HereNow-Client: cursor/lappycap-prune")"
    if echo "$del_resp" | jq -e '.error' >/dev/null 2>&1; then
      echo "warning: could not delete ${ps}:" >&2
      echo "$del_resp" | jq -r '.' >&2
    else
      to_delete=$((to_delete + 1))
    fi
  done < <(echo "$pub_resp" | jq -r '.publishes[]?.slug? // empty' | grep -E '^[a-z0-9][a-z0-9-]{2,63}$' || true)

  rm -f "$linked_tmp"
  echo "Prune finished (removed ${to_delete} unlinked publish(es))." >&2
}

prune_unlinked_publishes "$SLUG"

echo "$PUBLIC_URL" >&2
echo "$PUBLIC_URL"
