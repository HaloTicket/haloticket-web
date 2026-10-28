// true when the server answered 403: the signed-in person is not allowed to do this with this event.
export function isForbiddenError(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 403;
}
