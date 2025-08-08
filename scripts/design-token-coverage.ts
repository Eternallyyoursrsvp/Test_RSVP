#!/usr/bin/env tsx

/**
 * DESIGN TOKEN COVERAGE ANALYZER
 * Analyzes codebase for design token adoption and identifies hardcoded values
 */

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface CoverageReport {
  totalFiles: number;
  filesWithTokens: number;
  filesWithHardcodedValues: number;
  hardcodedValues: HardcodedValue[];
  tokenCoverage: number;
  complianceScore: number;
}

interface HardcodedValue {
  file: string;
  line: number;
  value: string;
  type: 'color' | 'spacing' | 'shadow' | 'font-size' | 'other';
  suggestion?: string;
}

class DesignTokenAnalyzer {
  private readonly projectRoot: string;
  private readonly sourceDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.sourceDir = path.join(this.projectRoot, 'client/src');
  }

  async analyzeTokenCoverage(): Promise<CoverageReport> {
    console.log(chalk.blue('🔍 Analyzing design token coverage...\n'));

    const files = await glob('client/src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', '**/dist/**']
    });

    let totalFiles = 0;
    let filesWithTokens = 0;
    let filesWithHardcodedValues = 0;
    const hardcodedValues: HardcodedValue[] = [];

    for (const file of files) {
      totalFiles++;
      
      const analysis = await this.analyzeFile(file);
      
      if (analysis.hasTokenImport) {
        filesWithTokens++;
      }
      
      if (analysis.hardcodedValues.length > 0) {
        filesWithHardcodedValues++;
        hardcodedValues.push(...analysis.hardcodedValues);
      }
    }

    const tokenCoverage = Math.round((filesWithTokens / totalFiles) * 100);
    const violationRate = Math.round((filesWithHardcodedValues / totalFiles) * 100);
    const complianceScore = Math.max(0, 100 - violationRate - (100 - tokenCoverage) * 0.5);

    return {
      totalFiles,
      filesWithTokens,
      filesWithHardcodedValues,
      hardcodedValues,
      tokenCoverage,
      complianceScore
    };
  }

  private async analyzeFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const hasTokenImport = content.includes('design-system/tokens') || 
                          content.includes('@/design-system/tokens') ||
                          content.includes('../design-system/tokens');
    
    const hardcodedValues: HardcodedValue[] = [];

    lines.forEach((line, index) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('import')) {
        return;
      }

      // Check for hardcoded colors
      const hexColors = line.match(/#[0-9a-fA-F]{3,6}/g);
      if (hexColors) {
        hexColors.forEach(color => {
          hardcodedValues.push({
            file: filePath,
            line: index + 1,
            value: color,
            type: 'color',
            suggestion: `Use designSystem.colors.* instead of ${color}`
          });
        });
      }

      // Check for RGB/RGBA colors
      const rgbColors = line.match(/rgba?\([^)]+\)/g);
      if (rgbColors) {
        rgbColors.forEach(color => {
          hardcodedValues.push({
            file: filePath,
            line: index + 1,
            value: color,
            type: 'color',
            suggestion: `Use designSystem.colors.* or opacity tokens instead of ${color}`
          });
        });
      }

      // Check for hardcoded pixel values (excluding 0px, 1px, and common exceptions)
      const pixelValues = line.match(/(?<!\w)(?:[2-9]|[1-9]\d+)px(?!\w)/g);
      if (pixelValues) {
        pixelValues.forEach(px => {
          // Skip common legitimate uses
          if (line.includes('border:') && px === '1px') return;
          if (line.includes('outline:') && px === '2px') return;
          
          hardcodedValues.push({
            file: filePath,
            line: index + 1,
            value: px,
            type: 'spacing',
            suggestion: `Use designSystem.spacing.* or extendedSpacing.* instead of ${px}`
          });
        });
      }

      // Check for hardcoded box-shadow values
      const boxShadows = line.match(/box-shadow:\s*[^;]+(?<!var\([^)]*\))/g);
      if (boxShadows) {
        boxShadows.forEach(shadow => {
          if (!shadow.includes('var(') && !shadow.includes('designSystem')) {
            hardcodedValues.push({
              file: filePath,
              line: index + 1,
              value: shadow.trim(),
              type: 'shadow',
              suggestion: `Use designSystem.shadows.* instead of hardcoded shadow`
            });
          }
        });
      }

      // Check for hardcoded font sizes
      const fontSizes = line.match(/font-size:\s*(?:[0-9.]+(?:px|em|rem)|small|medium|large|x-large)/g);
      if (fontSizes) {
        fontSizes.forEach(size => {
          if (!size.includes('var(') && !size.includes('designSystem')) {
            hardcodedValues.push({
              file: filePath,
              line: index + 1,
              value: size.trim(),
              type: 'font-size',
              suggestion: `Use designSystem.typography.fontSize.* instead of ${size}`
            });
          }
        });
      }
    });

    return {
      hasTokenImport,
      hardcodedValues
    };
  }

  generateReport(report: CoverageReport): void {
    console.log(chalk.blue('📊 DESIGN TOKEN COVERAGE REPORT'));
    console.log('='.repeat(50));
    console.log(`📁 Files analyzed: ${report.totalFiles}`);
    console.log(`🎨 Files using design tokens: ${report.filesWithTokens} (${report.tokenCoverage}%)`);
    console.log(`⚠️  Files with hardcoded values: ${report.filesWithHardcodedValues}`);
    console.log(`🎯 Overall compliance score: ${Math.round(report.complianceScore)}%`);
    console.log();

    if (report.hardcodedValues.length > 0) {
      console.log(chalk.red('🚨 HARDCODED VALUES DETECTED:'));
      console.log('='.repeat(30));

      const groupedByFile = report.hardcodedValues.reduce((acc, item) => {
        if (!acc[item.file]) acc[item.file] = [];
        acc[item.file].push(item);
        return acc;
      }, {} as Record<string, HardcodedValue[]>);

      Object.entries(groupedByFile).forEach(([file, values]) => {
        console.log(chalk.yellow(`\n📄 ${file}:`));
        values.forEach(item => {
          const typeIcon = this.getTypeIcon(item.type);
          console.log(`  ${typeIcon} Line ${item.line}: ${chalk.red(item.value)}`);
          if (item.suggestion) {
            console.log(`    💡 ${chalk.gray(item.suggestion)}`);
          }
        });
      });
      console.log();
    }

    // Success criteria
    const isCompliant = report.complianceScore >= 95;
    const hasNoHardcodedValues = report.hardcodedValues.length === 0;
    const hasGoodCoverage = report.tokenCoverage >= 90;

    if (isCompliant && hasNoHardcodedValues && hasGoodCoverage) {
      console.log(chalk.green('✅ DESIGN SYSTEM COMPLIANCE: EXCELLENT'));
      console.log(chalk.green('   All quality gates passed!'));
    } else if (report.complianceScore >= 80) {
      console.log(chalk.yellow('⚠️  DESIGN SYSTEM COMPLIANCE: NEEDS IMPROVEMENT'));
      console.log(chalk.yellow(`   Target: 95% compliance, Current: ${Math.round(report.complianceScore)}%`));
    } else {
      console.log(chalk.red('❌ DESIGN SYSTEM COMPLIANCE: CRITICAL'));
      console.log(chalk.red('   Immediate action required!'));
    }

    console.log('\n' + '='.repeat(50));
    console.log(chalk.blue('📈 IMPROVEMENT RECOMMENDATIONS:'));
    
    if (report.tokenCoverage < 95) {
      console.log(`🎯 Increase design token adoption to 95%+ (currently ${report.tokenCoverage}%)`);
    }
    
    if (report.hardcodedValues.length > 0) {
      console.log(`🔧 Fix ${report.hardcodedValues.length} hardcoded value(s)`);
    }
    
    if (report.complianceScore < 95) {
      console.log(`📊 Achieve 95%+ compliance score (currently ${Math.round(report.complianceScore)}%)`);
    }

    console.log();
  }

  private getTypeIcon(type: HardcodedValue['type']): string {
    switch (type) {
      case 'color': return '🎨';
      case 'spacing': return '📐';
      case 'shadow': return '🌑';
      case 'font-size': return '🔤';
      default: return '⚙️';
    }
  }

  async run(): Promise<void> {
    try {
      const report = await this.analyzeTokenCoverage();
      this.generateReport(report);

      // Exit with error if compliance is below threshold
      if (report.complianceScore < 95 || report.hardcodedValues.length > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Error analyzing design token coverage:'), error);
      process.exit(1);
    }
  }
}

// Run analyzer if called directly
if (require.main === module) {
  const analyzer = new DesignTokenAnalyzer();
  analyzer.run();
}

export default DesignTokenAnalyzer;