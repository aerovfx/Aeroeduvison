const fs = require('fs');
const path = require('path');

// List of remaining files that need params fix
const filesToUpdate = [
  'app/api/courses/[courseId]/chapters/[chapterId]/unpublish/route.ts',
  'app/api/courses/[courseId]/chapters/[chapterId]/route.ts',
  'app/api/courses/[courseId]/chapters/route.ts',
  'app/api/courses/[courseId]/publish/route.ts',
  'app/api/courses/[courseId]/unpublish/route.ts',
  'app/api/courses/[courseId]/route.ts'
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
  
  // Add await params destructuring at the beginning of try block
  content = content.replace(
    /try\s*{\s*\n\s*const\s*session\s*=\s*await\s*getServerSession\(authOptions\);/g,
    'try {\n    const { courseId } = await params;\n    const session = await getServerSession(authOptions);'
  );
  
  content = content.replace(
    /try\s*{\s*\n\s*const\s*session\s*=\s*await\s*getServerSession\(authOptions\);\s*\n\s*const\s*userId\s*=\s*session\?\?\.user\?\?\.id;/g,
    'try {\n    const { courseId, chapterId } = await params;\n    const session = await getServerSession(authOptions);\n    const userId = session?.user?.id;'
  );
  
  // Fix params usage
  content = content.replace(/params\.courseId/g, 'courseId');
  content = content.replace(/params\.chapterId/g, 'chapterId');
  
  fs.writeFileSync(fullPath, content);
  console.log(`Updated: ${filePath}`);
}

console.log('Fixing remaining Next.js 15 params...');

filesToUpdate.forEach(updateFile);

console.log('Done!');
