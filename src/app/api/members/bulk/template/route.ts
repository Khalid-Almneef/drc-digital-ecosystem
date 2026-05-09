import { handle } from "@/lib/api";
import { requireSession } from "@/lib/auth";

const TEMPLATE = [
  "email,full_name,full_name_ar,department_slug,position,custom_role,custom_role_ar,major,phone_number,gender",
  "newmember@example.com,Jane Doe,جين دو,innovation,member,,,Computer Engineering,0500000000,female",
  "leadcandidate@example.com,John Smith,جون سميث,media,sub_leader,Photography Lead,قائد التصوير,Software Engineering,0500000001,male",
].join("\n");

export const GET = handle(async () => {
  await requireSession();
  return new Response(TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="drc-members-template.csv"',
    },
  });
});
