/**
 * Comprehensive Cookie Cleanup Execution Script
 * Orchestrates the complete cookie cleanup process
 */

class CookieCleanupOrchestrator {
    constructor() {
        this.results = {
            startTime: Date.now(),
            before: null,
            after: null,
            actions: [],
            errors: [],
            summary: null
        };
    }

    /**
     * Execute comprehensive cleanup plan
     */
    async executeCleanup() {
        console.log('🚀 Starting comprehensive cookie cleanup...');
        this.results.startTime = Date.now();

        try {
            // Step 1: Initial analysis
            await this.step1_InitialAnalysis();
            
            // Step 2: Safety backup
            await this.step2_SafetyBackup();
            
            // Step 3: Remove oversized cookies
            await this.step3_RemoveOversized();
            
            // Step 4: Remove suspicious cookies  
            await this.step4_RemoveSuspicious();
            
            // Step 5: Remove duplicates
            await this.step5_RemoveDuplicates();
            
            // Step 6: Enforce size limits
            await this.step6_EnforceLimits();
            
            // Step 7: Final analysis
            await this.step7_FinalAnalysis();
            
            // Step 8: Generate report
            await this.step8_GenerateReport();
            
            console.log('✅ Cookie cleanup completed successfully!');
            return this.results;
            
        } catch (error) {
            console.error('❌ Cookie cleanup failed:', error);
            this.results.errors.push({
                step: 'execution',
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async step1_InitialAnalysis() {
        console.log('📊 Step 1: Initial cookie analysis...');
        
        if (typeof window.cookieAnalysis === 'function') {
            this.results.before = window.cookieAnalysis();
        } else {
            this.results.before = this.basicAnalysis();
        }
        
        this.results.actions.push({
            step: 1,
            action: 'Initial analysis completed',
            details: {
                totalCookies: this.results.before.totalCookies,
                totalSizeMB: this.results.before.summary?.totalSizeMB || 'unknown'
            }
        });
    }

    async step2_SafetyBackup() {
        console.log('💾 Step 2: Creating safety backup...');
        
        const backup = {
            timestamp: new Date().toISOString(),
            cookies: document.cookie,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        try {
            localStorage.setItem('cookie_backup_' + Date.now(), JSON.stringify(backup));
            this.results.actions.push({
                step: 2,
                action: 'Safety backup created in localStorage'
            });
        } catch (error) {
            console.warn('⚠️ Could not create localStorage backup:', error.message);
            this.results.actions.push({
                step: 2,
                action: 'Safety backup failed',
                error: error.message
            });
        }
    }

    async step3_RemoveOversized() {
        console.log('🗑️ Step 3: Removing oversized cookies...');
        
        const oversizedRemoved = [];
        if (typeof window.cookieManager === 'object') {
            const removed = window.cookieManager.cleanupOversizedCookies();
            oversizedRemoved.push(...removed);
        } else {
            // Fallback cleanup
            const cookies = this.parseCookies();
            cookies.forEach(cookie => {
                if (cookie.size > 4096 && !this.isEssentialCookie(cookie.name)) {
                    this.removeCookie(cookie.name);
                    oversizedRemoved.push(cookie);
                }
            });
        }
        
        this.results.actions.push({
            step: 3,
            action: `Removed ${oversizedRemoved.length} oversized cookies`,
            details: oversizedRemoved.map(c => ({ name: c.name, size: c.size }))
        });
    }

    async step4_RemoveSuspicious() {
        console.log('🔍 Step 4: Removing suspicious cookies...');
        
        const suspiciousRemoved = [];
        if (typeof window.cookieManager === 'object') {
            const removed = window.cookieManager.cleanupSuspiciousCookies();
            suspiciousRemoved.push(...removed);
        } else {
            // Fallback cleanup
            const cookies = this.parseCookies();
            cookies.forEach(cookie => {
                if (this.isSuspiciousCookie(cookie) && !this.isEssentialCookie(cookie.name)) {
                    this.removeCookie(cookie.name);
                    suspiciousRemoved.push(cookie);
                }
            });
        }
        
        this.results.actions.push({
            step: 4,
            action: `Removed ${suspiciousRemoved.length} suspicious cookies`,
            details: suspiciousRemoved.map(c => ({ name: c.name, reason: 'suspicious pattern' }))
        });
    }

    async step5_RemoveDuplicates() {
        console.log('🔄 Step 5: Removing duplicate cookies...');
        
        const duplicatesRemoved = [];
        const seenCookies = new Set();
        const cookies = this.parseCookies();
        
        cookies.forEach(cookie => {
            const baseName = cookie.name.replace(/_?\d+$/, ''); // Remove trailing numbers
            
            if (seenCookies.has(baseName) && !this.isEssentialCookie(cookie.name)) {
                this.removeCookie(cookie.name);
                duplicatesRemoved.push(cookie);
            } else {
                seenCookies.add(baseName);
            }
        });
        
        this.results.actions.push({
            step: 5,
            action: `Removed ${duplicatesRemoved.length} duplicate cookies`,
            details: duplicatesRemoved.map(c => ({ name: c.name }))
        });
    }

    async step6_EnforceLimits() {
        console.log('🛡️ Step 6: Enforcing size limits...');
        
        if (typeof window.cookieManager === 'object' && typeof window.cookieManager.enforceSizeLimits === 'function') {
            window.cookieManager.enforceSizeLimits();
        }
        
        // Also enforce total size limit
        let currentSize = this.getCurrentCookieSize();
        const maxTotalSize = 50 * 1024; // 50KB
        const removed = [];
        
        if (currentSize > maxTotalSize) {
            const cookies = this.parseCookies()
                .filter(c => !this.isEssentialCookie(c.name))
                .sort((a, b) => b.size - a.size); // Largest first
            
            for (const cookie of cookies) {
                if (currentSize <= maxTotalSize) break;
                
                this.removeCookie(cookie.name);
                currentSize -= cookie.size;
                removed.push(cookie);
            }
        }
        
        this.results.actions.push({
            step: 6,
            action: 'Size limits enforced',
            details: {
                limitEnforced: true,
                additionalRemoved: removed.length,
                currentSize: Math.round(currentSize / 1024) + 'KB'
            }
        });
    }

    async step7_FinalAnalysis() {
        console.log('📈 Step 7: Final analysis...');
        
        // Wait for changes to take effect
        await this.delay(1000);
        
        if (typeof window.cookieAnalysis === 'function') {
            this.results.after = window.cookieAnalysis();
        } else {
            this.results.after = this.basicAnalysis();
        }
        
        this.results.actions.push({
            step: 7,
            action: 'Final analysis completed',
            details: {
                totalCookies: this.results.after.totalCookies,
                totalSizeMB: this.results.after.summary?.totalSizeMB || 'unknown'
            }
        });
    }

    async step8_GenerateReport() {
        console.log('📄 Step 8: Generating cleanup report...');
        
        const before = this.results.before;
        const after = this.results.after;
        
        this.results.summary = {
            duration: Date.now() - this.results.startTime,
            cookiesRemoved: (before.totalCookies || 0) - (after.totalCookies || 0),
            sizeSaved: (before.summary?.totalSize || 0) - (after.summary?.totalSize || 0),
            percentReduction: this.calculatePercentReduction(before, after),
            success: this.results.errors.length === 0
        };
        
        this.displayReport();
        
        this.results.actions.push({
            step: 8,
            action: 'Report generated and displayed'
        });
    }

    displayReport() {
        console.log('\n🎉 COOKIE CLEANUP REPORT');
        console.log('========================');
        console.log(`Duration: ${this.results.summary.duration}ms`);
        console.log(`Cookies removed: ${this.results.summary.cookiesRemoved}`);
        console.log(`Size saved: ${Math.round(this.results.summary.sizeSaved / 1024)}KB`);
        console.log(`Reduction: ${this.results.summary.percentReduction}%`);
        console.log(`Status: ${this.results.summary.success ? '✅ Success' : '❌ Errors occurred'}`);
        
        if (this.results.errors.length > 0) {
            console.log('\nErrors:');
            this.results.errors.forEach(error => {
                console.log(`  • ${error.step}: ${error.error}`);
            });
        }
        
        console.log('\nDetailed actions:');
        this.results.actions.forEach((action, index) => {
            console.log(`  ${index + 1}. ${action.action}`);
        });
    }

    // Helper methods
    parseCookies() {
        return document.cookie.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            const value = valueParts.join('=') || '';
            return {
                name: name.trim(),
                value,
                size: cookie.length
            };
        }).filter(cookie => cookie.name);
    }

    isEssentialCookie(name) {
        const essential = ['connect.sid', 'sid', '_csrf', 'auth_token', 'session_id'];
        return essential.includes(name);
    }

    isSuspiciousCookie(cookie) {
        const suspiciousPatterns = [/legacy/i, /old/i, /temp/i, /\d{13}/];
        return suspiciousPatterns.some(pattern => 
            pattern.test(cookie.name) || pattern.test(cookie.value)
        ) || cookie.value.length > 10000;
    }

    removeCookie(name) {
        const expireDate = new Date(0);
        const paths = ['/', '/api', '/admin'];
        
        paths.forEach(path => {
            document.cookie = `${name}=; expires=${expireDate.toUTCString()}; path=${path}`;
        });
    }

    getCurrentCookieSize() {
        return document.cookie.length;
    }

    basicAnalysis() {
        const cookies = this.parseCookies();
        const totalSize = cookies.reduce((sum, cookie) => sum + cookie.size, 0);
        
        return {
            totalCookies: cookies.length,
            summary: {
                totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            }
        };
    }

    calculatePercentReduction(before, after) {
        const beforeSize = before.summary?.totalSize || 0;
        const afterSize = after.summary?.totalSize || 0;
        
        if (beforeSize === 0) return 0;
        return Math.round(((beforeSize - afterSize) / beforeSize) * 100);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global execution function
window.executeCookieCleanup = async () => {
    const orchestrator = new CookieCleanupOrchestrator();
    return await orchestrator.executeCleanup();
};

// Auto-execute if cookies are severely bloated
setTimeout(async () => {
    const currentSize = document.cookie.length;
    const criticalThreshold = 100 * 1024; // 100KB
    
    if (currentSize > criticalThreshold) {
        console.log(`🚨 Critical cookie bloat detected (${Math.round(currentSize/1024)}KB)`);
        console.log('🤖 Auto-executing cleanup...');
        
        try {
            await window.executeCookieCleanup();
        } catch (error) {
            console.error('❌ Auto-cleanup failed:', error);
        }
    }
}, 2000);

console.log('🎬 Cookie cleanup orchestrator loaded!');
console.log('📝 Run: executeCookieCleanup() to start comprehensive cleanup');