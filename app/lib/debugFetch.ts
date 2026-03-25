const originalFetch = global.fetch;

if (!(global as any).__FETCH_PATCHED__) {
  (global as any).__FETCH_PATCHED__ = true;

  global.fetch = async (
    ...args: Parameters<typeof fetch>
  ): ReturnType<typeof fetch> => {
    try {
      console.log("FETCH CALLED:", args[0]);
      return await originalFetch(...args);
    } catch (err) {
      console.error("FETCH FAILED:", args[0], err);
      throw err;
    }
  };
}
