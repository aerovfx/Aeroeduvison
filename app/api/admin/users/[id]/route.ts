import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const user = await db.user.findFirst({
      where: { 
        id,
        schoolId: admin.schoolId 
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    const { id } = await params;
    apiLogger.error('Error fetching user', {
      metadata: { 
        userId: id,
        errorMessage: (error as Error).message 
      }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    
    // Check if user exists and belongs to same school
    const existingUser = await db.user.findFirst({
      where: { 
        id,
        schoolId: admin.schoolId 
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailTaken = await db.user.findUnique({
        where: { email }
      });

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already taken' },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role: role.toUpperCase() })
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

    apiLogger.info('Admin updated user', {
      metadata: {
        adminId: admin.id,
        userId: id,
        updatedFields: { name, email, role }
      }
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    const { id } = await params;
    apiLogger.error('Error updating user', {
      metadata: { 
        userId: id,
        errorMessage: (error as Error).message 
      }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    
    // Check if user exists and belongs to same school
    const existingUser = await db.user.findFirst({
      where: { 
        id,
        schoolId: admin.schoolId 
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    await db.user.delete({
      where: { id }
    });

    apiLogger.info('Admin deleted user', {
      metadata: {
        adminId: admin.id,
        deletedUserId: id,
        deletedUserEmail: existingUser.email
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    apiLogger.error('Error deleting user', {
      metadata: { 
        userId: id,
        errorMessage: (error as Error).message 
      }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
