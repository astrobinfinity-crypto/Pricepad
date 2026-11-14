// An error we throw on purpose, with the HTTP status to send back.
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}