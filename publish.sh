#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Update site art and assets $(date +%Y-%m-%d_%H:%M)"
git push
echo "Опубликовано на https://defras.art !"
