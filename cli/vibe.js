#!/usr/bin/env node

// Manito CLI Vibe Command - Quick codebase health check
// This is a standalone entry point for the 'vibe' command

import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import fetch from 'node-fetch';

async function detectServerPort() {
    const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
    
    for (const port of commonPorts) {
        try {
            const response = await fetch(`http://localhost:${port}/api/health`, { timeout: 2000 });
            if (response.ok) {
                const data = await response.json();
                if (data.message && data.message.includes('Manito')) {
                    return port;
                }
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

async function runVibeCheck(checkPath = '.') {
    const spinner = ora('Checking codebase vibe...').start();
    
    try {
        // Detect server port
        const port = await detectServerPort();
        if (!port) {
            spinner.fail('Could not detect ManitoDebug server. Make sure it\'s running with: npm run start:fullstack');
            process.exit(1);
        }
        
        spinner.text = 'Scanning codebase...';
        
        // Make API call to scan the directory
        const response = await fetch(`http://localhost:${port}/api/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: checkPath,
                options: {
                    patterns: ['**/*.{js,jsx,ts,tsx}'],
                    excludePatterns: ['node_modules/**', 'dist/**', 'build/**']
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Scan failed');
        }
        
        spinner.succeed('Vibe check complete!');
        
        const vibeScore = calculateVibeScore(result.data);
        displayVibeResults(result.data, vibeScore);
        
    } catch (error) {
        spinner.fail(`Vibe check failed: ${error.message}`);
        process.exit(1);
    }
}

function calculateVibeScore(results) {
    let score = 100;
    
    // Penalize for conflicts
    score -= results.conflicts.length * 10;
    
    // Penalize for high complexity files
    const highComplexityFiles = results.files.filter(f => f.complexity > 10).length;
    score -= highComplexityFiles * 5;
    
    // Penalize for very large files
    const largeFiles = results.files.filter(f => f.lines > 500).length;
    score -= largeFiles * 3;
    
    return Math.max(0, Math.min(100, score));
}

function displayVibeResults(results, score) {
    let emoji, color, message;
    
    if (score >= 90) {
        emoji = '🎉';
        color = 'green';
        message = 'Excellent! Your code is in great shape.';
    } else if (score >= 70) {
        emoji = '😊';
        color = 'yellow';
        message = 'Good vibes! Minor improvements possible.';
    } else if (score >= 50) {
        emoji = '😐';
        color = 'orange';
        message = 'Okay vibes. Some issues need attention.';
    } else {
        emoji = '😰';
        color = 'red';
        message = 'Rough vibes. Significant issues detected.';
    }
    
    console.log('\n' + boxen(
        chalk.bold[color](`${emoji} Vibe Score: ${score}/100`) + '\n' +
        chalk[color](message),
        {
            padding: 1,
            borderColor: color,
            borderStyle: 'round'
        }
    ));
    
    console.log(chalk.cyan('📊 Quick Stats:'));
    console.log(`  Files: ${results.files.length}`);
    console.log(`  Lines: ${results.metrics.linesOfCode.toLocaleString()}`);
    console.log(`  Conflicts: ${results.conflicts.length}`);
    
    if (results.conflicts.length > 0) {
        console.log('\n' + chalk.yellow('🔧 Issues found:'));
        results.conflicts.slice(0, 3).forEach(conflict => {
            console.log(`  • ${conflict.message}`);
        });
        
        if (results.conflicts.length > 3) {
            console.log(chalk.gray(`  ... and ${results.conflicts.length - 3} more`));
        }
    }
    
    console.log('\n' + chalk.blue('💡 Tip: Run "manito scan" for detailed analysis'));
}

// Run the vibe check
if (process.argv[1].endsWith('vibe.js')) {
    const path = process.argv[2] || '.';
    runVibeCheck(path);
}

export { runVibeCheck, calculateVibeScore, displayVibeResults };
