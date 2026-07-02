#!/bin/bash
cd /opt/Astro-staging/redo.ae/_wp_export
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
while read url; do
  slug=$(echo "$url" | sed -E 's#https?://[^/]+/##; s#/$##')
  out="html/posts/$slug.html"
  [ -s "$out" ] && { echo "skip $slug"; continue; }
  code=$(curl -s -A "$UA" -w '%{http_code}' "$url" -o "$out")
  echo "$code $slug $(wc -c < "$out")"
  sleep 1.2
done < posts_urls.txt
echo "DONE posts"
