import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { username, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password || user.isDeleted === true) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, permissions: user.permissions },
        process.env.JWT_SECRET as string,
        { expiresIn: '1d' }
    );

    const response = NextResponse.json({ message: 'Logged in' });
    response.cookies.set('token', token, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24,
    });

    return response;
}
