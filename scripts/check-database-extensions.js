#!/usr/bin/env node

/**
 * Database Extension Checker
 * Verifies required PostgreSQL extensions for CKG functionality
 */

import pg from 'pg';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class DatabaseExtensionChecker {
  constructor() {
    this.requiredExtensions = [
      {
        name: 'vector',
        description: 'pgvector - Vector similarity search',
        required: true,
        installInstructions: {
          macos: 'brew install pgvector',
          ubuntu: 'sudo apt-get install postgresql-14-pgvector',
          docker: 'Use ankane/pgvector Docker image',
          source: 'git clone https://github.com/pgvector/pgvector.git && make && make install'
        }
      },
      {
        name: 'pg_trgm',
        description: 'Trigram matching for fuzzy search',
        required: false,
        installInstructions: {
          note: 'Usually included with PostgreSQL contrib package'
        }
      },
      {
        name: 'btree_gin',
        description: 'GIN indexes for better performance',
        required: false,
        installInstructions: {
          note: 'Usually included with PostgreSQL contrib package'
        }
      }
    ];

    this.connectionConfig = {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/manito_dev',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  async checkExtensions() {
    logger.info('🔍 Checking database extensions for CKG functionality...');
    
    let client;
    try {
      client = new pg.Client(this.connectionConfig);
      await client.connect();
      
      logger.info('✅ Database connection established');
      
      const results = {
        available: [],
        installed: [],
        missing: [],
        errors: []
      };

      // Check each required extension
      for (const extension of this.requiredExtensions) {
        try {
          const availableResult = await this.checkExtensionAvailable(client, extension.name);
          const installedResult = await this.checkExtensionInstalled(client, extension.name);
          
          if (availableResult) {
            results.available.push(extension);
            
            if (installedResult) {
              results.installed.push(extension);
              logger.info(`✅ ${extension.name} - Available and installed`);
            } else {
              // Try to install the extension
              try {
                await client.query(`CREATE EXTENSION IF NOT EXISTS ${extension.name}`);
                results.installed.push(extension);
                logger.info(`✅ ${extension.name} - Installed successfully`);
              } catch (installError) {
                logger.warn(`⚠️ ${extension.name} - Available but failed to install: ${installError.message}`);
                results.missing.push({ ...extension, error: installError.message });
              }
            }
          } else {
            results.missing.push(extension);
            if (extension.required) {
              logger.error(`❌ ${extension.name} - Not available (REQUIRED)`);
            } else {
              logger.warn(`⚠️ ${extension.name} - Not available (optional)`);
            }
          }
        } catch (error) {
          results.errors.push({ extension: extension.name, error: error.message });
          logger.error(`❌ Error checking ${extension.name}: ${error.message}`);
        }
      }

      // Generate report
      await this.generateReport(results);
      
      // Check if critical extensions are missing
      const missingRequired = results.missing.filter(ext => ext.required);
      if (missingRequired.length > 0) {
        logger.error('🚨 Critical extensions missing - CKG will run in degraded mode');
        this.printInstallInstructions(missingRequired);
        return false;
      } else {
        logger.info('🎉 All required extensions available - CKG fully functional');
        return true;
      }

    } catch (error) {
      logger.error('❌ Database connection failed:', error.message);
      logger.info('🔧 CKG will run in offline mode without database features');
      return false;
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  async checkExtensionAvailable(client, extensionName) {
    try {
      const result = await client.query(
        'SELECT * FROM pg_available_extensions WHERE name = $1',
        [extensionName]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  async checkExtensionInstalled(client, extensionName) {
    try {
      const result = await client.query(
        'SELECT * FROM pg_extension WHERE extname = $1',
        [extensionName]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  printInstallInstructions(missingExtensions) {
    logger.info('\n📋 Installation Instructions:');
    
    for (const extension of missingExtensions) {
      logger.info(`\n🔧 ${extension.name} (${extension.description}):`);
      
      Object.entries(extension.installInstructions).forEach(([platform, instruction]) => {
        logger.info(`  ${platform}: ${instruction}`);
      });
    }
    
    logger.info('\n🔄 After installation, restart the database and run npm run dev again');
  }

  async generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        extensions: {
          available: results.available.length,
          installed: results.installed.length,
          missing: results.missing.length,
          errors: results.errors.length
        }
      },
      details: results
    };

    // Save report
    const fs = await import('fs/promises');
    await fs.writeFile(
      'docs/database-extension-report.json',
      JSON.stringify(report, null, 2)
    );

    logger.info(`📄 Extension report saved to docs/database-extension-report.json`);
  }

  async checkDatabaseHealth() {
    logger.info('🏥 Checking overall database health...');
    
    let client;
    try {
      client = new pg.Client(this.connectionConfig);
      await client.connect();

      // Check basic functionality
      const version = await client.query('SELECT version()');
      logger.info(`📊 PostgreSQL Version: ${version.rows[0].version.split(' ')[1]}`);

      // Check schema
      const schemas = await client.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'manito_dev'"
      );
      
      if (schemas.rows.length === 0) {
        logger.warn('⚠️ manito_dev schema not found - run migrations first');
      } else {
        logger.info('✅ manito_dev schema exists');
      }

      // Check tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'manito_dev'
      `);
      
      logger.info(`📋 Found ${tables.rows.length} tables in manito_dev schema`);

      // Check CKG tables specifically
      const ckgTables = ['graph_nodes', 'graph_edges', 'code_chunks', 'embeddings'];
      const existingCkgTables = tables.rows
        .map(row => row.table_name)
        .filter(name => ckgTables.includes(name));

      if (existingCkgTables.length === ckgTables.length) {
        logger.info('✅ All CKG tables exist');
      } else {
        logger.warn(`⚠️ Missing CKG tables: ${ckgTables.filter(t => !existingCkgTables.includes(t)).join(', ')}`);
      }

      return true;
    } catch (error) {
      logger.error('❌ Database health check failed:', error.message);
      return false;
    } finally {
      if (client) {
        await client.end();
      }
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new DatabaseExtensionChecker();
  
  const runChecks = async () => {
    logger.info('🚀 Starting database extension and health checks...\n');
    
    const healthOk = await checker.checkDatabaseHealth();
    const extensionsOk = await checker.checkExtensions();
    
    if (healthOk && extensionsOk) {
      logger.info('\n🎉 Database is fully ready for CKG functionality!');
      process.exit(0);
    } else if (healthOk) {
      logger.info('\n⚠️ Database connected but extensions missing - CKG will run in degraded mode');
      process.exit(0);
    } else {
      logger.error('\n❌ Database issues detected - please check configuration');
      process.exit(1);
    }
  };

  runChecks().catch(error => {
    logger.error('💥 Extension check failed:', error);
    process.exit(1);
  });
}

export default DatabaseExtensionChecker;
