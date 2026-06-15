REVOKE SELECT(hint, explanation) ON public.clues FROM authenticated, anon;
REVOKE SELECT(token) ON public.challenges FROM authenticated, anon;
REVOKE SELECT(admin_notes, reviewed_by, edited_clue, edited_answer, edited_category) ON public.puzzle_submissions FROM authenticated, anon;