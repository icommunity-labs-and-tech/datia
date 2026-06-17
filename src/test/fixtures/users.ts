import type { UserRecord } from '@/domain/users/UserRepository';

export const createUserFixture = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-123',
  organizationId: 'org-test-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  phone: null,
  notes: null,
  signsWithCertificate: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createAdminUserFixture = (overrides: Partial<UserRecord> = {}): UserRecord =>
  createUserFixture({
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    ...overrides,
  });

export const createUnverifiedUserFixture = (overrides: Partial<UserRecord> = {}): UserRecord =>
  createUserFixture({
    id: 'unverified-123',
    email: 'unverified@example.com',
    name: 'Unverified User',
    ...overrides,
  });

export const createUserWithPasswordFixture = (passwordHash: string, overrides: Partial<UserRecord> = {}): UserRecord =>
  createUserFixture({
    ...overrides,
    // Note: passwordHash is not part of UserRecord, it's handled separately
  });

export const createUserListFixture = (count: number = 3): UserRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createUserFixture({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      name: `User ${i + 1}`,
    })
  );
