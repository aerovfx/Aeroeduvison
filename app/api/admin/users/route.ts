import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users in the same school
    const users = await db.user.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    apiLogger.info('Admin fetched users list', {
      metadata: {
        adminId: user.id,
        schoolId: user.schoolId,
        userCount: users.length
      }
    });

    return NextResponse.json({ users });

  } catch (error) {
    apiLogger.error('Error fetching users', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        role: role.toUpperCase(),
        schoolId: admin.schoolId,
        password: 'temp123', // Temporary password, should be changed on first login
        emailVerified: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    apiLogger.info('Admin created new user', {
      metadata: {
        adminId: admin.id,
        newUserId: newUser.id,
        newUserEmail: newUser.email,
        newUserRole: newUser.role
      }
    });

    return NextResponse.json({ user: newUser }, { status: 201 });

  } catch (error) {
    apiLogger.error('Error creating user', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
