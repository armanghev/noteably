def get_prompt_for_type(type: str, text: str) -> str:
    base_instruction = (
        "You are an expert tutor creating study materials from a lecture transcript."
    )

    if type == "summary":
        return f"""{base_instruction}
Create a concise summary of the following text.
Focus on the main concepts and key takeaways.
Structure it with bullet points.

Return your response in JSON format:
{{
    "title": "A Descriptive Document Title (e.g., 'Introduction to Biology', NOT 'Summary of...')",
    "summary": "The summary text...",
    "key_points": ["point 1", "point 2"]
}}

Text:
{text}
"""

    elif type == "notes":
        return f"""{base_instruction}
Create a comprehensive Study Guide from the following text.
Do NOT just reproduce the text. Synthesize the information into a format optimized for studying.
- Use clear headings and bullet points.
- Highlight Key Terms and important definitions.
- Group related concepts together.
- Add "Key Takeaways" sections to summarize major topics.

Format the output as clean Markdown. Do NOT wrap it in JSON.

Text:
{text}
"""

    elif type == "flashcards":
        return f"""{base_instruction}
Create 10-15 flashcards from the key concepts in the text.
Each flashcard should have a 'front' (question/concept) and 'back' (answer/definition).

Return your response in JSON format:
{{
    "flashcards": [
        {{"front": "concept", "back": "definition"}}
    ]
}}

Text:
{text}
"""

    elif type in ["quiz", "quizzes"]:
        # Calculate number of questions based on transcript length
        # Roughly 1 question per 100 words, with min 3 and max 15
        word_count = len(text.split())
        num_questions = max(3, min(15, round(word_count / 100)))

        return f"""{base_instruction}
Create a {num_questions}-question multiple choice quiz based on the text.
Include the correct answer index (0-3).

Return your response in JSON format:
{{
    "questions": [
        {{
            "question": "The question?",
            "options": ["A", "B", "C", "D"],
            "correct_option": 0,
            "explanation": "Why it is correct"
        }}
    ]
}}

Text:
{text}
"""

    elif type == "cleanup":
        return f"""You are an expert editor. Format the following raw text into clean, readable Markdown.
- Remove page numbers, headers, and footers that interrupt the flow.
- Fix broken line breaks and spacing.
- Format tables and lists properly.
- Preserve all original information and data.
- Return ONLY the cleaned Markdown text, no JSON.

Text:
{text}
"""

    else:
        raise ValueError(f"Unknown material type: {type}")


def get_assistant_system_prompt(transcript: str, generated_content: dict) -> str:
    """Build system prompt with full study set context for the AI assistant."""
    context_parts = [
        "You are a helpful study assistant. The user is studying the following material.",
        "",
        "=== SOURCE TRANSCRIPT ===",
        transcript[:400000],  # Guard: cap at ~400K chars (~100K tokens)
        "",
    ]

    if generated_content.get("summary"):
        summary = generated_content["summary"]
        context_parts += [
            "=== SUMMARY ===",
            f"Title: {summary.get('title', '')}",
            summary.get("summary", ""),
            "",
        ]

    if generated_content.get("notes"):
        notes = generated_content["notes"]
        context_parts += [
            "=== STUDY NOTES ===",
            notes.get("content", ""),
            "",
        ]

    if generated_content.get("flashcards"):
        cards = generated_content["flashcards"].get("flashcards", [])
        cards_text = "\n".join(f"Q: {c['front']}\nA: {c['back']}" for c in cards[:50])
        context_parts += [
            "=== EXISTING FLASHCARDS ===",
            cards_text,
            "",
        ]

    if generated_content.get("quiz"):
        questions = generated_content["quiz"].get("questions", [])
        q_text = "\n".join(f"Q: {q['question']}" for q in questions[:20])
        context_parts += [
            "=== EXISTING QUIZ QUESTIONS ===",
            q_text,
            "",
        ]

    context_parts += [
        "=== INSTRUCTIONS ===",
        "Answer the user's questions based on the material above.",
        "Be concise, accurate, and helpful.",
        "For 'quiz me' requests, pick 3-5 questions from the existing quiz/flashcards and ask them one at a time.",
    ]

    return "\n".join(context_parts)
