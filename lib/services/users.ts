import "server-only";
import { prisma } from "@/lib/db";

/** Contact details used to prefill checkout for a logged-in customer. */
export async function getCheckoutDefaults(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      addresses: { select: { street: true, city: true, zip: true }, take: 1 },
    },
  });
  if (!user) return null;
  const address = user.addresses[0];
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
    street: address?.street ?? "",
    city: address?.city ?? "",
    zip: address?.zip ?? "",
  };
}
