# Workflow Quick Reference

## 🎯 Three-Workflow Architecture

### **Workflow Structure:**

1. **build-frontend.yml** - Builds and pushes Frontend container independently
2. **build-api-gateway.yml** - Builds and pushes API container independently  
3. **create-release.yml** - Creates GitHub releases with both container versions (manual trigger)

---

## 📋 Quick Actions

### Step 1: Build and Push Containers

**Build Frontend:**
```bash
# Option A: Using git tag
git tag frontend-v1.1.2
git push origin frontend-v1.1.2

# Option B: Manual trigger
# Go to Actions → Build and Push Frontend → Run workflow
# Enter version: 1.1.2
```

**Build API Gateway:**
```bash
# Option A: Using git tag
git tag api-v1.1.1
git push origin api-v1.1.1

# Option B: Manual trigger
# Go to Actions → Build and Push API Gateway → Run workflow
# Enter version: 1.1.1
```

### Step 2: Create Release (Manual)

After containers are built and pushed:

1. Go to **Actions** → **Create Release**
2. Click **Run workflow**
3. Fill in:
   - **Frontend version:** `1.1.2` (the version you built)
   - **API version:** `1.1.1` (the version you built)
   - **Release version:** `1.1.0` (overall release number)
   - **Pre-release:** Check if this is a beta/alpha
4. Click **Run workflow**

**Result:** GitHub release created with deployment instructions for both containers

---

## 🏷️ Tag Patterns

| Pattern | Triggers | Example | Action |
|---------|----------|---------|--------|
| `frontend-v*.*.*` | Build Frontend workflow | `frontend-v1.1.2` | Builds & pushes Frontend |
| `api-v*.*.*` | Build API workflow | `api-v1.2.0` | Builds & pushes API |
| N/A | Create Release is **manual only** | N/A | Creates GitHub release |

---

## 📦 What Happens

### On Tag Push or Manual Build

**Frontend Build (`frontend-v1.1.2`):**
1. ✅ Builds Frontend `1.1.2` Docker image
2. ✅ Pushes to Docker Hub with tags: `1.1.2` and `latest`
3. ⚠️ **Does NOT create GitHub release**

**API Build (`api-v1.2.0`):**
1. ✅ Builds API `1.2.0` Docker image
2. ✅ Pushes to Docker Hub with tags: `1.2.0` and `latest`
3. ⚠️ **Does NOT create GitHub release**

### On Manual Release Creation

**Create Release (v1.1.0 with Frontend 1.1.2 + API 1.1.1):**
1. ✅ Generates release notes with:
   - Both container versions
   - Docker pull commands
   - Full stack deployment script
   - Docker Compose configuration
   - Individual update instructions
   - Verification steps
2. ✅ Creates GitHub Release with tag `v1.1.0`
3. ✅ Links to Docker Hub images

---

## 🚀 Example Scenarios

### Scenario 1: Bug Fix in Frontend Only
```bash
# Step 1: Fix and build frontend
git add web-frontend/
git commit -m "fix: resolve calculation display issue"
git tag frontend-v1.1.2
git push origin frontend-v1.1.2
# ✅ Frontend 1.1.2 built and pushed to Docker Hub

# Step 2: Create release
# Go to Actions → Create Release
# Frontend: 1.1.2 (new)
# API: 1.1.1 (existing)
# Release: 1.1.2
```

### Scenario 2: New Feature in API Only
```bash
# Step 1: Build API
git add api-gateway-python/
git commit -m "feat: add export data endpoint"
git tag api-v1.2.0
git push origin api-v1.2.0
# ✅ API 1.2.0 built and pushed to Docker Hub

# Step 2: Create release
# Go to Actions → Create Release
# Frontend: 1.1.2 (existing)
# API: 1.2.0 (new)
# Release: 1.2.0
```

### Scenario 3: Update Both Containers
```bash
# Step 1: Build frontend
git tag frontend-v2.0.0
git push origin frontend-v2.0.0

# Step 2: Build API
git tag api-v2.0.0
git push origin api-v2.0.0

# Step 3: Create release
# Go to Actions → Create Release
# Frontend: 2.0.0
# API: 2.0.0
# Release: 2.0.0
```

---

## 🔧 Manual Workflow Triggers

### Build Frontend Manually
1. Actions → **Build and Push Frontend** → Run workflow
2. Enter version: `1.1.3`
3. Builds and pushes Frontend to Docker Hub

### Build API Manually
1. Actions → **Build and Push API Gateway** → Run workflow
2. Enter version: `1.2.1`
3. Builds and pushes API to Docker Hub

### Create Release Manually
1. Actions → **Create Release** → Run workflow
2. Enter:
   - Frontend version: `1.1.3` (must exist on Docker Hub)
   - API version: `1.2.1` (must exist on Docker Hub)
   - Release version: `1.2.0` (your choice for this release)
   - Pre-release: ☐ (check if beta/alpha)
3. Creates GitHub release with full deployment documentation

---

## 📊 Version Tracking

| Build Action | Frontend | API | Release |
|--------------|----------|-----|---------|
| Build Frontend 1.1.2 | **1.1.2** ⬆️ | - | - |
| Build API 1.1.1 | - | **1.1.1** ⬆️ | - |
| Create Release | 1.1.2 | 1.1.1 | **v1.1.0** 📦 |
| Build API 1.2.0 | - | **1.2.0** ⬆️ | - |
| Create Release | 1.1.2 | 1.2.0 | **v1.2.0** 📦 |

---

## 🔐 Required Secrets

```
DOCKERHUB_USERNAME - Your Docker Hub username
DOCKERHUB_TOKEN    - Docker Hub access token
GITHUB_TOKEN       - Automatically provided by GitHub Actions
```

---

## 💡 Best Practices

1. ✅ **Build first, release second** - Always build containers before creating releases
2. ✅ **Version independently** - Each container has its own version number
3. ✅ **Test before tagging** - Use manual workflow dispatch to test builds
4. ✅ **Verify Docker Hub** - Ensure containers are on Docker Hub before creating release
5. ✅ **Follow semver** - Use semantic versioning for each container
6. ✅ **Release version != Container version** - Release version can be different from container versions
7. ✅ **Document changes** - Use meaningful release version numbers

---

## 📚 Documentation

- [System Architecture](./ARCHITECTURE.md) (if exists)
- [Deployment Guide](./usage.md) (if exists)
- [README](./README.md)
