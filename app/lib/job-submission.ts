import type { CreateJobInput } from "./jobs";

const MAX_NAME_LENGTH = 100;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const JOB_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;

type ValidationResult =
  | { success: true; data: CreateJobInput }
  | { success: false; issues: string[] };

export function validateJobSubmission(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return {
      success: false,
      issues: ["Request body must be a JSON object"],
    };
  }

  const issues: string[] = [];
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";

  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    issues.push(`name must contain 1 to ${MAX_NAME_LENGTH} characters`);
  }

  if (!JOB_TYPE_PATTERN.test(type)) {
    issues.push("type must use dot-separated lowercase words, such as invoice.generate");
  }

  if (!isRecord(value.payload)) {
    issues.push("payload must be a JSON object");
  } else if (new TextEncoder().encode(JSON.stringify(value.payload)).length > MAX_PAYLOAD_BYTES) {
    issues.push("payload must be 16 KB or smaller");
  }

  if (issues.length > 0 || !isRecord(value.payload)) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      name,
      type,
      payload: value.payload,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
