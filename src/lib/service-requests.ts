import type { FinanceDepartmentSlug } from "@/lib/finance";

export type ServiceRequestType = "design" | "workshop" | "project_media" | "company_visit";
export type ServiceRequestStatus = "pending" | "assigned" | "in_progress" | "completed" | "rejected";
export type ServiceRequestPriority = "low" | "medium" | "high";
export type ServiceRequestTarget = "media" | "development" | "pr";

export interface ServiceRequestRow {
  requestId: number;
  requestType: ServiceRequestType;
  title: string;
  description: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  sourceDepartmentSlug: FinanceDepartmentSlug;
  sourceDepartmentName: string | null;
  targetDepartmentSlug: ServiceRequestTarget;
  targetDepartmentName: string | null;
  requestedBy: number;
  requestedByName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeNote: string | null;
  attachmentUrls: string[];
  requestedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export const SERVICE_REQUEST_TYPE_LABEL: Record<ServiceRequestType, string> = {
  design: "Design Request",
  workshop: "Workshop Request",
  project_media: "Project Media Request",
  company_visit: "Company Visit Request",
};

export const SERVICE_REQUEST_STATUS_TONE: Record<ServiceRequestStatus, string> = {
  pending: "badge badge-warning",
  assigned: "badge badge-primary",
  in_progress: "badge bg-blue-500/10 text-blue-300 border-blue-500/20",
  completed: "badge badge-success",
  rejected: "badge badge-error",
};

export const SERVICE_REQUEST_PRIORITY_TONE: Record<ServiceRequestPriority, string> = {
  low: "badge",
  medium: "badge badge-primary",
  high: "badge badge-warning",
};

export function canCreateServiceRequest(
  sourceDepartmentSlug: FinanceDepartmentSlug,
  requestType: ServiceRequestType,
  targetDepartmentSlug: ServiceRequestTarget,
) {
  if (requestType === "design") return sourceDepartmentSlug !== "media" && targetDepartmentSlug === "media";
  if (requestType === "project_media") return sourceDepartmentSlug !== "media" && targetDepartmentSlug === "media";
  if (requestType === "company_visit") return sourceDepartmentSlug === "development" && targetDepartmentSlug === "pr";
  return sourceDepartmentSlug === "innovation" && targetDepartmentSlug === "development";
}
