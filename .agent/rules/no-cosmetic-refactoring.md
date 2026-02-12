---
trigger: always_on
---

No Cosmetic Refactoring

Do not reformat, re-indent, or restructure code unless explicitly requested.

If code is functionally correct, preserve the existing formatting style, including:
	•	Single-line vs multi-line JSX
	•	Prop ordering
	•	Spacing and indentation
	•	Line breaks

Avoid stylistic changes that do not alter behavior. Only modify formatting when:
	1.	The user explicitly asks for refactoring or cleanup.
	2.	The change is required to fix a bug.
	3.	The change is required to meet a clearly defined project rule.

Minimize diff noise. Prefer the smallest possible change that solves the problem.