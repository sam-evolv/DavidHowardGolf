#!/bin/sh
# Downloads the real David Howard Golf mark (Higgsfield Recraft vector, option 3)
# at build time. Fails the build loudly if the artwork is not valid SVG,
# which keeps the previous deployment live instead of shipping a broken mark.
set -e
URL="https://d8j0ntlcm91z4.cloudfront.net/user_3Ei7AlrjOP38XotvP8uZ27B9ge5/hf_20260702_215314_bd5544e5-c1ef-415f-af69-79436b73021a.svg"
mkdir -p assets
curl -fsSL "$URL" -o assets/logo.svg
head -c 400 assets/logo.svg | grep -qi "<svg" || { echo "Downloaded file is not SVG"; exit 1; }
echo "logo.svg fetched: $(wc -c < assets/logo.svg) bytes"
