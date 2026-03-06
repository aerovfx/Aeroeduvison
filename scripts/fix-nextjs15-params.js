const fs = require('fs');
const path = require('path');

// List of files that need params fix
const filesToUpdate = [
  'app/(course)/courses/[courseId]/layout.tsx',
  'app/(dashboard)/(routes)/teacher/courses/[courseId]/page.tsx',
  'app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/page.tsx',
  'app/api/courses/[courseId]/route.ts',
  'app/api/courses/[courseId]/publish/route.ts',
  'app/api/courses/[courseId]/unpublish/route.ts',
  'app/api/courses/[courseId]/chapters/route.ts',
  'app/api/courses/[courseId]/chapters/reorder/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/publish/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/unpublish/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/progress/route.ts',
  'app/api/courses/[courseId]/attachments/route.ts',
  'app/api/courses/[courseId]/attachments/[attachmentId]/route.ts',
  'app/api/courses/[courseId]/checkout/route.ts'
];

function updateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix params type for Next.js 15
  content = content.replace(
    /params:\s*{\s*courseId:\s*string\s*}/g,
    'params: Promise<{ courseId: string }>'
  );
  
  content = content.replace(
    /params:\s*{\s*courseId:\s*string;\s*chapterId:\s*string\s*}/g,
    'params: Promise<{ courseId: string; chapterId: string }>'
  );
  
  content = content.replace(
    /params:\s*{\s*attachmentId:\s*string;\s*courseId:\s*string\s*}/g,
    'params: Promise<{ attachmentId: string; courseId: string }>'
  );
  
  // Add await params destructuring
  content = content.replace(
    /const\s*{\s*courseId\s*}\s*=\s*params;/g,
    'const { courseId } = await params;'
  );
  
  content = content.replace(
    /const\s*{\s*courseId,\s*chapterId\s*}\s*=\s*params;/g,
    'const { courseId, chapterId } = await params;'
  );
  
  content = content.replace(
    /const\s*{\s*attachmentId,\s*courseId\s*}\s*=\s*params;/g,
    'const { attachmentId, courseId } = await params;'
  );
  
  // Fix params usage
  content = content.replace(/params\.courseId/g, 'courseId');
  content = content.replace(/params\.chapterId/g, 'chapterId');
  content = content.replace(/params\.attachmentId/g, 'attachmentId');
  
  fs.writeFileSync(fullPath, content);
  console.log(`Updated: ${filePath}`);
}

console.log('Fixing Next.js 15 params...');

filesToUpdate.forEach(updateFile);

console.log('Done!');
