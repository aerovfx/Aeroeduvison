# STEM Projects - Quick Reference 🚀

## 🌐 Live URLs

- **Main Dashboard:** https://inphysic.com/dashboard/stem
- **Create Project:** https://inphysic.com/dashboard/stem/create
- **Templates:** https://inphysic.com/dashboard/stem/templates
- **Project Detail:** https://inphysic.com/dashboard/stem/[id]
- **Edit Project:** https://inphysic.com/dashboard/stem/[id]/edit
- **Timeline:** https://inphysic.com/dashboard/stem/[id]/timeline

---

## ⚡ Quick Commands

```bash
# Test STEM page
curl -I https://inphysic.com/dashboard/stem

# Run verification script
./test-stem-page.sh

# Test locally
npm run dev
# Visit: http://localhost:3000/dashboard/stem

# Build project
npm run build

# Check for errors
npm run lint
```

---

## 📊 Mock Projects (10 Available)

| Project | Category | Status | Difficulty |
|---------|----------|--------|-----------|
| Smart Traffic Light System | Engineering | Completed | Advanced |
| AI Tutor for Math | Technology | Completed | Advanced |
| Ocean Cleaner Boat | Engineering | Completed | Advanced |
| Renewable Energy House | Engineering | Completed | Intermediate |
| Virtual Chemistry Lab | Science | Completed | Advanced |
| Smart Waste Bin | Technology | Completed | Intermediate |
| AI Language Learning App | Technology | Completed | Advanced |
| Earthquake Warning System | Engineering | Completed | Advanced |
| BioPlastic from Waste | Science | Completed | Intermediate |
| Smart Classroom IoT | Technology | Completed | Intermediate |

---

## 🔧 Features Available

### Dashboard:
- ✅ Project grid (responsive 3-column)
- ✅ Statistics cards (5 metrics)
- ✅ Search by title/description/tags
- ✅ Filter by status (6 options)
- ✅ Filter by category (4 categories)

### Project Card Shows:
- Title & description
- Category icon & badge
- Status badge
- Progress bar
- Team members (with avatars)
- Tags
- Instructor info
- Due date
- Feedback count
- Action buttons

### CRUD Operations:
- ✅ Create new project
- ✅ View project details
- ✅ Edit project
- ✅ View timeline
- ✅ Browse templates
- ✅ Delete project

---

## 🐛 Troubleshooting

### Page shows loading forever:
```bash
# Clear localStorage
# In browser console:
localStorage.removeItem('stem-projects');
localStorage.removeItem('stem-projects-version');
# Refresh page
```

### Projects not showing:
```bash
# Check Context is working
# In browser console:
console.log(localStorage.getItem('stem-projects'));
# Should show JSON array of 10 projects
```

### API errors:
```bash
# Check network tab in DevTools
# API calls should either:
# 1. Succeed (200) - load from database
# 2. Fail gracefully - fallback to mock data
```

---

## 📁 Key Files

### Context:
- `contexts/STEMContext.tsx` - Data provider with 10 mock projects

### Pages:
- `app/(dashboard)/(routes)/dashboard/stem/page.tsx` - Main dashboard
- `app/(dashboard)/(routes)/dashboard/stem/create/page.tsx` - Create form
- `app/(dashboard)/(routes)/dashboard/stem/templates/page.tsx` - Templates
- `app/(dashboard)/(routes)/dashboard/stem/[id]/page.tsx` - Detail view
- `app/(dashboard)/(routes)/dashboard/stem/[id]/edit/page.tsx` - Edit form
- `app/(dashboard)/(routes)/dashboard/stem/[id]/timeline/page.tsx` - Timeline

### API Routes:
- `app/api/stem/projects/route.ts` - GET/POST projects
- `app/api/stem/projects/[id]/route.ts` - GET/PUT/DELETE project
- `app/api/stem/test/route.ts` - Test endpoint
- `app/api/stem/sync/route.ts` - Sync endpoint

---

## 🎯 Status Badges

| Status | Color | Description |
|--------|-------|-------------|
| Draft | Gray | Initial stage |
| In Progress | Blue | Currently working |
| Review | Yellow | Awaiting review |
| Completed | Green | Finished |
| Published | Purple | Public |

---

## 📚 Categories

| Category | Icon | Color |
|----------|------|-------|
| Science | Flask | Blue |
| Technology | Cpu | Green |
| Engineering | Wrench | Orange |
| Math | Calculator | Purple |

---

## 🎨 Difficulty Levels

| Level | Color | Description |
|-------|-------|-------------|
| Beginner | Green | Entry level |
| Intermediate | Yellow | Moderate |
| Advanced | Red | Expert |

---

## 🔍 Search & Filter

### Search works on:
- Project title
- Project description
- All tags

### Status Filter:
- All statuses
- Draft
- In Progress
- Review
- Completed
- Published

### Category Filter:
- All categories
- Science
- Technology
- Engineering
- Math

---

## 📊 Statistics Shown

1. **Total Projects** - Count of all projects
2. **Completed** - Count of completed projects (green)
3. **In Progress** - Count of ongoing projects (blue)
4. **Draft** - Count of draft projects (gray)
5. **Review** - Count of projects in review (yellow)

---

## 💾 Data Storage

### LocalStorage Keys:
- `stem-projects` - JSON array of projects
- `stem-projects-version` - Version number (2.0 or 3.0)

### Versions:
- **2.0** - Local mock data
- **3.0** - API data (when available)

---

## 🚀 Quick Test

```bash
# Method 1: Use test script
./test-stem-page.sh

# Method 2: Manual curl
curl -I https://inphysic.com/dashboard/stem
# Expected: HTTP 200

# Method 3: Browser
# Open: https://inphysic.com/dashboard/stem
# Should show 10 projects immediately
```

---

## 📝 Notes

- ✅ Mock projects always available (10 projects)
- ✅ API is optional enhancement
- ✅ Page works offline (uses localStorage)
- ✅ Loading guaranteed to complete (500ms max)
- ✅ No authentication required to view mock data
- ⚠️ Authentication required to create real projects

---

## 🆘 Get Help

### Debug Mode:
```javascript
// In browser console:
// Check projects in Context
localStorage.getItem('stem-projects');

// Check version
localStorage.getItem('stem-projects-version');

// Force reload mock data
localStorage.removeItem('stem-projects');
localStorage.removeItem('stem-projects-version');
location.reload();
```

### Common Issues:

**Issue:** Page stuck loading
**Fix:** Clear localStorage and refresh

**Issue:** Projects not showing
**Fix:** Check Context initialization in DevTools

**Issue:** Search not working
**Fix:** Check if searchTerm is properly set in state

**Issue:** Filters not working
**Fix:** Verify filter values in dropdowns

---

## 📖 Documentation

- **Complete Fix:** `STEM_PAGE_FIX_SUMMARY.md`
- **Test Script:** `test-stem-page.sh`
- **This Quick Reference:** `STEM_QUICK_REFERENCE.md`

---

**Last Updated:** October 9, 2025  
**Status:** ✅ Fully Operational  
**Version:** 1.0

