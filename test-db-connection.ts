
import { PrismaClient } from '@prisma/client'

async function main() {
    const prisma = new PrismaClient()
    try {
        console.log('Connecting to database...')
        const userCount = await prisma.user.count()
        console.log('Successfully connected! User count:', userCount)
    } catch (error) {
        console.error('Failed to connect to database:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
