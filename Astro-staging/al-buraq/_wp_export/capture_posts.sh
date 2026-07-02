#!/bin/bash
cd /opt/Astro-staging/al-buraq/_wp_export
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
i=0
while read -r url; do
  slug=$(echo "$url" | sed -E 's#https?://[^/]+/##; s#/$##')
  out="html/posts/$slug.html"
  if [ -s "$out" ]; then echo "skip $slug"; continue; fi
  code=$(curl -s -A "$UA" -w '%{http_code}' "$url" -o "$out")
  echo "$code $slug $(wc -c < "$out")"
  i=$((i+1))
  sleep 1.3
done < posts_urls.txt
echo "DONE captured $i posts"
