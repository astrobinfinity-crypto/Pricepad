// An error we throw on purpose, with the HTTP status to send back.
// code = "PLAN_LIMIT" marks "you hit a plan limit" so screens can offer an upgrade.
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}