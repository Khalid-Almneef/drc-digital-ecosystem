import { randomUUID } from "crypto";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { err, handle, ok, parseBody } from "@/lib/api";
import { loadMemberEndorsements, saveMemberEndorsements, type EndorsementContextType } from "@/lib/endorsements";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

interface EndorsementMemberOption {
  memberId: number;
  fullName: string;
  departmentName: string;
  position: string;
  sharedProjects: { projectId: number; title: string }[];
}

function uniqueProjects(projects: { projectId: number; title: string }[]) {
  return Array.from(new Map(projects.map((project) => [project.projectId, project])).values());
}

async function getMemberOptions(sessionMemberId: number): Promise<EndorsementMemberOption[]> {
  if (isMockMode()) {
    const store = getMockStore();
    const activeMembers = store.members.filter((member) => member.isActive && member.memberId !== sessionMemberId);
    const myProjectIds = new Set<number>();

    for (const membership of store.projectMembers) {
      if (membership.memberId === sessionMemberId) myProjectIds.add(membership.projectId);
    }
    for (const project of store.projects) {
      if (project.leadMemberId === sessionMemberId) myProjectIds.add(project.projectId);
    }

    return activeMembers
      .map((member) => {
        const sharedProjects = uniqueProjects(store.projects
          .filter((project) => {
            if (!myProjectIds.has(project.projectId)) return false;
            if (project.leadMemberId === member.memberId) return true;
            return store.projectMembers.some((membership) => (
              membership.projectId === project.projectId && membership.memberId === member.memberId
            ));
          })
          .map((project) => ({ projectId: project.projectId, title: project.title })));

        return {
          memberId: member.memberId,
          fullName: member.fullName,
          departmentName: member.departmentName,
          position: member.position,
          sharedProjects,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  const [{ rows: memberRows }, { rows: projectRows }] = await Promise.all([
    query<{
      memberId: number;
      fullName: string;
      departmentName: string | null;
      position: string;
    }>(
      `SELECT u.member_id AS "memberId",
              COALESCE(p.full_name, u.email) AS "fullName",
              d.name AS "departmentName",
              u.position::text AS position
         FROM users u
         LEFT JOIN profiles p ON p.member_id = u.member_id
         LEFT JOIN departments d ON d.department_id = u.department_id
        WHERE u.is_active = TRUE
          AND u.member_id <> $1
        ORDER BY COALESCE(p.full_name, u.email)`,
      [sessionMemberId],
    ),
    query<{
      memberId: number;
      projectId: number;
      title: string;
    }>(
      `WITH my_projects AS (
         SELECT DISTINCT p.project_id, p.title
           FROM projects p
           LEFT JOIN project_members pm ON pm.project_id = p.project_id
          WHERE pm.member_id = $1 OR p.lead_member_id = $1
       ),
       project_people AS (
         SELECT project_id, member_id FROM project_members
         UNION
         SELECT project_id, lead_member_id AS member_id
           FROM projects
          WHERE lead_member_id IS NOT NULL
       )
       SELECT pp.member_id AS "memberId",
              mp.project_id AS "projectId",
              mp.title
         FROM my_projects mp
         JOIN project_people pp ON pp.project_id = mp.project_id
        WHERE pp.member_id <> $1`,
      [sessionMemberId],
    ),
  ]);

  const sharedProjectMap = new Map<number, { projectId: number; title: string }[]>();
  for (const row of projectRows) {
    const existing = sharedProjectMap.get(row.memberId) ?? [];
    existing.push({ projectId: row.projectId, title: row.title });
    sharedProjectMap.set(row.memberId, existing);
  }

  return memberRows.map((member) => ({
    memberId: member.memberId,
    fullName: member.fullName,
    departmentName: member.departmentName ?? "Club-wide",
    position: member.position,
    sharedProjects: uniqueProjects(sharedProjectMap.get(member.memberId) ?? []),
  }));
}

async function getSelfMemberOption(sessionMemberId: number): Promise<EndorsementMemberOption | null> {
  if (isMockMode()) {
    const member = findMockMember(sessionMemberId);
    return member ? {
      memberId: member.memberId,
      fullName: member.fullName,
      departmentName: member.departmentName,
      position: member.position,
      sharedProjects: [],
    } : null;
  }

  const row = await query<{
    memberId: number;
    fullName: string;
    departmentName: string | null;
    position: string;
  }>(
    `SELECT u.member_id AS "memberId",
            COALESCE(p.full_name, u.email) AS "fullName",
            d.name AS "departmentName",
            u.position::text AS position
       FROM users u
       LEFT JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.member_id = $1
      LIMIT 1`,
    [sessionMemberId],
  );
  const member = row.rows[0];
  return member ? {
    memberId: member.memberId,
    fullName: member.fullName,
    departmentName: member.departmentName ?? "Club-wide",
    position: member.position,
    sharedProjects: [],
  } : null;
}

function enrichEndorsements(
  selfMember: EndorsementMemberOption | null,
  options: EndorsementMemberOption[],
  endorsements: Awaited<ReturnType<typeof loadMemberEndorsements>>["endorsements"],
) {
  const optionMap = new Map(options.map((option) => [option.memberId, option]));
  if (selfMember) {
    optionMap.set(selfMember.memberId, selfMember);
  }

  return endorsements
    .map((endorsement) => {
      const endorser = optionMap.get(endorsement.endorserMemberId);
      const endorsee = optionMap.get(endorsement.endorseeMemberId);
      const projectTitle =
        options.find((option) => option.memberId === endorsement.endorseeMemberId)
          ?.sharedProjects.find((project) => project.projectId === endorsement.projectId)?.title
        ?? options.find((option) => option.memberId === endorsement.endorserMemberId)
          ?.sharedProjects.find((project) => project.projectId === endorsement.projectId)?.title
        ?? null;

      return {
        ...endorsement,
        endorserName: endorser?.fullName ?? `Member #${endorsement.endorserMemberId}`,
        endorseeName: endorsee?.fullName ?? `Member #${endorsement.endorseeMemberId}`,
        endorseeDepartment: endorsee?.departmentName ?? "Club-wide",
        projectTitle,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function hasSharedProject(
  sessionMemberId: number,
  targetMemberId: number,
  projectId: number,
  memberOptions: EndorsementMemberOption[],
) {
  if (isMockMode()) {
    const store = getMockStore();
    const membersOnProject = new Set<number>();
    for (const membership of store.projectMembers) {
      if (membership.projectId === projectId) membersOnProject.add(membership.memberId);
    }
    const project = store.projects.find((entry) => entry.projectId === projectId);
    if (project?.leadMemberId != null) membersOnProject.add(project.leadMemberId);
    return membersOnProject.has(sessionMemberId) && membersOnProject.has(targetMemberId);
  }

  const target = memberOptions.find((member) => member.memberId === targetMemberId);
  return Boolean(target?.sharedProjects.some((project) => project.projectId === projectId));
}

export const GET = handle(async () => {
  const session = await requireSession();
  const [memberOptions, selfMember, payload] = await Promise.all([
    getMemberOptions(session.memberId),
    getSelfMemberOption(session.memberId),
    loadMemberEndorsements(),
  ]);
  const endorsements = enrichEndorsements(selfMember, memberOptions, payload.endorsements);

  const given = endorsements.filter((endorsement) => endorsement.endorserMemberId === session.memberId);
  const received = endorsements.filter((endorsement) => endorsement.endorseeMemberId === session.memberId);

  return ok({
    members: memberOptions,
    summary: {
      endorsementPoints: received.reduce((sum, endorsement) => sum + endorsement.points, 0),
      endorsementsReceived: received.length,
      endorsementsGiven: given.length,
    },
    received,
    given,
  });
});

const Post = z.object({
  endorseeMemberId: z.number().int(),
  contextType: z.enum(["worked_together", "project_together"]),
  projectId: z.number().int().optional(),
  note: z.string().trim().max(280).optional().or(z.literal("")),
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const body = await parseBody(req, Post);

  if (body.endorseeMemberId === session.memberId) {
    return err(400, "You cannot endorse yourself.");
  }

  const memberOptions = await getMemberOptions(session.memberId);
  const target = memberOptions.find((member) => member.memberId === body.endorseeMemberId);
  if (!target) {
    return err(404, "Member not found.");
  }

  const projectId = body.contextType === "project_together" ? body.projectId ?? null : null;
  if (body.contextType === "project_together" && !projectId) {
    return err(400, "Choose a shared project for project-based endorsements.");
  }
  if (projectId && !hasSharedProject(session.memberId, body.endorseeMemberId, projectId, memberOptions)) {
    return err(400, "That project is not shared between both members.");
  }

  const payload = await loadMemberEndorsements();
  const duplicate = payload.endorsements.find((endorsement) => (
    endorsement.endorserMemberId === session.memberId
    && endorsement.endorseeMemberId === body.endorseeMemberId
    && endorsement.contextType === body.contextType
    && (endorsement.projectId ?? null) === projectId
  ));
  if (duplicate) {
    return err(409, "You already submitted this endorsement.");
  }

  const created = {
    endorsementId: randomUUID(),
    endorserMemberId: session.memberId,
    endorseeMemberId: body.endorseeMemberId,
    contextType: body.contextType as EndorsementContextType,
    projectId,
    note: body.note ? body.note.trim() : null,
    points: 1,
    createdAt: new Date().toISOString(),
  };

  await saveMemberEndorsements([created, ...payload.endorsements], session.memberId);

  return ok({ success: true, endorsement: created }, { status: 201 });
});
