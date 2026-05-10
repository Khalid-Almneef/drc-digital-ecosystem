export type FormAudience = "members" | "leaders" | "public";
export type FormQuestionType = "text" | "multiple_choice";

export interface FormQuestion {
  questionId: number;
  prompt: string;
  questionType: FormQuestionType;
  options: string[] | null;
  isRequired: boolean;
  position: number;
}

export interface FormSummary {
  formId: number;
  title: string;
  description: string | null;
  audience: FormAudience;
  isOpen: boolean;
  closesAt: string | null;
  createdAt: string;
  responseCount: number;
}

export interface FormDetail extends FormSummary {
  questions: FormQuestion[];
}

export interface FormResponseRecord {
  responseId: number;
  memberId: number | null;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
  answers: { questionId: number; answerText: string | null }[];
}

export function canManageForms(s: { position: string; departmentSlug: string | null }): boolean {
  if (s.position === "president" || s.position === "vice_president") return true;
  if (s.departmentSlug !== "hr") return false;
  return ["dept_leader", "dept_vice_leader", "sub_leader"].includes(s.position);
}
