#!/usr/bin/env npx ts-node
/**
 * Multi-Tenant Migration Script
 * 
 * This script:
 * 1. Creates indexes for tenant-scoped queries
 * 2. Migrates existing data to assign tenantId
 * 
 * Run with: npx ts-node scripts/migrate-multi-tenant.ts
 * Or: npm run migrate:multi-tenant
 */

import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

interface MigrationStats {
  boards: number;
  tasks: number;
  activities: number;
  comments: number;
  chatMessages: number;
  chatSessions: number;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createIndexes(db: Db): Promise<void> {
  console.log('\n📊 Creating indexes...\n');

  // Boards - tenant + id (unique within tenant)
  await db.collection('boards').createIndex(
    { tenantId: 1, id: 1 },
    { unique: true, background: true }
  );
  console.log('  ✓ boards: { tenantId, id }');

  // Tasks - tenant + board for listing
  await db.collection('tasks').createIndex(
    { tenantId: 1, boardId: 1, archived: 1 },
    { background: true }
  );
  await db.collection('tasks').createIndex(
    { tenantId: 1, id: 1 },
    { unique: true, background: true }
  );
  console.log('  ✓ tasks: { tenantId, boardId, archived }');
  console.log('  ✓ tasks: { tenantId, id }');

  // Activities - tenant + board for listing, timestamp for sorting
  await db.collection('activities').createIndex(
    { tenantId: 1, boardId: 1, timestamp: -1 },
    { background: true }
  );
  await db.collection('activities').createIndex(
    { tenantId: 1, taskId: 1, timestamp: -1 },
    { background: true }
  );
  console.log('  ✓ activities: { tenantId, boardId, timestamp }');
  console.log('  ✓ activities: { tenantId, taskId, timestamp }');

  // Comments - tenant + task for listing
  await db.collection('comments').createIndex(
    { tenantId: 1, taskId: 1, createdAt: -1 },
    { background: true }
  );
  console.log('  ✓ comments: { tenantId, taskId, createdAt }');

  // Chat messages - tenant + board (optional) for listing
  await db.collection('chatMessages').createIndex(
    { tenantId: 1, boardId: 1, createdAt: -1 },
    { background: true }
  );
  await db.collection('chatMessages').createIndex(
    { tenantId: 1, createdAt: -1 },
    { background: true }
  );
  console.log('  ✓ chatMessages: { tenantId, boardId, createdAt }');
  console.log('  ✓ chatMessages: { tenantId, createdAt }');

  // Chat sessions - tenant + board
  await db.collection('chatSessions').createIndex(
    { tenantId: 1, boardId: 1 },
    { background: true }
  );
  console.log('  ✓ chatSessions: { tenantId, boardId }');

  // Tenants - slug must be unique
  await db.collection('tenants').createIndex(
    { slug: 1 },
    { unique: true, background: true }
  );
  await db.collection('tenants').createIndex(
    { id: 1 },
    { unique: true, background: true }
  );
  console.log('  ✓ tenants: { slug } (unique)');
  console.log('  ✓ tenants: { id } (unique)');

  // Users - email must be unique
  await db.collection('users').createIndex(
    { email: 1 },
    { unique: true, background: true }
  );
  await db.collection('users').createIndex(
    { id: 1 },
    { unique: true, background: true }
  );
  console.log('  ✓ users: { email } (unique)');
  console.log('  ✓ users: { id } (unique)');

  // API keys - hash for lookup
  await db.collection('apiKeys').createIndex(
    { keyHash: 1 },
    { unique: true, background: true }
  );
  await db.collection('apiKeys').createIndex(
    { tenantId: 1 },
    { background: true }
  );
  console.log('  ✓ apiKeys: { keyHash } (unique)');
  console.log('  ✓ apiKeys: { tenantId }');

  console.log('\n✅ All indexes created');
}

async function migrateData(db: Db, tenantId: string): Promise<MigrationStats> {
  console.log(`\n📦 Migrating data to tenant: ${tenantId}\n`);

  const stats: MigrationStats = {
    boards: 0,
    tasks: 0,
    activities: 0,
    comments: 0,
    chatMessages: 0,
    chatSessions: 0,
  };

  // Migrate boards without tenantId
  const boardResult = await db.collection('boards').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.boards = boardResult.modifiedCount;
  console.log(`  ✓ boards: ${stats.boards} migrated`);

  // Migrate tasks without tenantId
  const taskResult = await db.collection('tasks').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.tasks = taskResult.modifiedCount;
  console.log(`  ✓ tasks: ${stats.tasks} migrated`);

  // Migrate activities without tenantId
  const activityResult = await db.collection('activities').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.activities = activityResult.modifiedCount;
  console.log(`  ✓ activities: ${stats.activities} migrated`);

  // Migrate comments without tenantId
  const commentResult = await db.collection('comments').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.comments = commentResult.modifiedCount;
  console.log(`  ✓ comments: ${stats.comments} migrated`);

  // Migrate chat messages without tenantId
  const chatMsgResult = await db.collection('chatMessages').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.chatMessages = chatMsgResult.modifiedCount;
  console.log(`  ✓ chatMessages: ${stats.chatMessages} migrated`);

  // Migrate chat sessions without tenantId
  const chatSessionResult = await db.collection('chatSessions').updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  stats.chatSessions = chatSessionResult.modifiedCount;
  console.log(`  ✓ chatSessions: ${stats.chatSessions} migrated`);

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`\n✅ Migration complete: ${total} documents updated`);

  return stats;
}

async function main() {
  console.log('🔧 Multi-Tenant Migration\n');
  console.log('This script will:');
  console.log('  1. Create indexes for tenant-scoped queries');
  console.log('  2. Migrate existing data to a default tenant\n');

  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Check for existing tenant
    const existingTenant = await db.collection('tenants').findOne({});
    
    let tenantId: string;
    
    if (existingTenant) {
      console.log(`Found existing tenant: ${existingTenant.name} (${existingTenant.id})`);
      tenantId = existingTenant.id;
    } else {
      console.log('No tenant found. Will create default tenant during first login.');
      console.log('For now, using placeholder tenant ID for data migration.\n');
      
      // Use a consistent placeholder - will be replaced on first real login
      tenantId = 'tenant_default_migration';
      
      const answer = await prompt('Continue with migration? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('Migration cancelled.');
        process.exit(0);
      }
    }

    // Step 1: Create indexes
    await createIndexes(db);

    // Step 2: Check if there's data to migrate
    const unmigratedBoards = await db.collection('boards').countDocuments({
      tenantId: { $exists: false }
    });

    if (unmigratedBoards > 0) {
      console.log(`\nFound ${unmigratedBoards} boards without tenantId`);
      const answer = await prompt('Migrate existing data? (y/n): ');
      
      if (answer.toLowerCase() === 'y') {
        await migrateData(db, tenantId);
      } else {
        console.log('Data migration skipped.');
      }
    } else {
      console.log('\n✅ No data migration needed - all documents have tenantId');
    }

    console.log('\n🎉 Migration complete!\n');
    console.log('Next steps:');
    console.log('  1. Update API routes to use requireAuth from tenant-auth.ts');
    console.log('  2. Add tenantId filter to all queries');
    console.log('  3. Set tenantId on all create operations\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
