export const EXIT_SUCCESS = 0;
export const EXIT_GENERAL_ERROR = 1;
export const EXIT_SAFETY_REFUSAL = 2;
export const EXIT_USER_CANCEL = 3;
export const EXIT_MISSING_PREREQ = 4;

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class SafetyError extends CLIError {
  constructor(message: string) {
    super(message, EXIT_SAFETY_REFUSAL);
    this.name = 'SafetyError';
  }
}

export class UserCancelError extends CLIError {
  constructor(message: string = 'Operation cancelled by user') {
    super(message, EXIT_USER_CANCEL);
    this.name = 'UserCancelError';
  }
}

export class MissingPrereqError extends CLIError {
  constructor(message: string) {
    super(message, EXIT_MISSING_PREREQ);
    this.name = 'MissingPrereqError';
  }
}
