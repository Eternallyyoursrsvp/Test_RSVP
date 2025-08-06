# RSVP Platform - Rollback Scripts

**Generated**: August 1, 2025  
**Purpose**: Complete rollback capability for automated cleanup operations  
**Usage**: Execute these commands to restore deleted files if needed

---

## 🔄 Quick Rollback Commands

### Critical Rollback (Restore Core Files)
```bash
# Navigate to project root
cd "/Users/abhishek/Downloads/Caluse Code/RSVP/RSVP_Platform-main"

# Restore from git (if using version control)
git checkout HEAD -- package-testing.json
git checkout HEAD -- replit.nix
git checkout HEAD -- client/components/
git checkout HEAD -- server/lib/async-job-queue.ts.disabled
git checkout HEAD -- server/middleware/ultra-fast-response.ts.disabled
git checkout HEAD -- server/services/sms-service.ts
git checkout HEAD -- server/services/email.ts
```

### Full Rollback (Restore All Deleted Content)
```bash
# Restore all documentation
git checkout HEAD -- legacy_docs/

# Restore all components 
git checkout HEAD -- client/components/

# Restore all disabled services
git checkout HEAD -- server/lib/ server/middleware/ server/services/
```

---

## 📋 File-by-File Rollback Commands

### 1. Root Configuration Files

#### Restore package-testing.json
```bash
# Manual recreation if needed
cat > package-testing.json << 'EOF'
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.4",
    "@testing-library/react": "^16.3.0", 
    "@testing-library/user-event": "^14.6.1",
    "@vitest/ui": "^3.2.4",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
EOF
```

#### Restore replit.nix
```bash
# Git restore
git checkout HEAD -- replit.nix

# Manual recreation if needed
cat > replit.nix << 'EOF'
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.postgresql
    pkgs.nodePackages.typescript
  ];
}
EOF
```

### 2. Frontend Component Files

#### Restore Duplicate Components
```bash
# Restore entire client/components directory
git checkout HEAD -- client/components/

# Or restore individual files
git checkout HEAD -- client/components/analytics/CommunicationDashboard.tsx
git checkout HEAD -- client/components/transport/DragDropInterface.tsx
git checkout HEAD -- client/components/transport/GroupManagement.tsx
git checkout HEAD -- client/components/travel/FlightCoordination.tsx
```

### 3. Backend Service Files

#### Restore Disabled Services
```bash
# Restore disabled async job queue
git checkout HEAD -- server/lib/async-job-queue.ts.disabled

# Restore disabled ultra-fast response
git checkout HEAD -- server/middleware/ultra-fast-response.ts.disabled
```

#### Restore Duplicate Services
```bash
# Restore duplicate SMS service
git checkout HEAD -- server/services/sms-service.ts

# Restore duplicate email service  
git checkout HEAD -- server/services/email.ts
```

### 4. Legacy Documentation

#### Restore Documentation Archive
```bash
# Restore entire legacy documentation
git checkout HEAD -- legacy_docs/

# Restore specific archived content
git checkout HEAD -- legacy_docs/archive/
git checkout HEAD -- legacy_docs/Ver4_*
git checkout HEAD -- legacy_docs/comprehensive-audit-travel-transport.md
git checkout HEAD -- legacy_docs/TRAVEL_TRANSPORT_AUDIT_2025.md
git checkout HEAD -- legacy_docs/rebuild-checklist.md
git checkout HEAD -- legacy_docs/ver3-complete-architecture-plan.md
git checkout HEAD -- legacy_docs/replit.md
```

#### Restore Archive Files
```bash
# Restore temporary files
git checkout HEAD -- legacy_docs/archive/legacy-root-files/cookies2.txt
git checkout HEAD -- legacy_docs/archive/legacy-root-files/test-transport-save.js
```

### 5. Migration Scripts (if archived)

#### Restore Migration Scripts
```bash
# Restore all migration scripts if they were archived
git checkout HEAD -- scripts/add-accommodations-travel-columns.ts
git checkout HEAD -- scripts/add-dummy-guests.ts
git checkout HEAD -- scripts/add-event-setup-wizard.ts
git checkout HEAD -- scripts/add-flight-buffer-fields.ts
git checkout HEAD -- scripts/add-hotels-support.ts
git checkout HEAD -- scripts/add-smtp-fields.ts
git checkout HEAD -- scripts/add-transport-coordination.ts
git checkout HEAD -- scripts/add-transport-module.ts
git checkout HEAD -- scripts/add-whatsapp-fields.ts
git checkout HEAD -- scripts/fix-hotel-system.ts
git checkout HEAD -- scripts/migrate-buffer-hours-to-time.ts
git checkout HEAD -- scripts/oauth-migration.ts
git checkout HEAD -- scripts/update-accommodation-schema.ts
```

### 6. Test Artifacts (if cleaned)

#### Restore Test Results
```bash
# Restore test result directories if they were cleaned
git checkout HEAD -- test-results/
git checkout HEAD -- playwright-report/
```

---

## 🚨 Emergency Recovery Procedures

### Complete Project Reset
```bash
# Nuclear option - restore entire project to pre-cleanup state
cd "/Users/abhishek/Downloads/Caluse Code/RSVP/RSVP_Platform-main"
git reset --hard HEAD
git clean -fd
```

### Selective Recovery by Category
```bash
# Restore only frontend changes
git checkout HEAD -- client/

# Restore only backend changes  
git checkout HEAD -- server/

# Restore only documentation changes
git checkout HEAD -- legacy_docs/ docs/

# Restore only configuration changes
git checkout HEAD -- package-testing.json replit.nix
```

---

## 📦 Backup Creation Commands

### Create Pre-Cleanup Backup
```bash
# Create backup directory
mkdir -p backups/pre-cleanup

# Backup critical files before deletion
cp package-testing.json backups/pre-cleanup/ 2>/dev/null || true
cp replit.nix backups/pre-cleanup/ 2>/dev/null || true
cp -r client/components/ backups/pre-cleanup/client-components/ 2>/dev/null || true
cp server/lib/async-job-queue.ts.disabled backups/pre-cleanup/ 2>/dev/null || true
cp server/middleware/ultra-fast-response.ts.disabled backups/pre-cleanup/ 2>/dev/null || true
cp server/services/sms-service.ts backups/pre-cleanup/ 2>/dev/null || true
cp server/services/email.ts backups/pre-cleanup/ 2>/dev/null || true
cp -r legacy_docs/ backups/pre-cleanup/legacy_docs/ 2>/dev/null || true

# Create archive
cd backups
tar -czf pre-cleanup-backup-$(date +%Y%m%d-%H%M%S).tar.gz pre-cleanup/
```

### Restore from Backup
```bash
# Navigate to backup directory
cd backups

# Extract latest backup
tar -xzf pre-cleanup-backup-*.tar.gz

# Copy files back to project
cd pre-cleanup
cp package-testing.json ../../ 2>/dev/null || true
cp replit.nix ../../ 2>/dev/null || true
cp -r client-components/ ../../client/components/ 2>/dev/null || true
cp async-job-queue.ts.disabled ../../server/lib/ 2>/dev/null || true
cp ultra-fast-response.ts.disabled ../../server/middleware/ 2>/dev/null || true
cp sms-service.ts ../../server/services/ 2>/dev/null || true
cp email.ts ../../server/services/ 2>/dev/null || true
cp -r legacy_docs/ ../../ 2>/dev/null || true
```

---

## 🔍 Validation Commands

### Verify Rollback Success
```bash
# Check critical files exist
test -f package-testing.json && echo "✅ package-testing.json restored" || echo "❌ package-testing.json missing"
test -f replit.nix && echo "✅ replit.nix restored" || echo "❌ replit.nix missing"
test -d client/components && echo "✅ client/components restored" || echo "❌ client/components missing"
test -f server/lib/async-job-queue.ts.disabled && echo "✅ async-job-queue.ts.disabled restored" || echo "❌ async-job-queue.ts.disabled missing"
test -d legacy_docs && echo "✅ legacy_docs restored" || echo "❌ legacy_docs missing"

# Verify application still functions
npm install
npm run check
npm run test
```

### Post-Rollback Testing
```bash
# Verify frontend builds
npm run build

# Verify backend starts
npm run dev &
PID=$!
sleep 5
curl -f http://localhost:3000/api/health
kill $PID

# Verify tests pass
npm run test
```

---

## 📞 Support & Recovery

### If Rollback Fails
1. **Check Git Status**: `git status` to see current state
2. **Use Git Reflog**: `git reflog` to find commit before cleanup
3. **Manual File Recovery**: Check backup directories
4. **Contact Support**: Provide cleanup log files

### Recovery Verification Checklist
- [ ] All critical configuration files present
- [ ] Frontend components accessible  
- [ ] Backend services functional
- [ ] Database connections working
- [ ] Tests passing
- [ ] Build process successful
- [ ] Application starts without errors

---

**⚠️ IMPORTANT NOTES:**
- Always test rollback procedures in development environment first
- Verify database integrity after major rollbacks
- Check for any configuration changes that may need manual restoration
- Consider dependency updates that occurred during cleanup

**🔄 ROLLBACK SCRIPTS READY** | **Complete Recovery Capability** | **Emergency Procedures Documented**