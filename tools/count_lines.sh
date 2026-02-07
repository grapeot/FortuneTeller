#!/bin/bash
# Count lines of actual code (exclude config files, generated files, etc.)

echo "📊 Code Line Count"
echo "=================="
echo

# Define what to exclude
EXCLUDE_PATTERNS=(
  "node_modules"
  "dist"
  "build"
  ".git"
  "package-lock.json"
  "package.json"
  "*.lock"
  "*.log"
  "*.md"
  "*.txt"
  "*.json"
  "*.jpg"
  "*.png"
  "*.svg"
  ".env*"
  "*.example"
  "Dockerfile"
  "requirements.txt"
  "vite.config.js"
  "index.html"
  "favicon.svg"
)

# Build find exclude args
EXCLUDE_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS+=(-not -path "*/${pattern}")
  EXCLUDE_ARGS+=(-not -name "${pattern}")
done

# Count by file type
echo "By File Type:"
echo "--------------"

# JavaScript/JSX
JS_FILES=$(find . -type f \( -name "*.js" -o -name "*.jsx" \) "${EXCLUDE_ARGS[@]}" -not -path "./node_modules/*" -not -path "./dist/*" | grep -v node_modules | grep -v dist)
JS_LINES=$(echo "$JS_FILES" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
JS_COUNT=$(echo "$JS_FILES" | grep -c . || echo "0")
echo "  JavaScript/JSX: $JS_LINES lines ($JS_COUNT files)"

# Python
PY_FILES=$(find . -type f -name "*.py" "${EXCLUDE_ARGS[@]}" -not -path "./node_modules/*" -not -path "./dist/*" | grep -v node_modules | grep -v dist)
PY_LINES=$(echo "$PY_FILES" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
PY_COUNT=$(echo "$PY_FILES" | grep -c . || echo "0")
echo "  Python:         $PY_LINES lines ($PY_COUNT files)"

# CSS
CSS_FILES=$(find . -type f -name "*.css" "${EXCLUDE_ARGS[@]}" -not -path "./node_modules/*" -not -path "./dist/*" | grep -v node_modules | grep -v dist)
CSS_LINES=$(echo "$CSS_FILES" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
CSS_COUNT=$(echo "$CSS_FILES" | grep -c . || echo "0")
echo "  CSS:            $CSS_LINES lines ($CSS_COUNT files)"

# HTML (test files only)
HTML_FILES=$(find ./test -type f -name "*.html" 2>/dev/null | grep -v node_modules | grep -v dist)
HTML_LINES=$(echo "$HTML_FILES" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
HTML_COUNT=$(echo "$HTML_FILES" | grep -c . || echo "0")
if [ "$HTML_COUNT" -gt 0 ]; then
  echo "  HTML (tests):   $HTML_LINES lines ($HTML_COUNT files)"
fi

echo
echo "Total:           $((JS_LINES + PY_LINES + CSS_LINES + HTML_LINES)) lines"
echo

# Show file breakdown
echo "File Breakdown:"
echo "---------------"
echo "$JS_FILES" | while read -r file; do
  if [ -n "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "  $file: $lines lines"
  fi
done
echo "$PY_FILES" | while read -r file; do
  if [ -n "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "  $file: $lines lines"
  fi
done
echo "$CSS_FILES" | while read -r file; do
  if [ -n "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "  $file: $lines lines"
  fi
done
echo "$HTML_FILES" | while read -r file; do
  if [ -n "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "  $file: $lines lines"
  fi
done
