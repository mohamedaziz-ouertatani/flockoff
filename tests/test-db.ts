/**
 * The database used by integration and e2e tests. Tests write orders and change stock there, so it
 * must never point at dev or production data: we refuse any URL whose database name lacks "test".
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://flockoff:flockoff@localhost:5434/flockoff_test?schema=public";

export function assertIsTestDatabase(url: string = TEST_DATABASE_URL) {
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": test database names must contain "test".`);
  }
}
