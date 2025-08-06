/**
 * Cookie Monitoring and Prevention System
 * Real-time cookie monitoring with dashboard
 */

class CookieMonitor {
    constructor() {
        this.monitoring = false;
        this.metrics = {
            totalCookies: 0,
            totalSize: 0,
            oversizedCookies: 0,
            violations: [],
            timeline: []
        };
        
        this.limits = {
            maxCookieSize: 4096,
            maxTotalSize: 50 * 1024,
            maxTotalCookies: 20
        };

        this.observers = [];
        this.dashboard = null;
    }

    /**
     * Start real-time monitoring
     */
    startMonitoring() {
        if (this.monitoring) return;
        
        console.log('🔍 Starting cookie monitoring...');
        this.monitoring = true;
        
        // Initial scan
        this.scanCookies();
        
        // Set up periodic scanning
        this.monitoringInterval = setInterval(() => {
            this.scanCookies();
        }, 5000); // Every 5 seconds
        
        // Monitor cookie changes via document.cookie interception
        this.interceptCookieChanges();
        
        // Create monitoring dashboard
        this.createDashboard();
        
        console.log('✅ Cookie monitoring active');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.dashboard) {
            this.dashboard.remove();
            this.dashboard = null;
        }
        
        console.log('⏹️ Cookie monitoring stopped');
    }

    /**
     * Scan current cookies and update metrics
     */
    scanCookies() {
        const cookies = this.getAllCookies();
        const timestamp = Date.now();
        
        this.metrics = {
            totalCookies: cookies.length,
            totalSize: cookies.reduce((sum, cookie) => sum + cookie.size, 0),
            oversizedCookies: cookies.filter(c => c.size > this.limits.maxCookieSize).length,
            violations: this.checkViolations(cookies),
            timeline: [...this.metrics.timeline.slice(-50), {
                timestamp,
                totalSize: this.metrics.totalSize,
                totalCookies: cookies.length
            }]
        };

        // Alert on violations
        this.metrics.violations.forEach(violation => {
            console.warn(`🚨 Cookie violation: ${violation.message}`);
        });

        // Update dashboard
        this.updateDashboard();
        
        // Notify observers
        this.observers.forEach(callback => callback(this.metrics));
    }

    /**
     * Get all cookies with analysis
     */
    getAllCookies() {
        const cookieString = document.cookie;
        if (!cookieString) return [];

        return cookieString.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            const value = valueParts.join('=') || '';
            
            return {
                name: name.trim(),
                value,
                size: cookie.length,
                timestamp: Date.now()
            };
        });
    }

    /**
     * Check for limit violations
     */
    checkViolations(cookies) {
        const violations = [];
        
        // Check total cookie count
        if (cookies.length > this.limits.maxTotalCookies) {
            violations.push({
                type: 'count',
                message: `Too many cookies: ${cookies.length}/${this.limits.maxTotalCookies}`
            });
        }
        
        // Check total size
        const totalSize = cookies.reduce((sum, cookie) => sum + cookie.size, 0);
        if (totalSize > this.limits.maxTotalSize) {
            violations.push({
                type: 'size',
                message: `Total size exceeded: ${Math.round(totalSize/1024)}KB/${Math.round(this.limits.maxTotalSize/1024)}KB`
            });
        }
        
        // Check individual cookie sizes
        cookies.forEach(cookie => {
            if (cookie.size > this.limits.maxCookieSize) {
                violations.push({
                    type: 'individual',
                    message: `Cookie '${cookie.name}' is oversized: ${Math.round(cookie.size/1024)}KB`
                });
            }
        });
        
        return violations;
    }

    /**
     * Intercept cookie changes
     */
    interceptCookieChanges() {
        const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                        Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
        
        if (!originalCookieDescriptor) return;
        
        Object.defineProperty(document, 'cookie', {
            get: originalCookieDescriptor.get,
            set: (value) => {
                console.log(`🍪 Cookie change detected: ${value.split('=')[0]}`);
                
                // Check size before setting
                if (value.length > this.limits.maxCookieSize) {
                    console.warn(`🚨 Attempting to set oversized cookie: ${value.length} bytes`);
                }
                
                const result = originalCookieDescriptor.set.call(document, value);
                
                // Scan after change
                setTimeout(() => this.scanCookies(), 100);
                
                return result;
            },
            configurable: true
        });
    }

    /**
     * Create monitoring dashboard
     */
    createDashboard() {
        // Remove existing dashboard
        if (this.dashboard) {
            this.dashboard.remove();
        }

        this.dashboard = document.createElement('div');
        this.dashboard.id = 'cookie-monitor-dashboard';
        this.dashboard.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            overflow-y: auto;
            border: 2px solid #333;
        `;

        document.body.appendChild(this.dashboard);
        this.updateDashboard();
    }

    /**
     * Update dashboard content
     */
    updateDashboard() {
        if (!this.dashboard) return;

        const violations = this.metrics.violations;
        const violationColor = violations.length > 0 ? '#ff4444' : '#44ff44';
        
        this.dashboard.innerHTML = `
            <div style="border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 10px;">
                <strong>🍪 Cookie Monitor</strong>
                <button onclick="window.cookieMonitor.stopMonitoring()" style="float: right; background: #666; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div>Total: ${this.metrics.totalCookies}/${this.limits.maxTotalCookies} cookies</div>
                <div>Size: ${Math.round(this.metrics.totalSize/1024)}KB/${Math.round(this.limits.maxTotalSize/1024)}KB</div>
                <div>Oversized: ${this.metrics.oversizedCookies}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="background: #333; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${violationColor}; height: 100%; width: ${Math.min(100, (this.metrics.totalSize / this.limits.maxTotalSize) * 100)}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            ${violations.length > 0 ? `
                <div style="color: #ff4444; margin-bottom: 10px;">
                    <strong>⚠️ Violations:</strong><br>
                    ${violations.map(v => `• ${v.message}`).join('<br>')}
                </div>
            ` : '<div style="color: #44ff44;">✅ All limits OK</div>'}
            
            <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
                Last update: ${new Date().toLocaleTimeString()}
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="window.cleanupCookies()" style="background: #ff6666; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Cleanup</button>
                <button onclick="console.table(window.cookieMonitor.getAllCookies())" style="background: #6666ff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Inspect</button>
            </div>
        `;
    }

    /**
     * Subscribe to monitoring updates
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            const index = this.observers.indexOf(callback);
            if (index > -1) {
                this.observers.splice(index, 1);
            }
        };
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics() {
        const data = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            limits: this.limits,
            cookies: this.getAllCookies()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cookie-metrics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize global monitor
window.cookieMonitor = new CookieMonitor();

// Convenience functions
window.startCookieMonitoring = () => window.cookieMonitor.startMonitoring();
window.stopCookieMonitoring = () => window.cookieMonitor.stopMonitoring();
window.exportCookieMetrics = () => window.cookieMonitor.exportMetrics();

// Auto-start monitoring if cookies are already problematic
setTimeout(() => {
    const cookies = window.cookieMonitor.getAllCookies();
    const totalSize = cookies.reduce((sum, c) => sum + c.size, 0);
    
    if (totalSize > 30 * 1024 || cookies.length > 15) { // Threshold for auto-start
        console.log('🚨 Cookie bloat detected - starting automatic monitoring');
        window.startCookieMonitoring();
    }
}, 1000);

console.log('📊 Cookie monitoring system loaded!');
console.log('📝 Available commands:');
console.log('  • startCookieMonitoring() - Start real-time monitoring');
console.log('  • stopCookieMonitoring() - Stop monitoring');
console.log('  • exportCookieMetrics() - Export metrics data');