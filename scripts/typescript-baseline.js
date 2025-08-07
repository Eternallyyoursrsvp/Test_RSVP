#!/usr/bin/env node

/**
 * Progressive TypeScript Development Constitution
 * Baseline Error Tracking System
 * 
 * This script maintains the 802 error baseline established after our TypeScript cleanup
 * and prevents regression while allowing gradual improvement.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESTABLISHED BASELINE - 802 errors after our cleanup (down from 1,224)
const BASELINE_ERROR_COUNT = 802;
const BASELINE_FILE = path.join(__dirname, 'typescript-baseline.json');
const IMPROVEMENT_ACHIEVEMENT = 422; // Errors we fixed (1,224 - 802)

class TypeScriptBaselineManager {
  constructor() {
    this.baseline = this.loadBaseline();
  }

  /**
   * Load existing baseline or create new one
   */
  loadBaseline() {
    if (fs.existsSync(BASELINE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Corrupted baseline file, recreating...');
      }
    }
    
    return this.createInitialBaseline();
  }

  /**
   * Create the initial baseline from our current state
   */
  createInitialBaseline() {
    console.log('📋 Creating initial TypeScript baseline...');
    
    const baseline = {
      version: '1.0.0',
      created: new Date().toISOString(),
      establishedCount: BASELINE_ERROR_COUNT,
      improvementAchieved: IMPROVEMENT_ACHIEVEMENT,
      originalCount: BASELINE_ERROR_COUNT + IMPROVEMENT_ACHIEVEMENT,
      description: 'Baseline established after systematic TypeScript cleanup',
      constitution: 'Progressive TypeScript Development Constitution v1.0',
      errors: this.getCurrentErrors(),
      summary: {
        allowedErrorCount: BASELINE_ERROR_COUNT,
        regressionThreshold: BASELINE_ERROR_COUNT + 50, // Allow 50 error buffer
        improvementTarget: 100, // Target below 100 errors eventually
        currentPhase: 'Maintenance and Gradual Improvement'
      }
    };

    this.saveBaseline(baseline);
    return baseline;
  }

  /**
   * Get current TypeScript errors from compilation
   */
  getCurrentErrors() {
    try {
      console.log('🔍 Analyzing current TypeScript errors...');
      
      // Run TypeScript check and capture output
      const tscOutput = execSync('npm run check', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      return this.parseTypeScriptErrors(tscOutput);
    } catch (error) {
      // tsc exits with error code when there are TypeScript errors
      const output = error.stdout || error.stderr || '';
      return this.parseTypeScriptErrors(output);
    }
  }

  /**
   * Parse TypeScript compiler output to extract error information
   */
  parseTypeScriptErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match TypeScript error pattern: file(line,col): error TS####: message
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5],
          fullLine: line
        });
      }
    }
    
    return errors;
  }

  /**
   * Check current state against baseline
   */
  checkBaseline() {
    const current = this.getCurrentErrors();
    const currentCount = current.length;
    const baselineCount = this.baseline.establishedCount;
    
    console.log('\n🏛️  Progressive TypeScript Constitution - Baseline Check');
    console.log('=' .repeat(60));
    console.log(`📊 Baseline Errors (Allowed): ${baselineCount}`);
    console.log(`📊 Current Errors: ${currentCount}`);
    console.log(`📊 Achievement Preserved: ${IMPROVEMENT_ACHIEVEMENT} errors fixed`);
    
    const status = this.determineStatus(currentCount, baselineCount);
    this.displayStatus(status, currentCount, baselineCount);
    
    return status;
  }

  /**
   * Determine the current status relative to baseline
   */
  determineStatus(currentCount, baselineCount) {
    const regressionThreshold = this.baseline.summary.regressionThreshold;
    
    if (currentCount <= 100) {
      return 'EXCELLENCE'; // Target achieved!
    } else if (currentCount < baselineCount) {
      return 'IMPROVEMENT'; // We've improved beyond baseline
    } else if (currentCount <= baselineCount) {
      return 'COMPLIANT'; // Within baseline tolerance
    } else if (currentCount <= regressionThreshold) {
      return 'CAUTION'; // Slight regression but within buffer
    } else {
      return 'VIOLATION'; // Significant regression - block
    }
  }

  /**
   * Display status with appropriate formatting and recommendations
   */
  displayStatus(status, currentCount, baselineCount) {
    switch (status) {
      case 'EXCELLENCE':
        console.log('🎉 STATUS: EXCELLENCE ACHIEVED!');
        console.log('✨ Target of <100 errors reached!');
        console.log('🚀 Ready to graduate to stricter TypeScript settings');
        break;
        
      case 'IMPROVEMENT':
        console.log('📈 STATUS: IMPROVEMENT DETECTED');
        console.log(`✅ ${baselineCount - currentCount} fewer errors than baseline`);
        console.log('🎯 Continue the excellent progress!');
        break;
        
      case 'COMPLIANT':
        console.log('✅ STATUS: BASELINE COMPLIANT'); 
        console.log('📋 Current error count within established baseline');
        console.log('💡 Consider gradual improvements when modifying files');
        break;
        
      case 'CAUTION':
        console.log('⚠️  STATUS: CAUTION - SLIGHT REGRESSION');
        console.log(`📊 ${currentCount - baselineCount} more errors than baseline`);
        console.log('🔧 Consider reviewing recent changes');
        console.log('✅ Still within acceptable buffer zone');
        break;
        
      case 'VIOLATION':
        console.log('🚨 STATUS: BASELINE VIOLATION');
        console.log(`❌ ${currentCount - baselineCount} errors above baseline`);
        console.log('🛑 RECOMMENDED ACTION: Review and fix new errors before commit');
        console.log('📝 Progressive Constitution requires baseline maintenance');
        process.exit(1); // Block in CI/pre-commit
        break;
    }
  }

  /**
   * Compare errors to identify new vs existing
   */
  compareErrors() {
    const current = this.getCurrentErrors();
    const baseline = this.baseline.errors || [];
    
    const baselineSignatures = new Set(baseline.map(err => 
      `${err.file}:${err.line}:${err.code}`
    ));
    
    const newErrors = current.filter(err => 
      !baselineSignatures.has(`${err.file}:${err.line}:${err.code}`)
    );
    
    const fixedErrors = baseline.filter(err => {
      const signature = `${err.file}:${err.line}:${err.code}`;
      return !current.some(curr => 
        `${curr.file}:${curr.line}:${curr.code}` === signature
      );
    });
    
    if (newErrors.length > 0) {
      console.log('\n🆕 NEW ERRORS DETECTED:');
      console.log('=' .repeat(40));
      newErrors.forEach(err => {
        console.log(`❌ ${err.file}:${err.line} - ${err.code}: ${err.message}`);
      });
    }
    
    if (fixedErrors.length > 0) {
      console.log('\n✅ ERRORS FIXED:');
      console.log('=' .repeat(40));
      fixedErrors.forEach(err => {
        console.log(`✅ ${err.file}:${err.line} - ${err.code}: ${err.message}`);
      });
    }
    
    return { newErrors, fixedErrors };
  }

  /**
   * Update baseline (only when improvements are made)
   */
  updateBaseline() {
    const current = this.getCurrentErrors();
    const currentCount = current.length;
    
    if (currentCount < this.baseline.establishedCount) {
      console.log('📈 Updating baseline with improvement!');
      
      this.baseline.establishedCount = currentCount;
      this.baseline.errors = current;
      this.baseline.lastUpdated = new Date().toISOString();
      this.baseline.improvementHistory = this.baseline.improvementHistory || [];
      this.baseline.improvementHistory.push({
        date: new Date().toISOString(),
        previousCount: this.baseline.establishedCount,
        newCount: currentCount,
        improvement: this.baseline.establishedCount - currentCount
      });
      
      this.saveBaseline(this.baseline);
      console.log('✅ Baseline updated successfully!');
    } else {
      console.log('📋 No improvement detected, baseline unchanged');
    }
  }

  /**
   * Save baseline to file
   */
  saveBaseline(baseline) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    console.log(`💾 Baseline saved to ${BASELINE_FILE}`);
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const status = this.checkBaseline();
    const comparison = this.compareErrors();
    
    const report = {
      timestamp: new Date().toISOString(),
      constitution: 'Progressive TypeScript Development Constitution',
      version: this.baseline.version,
      status: status,
      metrics: {
        baseline: this.baseline.establishedCount,
        current: this.getCurrentErrors().length,
        improvement: IMPROVEMENT_ACHIEVEMENT,
        target: this.baseline.summary.improvementTarget
      },
      changes: {
        newErrors: comparison.newErrors.length,
        fixedErrors: comparison.fixedErrors.length
      },
      recommendations: this.getRecommendations(status)
    };
    
    // Save report
    const reportPath = path.join(__dirname, `typescript-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Detailed report saved to ${reportPath}`);
    return report;
  }

  /**
   * Get recommendations based on current status
   */
  getRecommendations(status) {
    const recommendations = [];
    
    switch (status) {
      case 'EXCELLENCE':
        recommendations.push('Consider enabling stricter TypeScript settings');
        recommendations.push('Graduate to full TypeScript strict mode');
        recommendations.push('Update development guidelines to prevent regression');
        break;
        
      case 'IMPROVEMENT':
        recommendations.push('Continue the excellent work!');
        recommendations.push('Update baseline to reflect improvements');
        recommendations.push('Share improvements with team');
        break;
        
      case 'COMPLIANT':
        recommendations.push('Focus on improving modified files');
        recommendations.push('Consider tackling remaining errors in batches');
        recommendations.push('Maintain current standards');
        break;
        
      case 'CAUTION':
        recommendations.push('Review recent changes for new TypeScript issues');
        recommendations.push('Consider fixing a few errors to return to baseline');
        recommendations.push('Monitor closely to prevent further regression');
        break;
        
      case 'VIOLATION':
        recommendations.push('URGENT: Fix new TypeScript errors before proceeding');
        recommendations.push('Review commit introducing new errors');
        recommendations.push('Consider reverting problematic changes');
        break;
    }
    
    return recommendations;
  }
}

// CLI Interface
if (process.argv[1] && process.argv[1].endsWith('typescript-baseline.js')) {
  const manager = new TypeScriptBaselineManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      manager.checkBaseline();
      break;
      
    case 'update':
      manager.updateBaseline();
      break;
      
    case 'compare':
      manager.compareErrors();
      break;
      
    case 'report':
      manager.generateReport();
      break;
      
    case 'init':
      manager.createInitialBaseline();
      break;
      
    default:
      console.log('🏛️  Progressive TypeScript Development Constitution');
      console.log('Usage: node typescript-baseline.js [command]');
      console.log('\nCommands:');
      console.log('  check    - Check current status against baseline');
      console.log('  update   - Update baseline (only when improved)'); 
      console.log('  compare  - Compare current errors vs baseline');
      console.log('  report   - Generate detailed report');
      console.log('  init     - Initialize baseline');
      console.log('\n📊 Current baseline: 802 errors (422 improvement from 1,224)');
      manager.checkBaseline();
  }
}

export default TypeScriptBaselineManager;