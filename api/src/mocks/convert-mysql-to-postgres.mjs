#!/usr/bin/env node
/**
 * Convert MySQL JSON exports to PostgreSQL INSERT statements
 * 
 * Usage:
 *   node convert-mysql-to-postgres.mjs <input-json-file> [output-sql-file]
 * 
 * Example:
 *   node convert-mysql-to-postgres.mjs users.json users.sql
 *   node convert-mysql-to-postgres.mjs recommenders.json collaborators.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Table name mappings (old MySQL -> new PostgreSQL)
const TABLE_MAPPINGS = {
  'users': 'user_profiles',
  'user_profiles': 'user_profiles',
  'recommenders': 'collaborators',
  'scholarships': 'applications', // MySQL export has scholarships.json but it's actually applications data
  'applications': 'applications',
  'essays': 'essays',
  'recommendations': 'recommendations',
};

// Column name mappings (camelCase -> snake_case)
const COLUMN_MAPPINGS = {
  // user_profiles
  'userId': 'id',
  'authUserId': 'auth_user_id',
  'firstName': 'first_name',
  'lastName': 'last_name',
  'emailAddress': 'email_address',
  'phoneNumber': 'phone_number',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  
  // collaborators (from recommenders)
  'recommenderId': 'id',
  'userId': 'user_id',
  'firstName': 'first_name',
  'lastName': 'last_name',
  'emailAddress': 'email',
  'email': 'email',
  'phoneNumber': 'phone_number',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  
  // applications
  'applicationId': 'id',
  'application_id': 'id',
  'userId': 'user_id',
  'user_id': 'user_id',
  'scholarshipName': 'scholarship_name',
  'scholarship_name': 'scholarship_name',
  'targetType': 'target_type',
  'target_type': 'target_type',
  'orgWebsite': 'org_website',
  'org_website': 'org_website',
  'applicationLink': 'application_link',
  'application_link': 'application_link',
  'amount': 'min_award', // Single amount field becomes min_award
  'minAward': 'min_award',
  'min_award': 'min_award',
  'maxAward': 'max_award',
  'max_award': 'max_award',
  'renewableTerms': 'renewable_terms',
  'renewable_terms': 'renewable_terms',
  'documentInfoLink': 'document_info_link',
  'document_info_link': 'document_info_link',
  'currentAction': 'current_action',
  'current_action': 'current_action',
  'submissionDate': 'submission_date',
  'submission_date': 'submission_date',
  'openDate': 'open_date',
  'open_date': 'open_date',
  'dueDate': 'due_date',
  'due_date': 'due_date',
  'createdAt': 'created_at',
  'created_at': 'created_at',
  'updatedAt': 'updated_at',
  'updated_at': 'updated_at',
  
  // essays
  'essayId': 'id',
  'essay_id': 'id',
  'applicationId': 'application_id',
  'application_id': 'application_id',
  'essayLink': 'essay_link',
  'essay_link': 'essay_link',
  'wordCount': 'word_count',
  'word_count': 'word_count',
  'createdAt': 'created_at',
  'created_at': 'created_at',
  'updatedAt': 'updated_at',
  'updated_at': 'updated_at',

  // recommendations
  'recommendationId': 'id',
  'recommendation_id': 'id',
  'applicationId': 'application_id',
  'application_id': 'application_id',
  'recommenderId': 'recommender_id',
  'recommender_id': 'recommender_id',
  'submittedAt': 'submitted_at',
  'submitted_at': 'submitted_at',
  'dueDate': 'due_date',
  'due_date': 'due_date',
  'createdAt': 'created_at',
  'created_at': 'created_at',
  'updatedAt': 'updated_at',
  'updated_at': 'updated_at',
};

// Special handling for recommenders -> collaborators
function convertRecommenderToCollaborator(row, userIdMap) {
  // Map recommender data to collaborator structure
  const collaborator = {
    user_id: userIdMap[row.userId] || userIdMap[row.user_id] || row.userId || row.user_id,
    first_name: row.firstName || row.first_name,
    last_name: row.lastName || row.last_name,
    email: row.emailAddress || row.email_address || row.email,
    relationship: row.relationship || 'Recommender',
    phone_number: row.phoneNumber || row.phone_number || null,
  };

  // Preserve timestamps if available
  if (row.createdAt || row.created_at) {
    collaborator.created_at = row.createdAt || row.created_at;
  }
  if (row.updatedAt || row.updated_at) {
    collaborator.updated_at = row.updatedAt || row.updated_at;
  }

  return collaborator;
}

// Convert a single row to PostgreSQL format
function convertRow(row, tableName) {
  const converted = {};

  for (const [oldKey, value] of Object.entries(row)) {
    // Skip null/undefined values (PostgreSQL will use defaults)
    if (value === null || value === undefined) continue;

    // Map column name
    const newKey = COLUMN_MAPPINGS[oldKey] || oldKey.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase();

    // Special value transformations
    let transformedValue = value;

    // Fix status values - capitalize first letter for ENUMs
    if (newKey === 'status' && typeof value === 'string') {
      transformedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    // Convert MySQL boolean (0/1) to PostgreSQL boolean
    if (newKey === 'renewable' && (value === 0 || value === 1)) {
      transformedValue = value === 1;
    }

    converted[newKey] = transformedValue;
  }

  return converted;
}

// Escape SQL values
function escapeSQLValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === 'string') {
    // Escape single quotes
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  // For arrays (like TEXT[])
  if (Array.isArray(value)) {
    return `ARRAY[${value.map(v => escapeSQLValue(v)).join(', ')}]`;
  }
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

// Generate INSERT statement
function generateInsert(tableName, row) {
  const columns = Object.keys(row).join(', ');
  const values = Object.values(row).map(escapeSQLValue).join(', ');
  return `INSERT INTO public.${tableName} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;`;
}

// Main conversion function
function convertFile(inputFile, outputFile, options = {}) {
  console.log(`📖 Reading ${inputFile}...`);
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const inputFileName = path.basename(inputFile, '.json');
  
  // Determine target table name
  let targetTable = TABLE_MAPPINGS[inputFileName] || inputFileName;
  
  // Special case: recommenders -> collaborators
  const isRecommenders = inputFileName.toLowerCase().includes('recommender');
  if (isRecommenders) {
    targetTable = 'collaborators';
  }
  
  console.log(`📝 Converting to table: ${targetTable}`);
  
  // Ensure data is an array
  const rows = Array.isArray(data) ? data : [data];
  
  if (rows.length === 0) {
    console.log('⚠️  No data found in file');
    return;
  }
  
  console.log(`📊 Found ${rows.length} rows`);
  
  // Generate SQL statements
  const sqlStatements = [];
  sqlStatements.push(`-- Migration data from ${inputFileName}.json`);
  sqlStatements.push(`-- Converted to PostgreSQL format for table: ${targetTable}`);
  sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
  sqlStatements.push('');
  sqlStatements.push('BEGIN;');
  sqlStatements.push('');
  
  // User ID mapping for foreign keys (if provided)
  const userIdMap = options.userIdMap || {};
  
  rows.forEach((row, index) => {
    try {
      let convertedRow;
      
      // Special handling for recommenders
      if (isRecommenders) {
        convertedRow = convertRecommenderToCollaborator(row, userIdMap);
      } else {
        convertedRow = convertRow(row, targetTable);
      }
      
      // Remove id if it exists (let PostgreSQL generate it)
      // Unless we're preserving IDs for foreign key relationships
      if (!options.preserveIds && convertedRow.id) {
        delete convertedRow.id;
      }
      
      const insert = generateInsert(targetTable, convertedRow);
      sqlStatements.push(insert);
    } catch (error) {
      console.error(`❌ Error converting row ${index + 1}:`, error.message);
      sqlStatements.push(`-- ERROR: Row ${index + 1} failed to convert`);
    }
  });
  
  sqlStatements.push('');
  sqlStatements.push('COMMIT;');
  
  // Write output
  const output = sqlStatements.join('\n');
  
  if (outputFile) {
    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`✅ Written to ${outputFile}`);
  } else {
    console.log('\n' + output);
  }
  
  return output;
}

// CLI interface - check if this is the main module
const isMainModule = process.argv[1] && 
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node convert-mysql-to-postgres.mjs <input-json-file> [output-sql-file] [options]

Options:
  --preserve-ids    Preserve original IDs (useful for maintaining foreign key relationships)
  --user-id-map     JSON file mapping old user IDs to new user IDs

Examples:
  node convert-mysql-to-postgres.mjs users.json users.sql
  node convert-mysql-to-postgres.mjs recommenders.json collaborators.sql
  node convert-mysql-to-postgres.mjs applications.json applications.sql --preserve-ids
    `);
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  const options = {
    preserveIds: args.includes('--preserve-ids'),
  };
  
  // Load user ID map if provided
  const userIdMapIndex = args.indexOf('--user-id-map');
  if (userIdMapIndex !== -1 && args[userIdMapIndex + 1]) {
    const mapFile = args[userIdMapIndex + 1];
    options.userIdMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    console.log(`📋 Loaded user ID mapping from ${mapFile}`);
  }
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }
  
  try {
    convertFile(inputFile, outputFile, options);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

export { convertFile, convertRow, convertRecommenderToCollaborator };

