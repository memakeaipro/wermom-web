# _factory/

Internal assets for the Wermom Daily Content Generator scheduled task.

## Files
- `template.html` — Canonical Wermom blog post template with `{{PLACEHOLDERS}}`. Matches site design system (Playfair + Inter, cream/rose/sage palette, GTM-PMBJ4P92, BreadcrumbList + Article + FAQPage JSON-LD).
- `topic-bank.md` — Queue of upcoming article topics. Format: `slug | H1 | category | intent`. Categories: PR (pregnancy), NB (newborn), TD (toddler), RV (review).
- `published.txt` — One slug per line. Already-published slugs. Scheduled task skips these.

## Replenish workflow
When `topic-bank.md` has fewer than 50 unpublished slugs left, the scheduled task generates the next 100 in the same format and appends to the bank file before selecting that day's batch.

## Do not delete
This folder is read by the daily content cron. Leaving the repo without it breaks the pipeline.
