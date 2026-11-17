import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { EmailTakenError, listAccountOrders, registerCustomer } from "@/lib/services/accounts";
import { verifyCredentials } from "@/lib/services/auth";
import { createOrder } from "@/lib/services/orders";
import { signupSchema } from "@/lib/validation/auth";
import { makeProduct, orderInput } from "./fixtures";

afterAll(() => prisma.$disconnect());

const newEmail = () => `customer-${randomBytes(4).toString("hex")}@test.local`;
const signup = (email: string, password = "correct horse battery") =>
  signupSchema.parse({ firstName: "Sami", lastName: "Haddad", email, phone: "98 765 432", password, confirmPassword: password });

describe("registerCustomer", () => {
  it("creates a CUSTOMER with a bcrypt hash that verifies", async () => {
    const email = newEmail();
    const user = await registerCustomer(signup(email));

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.role).toBe("CUSTOMER");
    expect(row.phone).toBe("+21698765432");
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.passwordHash).not.toContain("correct horse");

    await expect(verifyCredentials({ email, password: "correct horse battery" })).resolves.toMatchObject({ id: user.id, role: "CUSTOMER" });
    await expect(verifyCredentials({ email, password: "wrong password" })).resolves.toBeNull();
  });

  it("refuses a second account for the same email, whatever its case", async () => {
    const email = newEmail();
    await registerCustomer(signup(email));
    await expect(registerCustomer(signup(email.toUpperCase()))).rejects.toBeInstanceOf(EmailTakenError);
  });
});

describe("order history", () => {
  it("lists only orders placed while logged in, never guest orders with the same email", async () => {
    const email = newEmail();
    const { variant } = await makeProduct({ M: 10 });
    const line = [{ variantId: variant("M").id, quantity: 1, unitPrice: 75_000 }];

    // Someone checks out as a guest with this email first (a stranger could do this, too).
    await createOrder({ ...orderInput(line), email }, null);

    const user = await registerCustomer(signup(email));
    const mine = await createOrder({ ...orderInput(line), email }, user.id);

    const history = await listAccountOrders(user.id);
    expect(history.map((o) => o.id)).toEqual([mine.id]);
    expect(history[0]).toMatchObject({ itemCount: 1, total: 82_000 });
  });

  it("is empty for a new account", async () => {
    const user = await registerCustomer(signup(newEmail()));
    expect(await listAccountOrders(user.id)).toEqual([]);
  });
});
