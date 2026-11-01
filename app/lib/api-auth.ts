import { getOptionalRuntimeBindings } from "./runtime-bindings";

export function requireApiKey(request: Request): Response | null {
  const expectedKey = getOptionalRuntimeBindings()?.RELAY_API_KEY;

  if (!expectedKey) {
    return null;
  }

  const authorization = request.headers.get("authorization");
  const providedKey = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!constantTimeEqual(providedKey, expectedKey)) {
    return Response.json(
      { error: "A valid Relay API key is required" },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      },
    );
  }

  return null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const maximumLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}
