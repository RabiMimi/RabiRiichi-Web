#!/bin/sh
# Generate TypeScript bindings from the proto definitions in ./protos.
#
# Output goes to src/generated (git-ignored). Run `npm run proto:update` first
# to ensure the protos submodule is initialized and up to date.
set -e

OUT_DIR=./src/generated
PROTO_DIR=./protos

if [ ! -d "${PROTO_DIR}" ] || [ -z "$(ls -A "${PROTO_DIR}" 2>/dev/null)" ]; then
  echo "Proto directory '${PROTO_DIR}' is empty."
  echo "Run 'npm run proto:update' to fetch the proto submodule first."
  exit 1
fi

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

# pbjs/pbts ship with the protobufjs-cli dev dependency. Prefer the locally
# installed binaries so the script works regardless of how it is invoked.
BIN_DIR="$(dirname "$0")/../node_modules/.bin"
PBJS="${BIN_DIR}/pbjs"
PBTS="${BIN_DIR}/pbts"
[ -x "${PBJS}" ] || PBJS="pbjs"
[ -x "${PBTS}" ] || PBTS="pbts"

# Find all proto files and sort them so that files containing enums are processed last.
# This workarounds a pbts bug where JSDoc parsing stops after encountering an enum.
ALL_PROTOS=$(find "${PROTO_DIR}" -iname "*.proto")
ENUM_PROTOS=""
NO_ENUM_PROTOS=""
for f in ${ALL_PROTOS}; do
  if grep -q "enum " "$f"; then
    ENUM_PROTOS="${ENUM_PROTOS} $f"
  else
    NO_ENUM_PROTOS="${NO_ENUM_PROTOS} $f"
  fi
done

"${PBJS}" \
  -t static-module \
  --force-number \
  -w es6 \
  -r rabiriichi \
  -p "${PROTO_DIR}" \
  -o "${OUT_DIR}/protos.js" \
  ${NO_ENUM_PROTOS} ${ENUM_PROTOS}

"${PBTS}" -o "${OUT_DIR}/protos.d.ts" "${OUT_DIR}/protos.js"

echo "Generated proto bindings in ${OUT_DIR}."
