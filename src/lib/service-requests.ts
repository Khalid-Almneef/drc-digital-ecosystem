import type { FinanceDepartmentSlug } from "@/lib/finance";

export type ServiceRequestType =
  | "design"
  | "workshop"
  | "project_media"
  | "company_visit"
  | "event_creation"
  | "media_request"
  | "content_modification"
  | "other";

export type ServiceRequestStatus = "pending" | "assigned" | "in_progress" | "completed" | "rejected";
export type ServiceRequestPriority = "low" | "medium" | "high";

export type ServiceRequestTarget =
  | "executive"
  | "hr"
  | "development"
  | "innovation"
  | "media"
  | "pr"
  | "finance"
  | "logistics"
  | "madarat";

export const ALL_TARGETS: ServiceRequestTarget[] = [
  "executive", "hr", "development", "innovation", "media", "pr", "finance", "logistics", "madarat",
];

export function toServiceRequestSlug(value: string | null | undefined): ServiceRequestTarget | null {
  if (!value) return null;
  return ALL_TARGETS.includes(value as ServiceRequestTarget) ? (value as ServiceRequestTarget) : null;
}

// Which target departments are valid for each request type. The "other"
// type is the universal fallback — any source can pick any target. The
// cascade dropdown in the UI reads from this map.
export const VALID_TARGETS_BY_TYPE: Record<ServiceRequestType, ServiceRequestTarget[]> = {
  design: ["media"],
  workshop: ["development", "madarat"],
  project_media: ["media"],
  company_visit: ["pr"],
  event_creation: ["logistics", "pr"],
  media_request: ["media"],
  content_modification: ["executive", "media"],
  other: [...ALL_TARGETS],
};

export interface ServiceRequestRow {
  requestId: number;
  requestType: ServiceRequestType;
  title: string;
  description: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  sourceDepartmentSlug: ServiceRequestTarget;
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
  event_creation: "Event Creation",
  media_request: "Media Request",
  content_modification: "Content Modification",
  other: "Other",
};

export const SERVICE_REQUEST_TYPE_LABEL_AR: Record<ServiceRequestType, string> = {
  design: "طلب تصميم",
  workshop: "طلب ورشة",
  project_media: "تغطية مشروع",
  company_visit: "زيارة شركة",
  event_creation: "إنشاء فعالية",
  media_request: "طلب إعلامي",
  content_modification: "تعديل محتوى",
  other: "طلب آخر",
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
  sourceDepartmentSlug: ServiceRequestTarget | FinanceDepartmentSlug,
  requestType: ServiceRequestType,
  targetDepartmentSlug: ServiceRequestTarget,
) {
  // No self-targeting (asking your own department for a service is not a
  // cross-department request — that belongs in the dept's own task system).
  if (sourceDepartmentSlug === targetDepartmentSlug) return false;
  const valid = VALID_TARGETS_BY_TYPE[requestType];
  if (!valid?.includes(targetDepartmentSlug)) return false;
  return true;
}
