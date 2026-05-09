import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getMemberPreferences, isValidPalette, patchMemberPreferences } from "@/lib/member-preferences";

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const PatchSchema = z.object({
  language: z.enum(["en", "ar"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  palette: z.object({
    primary: HexColor,
    secondary: HexColor,
    accent: HexColor,
  }).nullable().optional(),
});

export const GET = handle(async () => {
  const session = await requireSession();
  const preferences = await getMemberPreferences(session.memberId);

  return ok({
    preferences: preferences ?? null,
  });
});

export const PATCH = handle(async (req) => {
  const session = await requireSession();
  const body = await parseBody(req, PatchSchema);

  if (
    body.language === undefined &&
    body.theme === undefined &&
    body.palette === undefined
  ) {
    return err(400, "Nothing to update.");
  }

  if (body.palette !== undefined && body.palette !== null && !isValidPalette(body.palette)) {
    return err(400, "Invalid palette.");
  }

  const preferences = await patchMemberPreferences(
    session.memberId,
    {
      language: body.language,
      theme: body.theme,
      palette: body.palette,
    },
    session.memberId,
  );

  return ok({ preferences });
});
