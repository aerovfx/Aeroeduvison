#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = process.env.K_SERVICE !== undefined;

console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  K_SERVICE: process.env.K_SERVICE,
  isProduction,
  isCloudRun
});

if (isProduction || isCloudRun) {
  console.log('Using PostgreSQL schema for production');
  // Keep the current schema.prisma (PostgreSQL)
} else {
  console.log('Using SQLite schema for local development');
  // Copy local schema to main schema
  const localSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.local.prisma');
  const mainSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  
  if (fs.existsSync(localSchemaPath)) {
    const localSchema = fs.readFileSync(localSchemaPath, 'utf8');
    fs.writeFileSync(mainSchemaPath, localSchema);
    console.log('Switched to SQLite schema');
  } else {
    console.error('Local schema file not found:', localSchemaPath);
    process.exit(1);
  }
}

