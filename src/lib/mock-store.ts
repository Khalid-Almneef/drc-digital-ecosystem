import { getSiteContentKeyCandidates, normalizeSiteContentKey } from "@/lib/site-content";

export type MockPosition =
  | "president"
  | "vice_president"
  | "dept_leader"
  | "dept_vice_leader"
  | "sub_leader"
  | "member";

export type MockDepartmentSlug =
  | "executive"
  | "hr"
  | "development"
  | "innovation"
  | "media"
  | "pr"
  | "finance"
  | "logistics"
  | "madarat";

export interface MockSessionUser {
  memberId: number;
  email: string;
  position: MockPosition;
  departmentId: number | null;
  departmentSlug: MockDepartmentSlug | null;
}

export interface MockMember {
  memberId: number;
  fullName: string;
  fullNameAr: string;
  email: string;
  position: MockPosition;
  departmentId: number | null;
  departmentSlug: MockDepartmentSlug | null;
  departmentName: string;
  departmentNameAr: string;
  avatarUrl: string | null;
  bio: string | null;
  quote: string | null;
  quoteAr: string | null;
  major: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  graduationYear: number | null;
  gender: "male" | "female" | null;
  isActive: boolean;
  isPublicOnTeam: boolean;
  /** Per-field privacy. Each defaults match the SQL migration 024. */
  isEmailPublic?: boolean;
  isLinkedinPublic?: boolean;
  isPhonePublic?: boolean;
  isGithubPublic?: boolean;
  /** Optional custom role label that overrides the generic position label
   *  on the public team card (e.g. "Media Advisor", "Marketing Lead"). */
  customRole?: string | null;
  customRoleAr?: string | null;
  profileStatus: "active" | "inactive" | "alumni" | "suspended";
  /** False = HR-registered, awaiting first-login setup email. Undefined/true = ready to log in. */
  passwordSet?: boolean;
}

export interface MockTask {
  taskId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: number | null;
  dueDate: string | null;
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  creditHours: number;
  completedAt: string | null;
  createdAt: string;
  createdBy: number | null;
  projectId: number | null;
  departmentId: number | null;
}

export interface MockProject {
  projectId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  githubUrl: string | null;
  category: string | null;
  status: "planning" | "in_progress" | "testing" | "completed" | "archived";
  isFeatured: boolean;
  isPublished: boolean;
  techStack: string[] | null;
  startDate: string | null;
  targetEndDate: string | null;
  completedDate: string | null;
  departmentId: number | null;
  leadMemberId: number | null;
  creditHours: number;
  cost: number | null;
  applicationsEnabled: boolean;
  applicationRoles: string[];
}

export interface MockProjectMember {
  projectId: number;
  memberId: number;
  role: string;
  joinedAt: string;
}

export interface MockDeliverable {
  deliverableId: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface MockProjectApplication {
  applicationId: number;
  projectId: number;
  memberId: number;
  role: string;
  note: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface MockVolunteerHour {
  id: number;
  memberId: number;
  hours: number;
  title: string;
  description: string | null;
  participationDate: string;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedAt: string | null;
  approvedBy: number | null;
  sourceType: "self_logged" | "task_credit" | "project_credit" | "event_credit" | "hour_task" | "bulk_import";
  sourceId: number | null;
}

export interface MockVolunteerHourTask {
  opportunityId: number;
  title: string;
  description: string | null;
  hours: number;
  participationDate: string;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockApplication {
  applicationId: number;
  applicantName: string;
  applicantEmail: string;
  universityId: string;
  major: string;
  phoneNumber: string;
  motivation: string;
  skills: string;
  status: "pending" | "interview" | "accepted" | "rejected";
  appliedDate: string;
  preferredDepartmentIds: number[];
  memberId: number | null;
  reviewedBy: number | null;
}

export interface MockSiteContentRow {
  key: string;
  en: string | null;
  ar: string | null;
  json: unknown;
  updatedAt: string | null;
}

export interface MockAsset {
  assetId: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  label: string | null;
  tags: string[] | null;
  createdAt: string;
  uploadedBy: number | null;
}

export type MockSponsorStatus = "wanting_to_contact" | "contacted" | "in_process" | "valid" | "failed";

export interface MockSponsor {
  sponsorId: number;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: "platinum" | "gold" | "silver" | "bronze";
  amount: number | null;
  currency: string;
  status: MockSponsorStatus;
  contactName: string | null;
  contactEmail: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  notes: string | null;
  nextAction: string | null;
  lastContactedAt: string | null;
  proposalTitle: string | null;
  proposalBody: string | null;
  proposalPdfUrl: string | null;
  proposalUpdatedAt: string | null;
  managedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockAnnouncement {
  announcementId: number;
  title: string;
  body: string | null;
  imageUrl: string | null;
  priority: "low" | "medium" | "high" | "critical";
  isPinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  authorId: number | null;
}

export interface MockAnnouncementRequest {
  requestId: number;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "critical";
  requestType: "general" | "monthly_newsletter";
  status: "pending" | "published" | "rejected";
  requestedBy: number;
  handledBy: number | null;
  desiredPublishDate: string | null;
  createdAt: string;
  resolvedAt: string | null;
  publishedAnnouncementId: number | null;
}

export interface MockMediaContent {
  contentId: number;
  title: string;
  type: "post" | "story" | "reel" | "video" | "photo" | "article";
  platform: "instagram" | "twitter" | "linkedin" | "youtube" | "website" | "other" | null;
  description: string | null;
  fileUrl: string | null;
  scheduledDate: string | null;
  publishedDate: string | null;
  status: "draft" | "in_review" | "scheduled" | "published" | "archived";
  views: number;
  likes: number;
  shares: number;
  assignedTo: number | null;
  createdBy: number | null;
  createdAt: string;
}

export interface MockEvent {
  eventId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: "workshop" | "competition" | "meetup" | "general";
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable: number | null;
  isPublished: boolean;
  creditHours: number;
}

export interface MockWorkshop {
  workshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  category: string | null;
  presenter: string | null;
  durationMin: number | null;
  videoUrl: string | null;
  googleDriveFolderUrl: string | null;
  thumbnailUrl: string | null;
  recordedDate: string | null;
  isPublished: boolean;
  membersOnly?: boolean;
  sessions?: MockWorkshopSession[];
}

export interface MockWorkshopSession {
  sessionId: number;
  workshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  durationMin: number | null;
  googleDriveUrl: string;
  orderIndex: number;
}

export interface MockLiveWorkshop {
  liveWorkshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  presenter: string | null;
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  meetingUrl: string | null;
  maxRegistrants: number | null;
  registrationOpen: boolean;
  isPublished: boolean;
  membersOnly?: boolean;
  createdAt: string;
}

export interface MockLiveWorkshopRegistration {
  registrationId: number;
  liveWorkshopId: number;
  fullName: string;
  email: string;
  universityId: string | null;
  phone: string | null;
  department: string | null;
  notes: string | null;
  registeredAt: string;
}

export interface MockMadaratSession {
  sessionId: number;
  title: string;
  description: string | null;
  intervieweeName: string;
  interviewerName: string | null;
  intervieweeRole: string | null;
  programType: "madarat" | "madariya_males" | "madariya_females";
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  meetingUrl: string | null;
  maxRegistrants: number | null;
  registrationOpen: boolean;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: string;
}

export interface MockMadaratRegistration {
  registrationId: number;
  sessionId: number;
  fullName: string;
  email: string;
  universityId: string | null;
  phone: string | null;
  department: string | null;
  notes: string | null;
  registeredAt: string;
}

export interface MockServiceRequest {
  requestId: number;
  requestType:
    | "design"
    | "workshop"
    | "project_media"
    | "company_visit"
    | "event_creation"
    | "media_request"
    | "content_modification"
    | "other";
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "assigned" | "in_progress" | "completed" | "rejected";
  sourceDepartmentSlug: MockDepartmentSlug;
  targetDepartmentSlug: MockDepartmentSlug;
  requestedBy: number;
  assigneeId: number | null;
  assigneeNote: string | null;
  attachmentUrls: string[];
  requestedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface MockDepartment {
  id: number;
  slug: MockDepartmentSlug;
  name: string;
  nameAr: string;
  description: string;
}

interface MockCounters {
  announcement: number;
  announcementRequest: number;
  application: number;
  projectApplication: number;
  task: number;
  project: number;
  deliverable: number;
  volunteerHour: number;
  volunteerHourTask: number;
  asset: number;
  mediaContent: number;
  workshop: number;
  liveWorkshopRegistration: number;
  madaratSession: number;
  madaratRegistration: number;
  serviceRequest: number;
  sponsor: number;
  notification: number;
  changeRequest: number;
  motmHistory: number;
}

export interface MockChangeRequest {
  requestId: number;
  requestType: string;
  departmentId: number;
  requesterId: number;
  targetId: number | null;
  payload: Record<string, unknown>;
  summary: string;
  status: "pending" | "approved" | "rejected" | "applied" | "apply_failed";
  decidedBy: number | null;
  decidedAt: string | null;
  appliedAt: string | null;
  applyError: string | null;
  createdAt: string;
}

export interface MockNotification {
  notificationId: number;
  recipientId: number;
  category: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  sourceType: string | null;
  sourceId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface MockMotmRecord {
  historyId: number;
  memberId: number;
  year: number;
  month: number;
  role: "member" | "leader";
  awardedAt: string;
  awardedBy: number | null;
  note: string | null;
}

export interface MockStore {
  departments: MockDepartment[];
  members: MockMember[];
  siteContent: MockSiteContentRow[];
  applications: MockApplication[];
  volunteerHours: MockVolunteerHour[];
  volunteerHourTasks: MockVolunteerHourTask[];
  tasks: MockTask[];
  assets: MockAsset[];
  sponsors: MockSponsor[];
  announcements: MockAnnouncement[];
  announcementRequests: MockAnnouncementRequest[];
  mediaContent: MockMediaContent[];
  events: MockEvent[];
  workshops: MockWorkshop[];
  liveWorkshops: MockLiveWorkshop[];
  liveWorkshopRegistrations: MockLiveWorkshopRegistration[];
  madaratSessions: MockMadaratSession[];
  madaratRegistrations: MockMadaratRegistration[];
  serviceRequests: MockServiceRequest[];
  projects: MockProject[];
  projectMembers: MockProjectMember[];
  projectApplications: MockProjectApplication[];
  deliverables: MockDeliverable[];
  notifications: MockNotification[];
  changeRequests: MockChangeRequest[];
  motmHistory: MockMotmRecord[];
  counters: MockCounters;
}

export const MOCK_DEMO_USERS: Record<string, {
  id: string;
  name: string;
  email: string;
  position: MockPosition;
  department: MockDepartmentSlug;
  departmentName: string;
  departmentNameAr: string;
}> = {
  president: {
    id: "58",
    name: "Club President",
    email: "president@drc.club",
    position: "president",
    department: "executive",
    departmentName: "Executive",
    departmentNameAr: "القيادة",
  },
  vp: {
    id: "59",
    name: "Club Vice President",
    email: "vp@drc.club",
    position: "vice_president",
    department: "executive",
    departmentName: "Executive",
    departmentNameAr: "القيادة",
  },
  hr_leader: {
    id: "68",
    name: "HR Leader",
    email: "hr.lead@drc.club",
    position: "dept_leader",
    department: "hr",
    departmentName: "Human Resources",
    departmentNameAr: "لجنة الموارد البشرية",
  },
  dev_leader: {
    id: "62",
    name: "Development Leader",
    email: "dev.lead@drc.club",
    position: "dept_leader",
    department: "development",
    departmentName: "Development",
    departmentNameAr: "لجنة التطوير",
  },
  innovation_leader: {
    id: "60",
    name: "Innovation Leader",
    email: "innovation.lead@drc.club",
    position: "dept_leader",
    department: "innovation",
    departmentName: "Innovation",
    departmentNameAr: "لجنة الابتكار",
  },
  media_leader: {
    id: "64",
    name: "Media Leader",
    email: "media.lead@drc.club",
    position: "dept_leader",
    department: "media",
    departmentName: "Media",
    departmentNameAr: "لجنة الإعلام",
  },
  pr_leader: {
    id: "66",
    name: "PR Leader",
    email: "pr.lead@drc.club",
    position: "dept_leader",
    department: "pr",
    departmentName: "Public Relations",
    departmentNameAr: "لجنة العلاقات العامة",
  },
  finance_leader: {
    id: "67",
    name: "Finance Leader",
    email: "finance.lead@drc.club",
    position: "dept_leader",
    department: "finance",
    departmentName: "Finance",
    departmentNameAr: "اللجنة المالية",
  },
  madarat_leader: {
    id: "69",
    name: "Madarat Leader",
    email: "madarat.lead@drc.club",
    position: "dept_leader",
    department: "madarat",
    departmentName: "Madarat",
    departmentNameAr: "مدارات",
  },
  member: {
    id: "1",
    name: "Demo Member",
    email: "member1@drc.com",
    position: "member",
    department: "innovation",
    departmentName: "Innovation",
    departmentNameAr: "لجنة الابتكار",
  },
};

declare global {
  var __drcMockStore: MockStore | undefined;
}

const NOW = "2026-04-17T12:00:00.000Z";

function seedStore(): MockStore {
  const departments: MockDepartment[] = [
    { id: 1, slug: "executive", name: "Executive", nameAr: "القيادة", description: "Club leadership and strategy" },
    { id: 2, slug: "hr", name: "Human Resources", nameAr: "لجنة الموارد البشرية", description: "Membership, people operations, and culture" },
    { id: 3, slug: "development", name: "Development", nameAr: "لجنة التطوير", description: "Software, systems, and workshops" },
    { id: 4, slug: "innovation", name: "Innovation", nameAr: "لجنة الابتكار", description: "Projects, builds, and experimentation" },
    { id: 5, slug: "media", name: "Media", nameAr: "لجنة الإعلام", description: "Content production and storytelling" },
    { id: 6, slug: "pr", name: "Public Relations", nameAr: "لجنة العلاقات العامة", description: "Partnerships, outreach, and events" },
    { id: 7, slug: "finance", name: "Finance", nameAr: "اللجنة المالية", description: "Budgeting and approvals" },
    { id: 8, slug: "logistics", name: "Logistics", nameAr: "اللجنة اللوجستية", description: "Inventory, spaces, and support" },
    { id: 9, slug: "madarat", name: "Madarat", nameAr: "مدارات", description: "Alumni and knowledge transfer" },
  ];

  const members: MockMember[] = [
    {
      memberId: 58, fullName: "Club President", fullNameAr: "رئيس النادي", email: "president@drc.club",
      position: "president", departmentId: 1, departmentSlug: "executive", departmentName: "Executive", departmentNameAr: "القيادة",
      avatarUrl: null, bio: "Leads club strategy and partnerships.", quote: null, quoteAr: null, major: "Computer Engineering", phoneNumber: "0500000058",
      linkedinUrl: "https://linkedin.com/in/drc-president", githubUrl: null, graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 59, fullName: "Club Vice President", fullNameAr: "نائب رئيس النادي", email: "vp@drc.club",
      position: "vice_president", departmentId: 1, departmentSlug: "executive", departmentName: "Executive", departmentNameAr: "القيادة",
      avatarUrl: null, bio: "Coordinates committees and internal delivery.", quote: null, quoteAr: null, major: "Electrical Engineering", phoneNumber: "0500000059",
      linkedinUrl: "https://linkedin.com/in/drc-vp", githubUrl: null, graduationYear: 2026, gender: "female", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 68, fullName: "HR Leader", fullNameAr: "قائد الموارد البشرية", email: "hr.lead@drc.club",
      position: "dept_leader", departmentId: 2, departmentSlug: "hr", departmentName: "Human Resources", departmentNameAr: "لجنة الموارد البشرية",
      avatarUrl: null, bio: "Owns membership onboarding and volunteer approvals.", quote: null, quoteAr: null, major: "Business Administration", phoneNumber: "0500000068",
      linkedinUrl: "https://linkedin.com/in/drc-hr", githubUrl: null, graduationYear: 2026, gender: "female", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 62, fullName: "Development Leader", fullNameAr: "قائد التطوير", email: "dev.lead@drc.club",
      position: "dept_leader", departmentId: 3, departmentSlug: "development", departmentName: "Development", departmentNameAr: "لجنة التطوير",
      avatarUrl: null, bio: "Runs platform and workshop delivery.", quote: null, quoteAr: null, major: "Software Engineering", phoneNumber: "0500000062",
      linkedinUrl: "https://linkedin.com/in/drc-dev", githubUrl: "https://github.com/drc-dev", graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 60, fullName: "Innovation Leader", fullNameAr: "قائد الابتكار", email: "innovation.lead@drc.club",
      position: "dept_leader", departmentId: 4, departmentSlug: "innovation", departmentName: "Innovation", departmentNameAr: "لجنة الابتكار",
      avatarUrl: null, bio: "Leads builds, labs, and project tracking.", quote: null, quoteAr: null, major: "Mechanical Engineering", phoneNumber: "0500000060",
      linkedinUrl: "https://linkedin.com/in/drc-innovation", githubUrl: null, graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 64, fullName: "Media Leader", fullNameAr: "قائد الإعلام", email: "media.lead@drc.club",
      position: "dept_leader", departmentId: 5, departmentSlug: "media", departmentName: "Media", departmentNameAr: "لجنة الإعلام",
      avatarUrl: null, bio: "Owns storytelling, visuals, and content review.", quote: null, quoteAr: null, major: "Digital Media", phoneNumber: "0500000064",
      linkedinUrl: "https://linkedin.com/in/drc-media", githubUrl: null, graduationYear: 2026, gender: "female", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 66, fullName: "PR Leader", fullNameAr: "قائد العلاقات العامة", email: "pr.lead@drc.club",
      position: "dept_leader", departmentId: 6, departmentSlug: "pr", departmentName: "Public Relations", departmentNameAr: "لجنة العلاقات العامة",
      avatarUrl: null, bio: "Handles sponsorships, outreach, and campaigns.", quote: null, quoteAr: null, major: "Marketing", phoneNumber: "0500000066",
      linkedinUrl: "https://linkedin.com/in/drc-pr", githubUrl: null, graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 67, fullName: "Finance Leader", fullNameAr: "قائد المالية", email: "finance.lead@drc.club",
      position: "dept_leader", departmentId: 7, departmentSlug: "finance", departmentName: "Finance", departmentNameAr: "اللجنة المالية",
      avatarUrl: null, bio: "Owns budget allocation, purchase approvals, and procurement follow-through.", quote: null, quoteAr: null, major: "Finance", phoneNumber: "0500000067",
      linkedinUrl: "https://linkedin.com/in/drc-finance", githubUrl: null, graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 69, fullName: "Madarat Leader", fullNameAr: "قائد مدارات", email: "madarat.lead@drc.club",
      position: "dept_leader", departmentId: 9, departmentSlug: "madarat", departmentName: "Madarat", departmentNameAr: "مدارات",
      avatarUrl: null, bio: "Runs alumni conversations and knowledge-transfer sessions.", quote: null, quoteAr: null, major: "Computer Engineering", phoneNumber: "0500000069",
      linkedinUrl: "https://linkedin.com/in/drc-madarat", githubUrl: null, graduationYear: 2026, gender: "male", isActive: true, isPublicOnTeam: false, profileStatus: "active",
    },
    {
      memberId: 1000, fullName: 'Lama Abdullah Almubarak', fullNameAr: 'لمى عبدالله المبارك', email: 'mememomo-m77@hotmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية المعلومات - مسار علم البيانات والذكاء الاصطناعي', phoneNumber: '0554421092',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1001, fullName: 'Omar Ammar Baidas', fullNameAr: 'عمر عمار بيدس', email: 'omarbaidas3@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'طب وجراحة', phoneNumber: '0531965874',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1002, fullName: 'Deemah Nasser Alsenidi', fullNameAr: 'ديمه ناصر السنيدي', email: 'deemanasser3@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم المعلومات', phoneNumber: '0551512787',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1003, fullName: 'Danah Mths Aldosari', fullNameAr: 'دانه مطحس الدوسري', email: 'danadosary1@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم المعلومات', phoneNumber: '0569254976',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1004, fullName: 'Layan Salm Bahashwan', fullNameAr: 'ليان سالم باحشوان', email: 'laayaanqq@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0536869003',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1005, fullName: 'Amjd Hussein Alqahtani', fullNameAr: 'امجد حسين القحطاني', email: 'amgdqhtani11@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0553030828',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1006, fullName: 'Nourah Abd Allh Al Ghnam', fullNameAr: 'نوره عبد الله ال غنام', email: 'noraamg2006@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0507606714',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1007, fullName: 'Sultan Mansour Alanbari', fullNameAr: 'سلطان منصور العنبري', email: 'sultan.m.alanbari@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'الهندسة الميكانيكية', phoneNumber: '0566000491',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1008, fullName: 'Ghada Saeed Alqahtani', fullNameAr: 'غاده سعيد القحطاني', email: 'ghada.sq6@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنيه المعلومات', phoneNumber: '0557400296',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1009, fullName: 'Nourah Mohammed Aljobailah', fullNameAr: 'نورة محمد الجبيلة', email: 'nourahaljobailah@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0543398989',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1010, fullName: 'Khalid Slyman Alroumi', fullNameAr: 'خالد سليمان الرومي', email: 'kldalroumi@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0551215862',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1011, fullName: 'Sondos Salman Albeijan', fullNameAr: 'سندس سلمان البعيجان', email: 'ssondos1235@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0557214116',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1012, fullName: 'Rnad Abdulrahman Alhbrdy', fullNameAr: 'رناد عبدالرحمن الحبردي', email: 'renadalhabardi@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0532892944',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1013, fullName: 'Sarah Khalid Al Alyan Alqahtani', fullNameAr: 'ساره خالد ال عليان القحطاني', email: 'sara.alkhalid05@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0504281603',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1014, fullName: 'Renad Aysa Alawys', fullNameAr: 'ريناد عيسى العويس', email: '444200530@student.ksu.edu.sa',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'كلية علوم الحاسب وتقنية المعلومات | تقنية المعلومات IT', phoneNumber: '0502204371',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1015, fullName: 'Krym Sfwt Sabr', fullNameAr: 'كريم صفوت صابر', email: 'kareemsafwat22134355@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'السنة الأولي المشتركة مسار علمي', phoneNumber: '0532634374',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1016, fullName: 'Reema Abdalelh Almqrn', fullNameAr: 'ريما عبدالإله المقرن', email: '446202433@student.ksu.edu.sa',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة البرمجيات', phoneNumber: '0506873233',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1017, fullName: 'Abdalalh Aaydh Alqahtani', fullNameAr: 'عبدالاله عايض القحطاني', email: 'aask2030@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0535522276',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1018, fullName: 'Albatool Nayef Abalkhail', fullNameAr: 'البتول نايف أباالخيل', email: 'albatool.nn@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0508255949',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1019, fullName: 'Tala Saleh Alasmry', fullNameAr: 'تالا صالح الاسمري', email: 'talaalasmari7171@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0560093172',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1020, fullName: 'Sadeem Turki bin Mufayrij', fullNameAr: 'سديم تركي بن مفيريج', email: 's4366866@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0508487313',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1021, fullName: 'Lmya Majed Alroumi', fullNameAr: 'لمياء ماجد الرومي', email: 'lamiaalromi@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0558382938',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1022, fullName: 'Jana Ali Altmymy', fullNameAr: 'جنى علي التميمي', email: 'janaalitms@gmail.com',
      position: 'member', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0545352185',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1023, fullName: 'Aqeel Ibrahim Alaqyl', fullNameAr: 'عقيل إبراهيم العقيل', email: '445101440@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0536556550',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1024, fullName: 'Abdulrahman Fahad Aldryby', fullNameAr: 'عبدالرحمن فهد الدريبي', email: 'alduraibi123@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'السنة الأولى المشتركة', phoneNumber: '0565867273',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1025, fullName: 'Danah Khalid Almjly', fullNameAr: 'دانه خالد المجلي', email: 'almojallidana@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'السنه الاولى المشتركه - علمي', phoneNumber: '0501177874',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1026, fullName: 'Whj Faisal Aljayd', fullNameAr: 'وهج فيصل الجعيد', email: 'aljuaidwahaj@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0575555131',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1027, fullName: 'Faisal Abdulaziz Ahmed', fullNameAr: 'فيصل عبدالعزيز احمد', email: 'faisalamd581@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0557065100',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1028, fullName: 'Eynas Abdllh Saeed', fullNameAr: 'إيناس عبدلله سعيد', email: 'enaslsaeed@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0530961451',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1029, fullName: 'Dana Sultan Alotaibi', fullNameAr: 'دانا سلطان العتيبي', email: 'danasultana22@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية المعلومات', phoneNumber: '0532396021',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1030, fullName: 'Alyn Ibrahim Aldosari', fullNameAr: 'ألين ابراهيم الدوسري', email: '445200450@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0536338840',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1031, fullName: 'Sarah Adel Albkhytan', fullNameAr: 'ساره عادل البخيتان', email: 'sarah143477@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0557900154',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1032, fullName: 'Ltyfh Abdulrahman Aljbaly', fullNameAr: 'لطيفه عبدالرحمن الجبالي', email: '446203181@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0500128225',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1033, fullName: 'Jnan Slyman Alshtwy', fullNameAr: 'جنان سليمان الشتوي', email: 'jenansll8@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'جامعة الأميرة نورة- كلية الهندسة- الهندسة الكهربائية والالكترونية', phoneNumber: '0554301103',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1034, fullName: 'Hossam Abdulmohsen Al Smyh', fullNameAr: 'حسام عبدالمحسن آل سميح', email: 'qihossam1@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0504501310',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1035, fullName: 'Rhaf Ismail Alfalh', fullNameAr: 'رهاف إسماعيل الفالح', email: '444200823@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0550162262',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1036, fullName: 'Flwh Fahad Aldosari', fullNameAr: 'فلوة فهد الدوسري', email: 'flwa1428@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'كلية الهندسة - تخصص ميكاترونكس', phoneNumber: '0560073970',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1037, fullName: 'Abdullah Ahmed Alghdyr', fullNameAr: 'عبدالله أحمد الغدير', email: '445101144@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم معلومات - مسار عام', phoneNumber: '0532010112',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1038, fullName: 'Leen Meshal Alharbi', fullNameAr: 'لين مشعل الحربي', email: 'leenalnahel@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة البرمجيات', phoneNumber: '0551402866',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1039, fullName: 'Tala Malik Al Jmya', fullNameAr: 'تالا مالك ال جميع', email: 'talaaljumaie56@outlook.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة البرمجيات', phoneNumber: '0507871399',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1040, fullName: 'Fatimah Mohammed Mqld', fullNameAr: 'فاطمة محمد مقلد', email: '444200114@student.ksu.edu.sa',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة البرمجيات', phoneNumber: '0533948790',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1041, fullName: 'Abdulaziz Turki Aljuwair', fullNameAr: 'عبدالعزيز تركي الجوير', email: 'aziz.turki.alj@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0597554545',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1042, fullName: 'Ahmed Abdalwhab Alaskr', fullNameAr: 'احمد عبدالوهاب العسكر', email: 'ahmedalaskar995@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0547488222',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1043, fullName: 'Rakan Mohammed Aljdyd', fullNameAr: 'راكان محمد الجديد', email: 'rakan.mj12@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0566271973',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1044, fullName: 'Ibrahim Abdulkarim Alswydan', fullNameAr: 'إبراهيم عبدالكريم السويدان', email: 'ibrahim1alsuwaidan@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0508593871',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1045, fullName: 'Ghbdallh Mtya Saleh Alslymany', fullNameAr: 'غبدالله مطيع صالح السليماني', email: 'abdallhkasbar2@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0537382856',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1046, fullName: 'Mohammed Badr Almutairi', fullNameAr: 'محمد بدر المطيري', email: 'mohammedmutairi82@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0536063300',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1047, fullName: 'Ibrahim Hamad Alhmwd', fullNameAr: 'ابراهيم حمد الحمود', email: 'aalhmwd22@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0500167582',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1048, fullName: 'Rakan Sultan Aldosari', fullNameAr: 'راكان سلطان الدوسري', email: 'rakan.aldosari17@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0547996842',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1049, fullName: '‏ahmd Slym Mslh', fullNameAr: '‏أحمد سليم مصلح', email: 'a7mad.musleh@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0551692295',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1050, fullName: 'Saud Abdulrahman Al Zaid', fullNameAr: 'سعود عبدالرحمن آل زيد', email: 'a.saudalzaid@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0556341741',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1051, fullName: 'Fayz bin Mohammed Alshehri', fullNameAr: 'فايز بن محمد الشهري', email: 'fayezalshehri04@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0557990570',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1052, fullName: 'Lama Khalid Alrshwd', fullNameAr: 'لمى خالد الرشود', email: 'alrashoodlama@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0543278531',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1053, fullName: 'Mnar Mohammed Alabyd', fullNameAr: 'منار محمد العبيد', email: 'manarrrroooo77@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة كهرب تأسيسي', phoneNumber: '0500414577',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1054, fullName: 'Ahmed Twfyq Mtr', fullNameAr: 'احمد توفيق مطر', email: 'ahmad136234@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة كهربائية', phoneNumber: '0548537036',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1055, fullName: 'Slyman Abdullah Aldghyry', fullNameAr: 'سليمان عبدالله الدغيري', email: 'sulimanad2003@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة ميكانيكية', phoneNumber: '0503478568',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1056, fullName: 'Shykhh Zhyr Alnamy', fullNameAr: 'شيخه زهير النامي', email: 'shikah.242005@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0567692781',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1057, fullName: 'Alghyd Abdalwhab Jmaan', fullNameAr: 'الغيد عبدالوهاب جمعان', email: 'algheedjamaan@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0549200791',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1058, fullName: 'Meshal Dhafer Alqahtani', fullNameAr: 'مشعل ظافر القحطاني', email: 'meshalq2005@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0532869588',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1059, fullName: 'Daa Alghamdi', fullNameAr: 'دعاء الغامدي', email: 'daa0doo.com@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0500312784',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1060, fullName: 'Fatimah Hashem Alhashm', fullNameAr: 'فاطمة هاشم الهاشم', email: 'fhashem566@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0556535489',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1061, fullName: 'Khalid Abdulrahman Almutairi', fullNameAr: 'خالد عبدالرحمن المطيري', email: 'khalid.a.almutairi0@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0501636358',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1062, fullName: 'Wsn Abdulrahman Asyry', fullNameAr: 'وسن عبدالرحمن عسيري', email: 'wasanaa2007@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0541712334',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1063, fullName: 'Rnd Mdhwah Al Mdhwah', fullNameAr: 'رند مضواح آل مضواح', email: 'rand.almedwah.a@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0564766549',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1064, fullName: 'Saud Yasser Alhazmi', fullNameAr: 'سعود ياسر الحازمي', email: 's0y0h11@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0506282226',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1065, fullName: 'Mshaal Mohammed Almhsn', fullNameAr: 'مشاعل محمد المحسن', email: 'mashaelalmohsen@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0551287188',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1066, fullName: 'Hsan Mohammed Wfaallh', fullNameAr: 'حسان محمد وفاءالله', email: 'hassan1999wk@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0508445181',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1067, fullName: 'Leen Ahmed Swar', fullNameAr: 'لين أحمد سوار', email: 'lensewar2004@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: null,
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1068, fullName: 'Zuhd Abdulmalik Ibrahim', fullNameAr: 'زهد عبدالملك ابراهيم', email: 'zuhdib2022@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: null,
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1069, fullName: 'Shhd Abd Alazyz Alzahrani', fullNameAr: 'شهد عبد العزيز الزهراني', email: 'sh.abty33@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0549424650',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1070, fullName: 'Lana Abdullah Alhsyny', fullNameAr: 'لانا عبدالله الحسيني', email: 'alhussaini.lana@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0559993358',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1071, fullName: 'Sultan Dham Alanazi', fullNameAr: 'سلطان دحام العنزي', email: 'sultangs2005@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0507404732',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1072, fullName: 'Osama Abdulmohsen Alshdy', fullNameAr: 'أسامة عبدالمحسن الشدي', email: 'osamah.alsheddi0@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0502345566',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1073, fullName: 'Raghad Abdulrahman Alabrh', fullNameAr: 'رغد عبدالرحمن العبره', email: 'raghadalabrah@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0509871337',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1074, fullName: 'Ahmed Mnyr Salm', fullNameAr: 'أحمد منير سالم', email: 'aemounir1@gmail.com',
      position: 'member', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة كهربائية', phoneNumber: '0594019646',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1075, fullName: 'Jumana Abdulkarim Alshnqyty', fullNameAr: 'جمانه عبدالكريم الشنقيطي', email: 'jamanah_karem@hotmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0508230242',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1076, fullName: 'Jood Khalid Alhdlq', fullNameAr: 'جود خالد الهدلق', email: 'joodalhadlaq@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0543030129',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1077, fullName: 'Ahmed Abdalhady Alqahtani', fullNameAr: 'أحمد عبدالهادي القحطاني', email: 'ahmad.a.s.algahtani@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0581367592',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1078, fullName: 'Mohammed Badr Alyhya', fullNameAr: 'محمد بدر اليحيى', email: 'alyahya.mbm@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0551122337',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1079, fullName: 'Hind Shyl Alshhwan', fullNameAr: 'هند سهيل الشهوان', email: 'halshahwan3@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: null, phoneNumber: '0598576750',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1080, fullName: 'Layan Abdullah Alqahtani', fullNameAr: 'ليان عبدالله القحطاني', email: 'lainabdallh@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0535658107',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1081, fullName: 'Jana Abdullah Alyousef', fullNameAr: 'جنى عبدالله اليوسف', email: 'jnyalywsf1@gmail.com',
      position: 'member', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0550098543',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1082, fullName: 'Mohannad Adeeb Alrimawi', fullNameAr: 'Mohannad Adeeb alrimawi', email: 'rimawimohannad0@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'CFY - علمي', phoneNumber: '0534596211',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1083, fullName: 'Jood Nasser Alwhyb', fullNameAr: 'جود ناصر الوهيب', email: '446202596@student.ksu.edu.sa',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0534555455',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1084, fullName: 'Lyal Saeed Alghamdi', fullNameAr: 'ليال سعيد الغامدي', email: 'layalsaeed971@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0564598920',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1085, fullName: 'Reem Smhan', fullNameAr: 'ريم سمحان', email: 'dr.reemsamhan1@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'صيدلة', phoneNumber: '0559216849',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1086, fullName: 'Abdulmohsen Ghazy Alasmry', fullNameAr: 'عبدالمحسن غازي الاسمري', email: 'snd4541@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علاقات عامة', phoneNumber: '0507375272',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1087, fullName: 'Abdullah Saleh Alarf', fullNameAr: 'عبدالله صالح العرف', email: 'abdullah.s.m.a.88@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0552226582',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1088, fullName: 'Raghad Waleed Abalkhail', fullNameAr: 'رغد وليد أباالخيل', email: 'rwa1426rwa@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0538684559',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1089, fullName: 'Alzyn Bshyr Almurshid', fullNameAr: 'الزين بشير المرشد', email: 'eng.alzain.mrd@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم المعلومات', phoneNumber: '0541743780',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1090, fullName: 'Lyal Badr Alaqyl', fullNameAr: 'ليال بدر العقيّل', email: 'layal.og1@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم المعلومات', phoneNumber: '0507474788',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1091, fullName: 'Sha Khlyl Alnfyay', fullNameAr: 'سهى خليل النفيعي', email: 'suhakhalel@outlook.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم المعلومات', phoneNumber: '0553775275',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1092, fullName: 'Yousef Salm Almwash', fullNameAr: 'يوسف سالم المواش', email: 'youseffsalemm29@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0531312104',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1093, fullName: 'Mntha Mansour Aldwkhy', fullNameAr: 'منتهى منصور الدوخي', email: 'meme.mansour17@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'حقوق', phoneNumber: '0550402502',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1094, fullName: 'Mishari Mohammed Alabssi', fullNameAr: 'مشاري محمد العابسي', email: 'mesharialaabssi@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة برمجيات', phoneNumber: '0554848569',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1095, fullName: 'Abdulaziz Msaad Alshuwaier', fullNameAr: 'عبدالعزيز مساعد الشويعر', email: 'abdulaziz.m555@gmail.com',
      position: 'member', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0552472070',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1096, fullName: 'Yara Khalid Alabdulqadir', fullNameAr: 'يارا خالد العبدالقادر', email: '446205224@student.ksu.edu.sa',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0557808333',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1097, fullName: 'Layan Abdulaziz Ibrahim Aljudaei', fullNameAr: 'ليان عبدالعزيز ابراهيم الجديعي', email: '446205174@student.ksu.edu.sa',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0550271900',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1098, fullName: 'Taif Eidan Alaydan', fullNameAr: 'طيف عيدان العيدان', email: 'taif13932@gmail.com',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0509873969',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1099, fullName: 'Muayad Mazen Brnawy', fullNameAr: 'مؤيد مازن برناوي', email: 'mbarnawi3@gmail.com',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'سنة تحضيرية، ادارة الاعمال', phoneNumber: '0501715327',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1100, fullName: 'Faisal Awadh Albariqi', fullNameAr: 'فيصل عوض البارقي', email: 'barrrqi20@gmail.com',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0557970817',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1101, fullName: 'Badr Mubarak Alrahimi', fullNameAr: 'بدر مبارك الرحيمي', email: 'b.alrahimi.bme@gmail.com',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0500543696',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1102, fullName: 'Sarah Mahdi Alshahrani', fullNameAr: 'ساره مهدي الشهراني', email: 'sara0mahdi@gmail.com',
      position: 'member', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '1129205090',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1103, fullName: 'Abdullah Almasoud', fullNameAr: 'عبدالله المسعود', email: 'abdullahalmasoud20@gmail.com',
      position: 'sub_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0553934833',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Media Advisor', customRoleAr: 'مستشار إعلامي', profileStatus: 'active',
    },
    {
      memberId: 1104, fullName: 'Deemah Alfarhood', fullNameAr: 'ديمة الفرهود', email: 'demohato@gmail.com',
      position: 'dept_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0500415766',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1105, fullName: 'Saleh Alomair', fullNameAr: 'صالح العمير', email: 'salehbinomair@gmail.com',
      position: 'dept_vice_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0544313368',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1106, fullName: 'Abeer Alsahli', fullNameAr: 'عبير السهلي', email: 'abeer0alsahli@gmail.com',
      position: 'sub_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0555717410',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Marketing & Content Lead', customRoleAr: 'قائدة التسويق والمحتوى', profileStatus: 'active',
    },
    {
      memberId: 1107, fullName: 'Danah Alahmari', fullNameAr: 'دانه الأحمري', email: 'saad987hoor@gmail.com',
      position: 'sub_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تغذية سريرية', phoneNumber: '0503393751',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Design Lead', customRoleAr: 'قائدة التصميم', profileStatus: 'active',
    },
    {
      memberId: 1108, fullName: 'Sara Alotaibi', fullNameAr: 'ساره العتيبي', email: 'saraalotaibiqw@gmail.com',
      position: 'sub_leader', departmentId: 5, departmentSlug: 'media', departmentName: 'Media', departmentNameAr: 'لجنة الإعلام',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة برمجيات', phoneNumber: '0544030597',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Photography & Editing Lead', customRoleAr: 'قائدة التصوير والمونتاج', profileStatus: 'active',
    },
    {
      memberId: 1109, fullName: 'Lena Albawardi', fullNameAr: 'لينا البواردي', email: 'leena.bawardi@gmail.com',
      position: 'dept_leader', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم معلومات', phoneNumber: '0501208050',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1110, fullName: 'Jood Alzahrani', fullNameAr: 'جود الزهراني', email: 'joodprofacc@gmail.com',
      position: 'dept_vice_leader', departmentId: 6, departmentSlug: 'pr', departmentName: 'Public Relations', departmentNameAr: 'لجنة العلاقات العامة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'رياضيات اكتوارية', phoneNumber: '0534767136',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1111, fullName: 'Bandar Bin Mhareb', fullNameAr: 'بندر بن محارب', email: 'bnyr803@gmail.com',
      position: 'dept_leader', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية اسنان', phoneNumber: '0557666267',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1112, fullName: 'Danah Bin Saeed', fullNameAr: 'دانه بن سعيد', email: 'dana.binsaeed@gmail.com',
      position: 'dept_leader', departmentId: 7, departmentSlug: 'finance', departmentName: 'Finance', departmentNameAr: 'اللجنة المالية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0501535950',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1113, fullName: 'Rahaf Alrowaili', fullNameAr: 'رهف الرويلي', email: 'rahafruwaili_5@hotmail.com',
      position: 'president', departmentId: 1, departmentSlug: 'executive', departmentName: 'Executive', departmentNameAr: 'القيادة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم معلومات', phoneNumber: '0531818923',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1114, fullName: 'Omar Almansouri', fullNameAr: 'عمر المنصوري', email: 'omaralmansouri0@gmail.com',
      position: 'vice_president', departmentId: 1, departmentSlug: 'executive', departmentName: 'Executive', departmentNameAr: 'القيادة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0500685678',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1115, fullName: 'Jumana Alabssi', fullNameAr: 'جمانه العابسي', email: 'jumanaalabssi@gmail.com',
      position: 'vice_president', departmentId: 1, departmentSlug: 'executive', departmentName: 'Executive', departmentNameAr: 'القيادة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0504220477',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1116, fullName: 'Joud Almazroua', fullNameAr: 'جود المزروع', email: 'joudraedmz@gmail.com',
      position: 'dept_leader', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0590198234',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1117, fullName: 'Khalid Almneef', fullNameAr: 'خالد المنيف', email: 'khalidalmneef@gmail.com',
      position: 'dept_vice_leader', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0541201517',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1118, fullName: 'Fahda Alabdulkareem', fullNameAr: 'فهدة العبدالكريم', email: 'fahdahkarim@gmail.com',
      position: 'sub_leader', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0555998060',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Quality & Execution Lead', customRoleAr: 'قائدة الجودة والتنفيذ', profileStatus: 'active',
    },
    {
      memberId: 1119, fullName: 'Haneen Almutairi', fullNameAr: 'حنين المطيري', email: 'haneen.al.mutairi7@gmail.com',
      position: 'sub_leader', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0552930009',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Quality & Execution Lead', customRoleAr: 'قائدة الجودة والتنفيذ', profileStatus: 'active',
    },
    {
      memberId: 1120, fullName: 'Bader Baidas', fullNameAr: 'بدر بيدس', email: 'baderabaidas@gmail.com',
      position: 'sub_leader', departmentId: 4, departmentSlug: 'innovation', departmentName: 'Innovation', departmentNameAr: 'لجنة الابتكار',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0507844771',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Quality & Execution Lead', customRoleAr: 'قائد الجودة والتنفيذ', profileStatus: 'active',
    },
    {
      memberId: 1121, fullName: 'Abdulaziz Albayoudh', fullNameAr: 'عبدالعزيز البيوض', email: 'azalbayoudh@gmail.com',
      position: 'dept_leader', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0500044617',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1122, fullName: 'Khalid Alsalem', fullNameAr: 'خالد السالم', email: 'kyalsalem@gmail.com',
      position: 'dept_vice_leader', departmentId: 3, departmentSlug: 'development', departmentName: 'Development', departmentNameAr: 'لجنة التطوير',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0508557088',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1123, fullName: 'Wesal Hosawi', fullNameAr: 'وصال هوساوي', email: 'wesal.ma258@gmail.com',
      position: 'dept_leader', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة طبية حيوية', phoneNumber: '0548581053',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1124, fullName: 'Osama Hassan', fullNameAr: 'اسامه حسن', email: 'usamhssan@gmail.com',
      position: 'dept_vice_leader', departmentId: 2, departmentSlug: 'hr', departmentName: 'Human Resources', departmentNameAr: 'لجنة الموارد البشرية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'نظم معلومات', phoneNumber: '0552301016',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1125, fullName: 'Saba Alajmi', fullNameAr: 'صبا العجمي', email: 'sebaajmi@gmail.com',
      position: 'dept_leader', departmentId: 9, departmentSlug: 'madarat', departmentName: 'Madarat', departmentNameAr: 'مدارات',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'تقنية معلومات', phoneNumber: '0550004267',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1126, fullName: 'Firas Jabari', fullNameAr: 'فراس جباري', email: '445102319@student.ksu.edu.sa',
      position: 'dept_vice_leader', departmentId: 9, departmentSlug: 'madarat', departmentName: 'Madarat', departmentNameAr: 'مدارات',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0537990407',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'active',
    },
    {
      memberId: 1127, fullName: 'Yazan Hussein', fullNameAr: 'يزن حسين', email: 'c17hussain@gmail.com',
      position: 'sub_leader', departmentId: 1, departmentSlug: 'executive', departmentName: 'Executive', departmentNameAr: 'القيادة',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0554445273',
      linkedinUrl: null, githubUrl: null, graduationYear: null, gender: null, isActive: true, isPublicOnTeam: true, customRole: 'Projects Supervisor', customRoleAr: 'مشرف المشاريع', profileStatus: 'active',
    },
    {
      memberId: 1128, fullName: 'Reema Fahad Altwyjry', fullNameAr: 'ريما فهد التويجري', email: 'reema.altj@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'Tahakom', quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0564169676',
      linkedinUrl: 'https://www.linkedin.com/in/reemaft/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BxpZ0QBf4Sj%2BPyO7FaUFRMw%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1129, fullName: 'Abdulrahman Hossam Mlaekh', fullNameAr: 'عبدالرحمن حسام ملائكة', email: 'abdulrahmanhusam5@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'PIF', quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0559087711',
      linkedinUrl: 'https://www.linkedin.com/in/abdulrahman-malaikah/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BH2VFtNrlRR61pfGWbw0Mag%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1130, fullName: 'Ibrahim Khalid Alrasheed', fullNameAr: 'إبراهيم خالد الرشيد', email: 'ibrahim.khaled909@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'The Saudi Electricity Company', quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0591010567',
      linkedinUrl: 'https://www.linkedin.com/in/ibra-alrasheed/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3Bbe1h%2Ftp9SqOY6dH8JtOBHA%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1131, fullName: 'Ibrahim Mazen Alkhayat', fullNameAr: 'إبراهيم مازن الخياط', email: 'ialkhayatt@outlook.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'SAFCSP', quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0554141019',
      linkedinUrl: 'https://www.linkedin.com/in/ibrahim-alkhayatt/ar/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BwJ%2Banv%2B%2FTMGaxrpBTgJ0ZQ%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1132, fullName: 'Abdulrahman Hany Al Mohammed', fullNameAr: 'عبدالرحمن هاني ال محمد', email: 'almuhammad.ab@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'Elm', quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0558210211',
      linkedinUrl: 'https://www.linkedin.com/in/almuhammad/ar/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BfxlpApyiQI6%2FurJbybpcZg%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1133, fullName: 'Ryan Ahmed Alzahrani', fullNameAr: 'ريان احمد الزهراني', email: 'ahmdd655@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'Confidential', quote: null, quoteAr: null, major: 'هندسة الحاسب', phoneNumber: '0532275951',
      linkedinUrl: 'https://www.linkedin.com/in/rayan-alzahrani-a8a3311b7/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BMnGYAme9RuyquQT%2BcoTh9A%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1134, fullName: 'Danah Abd Allh Alanazi', fullNameAr: 'دانة عبد الله العنزي', email: 'dnoabd2004@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة برمجيات', phoneNumber: '0537910764',
      linkedinUrl: 'https://www.linkedin.com/in/dana-al-anazi-48a589217/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BV6ayBYRJSU%2Bl2%2BUxdn3stQ%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1135, fullName: 'Danah Bashar Hafth', fullNameAr: 'دانه بشار حافظ', email: 'dana7afez@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة برمجيات', phoneNumber: '0577320401',
      linkedinUrl: 'https://www.linkedin.com/in/dhafez123h4b655a/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3B2EiWr7agQ8WIAc5zumBLMQ%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1136, fullName: 'Fatimah Twfyq Alalywy', fullNameAr: 'فاطمه توفيق العليوي', email: '443204251@student.ksu.edu.sa',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: null, quote: null, quoteAr: null, major: 'هندسة برمجيات', phoneNumber: '0548480285',
      linkedinUrl: 'https://www.linkedin.com/in/fatemah-alelawi-6509b7255/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BeF6Sy2qsSTueHWgv88M63g%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1137, fullName: 'Abdullah Albra Alqyn', fullNameAr: 'عبدالله البراء القين', email: 'ab.gain2277@outlook.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'N/A', quote: null, quoteAr: null, major: 'السنة الاولى المشتركة (علمي)', phoneNumber: '0566098957',
      linkedinUrl: 'https://www.linkedin.com/in/abdullah-algain-547b7a248/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BH4FMIgxKToyqfDOMoaXQFQ%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1138, fullName: 'Fahad Adel Aljdaan', fullNameAr: 'فهد عادل الجدعان', email: 'f.jadel911@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'Elm', quote: null, quoteAr: null, major: 'علوم حاسب', phoneNumber: '0502300837',
      linkedinUrl: 'https://www.linkedin.com/in/fahad-aljadaan-142bba283/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3B7QMrnQU1R0C3U4siItsM7Q%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
    {
      memberId: 1139, fullName: 'Zaid Salman Alanqry', fullNameAr: 'زيد سلمان العنقري', email: 'zaidalangari6@gmail.com',
      position: 'member', departmentId: 8, departmentSlug: 'logistics', departmentName: 'Logistics', departmentNameAr: 'اللجنة اللوجستية',
      avatarUrl: null, bio: 'AppSec', quote: null, quoteAr: null, major: 'هندسة حاسب', phoneNumber: '0557929987',
      linkedinUrl: 'https://www.linkedin.com/in/zaid-alangari/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BHAVLIBhuTFujwjg65xHHGg%3D%3D', githubUrl: null, graduationYear: 2024, gender: null, isActive: true, isPublicOnTeam: true, profileStatus: 'alumni',
    },
// Total: 140

  ];

  const siteContent: MockSiteContentRow[] = [
    { key: "join.accepting", en: null, ar: null, json: { accepting: false }, updatedAt: NOW },
    { key: "join.closed.message", en: "Closed for this semester. Follow our pages to know more.", ar: "التسجيل مغلق لهذا الفصل. تابعوا صفحاتنا لمعرفة المزيد.", json: null, updatedAt: NOW },
    { key: "social.handles", en: null, ar: null, json: { x: "https://x.com/drcksu", linkedin: "https://www.linkedin.com/company/drones-and-robotics-club", tiktok: "https://www.tiktok.com/@drc_ksu" }, updatedAt: NOW },
    { key: "contact.email", en: "drcksu@gmail.com", ar: "drcksu@gmail.com", json: null, updatedAt: NOW },
    { key: "home.stats", en: null, ar: null, json: { projects: "", competitions: "", members: "", departments: "" }, updatedAt: NOW },
    { key: "home.sections", en: null, ar: null, json: { announcements: true, motm: true, whatwedo: true, workshops: true, projects: true }, updatedAt: NOW },
    { key: "home.status.text", en: "Systems Active", ar: "الأنظمة نشطة", json: null, updatedAt: NOW },
    { key: "members_of_month", en: null, ar: null, json: [1000, 1001, 1003], updatedAt: NOW },
  ];

  const applications: MockApplication[] = [
    {
      applicationId: 1,
      applicantName: "Reem Alotaibi",
      applicantEmail: "reem.alotaibi@student.ksu.edu.sa",
      universityId: "443100001",
      major: "Computer Science",
      phoneNumber: "0551000001",
      motivation: "I want to work on autonomous systems and competitions.",
      skills: "Python, CAD, public speaking",
      status: "pending",
      appliedDate: "2026-04-09",
      preferredDepartmentIds: [4, 5],
      memberId: null,
      reviewedBy: null,
    },
    {
      applicationId: 2,
      applicantName: "Abdulrahman Saleh",
      applicantEmail: "abdulrahman.saleh@student.ksu.edu.sa",
      universityId: "443100002",
      major: "Electrical Engineering",
      phoneNumber: "0551000002",
      motivation: "I want hands-on robotics experience.",
      skills: "Electronics, soldering, C",
      status: "pending",
      appliedDate: "2026-04-12",
      preferredDepartmentIds: [3, 4],
      memberId: null,
      reviewedBy: null,
    },
  ];

  const volunteerHours: MockVolunteerHour[] = [
    {
      id: 1, memberId: 1, hours: 4, title: "Workshop logistics support", description: "Assisted with setup and attendee coordination.",
      participationDate: "2026-04-01", approvalStatus: "approved", approvedAt: "2026-04-02T10:00:00.000Z", approvedBy: 68, sourceType: "self_logged", sourceId: null,
    },
    {
      id: 2, memberId: 11, hours: 2.5, title: "Credit for task: Campus recap reel", description: "Automatically credited on task completion.",
      participationDate: "2026-04-14", approvalStatus: "pending", approvedAt: null, approvedBy: null, sourceType: "task_credit", sourceId: 3,
    },
  ];

  const volunteerHourTasks: MockVolunteerHourTask[] = [
    {
      opportunityId: 1,
      title: "April Robotics Showcase Support",
      description: "Register here if you supported setup, coordination, or attendee guidance for the showcase.",
      hours: 3,
      participationDate: "2026-04-18",
      isActive: true,
      createdBy: 68,
      createdAt: "2026-04-17T09:00:00.000Z",
      updatedAt: "2026-04-17T09:00:00.000Z",
    },
  ];

  const tasks: MockTask[] = [
    {
      taskId: 1,
      title: "Capture robotics lab photo set",
      description: "Shoot and deliver 8 high-quality images for the upcoming announcement.",
      status: "in_progress",
      priority: "medium",
      assignedTo: 11,
      dueDate: "2026-04-20",
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: 2,
      completedAt: null,
      createdAt: "2026-04-10T09:00:00.000Z",
      createdBy: 64,
      projectId: null,
      departmentId: 5,
    },
    {
      taskId: 2,
      title: "Design join-us story sequence",
      description: "Prepare three story slides announcing open membership.",
      status: "review",
      priority: "high",
      assignedTo: 11,
      dueDate: "2026-04-18",
      artifactUrl: "/logo-full.png",
      artifactNotes: "Drafted in club brand colors. Need leader approval before scheduling.",
      submittedAt: "2026-04-16T13:00:00.000Z",
      creditHours: 1.5,
      completedAt: null,
      createdAt: "2026-04-11T09:00:00.000Z",
      createdBy: 64,
      projectId: null,
      departmentId: 5,
    },
    {
      taskId: 3,
      title: "Campus recap reel",
      description: "Edit and submit the reel from the April showcase.",
      status: "done",
      priority: "medium",
      assignedTo: 11,
      dueDate: "2026-04-14",
      artifactUrl: "/logo-horizontal.png",
      artifactNotes: "Final export delivered to social team.",
      submittedAt: "2026-04-14T11:00:00.000Z",
      creditHours: 2.5,
      completedAt: "2026-04-15T12:00:00.000Z",
      createdAt: "2026-04-08T09:00:00.000Z",
      createdBy: 64,
      projectId: null,
      departmentId: 5,
    },
    {
      taskId: 4,
      title: "Telemetry dashboard UI",
      description: "Build the first pass of the cross-project telemetry panel.",
      status: "in_progress",
      priority: "high",
      assignedTo: 12,
      dueDate: "2026-04-24",
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: 4,
      completedAt: null,
      createdAt: "2026-04-13T10:00:00.000Z",
      createdBy: 60,
      projectId: 101,
      departmentId: 4,
    },
    {
      taskId: 5,
      title: "Publish alumni interview registration form",
      description: "Prepare the registration form copy and internal reminder flow for the next Madarat session.",
      status: "review",
      priority: "high",
      assignedTo: 68,
      dueDate: "2026-04-22",
      artifactUrl: null,
      artifactNotes: "Draft form copy shared for HR review.",
      submittedAt: "2026-04-19T09:00:00.000Z",
      creditHours: 0,
      completedAt: null,
      createdAt: "2026-04-17T08:00:00.000Z",
      createdBy: 69,
      projectId: null,
      departmentId: 2,
    },
    {
      taskId: 6,
      title: "Design guest announcement assets",
      description: "Create post and story assets announcing the upcoming Madarat interviewee.",
      status: "in_progress",
      priority: "high",
      assignedTo: 11,
      dueDate: "2026-04-23",
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: 0,
      completedAt: null,
      createdAt: "2026-04-18T10:00:00.000Z",
      createdBy: 69,
      projectId: null,
      departmentId: 5,
    },
    {
      taskId: 7,
      title: "Coordinate guest welcome and outreach",
      description: "Confirm guest arrival details and prep the host brief for the Madariyah session.",
      status: "todo",
      priority: "medium",
      assignedTo: 14,
      dueDate: "2026-04-25",
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: 0,
      completedAt: null,
      createdAt: "2026-04-18T12:00:00.000Z",
      createdBy: 69,
      projectId: null,
      departmentId: 6,
    },
  ];

  const assets: MockAsset[] = [
    {
      assetId: 1, url: "/logo-full.png", filename: "logo-full.png", mimeType: "image/png", sizeBytes: 320000,
      label: "Innovation lab hero", tags: ["lab", "hero", "announcement"], createdAt: "2026-04-10T10:00:00.000Z", uploadedBy: 64,
    },
    {
      assetId: 2, url: "/logo-horizontal.png", filename: "logo-horizontal.png", mimeType: "image/png", sizeBytes: 410000,
      label: "Drone race action", tags: ["event", "projects"], createdAt: "2026-04-12T10:00:00.000Z", uploadedBy: 64,
    },
    {
      assetId: 3, url: "/logo-white.png", filename: "logo-white.png", mimeType: "image/png", sizeBytes: 180000,
      label: "Join us story draft", tags: ["social", "join"], createdAt: "2026-04-16T11:00:00.000Z", uploadedBy: 11,
    },
  ];

  const sponsors: MockSponsor[] = [
    {
      sponsorId: 1,
      name: "DroneX Industries",
      logoUrl: null,
      websiteUrl: "https://example.com/dronex",
      tier: "gold",
      amount: 25000,
      currency: "SAR",
      status: "valid",
      contactName: "Partnerships Team",
      contactEmail: "partners@dronex.example",
      contractStart: "2026-01-01",
      contractEnd: "2026-12-31",
      notes: "Confirmed sponsor for drone racing activations.",
      nextAction: "Send quarterly impact report.",
      lastContactedAt: "2026-04-12",
      proposalTitle: "DRC 2026 Technical Partnership",
      proposalBody: "Partner with DRC to support student drone racing, embedded systems workshops, and live technical showcases.",
      proposalPdfUrl: null,
      proposalUpdatedAt: "2026-04-12T10:00:00.000Z",
      managedBy: 69,
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z",
    },
    {
      sponsorId: 2,
      name: "Innovation Hub KSA",
      logoUrl: null,
      websiteUrl: "https://example.com/innovation-hub",
      tier: "silver",
      amount: 15000,
      currency: "SAR",
      status: "in_process",
      contactName: "External Relations",
      contactEmail: "relations@innovation.example",
      contractStart: null,
      contractEnd: null,
      notes: "Interested in workshop visibility and student demo booths.",
      nextAction: "Revise proposal with booth package.",
      lastContactedAt: "2026-04-18",
      proposalTitle: "Workshop Sponsorship Draft",
      proposalBody: "This proposal positions Innovation Hub KSA as a workshop sponsor with branded learning sessions and student project exposure.",
      proposalPdfUrl: null,
      proposalUpdatedAt: "2026-04-18T13:30:00.000Z",
      managedBy: 69,
      createdAt: "2026-04-08T08:00:00.000Z",
      updatedAt: "2026-04-18T13:30:00.000Z",
    },
    {
      sponsorId: 3,
      name: "Future Engineers Fund",
      logoUrl: null,
      websiteUrl: null,
      tier: "bronze",
      amount: 8000,
      currency: "SAR",
      status: "wanting_to_contact",
      contactName: null,
      contactEmail: null,
      contractStart: null,
      contractEnd: null,
      notes: "Potential education-aligned sponsor.",
      nextAction: "Find correct sponsorship contact.",
      lastContactedAt: null,
      proposalTitle: "Student Robotics Support Proposal",
      proposalBody: "DRC can offer meaningful student development visibility through workshops, competition support, and public technical showcases.",
      proposalPdfUrl: null,
      proposalUpdatedAt: "2026-04-20T09:00:00.000Z",
      managedBy: 69,
      createdAt: "2026-04-20T09:00:00.000Z",
      updatedAt: "2026-04-20T09:00:00.000Z",
    },
  ];

  const announcements: MockAnnouncement[] = [
      {
        announcementId: 100, title: 'Club restructure announcement', body: 'يَسر نــادي الدرونز والروبوت الإعلان عن الهيكلة الجديدة للفصل الدراسي الثاني لعـام ١٤٤٧ هـ في إطار سعيه المستمر لتعزيز التنظيم ودعم مسيرة النادي نحو مزيد من التميّز والإبتكار.  نتطلع إلى فصل دراسي حافل بالإنجاز والعمل الجماعي',
        imageUrl: '/uploads/scraped/2024539368417857929__0.jpg', priority: 'high', isPinned: true,
        createdAt: '2026-02-19T17:39:34.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 101, title: 'Members of the month', body: 'نشكر اعضائنا وقادتنا المتميزين لهذا الشهر لإبداعهم وتقديرًا لأدائهم الاستثنائي  جهودكم ومساهماتكم الفعاله تلهمنا جميعا، في اسفل التغريدة تجدون اسامي مبدعي نادي الدرونز والروبوت',
        imageUrl: '/uploads/scraped/1984621761506181523__0.jpg', priority: 'high', isPinned: false,
        createdAt: '2025-11-01T14:01:15.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 102, title: 'DRC update', body: 'نبارك للفائزين بالمراكز الأولى في مسابقه BINGO BOT V2 في نادي الدرونز والروبوت على تميزهم في عالم الإبداع والتقنية كل التوفيق لهم في تحقيق مزيد من الإنجازات المستقبلية  المركز الاول:spark  لطيفة المرشد غلا العواد الدانة آل ثنيان دانه السياري   المركز الثاني : sss صالح العمير',
        imageUrl: '/uploads/scraped/1977685285967163798__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-10-13T10:38:10.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 103, title: 'DRC update', body: 'من الماضي العريق إلى الحاضر المشرق.. ٩٥ عامًا والوطن يتجدد بالإنجاز   #عزنا_بطبعنا  #اليوم_الوطني_السعودي_95',
        imageUrl: '/uploads/scraped/1970514819095597275__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-09-23T15:45:17.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 104, title: 'Club inauguration', body: 'افتتاحا لعام مليء بالإنجازات، أقام نادي الدرونز و الروبوت لقاءه التعريفي  اللقاء فتح الباب للتعرف على رؤية النادي، واستمع فيه الأعضاء لرسائل تحفيزية من قادة النادي لصناعة بداية مختلفة  انطلاقة تؤكد أن القادم مليء بالفرص والإنجازات!',
        imageUrl: '/uploads/scraped/1966120164912722003__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-09-11T12:42:30.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 105, title: 'Club restructure announcement', body: 'بطموح متجدد ورؤية تصنع الفرق، وبخطى واثقة نحو آفاق أوسع من الابتكار  نعلن عن هيكلة نادي الدرونز والروبوت',
        imageUrl: '/uploads/scraped/1965021984460513424__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-09-08T11:58:44.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 106, title: 'Membership applications open', body: 'ساعات قليلة فقط تفصلنا على إغلاق باب التسجيل في نادي الدرونز والروبوت!  سارع بالانضمام الآن لتكون جزءًا من مجتمع المبدعين في عالم التكنولوجيا والابتكار!',
        imageUrl: '/uploads/scraped/1961013826234585242__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-08-28T10:31:44.000Z', expiresAt: null, authorId: 64,
      },
      {
        announcementId: 107, title: 'Membership applications open', body: 'التسجيل متاح الآن للانضمام لنادي الدرونز والروبوت   اذا عندك شغف بالدرونز و الروبوتات هذا مكانك المناسب ! لا تفوت الفرصة    التسجيل متاح الى تاريخ 28/8   https:// forms.gle/xJqXtzKWrwN16h 946 …',
        imageUrl: '/uploads/scraped/1958434191697174664__0.jpg', priority: 'medium', isPinned: false,
        createdAt: '2025-08-21T07:41:11.000Z', expiresAt: null, authorId: 64,
      },
  ];

  const announcementRequests: MockAnnouncementRequest[] = [
    {
      requestId: 1,
      title: "Monthly HR Newsletter — April",
      body: "Share the monthly HR newsletter with membership reminders, volunteer highlights, and upcoming deadlines.",
      priority: "high",
      requestType: "monthly_newsletter",
      status: "pending",
      requestedBy: 68,
      handledBy: null,
      desiredPublishDate: "2026-04-25",
      createdAt: "2026-04-17T10:00:00.000Z",
      resolvedAt: null,
      publishedAnnouncementId: null,
    },
  ];

  const mediaContent: MockMediaContent[] = [
    {
      contentId: 1,
      title: "Join Us reel",
      type: "reel",
      platform: "instagram",
      description: "Short recruitment reel built from member highlights and workshop clips.",
      fileUrl: "/logo-horizontal.png",
      scheduledDate: "2026-04-20T18:00:00.000Z",
      publishedDate: null,
      status: "scheduled",
      views: 0,
      likes: 0,
      shares: 0,
      assignedTo: 11,
      createdBy: 64,
      createdAt: "2026-04-16T10:00:00.000Z",
    },
    {
      contentId: 2,
      title: "Survey drone progress photo set",
      type: "photo",
      platform: "website",
      description: "Asset pack for project updates and homepage feature blocks.",
      fileUrl: "/logo-full.png",
      scheduledDate: null,
      publishedDate: null,
      status: "in_review",
      views: 0,
      likes: 0,
      shares: 0,
      assignedTo: 64,
      createdBy: 11,
      createdAt: "2026-04-15T08:00:00.000Z",
    },
    {
      contentId: 3,
      title: "Campus showcase recap",
      type: "post",
      platform: "twitter",
      description: "Published recap thread pointing followers to the project page.",
      fileUrl: "/logo-white.png",
      scheduledDate: "2026-04-14T19:30:00.000Z",
      publishedDate: "2026-04-14T19:35:00.000Z",
      status: "published",
      views: 1400,
      likes: 128,
      shares: 24,
      assignedTo: 64,
      createdBy: 64,
      createdAt: "2026-04-13T11:00:00.000Z",
    },
  ];

const events: MockEvent[] = [
    {
      eventId: 200, title: 'Trilogy: Tools & growth', description: 'انتهينا من الثلوثية الاولى  تناولنا فيها اهم الادوات والتطبيقات الي يحتاجها اي طالب بتنظيم شغله، وكيف تطور نفسك في اي مسار: برمجة ، هاردوير ، تصميم ، إدارة .  اللقاء الاول كان مجرد بداية، مع كل ثلوثية بنفتح موضوع جديد شكرا لكل من حضر، نلقاكم الاسبوع الجاي',
      imageUrl: '/uploads/scraped/1989011742664388791__0.jpg', type: 'meetup', category: 'DRC Activity',
      startTime: '2025-11-13T16:45:28.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 201, title: 'Training session', description: 'كانت لنا زيارة مميزة لشركة عِلم في قسم البحوث التطبيقية ومعمل الروبوتات   وكان من ضمنها لقاء مع عبدالرحمن آل محمد متدرب من خريجي نادينا، شاركنا تجربته وما اكتسبه من مهارات خلال فترة التدريب   وتضمنت ايضا جولة داخل المعمل، اطلعنا خلالها على عدد من المشاريع، من …',
      imageUrl: '/uploads/scraped/1978508845421834700__0.jpg', type: 'workshop', category: 'DRC Activity',
      startTime: '2025-10-15T17:10:42.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 202, title: 'Hands-on workshop', description: 'انتهى نادي الدرونز والروبوت وربوت من ورشة عمل ملهمة قدمها :  زيد العنقري  @Zyd7x  عبدالعزيز البيوض @fridaytics   عنوانها تحويل الفكرة لمشروع هندسي فعّال! تناولوا من خلالها التعامل مع ESP32, طريقة برمجتها، اختيار القطع المناسبة  واختتموا الورشة بعرض مشروعهم: نظ…',
      imageUrl: '/uploads/scraped/1968676698913722815__0.jpg', type: 'workshop', category: 'DRC Activity',
      startTime: '2025-09-18T14:01:15.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 203, title: 'Members gathering', description: 'خالص الشكر الى رعاة اللقاء على ضيافتهم المميزة، ودعمهم الذي كان له الأثر الكبير في إنجاح هذا اللقاء.',
      imageUrl: '/uploads/scraped/1966120637094936654__0.jpg', type: 'meetup', category: 'DRC Activity',
      startTime: '2025-09-11T12:44:23.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 204, title: 'DRC inauguration', description: 'افتتاحا لعام مليء بالإنجازات، أقام نادي الدرونز و الروبوت لقاءه التعريفي  اللقاء فتح الباب للتعرف على رؤية النادي، واستمع فيه الأعضاء لرسائل تحفيزية من قادة النادي لصناعة بداية مختلفة  انطلاقة تؤكد أن القادم مليء بالفرص والإنجازات!',
      imageUrl: '/uploads/scraped/1966120164912722003__0.jpg', type: 'meetup', category: 'DRC Activity',
      startTime: '2025-09-11T12:42:30.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 205, title: 'Hackathon', description: 'نبارك لعضو نادي الدرونز والروبوت عبدالعزيز البيوض  @Fridaytics  على فوز فريقه GamersTwo بالمركز الثالث في هاكاثون الرياضات الإلكترونية  @EsportHackathon  المقدم من  @TwisMinds ، استمر في التميز والابتكار ! ونتمنى لك ولبقية الأعضاء المزيد من النجاح والإنجازات ف…',
      imageUrl: '/uploads/scraped/1959318187171815787__0.jpg', type: 'competition', category: 'DRC Activity',
      startTime: '2025-08-23T18:13:52.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 206, title: 'DRC activity', description: 'احتفى نادي الدرونز والروبوت بزيارة طلاب برنامج موهبة!   في أجواء يملؤها الشغف والفضول العلمي، كان نادي الدرونز والروبوت على موعد مميز مع زيارة طلاب برنامج موهبة  @mawhiba ، لقد سعد النادي باستضافة هذه الكوكبة من المبدعين في مقره، حيث أطلع النادي الطلبة على أهم…',
      imageUrl: '/uploads/scraped/1945143263951765528__0.jpg', type: 'meetup', category: 'DRC Activity',
      startTime: '2025-07-15T15:27:47.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 207, title: 'DRC activity', description: 'في حفل ختام أنشطة نادي الدرونز والروبوت للفصل الدراسي الثاني، كرّمنا الأعضاء المميزين وشاركنا لحظات جميلة في أجواء ودّية بين أعضاء النادي  ختام مميز لفصل حافل بالإنجازات العظيمة !   شكرًا لمشرف النادي، و قادته، وأعضائه، على جهودهم ودعمهم طوال الفصل  نراكم قريب…',
      imageUrl: '/uploads/scraped/1920808527502692617__0.jpg', type: 'general', category: 'DRC Activity',
      startTime: '2025-05-09T11:50:14.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
    {
      eventId: 208, title: 'Hands-on workshop', description: 'احتفى نادي الدرونز والروبوت بإقامة ورشة عمل مميزة حول "مقدمة في التصميم الهندسي"،  بدأت الورشة بتقديم أحمد القحطاني، الذي استعرض أساسيات التصميم و لم يقتصر الأمر على التعلم النظري فقط، بل توفرت فرص للمشاركين لتجربة استخدام برامج التصميم والطباعة ثلاثية الأبعاد',
      imageUrl: '/uploads/scraped/1917626829755605391__0.jpg', type: 'workshop', category: 'DRC Activity',
      startTime: '2025-04-30T17:07:18.000Z', endTime: null, location: 'King Saud University',
      seatsAvailable: null, isPublished: false, creditHours: 2,
    },
  ];

  // Workshops are now created from the dashboard with real Google Drive
  // video links. The Drive video player on the public workshops page tracks
  // watched seconds in browser cookies (drc_watch_<workshopId>).
  const workshops: MockWorkshop[] = [];

  const liveWorkshops: MockLiveWorkshop[] = [
    { liveWorkshopId: 1, title: "Weekly Dev Office Hours", titleAr: "ساعات التطوير الأسبوعية", description: "Live Q&A for members building active club tools.", descriptionAr: "جلسة أسئلة وأجوبة مباشرة للأعضاء العاملين على أدوات النادي.", presenter: "Development Leader", scheduledAt: "2026-04-22T16:00:00.000Z", durationMin: 60, location: "Zoom", meetingUrl: "https://example.com/meet", maxRegistrants: 50, registrationOpen: true, isPublished: true, membersOnly: false, createdAt: "2026-04-10T12:00:00.000Z" },
  ];

  const liveWorkshopRegistrations: MockLiveWorkshopRegistration[] = [
    { registrationId: 1, liveWorkshopId: 1, fullName: "Reem Alotaibi", email: "reem.alotaibi@student.ksu.edu.sa", universityId: "443100001", phone: null, department: "Computer Science", notes: null, registeredAt: "2026-04-16T09:00:00.000Z" },
  ];

  const madaratSessions: MockMadaratSession[] = [
    {
      sessionId: 1,
      title: "From DRC to Industry",
      description: "A career conversation with a DRC alum on early-career growth, portfolios, and hiring expectations.",
      intervieweeName: "Noura Alghamdi",
      interviewerName: "Faisal Almutairi",
      intervieweeRole: "Product Designer at Aramco Digital",
      programType: "madarat",
      scheduledAt: "2026-04-28T17:00:00.000Z",
      durationMin: 60,
      location: "Innovation Hall",
      meetingUrl: null,
      maxRegistrants: 80,
      registrationOpen: true,
      isPublished: true,
      createdBy: 69,
      createdAt: "2026-04-15T10:00:00.000Z",
    },
    {
      sessionId: 2,
      title: "Madariyah: Hosting DRC Alumni",
      description: "A reflective alumni-hosting session focused on transitions from student work to professional teams.",
      intervieweeName: "Abdullah Alharbi",
      interviewerName: "Sara Alharbi",
      intervieweeRole: "Automation Engineer, SABIC",
      programType: "madariya_males",
      scheduledAt: "2026-04-09T18:00:00.000Z",
      durationMin: 75,
      location: "Main Auditorium",
      meetingUrl: null,
      maxRegistrants: 120,
      registrationOpen: false,
      isPublished: true,
      createdBy: 69,
      createdAt: "2026-03-28T11:00:00.000Z",
    },
  ];

  const madaratRegistrations: MockMadaratRegistration[] = [
    { registrationId: 1, sessionId: 1, fullName: "Reem Alotaibi", email: "reem.alotaibi@student.ksu.edu.sa", universityId: "443100001", phone: null, department: "Computer Science", notes: null, registeredAt: "2026-04-18T11:00:00.000Z" },
    { registrationId: 2, sessionId: 1, fullName: "Faisal Ahmed", email: "faisal@drc.club", universityId: "443100014", phone: "0500000014", department: "Public Relations", notes: "Interested in outreach careers.", registeredAt: "2026-04-18T13:30:00.000Z" },
    { registrationId: 3, sessionId: 2, fullName: "Sara Alharbi", email: "sara@drc.club", universityId: "443100011", phone: null, department: "Media", notes: null, registeredAt: "2026-04-03T09:15:00.000Z" },
    { registrationId: 4, sessionId: 2, fullName: "Omar Salem", email: "omar@drc.club", universityId: "443100012", phone: null, department: "Development", notes: null, registeredAt: "2026-04-04T12:20:00.000Z" },
  ];

  const serviceRequests: MockServiceRequest[] = [
    {
      requestId: 1,
      requestType: "design",
      title: "Guest announcement carousel",
      description: "Need a square post and story set for the next Madarat guest reveal with bilingual copy blocks.",
      priority: "high",
      status: "assigned",
      sourceDepartmentSlug: "madarat",
      targetDepartmentSlug: "media",
      requestedBy: 69,
      assigneeId: 11,
      assigneeNote: "Using the alumni session template. First draft due tomorrow.",
      attachmentUrls: ["/logo-horizontal.png"],
      requestedAt: "2026-04-18T09:00:00.000Z",
      updatedAt: "2026-04-18T13:00:00.000Z",
      resolvedAt: null,
    },
    {
      requestId: 2,
      requestType: "workshop",
      title: "3D Printing Workshop",
      description: "Innovation needs a beginner-friendly workshop on slicing, printer prep, and safe operation for prototype teams.",
      priority: "high",
      status: "pending",
      sourceDepartmentSlug: "innovation",
      targetDepartmentSlug: "development",
      requestedBy: 60,
      assigneeId: null,
      assigneeNote: null,
      attachmentUrls: ["/logo-full.png"],
      requestedAt: "2026-04-19T08:30:00.000Z",
      updatedAt: "2026-04-19T08:30:00.000Z",
      resolvedAt: null,
    },
    {
      requestId: 3,
      requestType: "project_media",
      title: "Project media coverage — Autonomous Survey Drone",
      description: "Need photo coverage and asset uploads for the Autonomous Survey Drone build so the archive and social posts stay current.",
      priority: "medium",
      status: "pending",
      sourceDepartmentSlug: "innovation",
      targetDepartmentSlug: "media",
      requestedBy: 60,
      assigneeId: null,
      assigneeNote: null,
      attachmentUrls: ["/logo-full.png"],
      requestedAt: "2026-04-20T10:00:00.000Z",
      updatedAt: "2026-04-20T10:00:00.000Z",
      resolvedAt: null,
    },
    {
      requestId: 4,
      requestType: "company_visit",
      title: "Visit request - Aramco Digital robotics team",
      description: "Development identified Aramco Digital as a strong visit target for members interested in robotics platforms, autonomy, and engineering careers.",
      priority: "high",
      status: "pending",
      sourceDepartmentSlug: "development",
      targetDepartmentSlug: "pr",
      requestedBy: 12,
      assigneeId: null,
      assigneeNote: null,
      attachmentUrls: [],
      requestedAt: "2026-04-21T09:00:00.000Z",
      updatedAt: "2026-04-21T09:00:00.000Z",
      resolvedAt: null,
    },
  ];

  const projects: MockProject[] = [
    {
      projectId: 101, title: "Autonomous Survey Drone", description: "Cross-club project for mapping, computer vision, and media storytelling.",
      imageUrl: "/logo-full.png", githubUrl: "https://github.com/drc/survey-drone", category: "Aerial Systems", status: "in_progress", isFeatured: true, isPublished: false,
      techStack: ["ROS2", "PX4", "OpenCV"], startDate: "2026-02-01", targetEndDate: "2026-05-30", completedDate: null, departmentId: null, leadMemberId: 60, creditHours: 12, cost: 8500,
      applicationsEnabled: true, applicationRoles: ["Flight Controls", "Computer Vision", "Field Testing"],
    },
    {
      projectId: 102, title: "Media Automation Toolkit", description: "Internal content pipeline for media submissions, review, and publishing.",
      imageUrl: "/logo-white.png", githubUrl: "https://github.com/drc/media-toolkit", category: "Internal Tools", status: "testing", isFeatured: true, isPublished: false,
      techStack: ["Next.js", "Postgres"], startDate: "2026-03-01", targetEndDate: "2026-04-30", completedDate: null, departmentId: 5, leadMemberId: 64, creditHours: 8, cost: 1200,
      applicationsEnabled: true, applicationRoles: ["Frontend", "Backend", "QA"],
    },
    {
      projectId: 103, title: "RoboCup Soccer Bot", description: "Competition bot with cross-discipline collaboration.", imageUrl: "/logo-horizontal.png",
      githubUrl: null, category: "Robotics", status: "completed", isFeatured: false, isPublished: false, techStack: ["STM32", "OpenCV"], startDate: "2025-10-01", targetEndDate: "2026-02-15", completedDate: "2026-02-20", departmentId: 4, leadMemberId: 13, creditHours: 10, cost: 6000,
      applicationsEnabled: false, applicationRoles: [],
    },
  ];

  const projectMembers: MockProjectMember[] = [
    { projectId: 101, memberId: 60, role: "Lead", joinedAt: "2026-02-01T00:00:00.000Z" },
    { projectId: 101, memberId: 12, role: "Software", joinedAt: "2026-02-03T00:00:00.000Z" },
    { projectId: 101, memberId: 13, role: "Mechanical", joinedAt: "2026-02-05T00:00:00.000Z" },
    { projectId: 101, memberId: 11, role: "Documentation", joinedAt: "2026-02-08T00:00:00.000Z" },
    { projectId: 102, memberId: 64, role: "Lead", joinedAt: "2026-03-01T00:00:00.000Z" },
    { projectId: 102, memberId: 62, role: "Platform", joinedAt: "2026-03-02T00:00:00.000Z" },
    { projectId: 102, memberId: 11, role: "Content QA", joinedAt: "2026-03-03T00:00:00.000Z" },
    { projectId: 103, memberId: 13, role: "Lead", joinedAt: "2025-10-01T00:00:00.000Z" },
    { projectId: 103, memberId: 1, role: "Control Systems", joinedAt: "2025-10-03T00:00:00.000Z" },
  ];

  const projectApplications: MockProjectApplication[] = [
    {
      applicationId: 1,
      projectId: 101,
      memberId: 11,
      role: "Field Testing",
      note: "I can support documentation during on-campus test runs.",
      status: "pending",
      createdAt: "2026-04-16T10:30:00.000Z",
    },
  ];

  const deliverables: MockDeliverable[] = [
    { deliverableId: 1, projectId: 101, title: "Flight-ready prototype", description: "Airframe assembled and stable in manual flight.", dueDate: "2026-04-25", completed: true, completedAt: "2026-04-10T10:00:00.000Z", orderIndex: 0, createdAt: "2026-02-10T00:00:00.000Z" },
    { deliverableId: 2, projectId: 101, title: "Mapping pipeline demo", description: "Generate first full campus map pass.", dueDate: "2026-05-05", completed: false, completedAt: null, orderIndex: 1, createdAt: "2026-02-15T00:00:00.000Z" },
    { deliverableId: 3, projectId: 102, title: "Media submission review flow", description: "Move contributor work to review and approval.", dueDate: "2026-04-18", completed: true, completedAt: "2026-04-15T12:00:00.000Z", orderIndex: 0, createdAt: "2026-03-05T00:00:00.000Z" },
  ];

  return {
    departments,
    members,
    siteContent,
    applications,
    volunteerHours,
    volunteerHourTasks,
    tasks,
    assets,
    sponsors,
    announcements,
    announcementRequests,
    mediaContent,
    events,
    workshops,
    liveWorkshops,
    liveWorkshopRegistrations,
    madaratSessions,
    madaratRegistrations,
    serviceRequests,
    projects,
    projectMembers,
    projectApplications,
    deliverables,
    notifications: [],
    changeRequests: [],
    motmHistory: seedMotmHistory(),
    counters: {
      announcement: 3,
      announcementRequest: 2,
      application: 3,
      projectApplication: 2,
      task: 8,
      project: 104,
      deliverable: 4,
      volunteerHour: 3,
      volunteerHourTask: 2,
      asset: 4,
      mediaContent: 4,
      workshop: 3,
      liveWorkshopRegistration: 2,
      madaratSession: 3,
      madaratRegistration: 5,
      serviceRequest: 5,
      sponsor: 4,
      notification: 0,
      changeRequest: 0,
      motmHistory: 0,
    },
  };
}

/**
 * Seeds historical Member-of-the-Month awards. Members 11, 13, 1 are the
 * site_content default for the *current* month; we backfill them plus a few
 * additional past awards so the leaderboard isn't empty in dev mode.
 */
function seedMotmHistory(): MockMotmRecord[] {
  // IDs 1000+ are real members from the imported roster; 60/62/64/68 are demo
  // dept-leader fixtures used for dev login.
  const rows: Omit<MockMotmRecord, "historyId">[] = [
    // current month — matches site_content members_of_month
    { memberId: 1000, year: 2026, month: 4, role: "member", awardedAt: "2026-04-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1001, year: 2026, month: 4, role: "member", awardedAt: "2026-04-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1003, year: 2026, month: 4, role: "member", awardedAt: "2026-04-01T08:00:00.000Z", awardedBy: 68, note: null },
    // historical (members)
    { memberId: 1000, year: 2026, month: 2, role: "member", awardedAt: "2026-02-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1000, year: 2025, month: 11, role: "member", awardedAt: "2025-11-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1001, year: 2025, month: 12, role: "member", awardedAt: "2025-12-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1003, year: 2026, month: 1, role: "member", awardedAt: "2026-01-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1004, year: 2025, month: 10, role: "member", awardedAt: "2025-10-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1004, year: 2025, month: 11, role: "member", awardedAt: "2025-11-01T08:00:00.000Z", awardedBy: 68, note: null },
    { memberId: 1005, year: 2026, month: 3, role: "member", awardedAt: "2026-03-01T08:00:00.000Z", awardedBy: 68, note: null },
    // leaders (use demo leader IDs that exist in mock)
    { memberId: 60, year: 2026, month: 3, role: "leader", awardedAt: "2026-03-01T08:00:00.000Z", awardedBy: 58, note: null },
    { memberId: 64, year: 2026, month: 2, role: "leader", awardedAt: "2026-02-01T08:00:00.000Z", awardedBy: 58, note: null },
    { memberId: 60, year: 2025, month: 11, role: "leader", awardedAt: "2025-11-01T08:00:00.000Z", awardedBy: 58, note: null },
    { memberId: 62, year: 2026, month: 4, role: "leader", awardedAt: "2026-04-01T08:00:00.000Z", awardedBy: 58, note: null },
    { memberId: 66, year: 2026, month: 1, role: "leader", awardedAt: "2026-01-01T08:00:00.000Z", awardedBy: 58, note: null },
  ];
  return rows.map((r, i) => ({ historyId: i + 1, ...r }));
}

export function isMockMode() {
  return !process.env.DATABASE_URL;
}

export function getMockStore(): MockStore {
  if (!global.__drcMockStore) global.__drcMockStore = seedStore();
  const store = global.__drcMockStore as MockStore;
  const seeded = seedStore();
  const counters = store.counters as MockStore["counters"] & Partial<Record<"announcementRequest" | "projectApplication" | "workshop" | "madaratSession" | "madaratRegistration" | "serviceRequest" | "sponsor", number>>;
  if (!store.announcementRequests) store.announcementRequests = seeded.announcementRequests;
  if (!store.projectApplications) store.projectApplications = seeded.projectApplications;
  if (!store.volunteerHourTasks) store.volunteerHourTasks = seeded.volunteerHourTasks;
  if (!store.madaratSessions) store.madaratSessions = seeded.madaratSessions;
  if (!store.madaratRegistrations) store.madaratRegistrations = seeded.madaratRegistrations;
  if (!store.serviceRequests) store.serviceRequests = seeded.serviceRequests;
  if (!store.sponsors) store.sponsors = seeded.sponsors;
  if (!store.notifications) store.notifications = seeded.notifications;
  if (!store.changeRequests) store.changeRequests = seeded.changeRequests;
  if (counters.notification === undefined) {
    counters.notification = seeded.counters.notification;
  }
  if ((counters as { changeRequest?: number }).changeRequest === undefined) {
    (counters as { changeRequest?: number }).changeRequest = seeded.counters.changeRequest;
  }
  if (counters.announcementRequest === undefined) {
    counters.announcementRequest = seeded.counters.announcementRequest;
  }
  if (counters.projectApplication === undefined) {
    counters.projectApplication = seeded.counters.projectApplication;
  }
  if (counters.volunteerHourTask === undefined) {
    counters.volunteerHourTask = seeded.counters.volunteerHourTask;
  }
  if (counters.workshop === undefined) {
    counters.workshop = seeded.counters.workshop;
  }
  if (counters.madaratSession === undefined) {
    counters.madaratSession = seeded.counters.madaratSession;
  }
  if (counters.madaratRegistration === undefined) {
    counters.madaratRegistration = seeded.counters.madaratRegistration;
  }
  if (counters.serviceRequest === undefined) {
    counters.serviceRequest = seeded.counters.serviceRequest;
  }
  if (counters.sponsor === undefined) {
    counters.sponsor = seeded.counters.sponsor;
  }
  const seededMembers = new Map(seeded.members.map((member) => [member.memberId, member]));
  for (const [memberId, member] of seededMembers.entries()) {
    if (!store.members.find((entry) => entry.memberId === memberId)) {
      store.members.push(member);
    }
  }
  store.members = store.members.map((member) => ({
    ...member,
    gender: member.gender ?? seededMembers.get(member.memberId)?.gender ?? "male",
  }));
  const seededTasks = new Map(seeded.tasks.map((task) => [task.taskId, task]));
  const seededMadaratSessions = new Map(seeded.madaratSessions.map((session) => [session.sessionId, session]));
  store.tasks = [
    ...store.tasks.map((task) => ({
      ...task,
      createdBy: task.createdBy ?? seededTasks.get(task.taskId)?.createdBy ?? null,
    })),
    ...seeded.tasks.filter((task) => !store.tasks.find((entry) => entry.taskId === task.taskId)),
  ];
  store.madaratSessions = [
    ...store.madaratSessions.map((session) => {
      const legacyProgramType = session.programType as string;
      return {
        ...session,
        interviewerName: session.interviewerName ?? seededMadaratSessions.get(session.sessionId)?.interviewerName ?? null,
        programType:
          legacyProgramType === "interview"
            ? "madarat"
            : legacyProgramType === "madaria"
              ? "madariya_males"
              : session.programType,
      };
    }),
    ...seeded.madaratSessions.filter((session) => !store.madaratSessions.find((entry) => entry.sessionId === session.sessionId)),
  ];
  store.madaratRegistrations = [
    ...store.madaratRegistrations.map((registration) => registration),
    ...seeded.madaratRegistrations.filter((registration) => !store.madaratRegistrations.find((entry) => entry.registrationId === registration.registrationId)),
  ];
  store.serviceRequests = [
    ...store.serviceRequests.map((request) => ({
      ...request,
      attachmentUrls: request.attachmentUrls ?? [],
      assigneeNote: request.assigneeNote ?? null,
    })),
    ...seeded.serviceRequests.filter((request) => !store.serviceRequests.find((entry) => entry.requestId === request.requestId)),
  ];
  counters.task = Math.max(counters.task, ...store.tasks.map((task) => task.taskId + 1), seeded.counters.task);
  counters.workshop = Math.max(counters.workshop, ...store.workshops.map((workshop) => workshop.workshopId + 1), seeded.counters.workshop);
  counters.madaratSession = Math.max(counters.madaratSession, ...store.madaratSessions.map((session) => session.sessionId + 1), seeded.counters.madaratSession);
  counters.madaratRegistration = Math.max(counters.madaratRegistration, ...store.madaratRegistrations.map((registration) => registration.registrationId + 1), seeded.counters.madaratRegistration);
  counters.serviceRequest = Math.max(counters.serviceRequest, ...store.serviceRequests.map((request) => request.requestId + 1), seeded.counters.serviceRequest);
  counters.sponsor = Math.max(counters.sponsor, ...store.sponsors.map((sponsor) => sponsor.sponsorId + 1), seeded.counters.sponsor);
  const seededProjects = new Map(seeded.projects.map((project) => [project.projectId, project]));
  const seededEvents = new Map(seeded.events.map((event) => [event.eventId, event]));
  store.projects = store.projects.map((project) => ({
    ...project,
    applicationsEnabled: project.applicationsEnabled ?? seededProjects.get(project.projectId)?.applicationsEnabled ?? false,
    applicationRoles: project.applicationRoles ?? seededProjects.get(project.projectId)?.applicationRoles ?? [],
  }));
  store.events = store.events.map((event) => ({
    ...event,
    creditHours: event.creditHours ?? seededEvents.get(event.eventId)?.creditHours ?? 0,
  }));
  return global.__drcMockStore;
}

export function nextMockId(key: keyof MockCounters): number {
  const store = getMockStore();
  const value = store.counters[key];
  store.counters[key] += 1;
  return value;
}

export function findMockMember(memberId: number) {
  return getMockStore().members.find((m) => m.memberId === memberId) ?? null;
}

export function departmentById(departmentId: number | null) {
  if (departmentId == null) return null;
  return getMockStore().departments.find((d) => d.id === departmentId) ?? null;
}

export function siteContentValue(key: string) {
  const canonicalKey = normalizeSiteContentKey(key);
  const row = getMockStore().siteContent.find((candidate) => getSiteContentKeyCandidates(key).includes(candidate.key)) ?? null;
  return row ? { ...row, key: canonicalKey } : null;
}

export function upsertSiteContent(key: string, patch: Partial<MockSiteContentRow>) {
  const store = getMockStore();
  const canonicalKey = normalizeSiteContentKey(key);
  for (let index = store.siteContent.length - 1; index >= 0; index -= 1) {
    if (store.siteContent[index].key !== canonicalKey && getSiteContentKeyCandidates(canonicalKey).includes(store.siteContent[index].key)) {
      store.siteContent.splice(index, 1);
    }
  }
  const existing = store.siteContent.find((r) => r.key === canonicalKey);
  if (existing) {
    Object.assign(existing, patch, { key: canonicalKey, updatedAt: new Date().toISOString() });
    return existing;
  }
  const row: MockSiteContentRow = {
    key: canonicalKey,
    en: patch.en ?? null,
    ar: patch.ar ?? null,
    json: patch.json ?? null,
    updatedAt: new Date().toISOString(),
  };
  store.siteContent.push(row);
  return row;
}

export function mockSessionFromKey(key: string | undefined | null): MockSessionUser | null {
  if (!key) return null;
  const user = MOCK_DEMO_USERS[key];
  if (!user) return null;
  const dept = getMockStore().departments.find((d) => d.slug === user.department) ?? null;
  return {
    memberId: Number(user.id),
    email: user.email,
    position: user.position,
    departmentId: dept?.id ?? null,
    departmentSlug: user.department,
  };
}
