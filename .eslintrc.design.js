/**
 * DESIGN SYSTEM ESLINT RULES
 * Enforces design token usage and prevents hardcoded values
 */

module.exports = {
  extends: ['./.eslintrc.js'],
  plugins: ['no-hardcoded-values'],
  rules: {
    // Detect hardcoded hex colors
    'no-hardcoded-colors': 'error',
    
    // Detect hardcoded pixel values (with exceptions)
    'no-magic-numbers': ['error', { 
      ignore: [0, 1, -1, 2], // Allow common values
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      detectObjects: false,
      enforceConst: false
    }],
    
    // Require design token imports in styled components
    'require-design-tokens': 'error',
    
    // Prevent inline styles without tokens
    'react/forbid-dom-props': ['error', {
      forbid: [
        {
          propName: 'style',
          message: 'Use styled-components with design tokens instead of inline styles'
        }
      ]
    }],
    
    // Prevent hardcoded CSS-in-JS values
    'styled-components-varname/no-hardcoded-values': 'error',
    
    // Custom rules for design system compliance
    '@typescript-eslint/naming-convention': [
      'error',
      // Ensure CSS custom properties follow design token naming
      {
        selector: 'variable',
        filter: '^--',
        format: ['kebab-case'],
        prefix: ['color-', 'spacing-', 'font-', 'shadow-', 'border-', 'z-', 'duration-']
      }
    ]
  },
  
  // Custom rule definitions
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // Custom rule: Detect hardcoded colors
        'no-hardcoded-colors': {
          create: function(context) {
            return {
              Literal(node) {
                if (typeof node.value === 'string') {
                  // Detect hex colors
                  if (/^#[0-9a-fA-F]{3,6}$/.test(node.value)) {
                    context.report({
                      node,
                      message: `Hardcoded color "${node.value}" detected. Use designSystem.colors.* instead.`,
                      fix: function(fixer) {
                        // Suggest common color replacements
                        const colorSuggestions = {
                          '#7A51E1': 'designSystem.colors.primary[500]',
                          '#E3C76F': 'designSystem.colors.secondary[500]',
                          '#FFFFFF': 'designSystem.colors.background.light',
                          '#000000': 'designSystem.colors.neutral.light.foreground',
                          '#121212': 'designSystem.colors.background.dark'
                        };
                        
                        const suggestion = colorSuggestions[node.value.toUpperCase()];
                        if (suggestion) {
                          return fixer.replaceText(node, suggestion);
                        }
                        return null;
                      }
                    });
                  }
                  
                  // Detect rgb/rgba colors
                  if (/^rgba?\([^)]+\)$/.test(node.value)) {
                    context.report({
                      node,
                      message: `Hardcoded RGB color "${node.value}" detected. Use designSystem.colors.* with opacity tokens instead.`
                    });
                  }
                }
              },
              
              TemplateLiteral(node) {
                // Check template literals in styled-components
                node.quasis.forEach(quasi => {
                  const text = quasi.value.raw;
                  
                  // Detect hex colors in CSS
                  const hexMatches = text.match(/#[0-9a-fA-F]{3,6}/g);
                  if (hexMatches) {
                    context.report({
                      node,
                      message: `Hardcoded color(s) in styled-component: ${hexMatches.join(', ')}. Use design tokens instead.`
                    });
                  }
                  
                  // Detect pixel values (excluding common exceptions)
                  const pxMatches = text.match(/(?:[2-9]|[1-9]\d+)px/g);
                  if (pxMatches) {
                    // Skip if it's a border or outline
                    if (!text.includes('border:') && !text.includes('outline:')) {
                      context.report({
                        node,
                        message: `Hardcoded spacing values: ${pxMatches.join(', ')}. Use designSystem.spacing.* instead.`
                      });
                    }
                  }
                });
              }
            };
          }
        },
        
        // Custom rule: Require design token imports
        'require-design-tokens': {
          create: function(context) {
            let hasStyledComponents = false;
            let hasDesignTokenImport = false;
            let hasHardcodedValues = false;
            
            return {
              ImportDeclaration(node) {
                if (node.source.value.includes('styled-components')) {
                  hasStyledComponents = true;
                }
                if (node.source.value.includes('design-system/tokens')) {
                  hasDesignTokenImport = true;
                }
              },
              
              TaggedTemplateExpression(node) {
                if (node.tag.name === 'styled' || 
                    (node.tag.type === 'MemberExpression' && node.tag.object.name === 'styled')) {
                  hasStyledComponents = true;
                  
                  // Check for hardcoded values in styled-components
                  const templateLiteral = node.quasi;
                  templateLiteral.quasis.forEach(quasi => {
                    const text = quasi.value.raw;
                    if (text.match(/#[0-9a-fA-F]{3,6}|(?:[2-9]|[1-9]\d+)px|rgba?\([^)]+\)/)) {
                      hasHardcodedValues = true;
                    }
                  });
                }
              },
              
              'Program:exit'() {
                if (hasStyledComponents && !hasDesignTokenImport && hasHardcodedValues) {
                  context.report({
                    message: 'File uses styled-components with hardcoded values but does not import design tokens. Add: import { designSystem } from "@/design-system/tokens";',
                    loc: { line: 1, column: 0 }
                  });
                }
              }
            };
          }
        }
      }
    }
  ],
  
  settings: {
    // Design system specific settings
    'design-system': {
      tokenPath: './client/src/design-system/tokens.ts',
      enforcementLevel: 'error',
      allowedHardcodedValues: ['0', '1px', '2px'], // Minimal exceptions
      requiredImportPattern: 'designSystem'
    }
  }
};