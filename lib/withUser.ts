'use server';

import type { User } from '@/app/generated/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export type SafeUser = Omit<User, 'password' | 'isDeleted'>;

export async function withUser(): Promise<SafeUser> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) redirect('/login');

    let decoded: { id: string };
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
            id: true, fname: true, lname: true, email: true,
            username: true, permissions: true, createdAt: true
        },
    });

    if (!user) redirect('/login');
    return user;
}
