#!/usr/bin/env node

/**
 * Status Update Script for ManitoDebug README.md
 * 
 * This script automatically updates the "Last Updated" timestamp in the README.md
 * status section whenever changes are made to the project.
 * 
 * Usage:
 *   node scripts/update-status.js
 *   npm run update-status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to README.md
const readmePath = path.join(__dirname, '..', 'README.md');

/**
 * Update the "Last Updated" timestamp in README.md
 */
function updateStatusTimestamp() {
  try {
    // Read the current README.md
    const content = fs.readFileSync(readmePath, 'utf8');
    
    // Get current date in format: January 2025
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentDate = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    
    // Replace the "Last Updated" line
    const updatedContent = content.replace(
      /\*\*Last Updated\*\*: .+/,
      `**Last Updated**: ${currentDate}`
    );
    
    // Write back to file
    fs.writeFileSync(readmePath, updatedContent, 'utf8');
    
    console.log(`✅ Updated README.md status timestamp to: ${currentDate}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating README.md status:', error.message);
    return false;
  }
}

/**
 * Update feature completion percentages based on current state
 */
function updateCompletionPercentages() {
  // This could be enhanced to automatically calculate percentages
  // based on completed tasks in various .md files
  console.log('📊 Feature completion percentages are manually maintained');
  console.log('💡 Consider implementing automatic percentage calculation in the future');
}

/**
 * Validate that all linked documents exist
 */
function validateDocumentLinks() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const expectedDocs = [
    'STATUS.md',
    'ARCHITECTURE.md', 
    'CORE_FUNCTIONALITY_STATUS.md',
    'SITE_MAP_AND_USER_PAGES.md',
    'CODE_KNOWLEDGE_GRAPH_ROADMAP.md',
    'CKG_IMPLEMENTATION_PLAN.md',
    'FULL_STACK_IMPLEMENTATION_SUMMARY.md',
    'AI_POWERED_ANALYSIS_SYSTEM.md',
    'ENHANCED_DATABASE_INTEGRATION_STATUS.md',
    'DOCKER_DEPLOYMENT_SUMMARY.md',
    'DATABASE_SEMANTIC_SEARCH_AUDIT.md'
  ];
  
  const missingDocs = [];
  
  for (const doc of expectedDocs) {
    const docPath = path.join(docsDir, doc);
    if (!fs.existsSync(docPath)) {
      missingDocs.push(doc);
    }
  }
  
  if (missingDocs.length === 0) {
    console.log('✅ All documentation links validated');
  } else {
    console.log('⚠️  Missing documentation files:');
    missingDocs.forEach(doc => console.log(`   - ${doc}`));
  }
  
  return missingDocs.length === 0;
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Updating ManitoDebug status...\n');
  
  // Update timestamp
  const timestampUpdated = updateStatusTimestamp();
  
  // Update completion percentages
  updateCompletionPercentages();
  
  // Validate document links
  const linksValid = validateDocumentLinks();
  
  console.log('\n📋 Status Update Summary:');
  console.log(`   Timestamp Updated: ${timestampUpdated ? '✅' : '❌'}`);
  console.log(`   Links Validated: ${linksValid ? '✅' : '⚠️'}`);
  
  if (timestampUpdated && linksValid) {
    console.log('\n🎉 Status update completed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Status update completed with warnings');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateStatusTimestamp, updateCompletionPercentages, validateDocumentLinks };
