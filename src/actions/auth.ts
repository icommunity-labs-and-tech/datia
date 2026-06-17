'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';

export async function login({ email, password }: { email: string; password: string }) {
  try {
    const user = await userRepository.getByEmail(email);
    // We need the password hash; use getPasswordHash by id
    const hash = await userRepository.getPasswordHash(user.id);
    const ok = await bcrypt.compare(password, hash ?? '');
    if (!ok) {
      throw new Error('Credenciales inválidas');
    }
    return { message: 'Logged in successfully' };
  } catch {
    throw new Error('Credenciales inválidas');
  }
}

export async function logout() {
  redirect('/dashboard/login');
}


