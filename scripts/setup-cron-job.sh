#!/bin/bash

# Setup Cron Job for Auto-Processing Pending Accounts
# This script configures a cron job to run every 10 minutes

echo "🔧 Setting up cron job for auto-processing..."

# Generate a secret key for the cron endpoint
CRON_SECRET=$(openssl rand -hex 32)

# Add to .env if not exists
if ! grep -q "CRON_SECRET" .env 2>/dev/null; then
  echo "CRON_SECRET=${CRON_SECRET}" >> .env
  echo "✅ Added CRON_SECRET to .env"
else
  echo "⚠️  CRON_SECRET already exists in .env"
fi

# Get the public URL
if [ -f "PUBLIC_URL.txt" ]; then
  PUBLIC_URL=$(cat PUBLIC_URL.txt)
else
  echo "⚠️  PUBLIC_URL.txt not found. Please set your public URL first."
  exit 1
fi

# Create cron script
cat > /tmp/telegram-flow-cron.sh << EOF
#!/bin/bash
# Auto-process pending Telegram accounts
curl -X POST "${PUBLIC_URL}/api/telegram-flow/auto-process" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
EOF

chmod +x /tmp/telegram-flow-cron.sh

echo "✅ Cron script created at /tmp/telegram-flow-cron.sh"

# Add to crontab (runs every 10 minutes)
CRON_LINE="*/10 * * * * /tmp/telegram-flow-cron.sh >> /var/log/telegram-flow-cron.log 2>&1"

# Check if already in crontab
if crontab -l 2>/dev/null | grep -q "telegram-flow-cron.sh"; then
  echo "⚠️  Cron job already exists"
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "✅ Cron job added (runs every 10 minutes)"
fi

echo ""
echo "📋 Summary:"
echo "  - Auto-process endpoint: ${PUBLIC_URL}/api/telegram-flow/auto-process"
echo "  - Runs every: 10 minutes"
echo "  - Log file: /var/log/telegram-flow-cron.log"
echo ""
echo "To manually trigger:"
echo "  curl -X POST \"${PUBLIC_URL}/api/telegram-flow/auto-process\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""
echo "To view cron jobs:"
echo "  crontab -l"
echo ""
echo "To remove cron job:"
echo "  crontab -e  # then delete the line containing 'telegram-flow-cron.sh'"
