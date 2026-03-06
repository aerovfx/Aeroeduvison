const fs = require('fs');
const path = require('path');

// List of files that need to be updated
const filesToUpdate = [
  'app/api/uploadthing/core.ts',
  'app/api/courses/[courseId]/unpublish/route.ts',
  'app/api/courses/[courseId]/publish/route.ts',
  'app/api/courses/[courseId]/checkout/route.ts',
  'app/api/courses/[courseId]/chapters/route.ts',
  'app/api/courses/[courseId]/chapters/reorder/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/unpublish/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/publish/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/progress/route.ts',
  'app/api/courses/[courseId]/attachments/route.ts',
  'app/api/courses/[courseId]/attachments/[attachmentId]/route.ts',
  'app/(dashboard)/(routes)/teacher/layout.tsx',
  'app/(dashboard)/(routes)/teacher/courses/page.tsx',
  'app/(dashboard)/(routes)/teacher/courses/[courseId]/page.tsx',
  'app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/page.tsx',
  'app/(dashboard)/(routes)/teacher/analytics/page.tsx',
  'app/(dashboard)/(routes)/search/page.tsx',
  'app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx'
];

function updateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace Clerk imports
  content = content.replace(
    /import\s*{\s*auth\s*}\s*from\s*["']@clerk\/nextjs["'];?/g,
    'import { getServerSession } from "next-auth/next";\nimport { authOptions } from "@/lib/auth";'
  );
  
  content = content.replace(
    /import\s*{\s*currentUser\s*}\s*from\s*["']@clerk\/nextjs["'];?/g,
    'import { getServerSession } from "next-auth/next";\nimport { authOptions } from "@/lib/auth";'
  );
  
  // Replace auth() calls
  content = content.replace(
    /const\s*{\s*userId\s*}\s*=\s*auth\(\);?/g,
    'const session = await getServerSession(authOptions);\n  const userId = session?.user?.id;'
  );
  
  content = content.replace(
    /const\s*{\s*userId\s*}\s*=\s*await\s*auth\(\);?/g,
    'const session = await getServerSession(authOptions);\n  const userId = session?.user?.id;'
  );
  
  content = content.replace(
    /const\s*user\s*=\s*await\s*currentUser\(\);?/g,
    'const session = await getServerSession(authOptions);\n  const user = session?.user;'
  );
  
  // Replace userId checks
  content = content.replace(
    /if\s*\(\s*!userId\s*\)/g,
    'if (!userId)'
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`Updated: ${filePath}`);
}

console.log('Updating Clerk imports to NextAuth.js...');

filesToUpdate.forEach(updateFile);

console.log('Done!');
