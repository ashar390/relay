import { AsyncLocalStorage } from "node:async_hooks";

export type RuntimeBindings = Pick<Cloudflare.Env, "JOB_QUEUE"> & {
  HYPERDRIVE?: { connectionString: string };
  RELAY_API_KEY?: string;
};

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

export function getOptionalRuntimeBindings(): RuntimeBindings | undefined {
  return bindingStore.getStore();
}
