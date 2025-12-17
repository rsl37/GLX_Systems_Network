#!/usr/bin/env bash
# /**
#  * GLX: Connect the World - Civic Networking Platform
#  * 
#  * Copyright (c) 2025 rsl37
#  * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
#  * 
#  * ⚠️  TERMS:
#  * - Commercial use strictly prohibited without written permission from copyright holder
#  * - Forking/derivative works prohibited without written permission
#  * - Violations subject to legal action and damages
#  * 
#  * See LICENSE file in repository root for full terms.
#  * Contact: roselleroberts@pm.me for licensing inquiries
#  */

# Find all files, compute their SHA256 hash, and sort by hash
find . -type f ! -path '*/.git/*' -exec sha256sum {} + | sort > /tmp/allfiles.sha256

# For each hash, keep the first file and delete the rest
awk '{print $1}' /tmp/allfiles.sha256 | uniq -d | while read hash; do
  files=($(grep "^$hash" /tmp/allfiles.sha256 | awk '{print $2}'))
  # Keep the first file, delete the rest
  for ((i=1; i<${#files[@]}; i++)); do
    echo "Deleting duplicate: ${files[$i]}"
    rm -f "${files[$i]}"
  done
done

echo "Duplicate deletion complete."
