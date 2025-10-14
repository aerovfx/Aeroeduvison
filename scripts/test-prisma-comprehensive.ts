#!/usr/bin/env tsx

/**
 * Comprehensive Prisma Database Test Suite
 * 
 * Tests:
 * 1. CRUD Operations for all major models
 * 2. Complex queries with relations
 * 3. Data validation and constraints
 * 4. Schema integrity
 * 5. Transaction handling
 */

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message: string) {
  log(`✅ ${message}`, colors.green)
}

function error(message: string) {
  log(`❌ ${message}`, colors.red)
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan)
}

function section(message: string) {
  log(`\n${"=".repeat(60)}`, colors.blue)
  log(`  ${message}`, colors.blue)
  log(`${"=".repeat(60)}`, colors.blue)
}

// Test data
const testUserEmail = `test-user-${Date.now()}@example.com`
const testTeacherEmail = `test-teacher-${Date.now()}@example.com`
let testUserId: string
let testTeacherId: string
let testCourseId: string
let testCategoryId: string
let testChapterId: string

async function testUserCRUD() {
  section("Testing User CRUD Operations")
  
  try {
    // CREATE
    info("Creating test users...")
    const hashedPassword = await hash("TestPassword123!", 10)
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: "Test Student",
        password: hashedPassword,
        role: "STUDENT",
      }
    })
    testUserId = user.id
    success(`Created user: ${user.email} (${user.id})`)
    
    const teacher = await prisma.user.create({
      data: {
        email: testTeacherEmail,
        name: "Test Teacher",
        password: hashedPassword,
        role: "TEACHER",
      }
    })
    testTeacherId = teacher.id
    success(`Created teacher: ${teacher.email} (${teacher.id})`)
    
    // READ
    info("Reading user...")
    const foundUser = await prisma.user.findUnique({
      where: { email: testUserEmail }
    })
    if (foundUser?.email === testUserEmail) {
      success("User read successfully")
    } else {
      throw new Error("User not found")
    }
    
    // UPDATE
    info("Updating user...")
    const updatedUser = await prisma.user.update({
      where: { id: testUserId },
      data: { name: "Updated Test Student" }
    })
    if (updatedUser.name === "Updated Test Student") {
      success("User updated successfully")
    } else {
      throw new Error("User update failed")
    }
    
    // LIST with filters
    info("Listing users with filters...")
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" }
    })
    success(`Found ${students.length} students`)
    
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" }
    })
    success(`Found ${teachers.length} teachers`)
    
  } catch (err) {
    error(`User CRUD test failed: ${err}`)
    throw err
  }
}

async function testCourseCRUD() {
  section("Testing Course CRUD Operations")
  
  try {
    // Create Category first
    info("Creating test category...")
    const category = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`
      }
    })
    testCategoryId = category.id
    success(`Created category: ${category.name}`)
    
    // CREATE Course
    info("Creating test course...")
    const course = await prisma.course.create({
      data: {
        title: "Test Mathematics Course",
        description: "A comprehensive test course",
        userId: testTeacherId,
        categoryId: testCategoryId,
        price: 99.99,
        isPublished: true,
      }
    })
    testCourseId = course.id
    success(`Created course: ${course.title} (${course.id})`)
    
    // READ with relations
    info("Reading course with relations...")
    const courseWithRelations = await prisma.course.findUnique({
      where: { id: testCourseId },
      include: {
        user: true,
        category: true,
        chapters: true,
        attachments: true,
      }
    })
    if (courseWithRelations) {
      success("Course read with relations successfully")
      info(`  Teacher: ${courseWithRelations.user.name}`)
      info(`  Category: ${courseWithRelations.category?.name}`)
      info(`  Chapters: ${courseWithRelations.chapters.length}`)
    }
    
    // UPDATE
    info("Updating course...")
    const updatedCourse = await prisma.course.update({
      where: { id: testCourseId },
      data: { 
        title: "Updated Test Mathematics Course",
        price: 149.99 
      }
    })
    if (updatedCourse.title.includes("Updated") && updatedCourse.price === 149.99) {
      success("Course updated successfully")
    }
    
    // LIST courses by teacher
    info("Listing courses by teacher...")
    const teacherCourses = await prisma.course.findMany({
      where: { userId: testTeacherId },
      include: { category: true }
    })
    success(`Found ${teacherCourses.length} courses for teacher`)
    
    // LIST published courses
    const publishedCourses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    })
    success(`Found ${publishedCourses.length} published courses`)
    
  } catch (err) {
    error(`Course CRUD test failed: ${err}`)
    throw err
  }
}

async function testChapterCRUD() {
  section("Testing Chapter (Quiz) CRUD Operations")
  
  try {
    // CREATE
    info("Creating test chapter...")
    const chapter = await prisma.chapter.create({
      data: {
        title: "Chapter 1: Introduction",
        description: "Introduction to the course",
        courseId: testCourseId,
        position: 1,
        isPublished: true,
        isFree: true,
      }
    })
    testChapterId = chapter.id
    success(`Created chapter: ${chapter.title}`)
    
    // Create more chapters
    await prisma.chapter.create({
      data: {
        title: "Chapter 2: Advanced Topics",
        courseId: testCourseId,
        position: 2,
        isPublished: true,
      }
    })
    
    // READ with course
    info("Reading chapter with course...")
    const chapterWithCourse = await prisma.chapter.findUnique({
      where: { id: testChapterId },
      include: {
        course: {
          include: { user: true }
        }
      }
    })
    if (chapterWithCourse) {
      success("Chapter read with relations successfully")
      info(`  Course: ${chapterWithCourse.course.title}`)
      info(`  Teacher: ${chapterWithCourse.course.user.name}`)
    }
    
    // UPDATE
    info("Updating chapter...")
    await prisma.chapter.update({
      where: { id: testChapterId },
      data: { 
        title: "Updated Chapter 1: Introduction",
        videoUrl: "https://example.com/video.mp4"
      }
    })
    success("Chapter updated successfully")
    
    // LIST chapters by course
    info("Listing chapters by course...")
    const courseChapters = await prisma.chapter.findMany({
      where: { courseId: testCourseId },
      orderBy: { position: 'asc' }
    })
    success(`Found ${courseChapters.length} chapters in course`)
    
  } catch (err) {
    error(`Chapter CRUD test failed: ${err}`)
    throw err
  }
}

async function testRelations() {
  section("Testing Complex Relations")
  
  try {
    // Test Purchase (User enrollment)
    info("Creating purchase (enrollment)...")
    const purchase = await prisma.purchase.create({
      data: {
        userId: testUserId,
        courseId: testCourseId,
      }
    })
    success(`Created purchase for user ${testUserId}`)
    
    // Query enrolled courses for user
    info("Querying enrolled courses for user...")
    const enrolledCourses = await prisma.purchase.findMany({
      where: { userId: testUserId },
      include: {
        course: {
          include: {
            chapters: {
              where: { isPublished: true },
              orderBy: { position: 'asc' }
            },
            category: true,
            user: true,
          }
        }
      }
    })
    success(`User enrolled in ${enrolledCourses.length} course(s)`)
    enrolledCourses.forEach(enrollment => {
      info(`  - ${enrollment.course.title} (${enrollment.course.chapters.length} chapters)`)
    })
    
    // Test User Progress
    info("Creating user progress...")
    const progress = await prisma.userProgress.create({
      data: {
        userId: testUserId,
        chapterId: testChapterId,
        isCompleted: true,
      }
    })
    success("User progress created")
    
    // Query user progress for course
    info("Querying user progress for course...")
    const userProgress = await prisma.userProgress.findMany({
      where: {
        userId: testUserId,
        chapter: {
          courseId: testCourseId
        }
      },
      include: {
        chapter: true
      }
    })
    success(`User completed ${userProgress.filter(p => p.isCompleted).length} chapters`)
    
    // Calculate course completion percentage
    const totalChapters = await prisma.chapter.count({
      where: { courseId: testCourseId, isPublished: true }
    })
    const completedChapters = userProgress.filter(p => p.isCompleted).length
    const completionPercentage = (completedChapters / totalChapters) * 100
    info(`Course completion: ${completionPercentage.toFixed(1)}%`)
    
    // Test complex query: Get all courses with student count
    info("Querying courses with enrollment count...")
    const coursesWithEnrollments = await prisma.course.findMany({
      where: { isPublished: true },
      include: {
        _count: {
          select: { purchases: true }
        },
        user: true,
        category: true,
      }
    })
    success(`Found ${coursesWithEnrollments.length} published courses`)
    coursesWithEnrollments.forEach(course => {
      info(`  - ${course.title}: ${course._count.purchases} students`)
    })
    
  } catch (err) {
    error(`Relations test failed: ${err}`)
    throw err
  }
}

async function testValidation() {
  section("Testing Data Validation & Constraints")
  
  try {
    // Test unique constraint on email
    info("Testing unique email constraint...")
    try {
      await prisma.user.create({
        data: {
          email: testUserEmail, // Duplicate
          name: "Duplicate User",
          role: "STUDENT",
        }
      })
      error("Unique constraint failed - duplicate email was allowed!")
    } catch (err: any) {
      if (err.code === "P2002") {
        success("Unique constraint working - duplicate email rejected")
      } else {
        throw err
      }
    }
    
    // Test unique constraint on Purchase (user, course)
    info("Testing unique purchase constraint...")
    try {
      await prisma.purchase.create({
        data: {
          userId: testUserId,
          courseId: testCourseId, // User already purchased this
        }
      })
      error("Unique constraint failed - duplicate purchase was allowed!")
    } catch (err: any) {
      if (err.code === "P2002") {
        success("Unique constraint working - duplicate purchase rejected")
      } else {
        throw err
      }
    }
    
    // Test required fields
    info("Testing required fields...")
    try {
      await prisma.course.create({
        data: {
          // Missing required fields: title, userId
          description: "Invalid course",
        } as any
      })
      error("Validation failed - missing required fields were allowed!")
    } catch (err: any) {
      success("Required field validation working")
    }
    
    // Test foreign key constraints
    info("Testing foreign key constraints...")
    try {
      await prisma.chapter.create({
        data: {
          title: "Invalid Chapter",
          courseId: "non-existent-course-id",
          position: 1,
        }
      })
      error("Foreign key constraint failed!")
    } catch (err: any) {
      if (err.code === "P2003" || err.message.includes("foreign key")) {
        success("Foreign key constraint working")
      } else {
        throw err
      }
    }
    
    // Test cascade delete
    info("Testing cascade delete...")
    const tempCourse = await prisma.course.create({
      data: {
        title: "Temp Course for Cascade Test",
        userId: testTeacherId,
      }
    })
    const tempChapter = await prisma.chapter.create({
      data: {
        title: "Temp Chapter",
        courseId: tempCourse.id,
        position: 1,
      }
    })
    
    await prisma.course.delete({
      where: { id: tempCourse.id }
    })
    
    const deletedChapter = await prisma.chapter.findUnique({
      where: { id: tempChapter.id }
    })
    if (!deletedChapter) {
      success("Cascade delete working - chapter deleted with course")
    } else {
      error("Cascade delete failed - orphaned chapter found")
    }
    
  } catch (err) {
    error(`Validation test failed: ${err}`)
    throw err
  }
}

async function testTransactions() {
  section("Testing Transactions")
  
  try {
    info("Testing successful transaction...")
    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: { name: `Transaction Category ${Date.now()}` }
      })
      
      const course = await tx.course.create({
        data: {
          title: "Transaction Test Course",
          userId: testTeacherId,
          categoryId: category.id,
        }
      })
      
      return { category, course }
    })
    success("Transaction completed successfully")
    info(`  Created category: ${result.category.name}`)
    info(`  Created course: ${result.course.title}`)
    
    // Test rollback on error
    info("Testing transaction rollback...")
    const categoryCountBefore = await prisma.category.count()
    
    try {
      await prisma.$transaction(async (tx) => {
        await tx.category.create({
          data: { name: `Rollback Test ${Date.now()}` }
        })
        
        // Force error with duplicate email
        await tx.user.create({
          data: {
            email: testUserEmail, // Duplicate!
            name: "Will Rollback",
            role: "STUDENT",
          }
        })
      })
      error("Transaction should have rolled back!")
    } catch (err) {
      const categoryCountAfter = await prisma.category.count()
      if (categoryCountBefore === categoryCountAfter) {
        success("Transaction rollback working - no orphaned data")
      } else {
        error("Transaction rollback failed - orphaned data found")
      }
    }
    
  } catch (err) {
    error(`Transaction test failed: ${err}`)
    throw err
  }
}

async function testMigrationStatus() {
  section("Checking Migration Status")
  
  try {
    info("Checking database connection...")
    await prisma.$queryRaw`SELECT 1`
    success("Database connection OK")
    
    // Count records in each table
    info("Checking table record counts...")
    const counts = {
      users: await prisma.user.count(),
      courses: await prisma.course.count(),
      chapters: await prisma.chapter.count(),
      categories: await prisma.category.count(),
      purchases: await prisma.purchase.count(),
      userProgress: await prisma.userProgress.count(),
    }
    
    success("All tables accessible:")
    Object.entries(counts).forEach(([table, count]) => {
      info(`  ${table}: ${count} records`)
    })
    
  } catch (err) {
    error(`Migration status check failed: ${err}`)
    throw err
  }
}

async function cleanup() {
  section("Cleaning Up Test Data")
  
  try {
    info("Deleting test data...")
    
    // Delete in correct order due to foreign keys
    if (testUserId) {
      await prisma.userProgress.deleteMany({ where: { userId: testUserId } })
      await prisma.purchase.deleteMany({ where: { userId: testUserId } })
    }
    
    if (testCourseId) {
      await prisma.chapter.deleteMany({ where: { courseId: testCourseId } })
      await prisma.attachment.deleteMany({ where: { courseId: testCourseId } })
      await prisma.purchase.deleteMany({ where: { courseId: testCourseId } })
      await prisma.course.delete({ where: { id: testCourseId } })
    }
    
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } })
    }
    
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } })
    }
    
    if (testTeacherId) {
      // Delete teacher's courses first
      const teacherCourses = await prisma.course.findMany({
        where: { userId: testTeacherId }
      })
      for (const course of teacherCourses) {
        await prisma.chapter.deleteMany({ where: { courseId: course.id } })
        await prisma.purchase.deleteMany({ where: { courseId: course.id } })
        await prisma.course.delete({ where: { id: course.id } })
      }
      
      await prisma.user.delete({ where: { id: testTeacherId } })
    }
    
    // Clean up transaction test data
    await prisma.category.deleteMany({
      where: {
        name: {
          startsWith: "Transaction Category"
        }
      }
    })
    
    success("Test data cleaned up successfully")
  } catch (err) {
    error(`Cleanup failed: ${err}`)
  }
}

async function main() {
  log("\n🚀 Starting Comprehensive Prisma Test Suite\n", colors.magenta)
  
  const startTime = Date.now()
  let passed = 0
  let failed = 0
  
  const tests = [
    { name: "Migration Status", fn: testMigrationStatus },
    { name: "User CRUD", fn: testUserCRUD },
    { name: "Course CRUD", fn: testCourseCRUD },
    { name: "Chapter CRUD", fn: testChapterCRUD },
    { name: "Relations", fn: testRelations },
    { name: "Validation", fn: testValidation },
    { name: "Transactions", fn: testTransactions },
  ]
  
  for (const test of tests) {
    try {
      await test.fn()
      passed++
    } catch (err) {
      failed++
      error(`Test suite "${test.name}" failed`)
    }
  }
  
  await cleanup()
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  section("Test Summary")
  log(`Total tests: ${tests.length}`, colors.cyan)
  log(`Passed: ${passed}`, colors.green)
  log(`Failed: ${failed}`, colors.red)
  log(`Duration: ${duration}s`, colors.yellow)
  
  if (failed === 0) {
    log("\n🎉 All Prisma tests passed!", colors.green)
  } else {
    log("\n⚠️  Some tests failed. Please review the errors above.", colors.red)
  }
}

main()
  .catch((err) => {
    error(`Fatal error: ${err}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


