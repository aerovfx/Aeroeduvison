# 🔐 GitHub Secrets Configuration Guide

**Date:** 2026-03-07  
**Repository:** https://github.com/aerovfx/Aeroeduvison  
**Branch:** siri  
**Estimated Time:** 1-2 hours

---

## 📋 Overview

This guide will help you configure all required GitHub Secrets for the CI/CD pipeline to work properly.

### Required Secrets

| Secret | Purpose | Environment |
|--------|---------|-------------|
| `STAGING_HOST` | Staging server hostname | Staging |
| `STAGING_USER` | Staging server username | Staging |
| `STAGING_SSH_KEY` | Staging SSH private key | Staging |
| `PRODUCTION_HOST` | Production server hostname | Production |
| `PRODUCTION_USER` | Production server username | Production |
| `PRODUCTION_SSH_KEY` | Production SSH private key | Production |
| `DOCKER_USERNAME` | Docker Hub username | Global |
| `DOCKER_PASSWORD` | Docker Hub access token | Global |

---

## 🚀 Step-by-Step Configuration

### Step 1: Access GitHub Secrets Settings

1. Go to repository: https://github.com/aerovfx/Aeroeduvison
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. You'll see the secrets management page

**Direct Link:** https://github.com/aerovfx/Aeroeduvison/settings/secrets/actions

---

### Step 2: Create Global Secrets (Docker Hub)

These secrets are used by all workflows.

#### 2.1 DOCKER_USERNAME

```
Name: DOCKER_USERNAME
Value: aerovfx
```

**Instructions:**
1. Click **New repository secret** button
2. Enter `DOCKER_USERNAME` in Name field
3. Enter your Docker Hub username (e.g., `aerovfx`)
4. Click **Add secret** button

#### 2.2 DOCKER_PASSWORD

**First, create Docker Hub Access Token:**

1. Go to https://hub.docker.com/settings/security
2. Click **New access token**
3. Enter token name: `GitHub Actions`
4. Select permissions: **Read & Write**
5. Click **Generate**
6. **Copy the token immediately** (you can't see it again!)

**Then add to GitHub:**

```
Name: DOCKER_PASSWORD
Value: <paste the token you just copied>
```

**Instructions:**
1. Click **New repository secret** button
2. Enter `DOCKER_PASSWORD` in Name field
3. Paste the Docker Hub access token in Value field
4. Click **Add secret** button

---

### Step 3: Create Staging Environment Secrets

#### 3.1 Create Staging Environment

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/environments
2. Click **New environment** button
3. Enter environment name: `staging`
4. Click **Configure environment** button

#### 3.2 Add Staging Secrets

**STAGING_HOST**
```
Name: STAGING_HOST
Value: staging.aeroedu.com
(or your staging server IP/domain)
```

**STAGING_USER**
```
Name: STAGING_USER
Value: deploy
(or your staging server username)
```

**STAGING_SSH_KEY**

**First, generate SSH key (if you don't have one):**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions@staging" -f github_actions_staging_key
# Press Enter (no passphrase needed)
```

**Then copy the private key:**

```bash
# On your local machine
cat github_actions_staging_key
# Copy the entire output (including BEGIN/END lines)
```

**Add to GitHub:**

```
Name: STAGING_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
<paste your private key here>
-----END OPENSSH PRIVATE KEY-----
```

**Instructions:**
1. In staging environment, click **Add secret** button
2. Enter secret name (e.g., `STAGING_HOST`)
3. Enter secret value
4. Click **Add secret** button
5. Repeat for all 3 staging secrets

---

### Step 4: Create Production Environment Secrets

#### 4.1 Create Production Environment

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/environments
2. Click **New environment** button
3. Enter environment name: `production`
4. Click **Configure environment** button

**Optional: Add protection rules**
- ✅ **Required reviewers** - Add team members who must approve deployments
- ✅ **Wait timer** - Set delay before deployment (e.g., 5 minutes)

#### 4.2 Add Production Secrets

**PRODUCTION_HOST**
```
Name: PRODUCTION_HOST
Value: api.aeroedu.com
(or your production server IP/domain)
```

**PRODUCTION_USER**
```
Name: PRODUCTION_USER
Value: deploy
(or your production server username)
```

**PRODUCTION_SSH_KEY**

**Generate SSH key for production:**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions@production" -f github_actions_production_key
# Press Enter (no passphrase needed)
```

**Copy the private key:**

```bash
# On your local machine
cat github_actions_production_key
# Copy the entire output (including BEGIN/END lines)
```

**Add to GitHub:**

```
Name: PRODUCTION_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
<paste your private key here>
-----END OPENSSH PRIVATE KEY-----
```

**Instructions:**
1. In production environment, click **Add secret** button
2. Enter secret name (e.g., `PRODUCTION_HOST`)
3. Enter secret value
4. Click **Add secret** button
5. Repeat for all 3 production secrets

---

## ✅ Verification Checklist

### Global Secrets (Repository-level)

- [ ] `DOCKER_USERNAME` - Docker Hub username
- [ ] `DOCKER_PASSWORD` - Docker Hub access token

### Staging Environment Secrets

- [ ] `STAGING_HOST` - Staging server hostname
- [ ] `STAGING_USER` - Staging server username
- [ ] `STAGING_SSH_KEY` - Staging SSH private key

### Production Environment Secrets

- [ ] `PRODUCTION_HOST` - Production server hostname
- [ ] `PRODUCTION_USER` - Production server username
- [ ] `PRODUCTION_SSH_KEY` - Production SSH private key

---

## 🔍 Test Configuration

### Test 1: Verify Secrets Are Set

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/secrets/actions
2. You should see:
   - 2 repository secrets (DOCKER_USERNAME, DOCKER_PASSWORD)
   - 3 staging environment secrets
   - 3 production environment secrets

### Test 2: Trigger Test Deployment

```bash
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin siri
```

**Monitor the pipeline:**
- Go to: https://github.com/aerovfx/Aeroeduvison/actions
- You should see the workflow running
- Check if deployment jobs succeed

---

## 🛠️ Troubleshooting

### Issue 1: SSH Key Not Working

**Symptoms:**
- Deployment fails with "Permission denied (publickey)"

**Solutions:**
1. Verify SSH key format (must include BEGIN/END lines)
2. Ensure public key is added to server's `~/.ssh/authorized_keys`
3. Check SSH key permissions on server:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### Issue 2: Docker Login Fails

**Symptoms:**
- Workflow fails at "Login to Docker Hub" step

**Solutions:**
1. Verify DOCKER_USERNAME is correct
2. Regenerate DOCKER_PASSWORD (access token)
3. Ensure token has Read & Write permissions

### Issue 3: Environment Not Found

**Symptoms:**
- Workflow fails with "Environment not found"

**Solutions:**
1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/environments
2. Ensure `staging` and `production` environments exist
3. Check environment names match workflow exactly (case-sensitive)

---

## 📝 Example Server Setup

### Staging Server Setup

```bash
# On staging server

# 1. Create deploy user
sudo useradd -m deploy
sudo passwd deploy

# 2. Add SSH key
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# Paste the PUBLIC key (not private key!)
sudo chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# 3. Create deployment directory
sudo mkdir -p /opt/aeroedu/staging
sudo chown -R deploy:deploy /opt/aeroedu/staging

# 4. Create deploy script
sudo nano /opt/aeroedu/staging/deploy.sh
# Add your deployment script
sudo chmod +x /opt/aeroedu/staging/deploy.sh
```

### Production Server Setup

```bash
# On production server

# 1. Create deploy user
sudo useradd -m deploy
sudo passwd deploy

# 2. Add SSH key
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# Paste the PUBLIC key (not private key!)
sudo chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# 3. Create deployment directory
sudo mkdir -p /opt/aeroedu/production
sudo chown -R deploy:deploy /opt/aeroedu/production

# 4. Create deploy script
sudo nano /opt/aeroedu/production/deploy.sh
# Add your deployment script
sudo chmod +x /opt/aeroedu/production/deploy.sh
```

---

## 🔒 Security Best Practices

### 1. Use Separate SSH Keys

- ✅ Use different SSH keys for staging and production
- ✅ Never reuse SSH keys across environments
- ✅ Rotate SSH keys every 6 months

### 2. Use Access Tokens (Not Passwords)

- ✅ Use Docker Hub access tokens (not account password)
- ✅ Use GitHub personal access tokens (if needed)
- ✅ Rotate tokens every 90 days

### 3. Limit Secret Access

- ✅ Use environment-specific secrets
- ✅ Don't share secrets between environments
- ✅ Use GitHub's secret scoping feature

### 4. Enable Branch Protection

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/branches
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ **Require pull request reviews**
   - ✅ **Require status checks to pass**
   - ✅ **Require branches to be up to date**

---

## 📊 Completion Checklist

### Repository Secrets
- [ ] `DOCKER_USERNAME` configured
- [ ] `DOCKER_PASSWORD` configured

### Staging Environment
- [ ] `staging` environment created
- [ ] `STAGING_HOST` configured
- [ ] `STAGING_USER` configured
- [ ] `STAGING_SSH_KEY` configured
- [ ] Test deployment successful

### Production Environment
- [ ] `production` environment created
- [ ] `PRODUCTION_HOST` configured
- [ ] `PRODUCTION_USER` configured
- [ ] `PRODUCTION_SSH_KEY` configured
- [ ] Branch protection enabled
- [ ] Test deployment successful

### Documentation
- [ ] SSH keys documented
- [ ] Server access documented
- [ ] Deployment process documented

---

## ✅ Success Criteria

**Configuration is complete when:**

1. ✅ All 8 secrets are configured
2. ✅ CI/CD pipeline runs successfully
3. ✅ Staging deployment works
4. ✅ Production deployment works
5. ✅ No security warnings in GitHub

---

## 🎯 Next Steps After Configuration

1. **Test CI/CD Pipeline**
   ```bash
   git push origin siri
   # Monitor: https://github.com/aerovfx/Aeroeduvison/actions
   ```

2. **Implement Database Queries** (2-3 days)
   - Follow: `CRITICAL_FIXES_IMPLEMENTATION.md`

3. **Add Redis Caching** (1-2 days)
   - Follow: `CRITICAL_FIXES_IMPLEMENTATION.md`

4. **Deploy to Production** (1 day)
   - Merge `siri` to `main`
   - Auto-deploy will trigger

---

**GitHub Secrets configuration complete!** 🔐

**Estimated Time:** 1-2 hours

**Direct Links:**
- Secrets: https://github.com/aerovfx/Aeroeduvison/settings/secrets/actions
- Environments: https://github.com/aerovfx/Aeroeduvison/settings/environments
- Actions: https://github.com/aerovfx/Aeroeduvison/actions
