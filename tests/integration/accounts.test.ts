import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { changePassword, EmailTakenError, listAccountOrders, registerCustomer } from "@/lib/services/accounts";
import { attemptLogin, checkSession, verifyCredentials } from "@/lib/services/auth";
import { LIMITS } from "@/lib/services/rate-limit";
import { createOrder } from "@/lib/services/orders";
import { changePasswordSchema, signupSchema } from "@/lib/validation/auth";
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

describe("changePassword", () => {
  const OLD = "correct horse battery";
  const NEW = "a brand new passphrase";
  const input = (currentPassword: string, newPassword = NEW) =>
    changePasswordSchema.parse({ currentPassword, newPassword, confirmPassword: newPassword });
  const ip = () => `10.9.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  it("needs the current password, then switches to the new one", async () => {
    const email = newEmail();
    const { id } = await registerCustomer(signup(email, OLD));

    expect((await changePassword(id, input("not my password"))).status).toBe("wrong_password");
    expect(await verifyCredentials({ email, password: OLD })).not.toBeNull();

    const r = await changePassword(id, input(OLD));
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.deviceToken).toBeTruthy();
    expect(await verifyCredentials({ email, password: OLD })).toBeNull();
    expect(await verifyCredentials({ email, password: NEW })).not.toBeNull();
  });

  it("revokes trusted-device tokens issued for the old password, but the returned one works", async () => {
    const email = newEmail();
    const { id } = await registerCustomer(signup(email, OLD));
    const before = await attemptLogin({ email, password: OLD }, ip());
    if (before.status !== "ok" || !before.deviceToken) throw new Error("login failed");

    const r = await changePassword(id, input(OLD));
    if (r.status !== "ok" || !r.deviceToken) throw new Error("change failed");

    // Use up the normal per-account bucket so only a valid trusted-device token can get in.
    for (let i = 0; i < LIMITS.loginPerEmail.max; i++) await attemptLogin({ email, password: `guess-${i}` }, ip());
    expect((await attemptLogin({ email, password: NEW }, ip(), { deviceToken: before.deviceToken })).status).toBe("rate_limited");
    expect((await attemptLogin({ email, password: NEW }, ip(), { deviceToken: r.deviceToken })).status).toBe("ok");
  }, 120_000);

  it("limits wrong current-password guesses per account", async () => {
    const { id } = await registerCustomer(signup(newEmail(), OLD));
    for (let i = 0; i < LIMITS.passwordChangePerUser.max; i++) {
      expect((await changePassword(id, input(`guess-${i}`))).status).toBe("wrong_password");
    }
    expect((await changePassword(id, input(OLD))).status).toBe("rate_limited");
  });

  it("two concurrent changes: exactly one wins, the other writes nothing", async () => {
    const email = newEmail();
    const { id } = await registerCustomer(signup(email, OLD));
    const results = await Promise.all([changePassword(id, input(OLD, "first new password")), changePassword(id, input(OLD, "second new password"))]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual(["conflict", "ok"]);
    const winner = results[0].status === "ok" ? "first new password" : "second new password";
    expect(await verifyCredentials({ email, password: winner })).not.toBeNull();
  });

  it("rejects reusing the current password and mismatched confirmation", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: OLD, newPassword: OLD, confirmPassword: OLD }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: OLD, newPassword: NEW, confirmPassword: "nope" }).success).toBe(false);
  });
});

describe("checkSession", () => {
  it("is valid until a password change bumps the session version", async () => {
    const email = newEmail();
    const { id } = await registerCustomer(signup(email, "correct horse battery"));
    const login = await attemptLogin({ email, password: "correct horse battery" }, "10.8.0.1");
    if (login.status !== "ok") throw new Error("login failed");
    const issued = login.user.sessionVersion;

    expect(await checkSession(id, issued)).toEqual({ role: "CUSTOMER" });
    // Tokens from before sessionVersion existed carry no version and count as 0.
    expect(await checkSession(id, undefined)).toEqual({ role: "CUSTOMER" });

    const r = await changePassword(
      id,
      changePasswordSchema.parse({ currentPassword: "correct horse battery", newPassword: "next password 1", confirmPassword: "next password 1" }),
    );
    expect(r.status).toBe("ok");
    expect(await checkSession(id, issued)).toBeNull();
    expect(await checkSession(id, undefined)).toBeNull();

    const again = await attemptLogin({ email, password: "next password 1" }, "10.8.0.1");
    if (again.status !== "ok") throw new Error("login failed");
    expect(again.user.sessionVersion).toBe(issued + 1);
    expect(await checkSession(id, again.user.sessionVersion)).toEqual({ role: "CUSTOMER" });
  });

  it("picks up role changes and rejects deleted users", async () => {
    const { id } = await registerCustomer(signup(newEmail()));
    await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
    expect(await checkSession(id, 0)).toEqual({ role: "ADMIN" });
    await prisma.user.delete({ where: { id } });
    expect(await checkSession(id, 0)).toBeNull();
  });
});
