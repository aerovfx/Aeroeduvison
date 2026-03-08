# ⚡ Quick Start: Configure GitHub Secrets (15 minutes)

**Fast-track guide for busy developers**

---

## 🎯 What You Need (5 minutes)

### 1. Docker Hub Account
- Go to: https://hub.docker.com
- Login or create account
- Username: `aerovfx` (or your username)

### 2. Docker Hub Access Token (2 minutes)
1. Go to: https://hub.docker.com/settings/security
2. Click **New access token**
3. Name: `GitHub Actions`
4. Permissions: **Read & Write**
5. Click **Generate**
6. **COPY THE TOKEN** (you can't see it again!)

### 3. SSH Keys (3 minutes)
```bash
# Generate staging SSH key
ssh-keygen -t ed25519 -C "github-actions@staging" -f github_actions_staging_key

# Generate production SSH key
ssh-keygen -t ed25519 -C "github-actions@production" -f github_actions_production_key

# Copy private keys
cat github_actions_staging_key
cat github_actions_production_key
```

### 4. Server Info (1 minute)
- Staging server: `staging.aeroedu.com` (or IP)
- Production server: `api.aeroedu.com` (or IP)
- Username: `deploy` (or your username)

---

## 🔐 Configure Secrets (10 minutes)

### Step 1: Go to Secrets Page
**Direct link:** https://github.com/aerovfx/Aeroeduvison/settings/secrets/actions

### Step 2: Add Global Secrets (2 minutes)

Click **New repository secret** → Add these 2 secrets:

```
Name: DOCKER_USERNAME
Value: aerovfx
```

```
Name: DOCKER_PASSWORD
Value: <paste Docker Hub token from step 2>
```

### Step 3: Create Staging Environment (3 minutes)

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/environments
2. Click **New environment** → Name: `staging`
3. Click **Add secret** → Add these 3 secrets:

```
Name: STAGING_HOST
Value: staging.aeroedu.com
```

```
Name: STAGING_USER
Value: deploy
```

```
Name: STAGING_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
<paste staging private key from step 3>
-----END OPENSSH PRIVATE KEY-----
```

### Step 4: Create Production Environment (3 minutes)

1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/environments
2. Click **New environment** → Name: `production`
3. Click **Add secret** → Add these 3 secrets:

```
Name: PRODUCTION_HOST
Value: api.aeroedu.com
```

```
Name: PRODUCTION_USER
Value: deploy
```

```
Name: PRODUCTION_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
<paste production private key from step 3>
-----END OPENSSH PRIVATE KEY-----
```

---

## ✅ Verify (2 minutes)

### Check Secrets
1. Go to: https://github.com/aerovfx/Aeroeduvison/settings/secrets/actions
2. You should see:
   - ✅ 2 repository secrets
   - ✅ 3 staging environment secrets
   - ✅ 3 production environment secrets

### Test Pipeline
```bash
# Push to trigger pipeline
git push origin siri

# Monitor: https://github.com/aerovfx/Aeroeduvison/actions
```

---

## 🎉 Done!

**Total Time:** 15 minutes

**What's Configured:**
- ✅ Docker Hub authentication
- ✅ Staging deployment
- ✅ Production deployment
- ✅ CI/CD pipeline ready

**Next Steps:**
1. Wait for pipeline to complete
2. Check deployment succeeded
3. Continue with database queries implementation

---

## 🆘 Quick Troubleshooting

**Pipeline fails at "Login to Docker Hub"?**
- Check DOCKER_USERNAME is correct
- Regenerate DOCKER_PASSWORD token

**Pipeline fails at "Deploy to staging"?**
- Check STAGING_HOST is correct (no https://)
- Verify SSH public key is on server: `~/.ssh/authorized_keys`

**Can't add secrets?**
- You need admin/owner permissions on repository
- Contact repository owner

---

**Quick Start Complete!** ⚡

**Full Guide:** See `GITHUB_SECRETS_SETUP.md` for detailed instructions
