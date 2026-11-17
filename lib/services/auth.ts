import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { LoginInput } from "@/lib/validation/auth";

export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Real hash generated once, so unknown emails cost the same time as wrong passwords.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("flockoff-dummy-password", BCRYPT_ROUNDS));

/** Returns the user (without hash) if the credentials are valid, otherwise null. */
export async function verifyCredentials({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
  };
}
