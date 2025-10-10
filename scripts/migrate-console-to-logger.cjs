/**
 * Console to Logger Migration Script
 * 
 * Automates replacement of console.* statements with structured logger calls.
 * Handles ~80% of common patterns, leaving complex cases for manual review.
 * 
 * Usage:
 *   node scripts/migrate-console-to-logger.js <file-path> [--dry-run]
 */

const fs = require('fs');
const path = require('path');

function migrateConsoleToLogger(content, filename) {
  const changes = [];
  let modifiedContent = content;

  // Pattern 1: console.error("Message:", error) → logger.error("Message", error)
  modifiedContent = modifiedContent.replace(
    /console\.error\(["']([^"']+):",\s*error\);?/g,
    (match, message, offset) => {
      changes.push({ line: getLineNumber(content, offset), pattern: 'error with error object', original: match });
      return `logger.error("${message}", error);`;
    }
  );

  // Pattern 2: console.error("Message", error) → logger.error("Message", error)
  modifiedContent = modifiedContent.replace(
    /console\.error\(["']([^"']+)["'],\s*error\);?/g,
    (match, message, offset) => {
      changes.push({ line: getLineNumber(content, offset), pattern: 'error simple', original: match });
      return `logger.error("${message}", error);`;
    }
  );

  // Pattern 3: console.error("Message") → logger.error("Message")
  modifiedContent = modifiedContent.replace(
    /console\.error\(["']([^"']+)["']\);?/g,
    (match, message, offset) => {
      changes.push({ line: getLineNumber(content, offset), pattern: 'error message only', original: match });
      return `logger.error("${message}");`;
    }
  );

  // Pattern 4: console.log("Message") → logger.info("Message")
  modifiedContent = modifiedContent.replace(
    /console\.log\(["']([^"']+)["']\);?/g,
    (match, message, offset) => {
      changes.push({ line: getLineNumber(content, offset), pattern: 'log message', original: match });
      return `logger.info("${message}");`;
    }
  );

  // Pattern 5: console.warn("Message") → logger.warn("Message")
  modifiedContent = modifiedContent.replace(
    /console\.warn\(["']([^"']+)["']\);?/g,
    (match, message, offset) => {
      changes.push({ line: getLineNumber(content, offset), pattern: 'warn message', original: match });
      return `logger.warn("${message}");`;
    }
  );

  // Pattern 6: console.log with template literals (simple case)
  modifiedContent = modifiedContent.replace(
    /console\.log\(`([^`]+)`\);?/g,
    (match, message, offset) => {
      // Skip if template has complex expressions
      if (message.includes('${') && message.split('${').length > 3) {
        return match; // Leave for manual review
      }
      changes.push({ line: getLineNumber(content, offset), pattern: 'log template', original: match });
      return `logger.info(\`${message}\`);`;
    }
  );

  // Check if logger import is present
  const hasLoggerImport = content.includes('import { logger }') || content.includes('import logger from');
  
  if (changes.length > 0 && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
      modifiedContent = content.slice(0, lastImportIndex) + 
        "\nimport { logger } from './logger';" + 
        content.slice(lastImportIndex);
      // Re-run replacements on the new content
      const result = migrateConsoleToLogger(modifiedContent, filename);
      modifiedContent = result.modifiedContent;
    }
  }

  return { modifiedContent, changes };
}

function getLineNumber(content, offset) {
  return content.substring(0, offset).split('\n').length;
}

function printSummary(changes, filename) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration Summary for: ${filename}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total replacements: ${changes.length}\n`);
  
  const byPattern = changes.reduce((acc, change) => {
    acc[change.pattern] = (acc[change.pattern] || 0) + 1;
    return acc;
  }, {});

  console.log('Replacements by pattern:');
  Object.entries(byPattern).forEach(([pattern, count]) => {
    console.log(`  - ${pattern}: ${count}`);
  });

  console.log('\nFirst 10 changes:');
  changes.slice(0, 10).forEach(change => {
    console.log(`  Line ${change.line}: ${change.original}`);
  });

  if (changes.length > 10) {
    console.log(`  ... and ${changes.length - 10} more`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const dryRun = args.includes('--dry-run');

  if (!filePath) {
    console.error('Usage: node migrate-console-to-logger.js <file-path> [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const { modifiedContent, changes } = migrateConsoleToLogger(content, path.basename(filePath));

  printSummary(changes, filePath);

  if (changes.length === 0) {
    console.log('\nNo console statements found to migrate.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes written to file.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    // Create backup
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`\nBackup created: ${backupPath}`);

    // Write changes
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(`Changes written to: ${filePath}`);
    console.log('\nIMPORTANT: Review the changes and run tests before committing!');
  }
}

main();
