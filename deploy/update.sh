#!/bin/bash
# ============================================
# Smart Tags — Quick Update Script
# Run this to pull latest changes and redeploy
# ============================================

set -e
APP_DIR="/var/www/smart-tags"

echo "Pulling latest changes..."
cd $APP_DIR
git pull origin main

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Restarting app..."
pm2 restart smart-tags

echo "Done! App updated."
