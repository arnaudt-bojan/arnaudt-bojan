export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
