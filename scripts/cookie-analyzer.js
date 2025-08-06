/**
 * Cookie Bloat Analysis Tool
 * Run this in browser console to analyze cookie sizes and content
 */

function analyzeCookies() {
    const cookies = document.cookie.split(';');
    const analysis = {
        totalCookies: cookies.length,
        totalSize: 0,
        cookieDetails: [],
        patterns: {
            duplicates: new Map(),
            base64Encoded: [],
            jsonLike: [],
            oversized: [],
            suspicious: []
        },
        summary: {}
    };

    console.log('🍪 Cookie Analysis Starting...\n');
    
    cookies.forEach((cookie, index) => {
        if (!cookie.trim()) return;
        
        const [name, ...valueParts] = cookie.trim().split('=');
        const value = valueParts.join('=') || '';
        const size = cookie.length;
        
        const cookieInfo = {
            index,
            name: name.trim(),
            value,
            size,
            sizeKB: (size / 1024).toFixed(2),
            type: 'unknown'
        };

        // Analyze cookie content type
        if (value.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
            cookieInfo.type = 'base64';
            analysis.patterns.base64Encoded.push(cookieInfo);
            
            // Try to decode base64
            try {
                const decoded = atob(value);
                cookieInfo.decodedContent = decoded;
                if (decoded.startsWith('{') || decoded.startsWith('[')) {
                    cookieInfo.type = 'base64-json';
                }
            } catch (e) {
                cookieInfo.decodeError = e.message;
            }
        }
        
        if (value.startsWith('{') || value.startsWith('[')) {
            cookieInfo.type = 'json';
            analysis.patterns.jsonLike.push(cookieInfo);
            
            // Try to parse JSON
            try {
                cookieInfo.parsedJson = JSON.parse(value);
            } catch (e) {
                cookieInfo.parseError = e.message;
            }
        }

        // Check for duplicates
        const baseNameMatch = name.match(/^(.+?)_?\d*$/);
        const baseName = baseNameMatch ? baseNameMatch[1] : name;
        
        if (!analysis.patterns.duplicates.has(baseName)) {
            analysis.patterns.duplicates.set(baseName, []);
        }
        analysis.patterns.duplicates.get(baseName).push(cookieInfo);

        // Flag oversized cookies (> 4KB is problematic)
        if (size > 4096) {
            analysis.patterns.oversized.push(cookieInfo);
        }

        // Flag suspicious patterns
        if (name.includes('legacy') || name.includes('old') || name.includes('temp') || 
            name.match(/\d{13}/) || value.length > 10000) {
            analysis.patterns.suspicious.push(cookieInfo);
        }

        analysis.cookieDetails.push(cookieInfo);
        analysis.totalSize += size;
    });

    // Generate summary
    analysis.summary = {
        totalSizeKB: (analysis.totalSize / 1024).toFixed(2),
        totalSizeMB: (analysis.totalSize / (1024 * 1024)).toFixed(2),
        averageSizeKB: (analysis.totalSize / analysis.totalCookies / 1024).toFixed(2),
        oversizedCount: analysis.patterns.oversized.length,
        duplicateGroups: Array.from(analysis.patterns.duplicates.entries()).filter(([_, cookies]) => cookies.length > 1).length,
        base64Count: analysis.patterns.base64Encoded.length,
        jsonCount: analysis.patterns.jsonLike.length,
        suspiciousCount: analysis.patterns.suspicious.length
    };

    return analysis;
}

function displayCookieAnalysis() {
    const analysis = analyzeCookies();
    
    console.log('📊 COOKIE ANALYSIS RESULTS');
    console.log('========================\n');
    
    console.log('📈 Summary:');
    console.log(`  Total Cookies: ${analysis.totalCookies}`);
    console.log(`  Total Size: ${analysis.summary.totalSizeKB} KB (${analysis.summary.totalSizeMB} MB)`);
    console.log(`  Average Size: ${analysis.summary.averageSizeKB} KB per cookie`);
    console.log(`  Oversized (>4KB): ${analysis.summary.oversizedCount}`);
    console.log(`  Duplicate Groups: ${analysis.summary.duplicateGroups}`);
    console.log(`  Base64 Encoded: ${analysis.summary.base64Count}`);
    console.log(`  JSON-like: ${analysis.summary.jsonCount}`);
    console.log(`  Suspicious: ${analysis.summary.suspiciousCount}\n`);

    if (analysis.patterns.oversized.length > 0) {
        console.log('🚨 OVERSIZED COOKIES (>4KB):');
        analysis.patterns.oversized.forEach(cookie => {
            console.log(`  ${cookie.name}: ${cookie.sizeKB} KB`);
            if (cookie.type === 'base64' && cookie.decodedContent) {
                console.log(`    Decoded preview: ${cookie.decodedContent.substring(0, 100)}...`);
            } else if (cookie.type === 'json' && cookie.parsedJson) {
                console.log(`    JSON keys: ${Object.keys(cookie.parsedJson).slice(0, 5).join(', ')}`);
            } else {
                console.log(`    Value preview: ${cookie.value.substring(0, 100)}...`);
            }
        });
        console.log('');
    }

    if (analysis.patterns.suspicious.length > 0) {
        console.log('⚠️ SUSPICIOUS COOKIES:');
        analysis.patterns.suspicious.forEach(cookie => {
            console.log(`  ${cookie.name}: ${cookie.sizeKB} KB - ${cookie.type}`);
        });
        console.log('');
    }

    const duplicateGroups = Array.from(analysis.patterns.duplicates.entries()).filter(([_, cookies]) => cookies.length > 1);
    if (duplicateGroups.length > 0) {
        console.log('🔄 DUPLICATE COOKIE GROUPS:');
        duplicateGroups.forEach(([baseName, cookies]) => {
            console.log(`  ${baseName}: ${cookies.length} instances`);
            cookies.forEach(cookie => {
                console.log(`    - ${cookie.name}: ${cookie.sizeKB} KB`);
            });
        });
        console.log('');
    }

    console.log('💾 Detailed cookie data available in returned object');
    return analysis;
}

// Export for use
window.cookieAnalysis = displayCookieAnalysis;
window.analyzeCookies = analyzeCookies;

console.log('Cookie analysis tools loaded. Run cookieAnalysis() to start.');