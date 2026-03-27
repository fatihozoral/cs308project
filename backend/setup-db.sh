#!/bin/bash

# Database Setup Script for CS 308 Online Ticketing Platform
# This script creates the database and runs migrations

echo "🚀 CS 308 Database Setup Script"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it first."
    echo "Run: cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    echo "Please make sure PostgreSQL is running."
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Check if database exists
echo "🔍 Checking if database exists..."
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -w $DB_NAME)

if [ -z "$DB_EXISTS" ]; then
    echo "📦 Creating database: $DB_NAME"
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
else
    echo "✅ Database already exists"
fi

echo ""

# Run migrations
echo "🔄 Running migrations..."
node -e "
const pool = require('./src/config/database');
const fs = require('fs');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./src/db/migrations/001_create_users_and_refresh_tokens.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database setup completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run seed script: npm run seed"
    echo "  2. Start the server: npm run dev"
else
    echo ""
    echo "❌ Setup failed. Please check the errors above."
    exit 1
fi
