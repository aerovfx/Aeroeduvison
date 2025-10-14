#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}💾 Creating backup of local database...${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found${NC}"
    echo -e "${YELLOW}Please create .env.local with your local DATABASE_URL${NC}"
    exit 1
fi

# Load environment variables
source .env.local

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not found in .env.local${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/local_db_backup_$TIMESTAMP.sql"

echo -e "${BLUE}📦 Creating backup: $BACKUP_FILE${NC}"

# Create backup using pg_dump
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Local database backup created successfully!${NC}"
    echo -e "${BLUE}📁 Backup location: $BACKUP_FILE${NC}"
    
    # Show backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${BLUE}📊 Backup size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Failed to create backup${NC}"
    exit 1
fi

echo -e "${YELLOW}💡 To restore this backup later:${NC}"
echo -e "   psql \"\$DATABASE_URL\" < $BACKUP_FILE"





