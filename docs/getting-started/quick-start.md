# Quick Start Guide

Get AeroEduVison running in 5 minutes with this step-by-step guide.

## 🚀 Launch Checklist

- [ ] Prerequisites installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Database running
- [ ] Server started

## Step 1: Quick Setup (2 minutes)

### One-Command Setup (Recommended)

```bash
# Clone and setup everything
git clone https://github.com/aerovfx/Aeroeduvison.git
cd Aeroeduvison
npm run setup:quick
```

The `setup:quick` script will:
- Install all dependencies
- Setup environment variables
- Create and migrate database
- Seed initial data

### Manual Setup

If you prefer manual control:

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env.local

# Setup database (choose one option)
npm run db:setup:local    # Local PostgreSQL
npm run db:setup:docker   # Docker PostgreSQL

# Generate and migrate
npm run db:generate
npm run db:push
npm run db:seed
```

## Step 2: Start the Application (1 minute)

```bash
# Start development server
npm run dev
```

**Expected output:**
```
✓ Ready - started server on 0.0.0.0:3000, url: http://localhost:3000
✓ Compiled / in 2.3s
```

## Step 3: First Login (2 minutes)

1. **Open your browser** to [http://localhost:3000](http://localhost:3000)

2. **Sign up as a teacher:**
   - Click "Sign Up"
   - Choose "Teacher" role
   - Fill in details:
     - Email: `teacher@example.com`
     - Password: `password123`
     - Name: `Demo Teacher`

3. **Verify your account:**
   - Check terminal for verification link
   - Or use the seeded admin account:
     - Email: `admin@aeroeduvison.com`
     - Password: `admin123`

## Step 4: Explore the Dashboard

### 🎯 Teacher Dashboard

After login, you'll see:

- **Course Management**: Create and organize courses
- **Student Progress**: Track learning analytics
- **Lab Assignments**: Design interactive experiments
- **AI Content Generator**: Auto-create lesson materials

### 🧪 Try Your First Simulation

1. Go to **Labs** → **Physics Simulations**
2. Click **"Projectile Motion"**
3. Adjust parameters and watch real-time visualization
4. Try **"Aerodynamics Simulator"** for flight dynamics

### 🤖 Use AI Features

1. Navigate to **Content** → **AI Generator**
2. Enter a topic: *"Newton's Laws of Motion"*
3. Watch as AI generates complete lesson materials
4. Customize and save the content

## 🎉 You're Done!

**Congratulations!** You've successfully launched AeroEduVison. Here's what you can do next:

### Immediate Next Steps

- [ ] **Create your first course** in the dashboard
- [ ] **Add students** to your course
- [ ] **Assign a lab simulation** to students
- [ ] **Grade submissions** using OCR auto-grading

### Explore Advanced Features

- [ ] **Custom Simulations**: Build your own interactive labs
- [ ] **AI Tutoring**: Enable personalized learning paths
- [ ] **Analytics Dashboard**: Monitor student engagement
- [ ] **Deployment**: Move to production with Google Cloud

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes
npm run db:seed         # Seed initial data
npm run db:studio       # Open Prisma Studio

# Testing
npm run test            # Run all tests
npm run test:auth       # Test authentication
npm run test:e2e        # End-to-end tests

# Deployment
npm run deploy:dev      # Deploy to dev environment
npm run deploy:prod     # Deploy to production
```

## Troubleshooting Quick Fixes

### Server won't start?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Database connection issues?
```bash
# Reset database
npm run db:reset
npm run db:seed
```

### Blank page in browser?
- Clear browser cache
- Check console for errors (F12 → Console)
- Verify environment variables

## 🎯 Success Metrics

After setup, verify these work:

- ✅ **Login/Registration** - User authentication
- ✅ **Dashboard Access** - Role-based navigation
- ✅ **Simulation Loading** - Interactive labs work
- ✅ **AI Features** - Content generation functions
- ✅ **Database** - Data persists between sessions

## 📞 Need Help?

- **Documentation**: [Full Installation Guide](./installation.md)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-issues.md)
- **Community**: Join our Discord/Slack (coming soon)

---

**Ready for more?** Continue with [Creating Your First Course](../simulations/quick-start-labs.md) or explore [Advanced Features](../ai-features/overview.md).