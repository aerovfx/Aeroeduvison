#!/bin/bash

echo "Setting up Math LMS Database..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"
EOF
    echo "✅ Created .env.local file"
    echo "⚠️  Please update DATABASE_URL with your PostgreSQL credentials"
else
    echo "✅ .env.local already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in .env.local with your PostgreSQL credentials"
echo "2. Create a PostgreSQL database named 'lmsmath'"
echo "3. Run: npx prisma migrate dev --name init"
echo "4. Run: npm run db:seed (optional)"
echo "5. Run: npm run dev"
