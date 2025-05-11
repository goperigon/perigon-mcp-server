export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Helper type to determine if a Result is a success or failure
export type Success<T> = Extract<Result<T, any>, { success: true }>;
export type Failure<E> = Extract<Result<any, E>, { success: false }>;

// Constructor functions
export function Ok<T>(value: T): Result<T, never> {
  return {
    success: true,
    value,
  };
}

export function Err<E = Error>(error: E): Result<never, E> {
  return {
    success: false,
    error,
  };
}

// Type guards
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

// Pattern matching and functional operators
export const Result = {
  /**
   * Pattern match on a result to handle both success and error cases
   */
  match<T, E, U>(
    result: Result<T, E>,
    patterns: {
      ok: (value: T) => U;
      err: (error: E) => U;
    },
  ): U {
    return isOk(result)
      ? patterns.ok(result.value)
      : patterns.err(result.error);
  },

  /**
   * Transform the success value of a Result
   */
  map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return isOk(result) ? Ok(fn(result.value)) : result;
  },

  /**
   * Transform the error value of a Result
   */
  mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return isErr(result) ? Err(fn(result.error)) : result;
  },

  /**
   * Chain operations that might fail
   */
  flatMap<T, E, U>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    return isOk(result) ? fn(result.value) : result;
  },

  /**
   * Alternative name for flatMap/bind
   */
  chain<T, E, U>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    return Result.flatMap(result, fn);
  },

  /**
   * Get the value or return a default
   */
  getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
    return isOk(result) ? result.value : defaultValue;
  },

  /**
   * Apply a function to both cases and return a value
   */
  fold<T, E, U>(
    result: Result<T, E>,
    onOk: (value: T) => U,
    onErr: (error: E) => U,
  ): U {
    return isOk(result) ? onOk(result.value) : onErr(result.error);
  },

  /**
   * Combine multiple Results into a single Result with an array of values
   */
  all<T, E>(results: Array<Result<T, E>>): Result<T[], E> {
    const values: T[] = [];

    for (const result of results) {
      if (isErr(result)) {
        return result;
      }
      values.push(result.value);
    }

    return Ok(values);
  },

  /**
   * Try to execute a function that might throw and convert it to a Result
   */
  try<T>(fn: () => T): Result<T, Error> {
    try {
      return Ok(fn());
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Attempt several operations, returning the first success or all errors
   */
  any<T, E>(results: Array<Result<T, E>>): Result<T, E[]> {
    const errors: E[] = [];

    for (const result of results) {
      if (isOk(result)) {
        return result;
      }
      errors.push(result.error);
    }

    return Err(errors);
  },
};

// Add pipe method for more readable compositions
export function pipe<T>(value: T): PipeChain<T> {
  return {
    to: <U>(fn: (value: T) => U) => pipe(fn(value)),
    value,
  };
}

type PipeChain<T> = {
  to: <U>(fn: (value: T) => U) => PipeChain<U>;
  value: T;
};
