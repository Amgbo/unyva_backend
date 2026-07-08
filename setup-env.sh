#!/bin/bash

# Setup environment variables for Unyva Backend
# This script helps set up the required environment variables

echo "Setting up environment variables for Unyva Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "⚠️  .env file already exists"
fi

# Generate a secure JWT secret if not set
if ! grep -q "JWT_SECRET=" .env 2>/dev/null || grep -q "JWT_SECRET=$" .env 2>/dev/null; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "JWT_SECRET=$JWT_SECRET" >> .env
    echo "✅ JWT_SECRET generated and added to .env"
else
    echo "⚠️  JWT_SECRET already set in .env"
fi

# Check for other required variables
REQUIRED_VARS=("DATABASE_URL" "PAYSTACK_SECRET_KEY" "PAYSTACK_PUBLIC_KEY" "PAYSTACK_WEBHOOK_SECRET")

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "$var=" .env 2>/dev/null; then
        echo "⚠️  $var not found in .env - please set it manually"
    else
        echo "✅ $var found in .env"
    fi
done

echo ""
echo "Environment setup complete!"
echo "Please ensure all required variables are set in .env file:"
echo "- DATABASE_URL"
echo "- JWT_SECRET (auto-generated)"
echo "- PAYSTACK_SECRET_KEY"
echo "- PAYSTACK_PUBLIC_KEY"
echo "- PAYSTACK_WEBHOOK_SECRET"
echo ""
echo "Then run the database migration:"
echo "cd unyva_backend && npm run migrate"
