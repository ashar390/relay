import type { JobQueueMessage } from "./job-queue";

export type JobHandlerResult = Record<string, unknown>;

export class JobHandlerError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "JobHandlerError";
  }
}

export async function runJobHandler(
  message: JobQueueMessage,
): Promise<JobHandlerResult> {
  switch (message.type) {
    case "csv.validate":
      return validateCsv(message.payload);
    case "customers.import":
      return importCustomers(message.payload);
    case "report.generate":
      return generateReport(message.payload);
    case "email.send":
      return prepareEmail(message.payload);
    case "invoice.generate":
      return generateInvoice(message.payload);
    default:
      throw new JobHandlerError(
        "UNSUPPORTED_JOB_TYPE",
        `No handler is registered for ${message.type}`,
        false,
      );
  }
}

function validateCsv(payload: Record<string, unknown>): JobHandlerResult {
  const fileName = requireString(payload, "fileName", "csv.validate");
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  return {
    fileName,
    valid: true,
    rowCount: rows.length,
  };
}

function importCustomers(payload: Record<string, unknown>): JobHandlerResult {
  const fileName = requireString(payload, "fileName", "customers.import");
  const records = Array.isArray(payload.records) ? payload.records : [];
  const validRecords = records.filter(
    (record) => typeof record === "object" && record !== null,
  );

  return {
    fileName,
    imported: validRecords.length,
    skipped: records.length - validRecords.length,
  };
}

function generateReport(payload: Record<string, unknown>): JobHandlerResult {
  const importId = requireString(payload, "importId", "report.generate");

  return {
    importId,
    reportId: `report_${importId}`,
    format: "json",
  };
}

function prepareEmail(payload: Record<string, unknown>): JobHandlerResult {
  const importId = requireString(payload, "importId", "email.send");

  return {
    importId,
    deliveryStatus: "accepted",
    recipient: typeof payload.to === "string" ? payload.to : "project-owner",
  };
}

function generateInvoice(payload: Record<string, unknown>): JobHandlerResult {
  const customerId = requireString(payload, "customerId", "invoice.generate");

  return {
    customerId,
    invoiceId: `invoice_${crypto.randomUUID()}`,
    month: typeof payload.month === "string" ? payload.month : null,
  };
}

function requireString(
  payload: Record<string, unknown>,
  field: string,
  jobType: string,
): string {
  const value = payload[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new JobHandlerError(
      "INVALID_JOB_PAYLOAD",
      `${jobType} requires payload.${field}`,
      false,
    );
  }

  return value;
}
