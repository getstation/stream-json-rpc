export const wrapError = (e: any) => {
  if (e.data && e.stack && e.data.stack) {
    e.stack = `${e.stack}
Caused by: ${(e.data as any).stack}`;
    delete (e.data as any).stack;
  }
  return e;
};
