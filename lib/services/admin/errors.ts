/** A failure an admin can understand and fix; its message is safe to show in the UI. */
export class AdminError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminError";
  }
}
