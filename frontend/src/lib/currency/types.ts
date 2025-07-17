/**
 * Currency type definitions for the financial tools application
 */

/**
 * Error thrown when currency fetch operations fail
 */
export class CurrencyFetchError extends Error {
  public readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CurrencyFetchError';
    this.cause = cause;
  }
}

