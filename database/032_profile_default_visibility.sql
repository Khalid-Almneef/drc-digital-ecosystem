-- Toggles for "Show me on the public team page" and "Show my phone number"
-- were removed from the profile page. Make everyone public on the team page
-- and force phone numbers off so leftover stale state can't leak data.
UPDATE profiles SET is_public_on_team = TRUE WHERE is_public_on_team IS DISTINCT FROM TRUE;
UPDATE profiles SET is_phone_public = FALSE WHERE is_phone_public IS DISTINCT FROM FALSE;
