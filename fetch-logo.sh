#!/bin/sh
# Downloads the real David Howard Golf mark (Higgsfield Recraft vector, option 3)
# at build time. Fails the build loudly if the artwork is not valid SVG,
# keeping the previous deployment live rather than shipping a broken mark.
set -e
mkdir -p assets
for U in \
  "https://d8j0ntlcm91z4.cloudfront.net/user_3Ei7AlrjOP38XotvP8uZ27B9ge5/hf_20260702_215314_bd5544e5-c1ef-415f-af69-79436b73021a.svg" \
  "https://d8j0ntlcm91z4.cloudfront.net/user_3Ei7AlrjOP38XotvP8uZ27B9ge5/hf_20260702_215314_bd5544e5-c1ef-415f-a69f-79436b73021a.svg"
do
  if curl -fsSL "$U" -o assets/logo.svg 2>/dev/null; then
    if head -c 400 assets/logo.svg | grep -qi "<svg"; then
      echo "logo.svg fetched from $U ($(wc -c < assets/logo.svg) bytes)"
      exit 0
    fi
  fi
done
echo "Could not fetch a valid SVG logo"; exit 1
