/**
 * Cookie Cleanup and Management Script
 * Run this in browser console to safely clean up oversized cookies
 */

class CookieManager {
    constructor() {
        this.essentialCookies = new Set([
            'connect.sid',         // Express session cookie
            '_csrf',               // CSRF protection
            'auth_token',          // Authentication token
            'session_id',          // Session identifier
            'remember_me'          // Remember me functionality
        ]);
        
        this.maxCookieSize = 4096; // 4KB limit per cookie
        this.totalSizeLimit = 50 * 1024; // 50KB total limit
    }

    /**
     * Get all cookies with detailed analysis
     */
    getAllCookies() {
        const cookies = document.cookie.split(';');
        const analysis = {
            cookies: [],
            totalSize: 0,
            oversized: [],
            duplicates: [],
            suspicious: [],
            essential: [],
            nonEssential: []
        };

        const seenNames = new Map();
        
        cookies.forEach(cookie => {
            if (!cookie.trim()) return;
            
            const [name, ...valueParts] = cookie.trim().split('=');
            const value = valueParts.join('=') || '';
            const size = cookie.length;
            
            const cookieInfo = {
                name: name.trim(),
                value,
                size,
                sizeKB: (size / 1024).toFixed(2),
                isEssential: this.essentialCookies.has(name.trim()),
                isOversized: size > this.maxCookieSize
            };

            // Track duplicates
            if (seenNames.has(cookieInfo.name)) {
                analysis.duplicates.push(cookieInfo);
            } else {
                seenNames.set(cookieInfo.name, true);
            }

            // Categorize cookies
            if (cookieInfo.isEssential) {
                analysis.essential.push(cookieInfo);
            } else {
                analysis.nonEssential.push(cookieInfo);
            }

            if (cookieInfo.isOversized) {
                analysis.oversized.push(cookieInfo);
            }

            // Flag suspicious cookies
            if (this.isSuspicious(cookieInfo)) {
                analysis.suspicious.push(cookieInfo);
            }

            analysis.cookies.push(cookieInfo);
            analysis.totalSize += size;
        });

        return analysis;
    }

    /**
     * Check if a cookie appears suspicious
     */
    isSuspicious(cookieInfo) {
        const suspiciousPatterns = [
            /legacy/i,
            /old/i,
            /temp/i,
            /backup/i,
            /\d{13}/, // Timestamp patterns
            /[A-Za-z0-9]{100,}/, // Very long random strings
        ];

        const suspiciousValues = [
            cookieInfo.value.length > 10000, // Very large values
            cookieInfo.name.includes('temp'),
            cookieInfo.name.includes('debug'),
            cookieInfo.name.includes('test')
        ];

        return suspiciousPatterns.some(pattern => pattern.test(cookieInfo.name) || pattern.test(cookieInfo.value)) ||
               suspiciousValues.some(Boolean);
    }

    /**
     * Safely remove a cookie
     */
    removeCookie(name) {
        // Remove cookie by setting it to expire in the past
        const expireDate = new Date(0);
        
        // Try different path combinations
        const paths = ['/', '/api', '/admin', '/guest'];
        const domains = [window.location.hostname, '.' + window.location.hostname, undefined];
        
        paths.forEach(path => {
            domains.forEach(domain => {
                let cookieString = `${name}=; expires=${expireDate.toUTCString()}; path=${path}`;
                if (domain) {
                    cookieString += `; domain=${domain}`;
                }
                document.cookie = cookieString;
            });
        });
    }

    /**
     * Clean up oversized cookies
     */
    cleanupOversizedCookies() {
        const analysis = this.getAllCookies();
        const removed = [];
        
        console.log('🧹 Starting cleanup of oversized cookies...');
        
        analysis.oversized.forEach(cookie => {
            if (!cookie.isEssential) {
                console.log(`🗑️ Removing oversized cookie: ${cookie.name} (${cookie.sizeKB} KB)`);
                this.removeCookie(cookie.name);
                removed.push(cookie);
            } else {
                console.warn(`⚠️ Keeping oversized essential cookie: ${cookie.name} (${cookie.sizeKB} KB)`);
            }
        });

        return removed;
    }

    /**
     * Clean up suspicious cookies
     */
    cleanupSuspiciousCookies() {
        const analysis = this.getAllCookies();
        const removed = [];
        
        console.log('🔍 Starting cleanup of suspicious cookies...');
        
        analysis.suspicious.forEach(cookie => {
            if (!cookie.isEssential) {
                console.log(`🗑️ Removing suspicious cookie: ${cookie.name}`);
                this.removeCookie(cookie.name);
                removed.push(cookie);
            }
        });

        return removed;
    }

    /**
     * Clean up duplicate cookies
     */
    cleanupDuplicateCookies() {
        const analysis = this.getAllCookies();
        const removed = [];
        
        console.log('🔄 Starting cleanup of duplicate cookies...');
        
        analysis.duplicates.forEach(cookie => {
            if (!cookie.isEssential) {
                console.log(`🗑️ Removing duplicate cookie: ${cookie.name}`);
                this.removeCookie(cookie.name);
                removed.push(cookie);
            }
        });

        return removed;
    }

    /**
     * Comprehensive cleanup
     */
    performFullCleanup() {
        console.log('🚀 Starting comprehensive cookie cleanup...');
        
        const beforeAnalysis = this.getAllCookies();
        console.log(`📊 Before cleanup: ${beforeAnalysis.cookies.length} cookies, ${(beforeAnalysis.totalSize / 1024).toFixed(2)} KB total`);
        
        const results = {
            oversized: this.cleanupOversizedCookies(),
            suspicious: this.cleanupSuspiciousCookies(),
            duplicates: this.cleanupDuplicateCookies()
        };

        // Wait a moment for cookie changes to take effect
        setTimeout(() => {
            const afterAnalysis = this.getAllCookies();
            console.log(`📊 After cleanup: ${afterAnalysis.cookies.length} cookies, ${(afterAnalysis.totalSize / 1024).toFixed(2)} KB total`);
            
            const saved = beforeAnalysis.totalSize - afterAnalysis.totalSize;
            console.log(`💾 Space saved: ${(saved / 1024).toFixed(2)} KB`);
            
            if (afterAnalysis.totalSize > this.totalSizeLimit) {
                console.warn('⚠️ Cookie storage still exceeds recommended limits');
                this.suggestAlternatives();
            } else {
                console.log('✅ Cookie storage now within recommended limits');
            }
        }, 1000);

        return results;
    }

    /**
     * Suggest alternative storage methods
     */
    suggestAlternatives() {
        console.log('💡 Consider these alternatives for large data:');
        console.log('  • localStorage: For client-side data that persists');
        console.log('  • sessionStorage: For temporary session data');
        console.log('  • IndexedDB: For large amounts of structured data');
        console.log('  • Server-side sessions: Store data on the server');
    }

    /**
     * Set cookie size limits
     */
    enforceSize Limits() {
        // Override document.cookie setter to enforce size limits
        const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                        Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
        
        if (originalCookieDescriptor) {
            Object.defineProperty(document, 'cookie', {
                get: originalCookieDescriptor.get,
                set: (value) => {
                    if (value.length > this.maxCookieSize) {
                        console.warn(`🚫 Blocked cookie that exceeds size limit: ${value.length} bytes`);
                        console.warn(`🚫 Cookie name: ${value.split('=')[0]}`);
                        return;
                    }
                    
                    // Check total size after setting
                    const futureSize = this.getAllCookies().totalSize + value.length;
                    if (futureSize > this.totalSizeLimit) {
                        console.warn(`🚫 Blocked cookie that would exceed total size limit`);
                        return;
                    }
                    
                    originalCookieDescriptor.set.call(this, value);
                },
                configurable: true
            });
            
            console.log('🛡️ Cookie size limits enforced');
        }
    }
}

// Create global instance
window.cookieManager = new CookieManager();

// Convenience functions
window.cleanupCookies = () => window.cookieManager.performFullCleanup();
window.analyzeCookies = () => {
    const analysis = window.cookieManager.getAllCookies();
    console.table(analysis.cookies.map(c => ({
        name: c.name,
        size: c.sizeKB + ' KB',
        essential: c.isEssential ? '✅' : '❌',
        oversized: c.isOversized ? '🚨' : '✅'
    })));
    return analysis;
};
window.enforceCookieLimits = () => window.cookieManager.enforceSizeLimits();

console.log('🍪 Cookie management tools loaded!');
console.log('📝 Available commands:');
console.log('  • cleanupCookies() - Perform full cleanup');
console.log('  • analyzeCookies() - Analyze current cookies');
console.log('  • enforceCookieLimits() - Enforce size limits');
console.log('  • cookieManager.methodName() - Access all methods');