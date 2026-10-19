import { AsyncLocalStorage } from "node:async_hooks";

type RuntimeBindings = Pick<Cloudflare.Env, "JOB_QUEUE">;

const bindingStore = new AsyncLocalStorage<RuntimeBindings>();

export function runWithRuntimeBindings<T>(
  bindings: RuntimeBindings,
  callback: () => T,
): T {
  return bindingStore.run(bindings, callback);
}

export function getRuntimeBindings(): RuntimeBindings {
  const bindings = bindingStore.getStore();

  if (!bindings) {
    throw new Error("Runtime bindings are unavailable outside a request");
  }

  return bindings;
}
