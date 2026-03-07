#!/usr/bin/env tsx

/**
 * Migrate data from SQLite to PostgreSQL
 */

import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import Database from "better-sqlite3"

const postgresUrl = process.env.DATABASE_URL!
const sqliteDb = new Database("prisma/dev.db")
const postgres = new PrismaClient()

async function main() {
  console.log("🚀 Starting migration from SQLite to PostgreSQL...")
  console.log("")

  try {
    // Get data from SQLite
    console.log("📊 Reading data from SQLite...")
    
    const users = sqliteDb.prepare("SELECT * FROM User").all()
    const categories = sqliteDb.prepare("SELECT * FROM Category").all()
    const courses = sqliteDb.prepare("SELECT * FROM Course").all()
    const chapters = sqliteDb.prepare("SELECT * FROM Chapter").all()
    const purchases = sqliteDb.prepare("SELECT * FROM Purchase").all()
    const userProgress = sqliteDb.prepare("SELECT * FROM UserProgress").all()
    
    console.log(`  Users: ${users.length}`)
    console.log(`  Categories: ${categories.length}`)
    console.log(`  Courses: ${courses.length}`)
    console.log(`  Chapters: ${chapters.length}`)
    console.log(`  Purchases: ${purchases.length}`)
    console.log(`  User Progress: ${userProgress.length}`)
    console.log("")

    // Migrate Users
    console.log("👥 Migrating users...")
    for (const user of users as any[]) {
      await postgres.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role,
          image: user.image,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          schoolId: user.schoolId || "default-school",
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        }
      })
    }
    console.log(`✅ Migrated ${users.length} users`)

    // Migrate Categories
    console.log("📚 Migrating categories...")
    for (const category of categories as any[]) {
      await postgres.category.upsert({
        where: { id: category.id },
        update: {},
        create: {
          id: category.id,
          name: category.name,
        }
      })
    }
    console.log(`✅ Migrated ${categories.length} categories`)

    // Migrate Courses
    console.log("📖 Migrating courses...")
    for (const course of courses as any[]) {
      await postgres.course.upsert({
        where: { id: course.id },
        update: {},
        create: {
          id: course.id,
          userId: course.userId,
          title: course.title,
          description: course.description,
          imageUrl: course.imageUrl,
          price: course.price,
          isPublished: course.isPublished === 1,
          categoryId: course.categoryId,
          schoolId: course.schoolId || "default-school",
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt),
        }
      })
    }
    console.log(`✅ Migrated ${courses.length} courses`)

    // Migrate Chapters
    console.log("📝 Migrating chapters...")
    for (const chapter of chapters as any[]) {
      await postgres.chapter.upsert({
        where: { id: chapter.id },
        update: {},
        create: {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description,
          videoUrl: chapter.videoUrl,
          position: chapter.position,
          isPublished: chapter.isPublished === 1,
          isFree: chapter.isFree === 1,
          courseId: chapter.courseId,
          createdAt: new Date(chapter.createdAt),
          updatedAt: new Date(chapter.updatedAt),
        }
      })
    }
    console.log(`✅ Migrated ${chapters.length} chapters`)

    // Migrate Purchases
    if (purchases.length > 0) {
      console.log("🛒 Migrating purchases...")
      for (const purchase of purchases as any[]) {
        await postgres.purchase.upsert({
          where: { id: purchase.id },
          update: {},
          create: {
            id: purchase.id,
            userId: purchase.userId,
            courseId: purchase.courseId,
            createdAt: new Date(purchase.createdAt),
            updatedAt: new Date(purchase.updatedAt),
          }
        })
      }
      console.log(`✅ Migrated ${purchases.length} purchases`)
    }

    // Migrate User Progress
    if (userProgress.length > 0) {
      console.log("📈 Migrating user progress...")
      for (const progress of userProgress as any[]) {
        await postgres.userProgress.upsert({
          where: { id: progress.id },
          update: {},
          create: {
            id: progress.id,
            userId: progress.userId,
            chapterId: progress.chapterId,
            isCompleted: progress.isCompleted === 1,
            createdAt: new Date(progress.createdAt),
            updatedAt: new Date(progress.updatedAt),
          }
        })
      }
      console.log(`✅ Migrated ${userProgress.length} progress records`)
    }

    console.log("")
    console.log("🎉 Migration complete!")
    console.log("")
    console.log("📊 Summary:")
    console.log(`  ✅ Users: ${users.length}`)
    console.log(`  ✅ Categories: ${categories.length}`)
    console.log(`  ✅ Courses: ${courses.length}`)
    console.log(`  ✅ Chapters: ${chapters.length}`)
    console.log(`  ✅ Purchases: ${purchases.length}`)
    console.log(`  ✅ User Progress: ${userProgress.length}`)

  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  } finally {
    sqliteDb.close()
    await postgres.$disconnect()
  }
}

main()


