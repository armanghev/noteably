def get_prompt_for_type(type: str, text: str, options: dict = None) -> str:
    options = options or {}
    language = options.get("language", "english")
    focus = options.get("focus", "general")

    base_instruction = (
        f"You are an expert tutor creating study materials from a lecture transcript. "
        f"Output MUST be in {language}."
    )

    if focus == "exam":
        base_instruction += " Focus strictly on definitions, dates, formulas, and key concepts likely to appear on an exam."
    elif focus == "deep_dive":
        base_instruction += " Explore complex mechanisms, underlying logic, and 'why' it works. Go beyond the basics."
    elif focus == "simple":
        base_instruction += " Simplify complex terms. Use analogies. Explain like I'm 5 (ELI5)."

    if type == "summary":
        format_instr = "Structure it with bullet points."
        if options.get("summary_format") == "paragraphs":
            format_instr = "Structure it as coherent paragraphs."

        length_instr = ""
        length_opt = options.get("summary_length", "medium")
        if length_opt == "short":
            length_instr = "Keep the summary concise (approx. 200 words)."
        elif length_opt == "detailed":
            length_instr = "Provide a comprehensive, detailed summary covering all key aspects and nuances."
        else:
            length_instr = "Provide a balanced summary (approx. 400 words)."

        return f"""{base_instruction}
Create a concise summary of the following text.
Focus on the main concepts and key takeaways.
{format_instr}
{length_instr}

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
        style = options.get("notes_style", "standard")
        style_instr = "- Use clear headings and bullet points."
        if style == "cornell":
            style_instr = "- Use the Cornell Note-taking system structure (Cues/Questions on left, Notes on right, Summary at bottom). Format as Markdown."
        elif style == "outline":
            style_instr = "- Use a strict hierarchical outline format (I. A. 1. a.)."
        elif style == "qa":
            style_instr = "- structure the entire set of notes as a series of Questions and detailed Answers."

        return f"""{base_instruction}
Create a comprehensive Study Guide from the following text.
Do NOT just reproduce the text. Synthesize the information into a format optimized for studying.
{style_instr}
- Highlight Key Terms and important definitions.
- Group related concepts together.
- Add "Key Takeaways" sections to summarize major topics.

Format the output as clean Markdown. Do NOT wrap it in JSON.

Text:
{text}
"""

    elif type == "flashcards":
        count = options.get("flashcard_count", 15)
        # Ensure count is int
        try:
            count = int(count)
        except:
            count = 15
        
        return f"""{base_instruction}
Create {count} flashcards from the key concepts in the text.
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
        difficulty = options.get("quiz_difficulty", "medium")
        
        # Calculate number of questions based on transcript length
        # Roughly 1 question per 100 words, with min 3 and max 15
        word_count = len(text.split())
        num_questions = max(3, min(15, round(word_count / 100)))

        return f"""{base_instruction}
Create a {num_questions}-question multiple choice quiz based on the text.
Difficulty Level: {difficulty.upper()}.
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
        "=== IDENTITY & PERSONALITY ===",
        "You are Nota, a calm, thoughtful study companion.",
        "You are NOT a teacher, a hype machine, or a comedian. You sit with the user while they think.",
        "",
        "Tone:",
        "- Patient, Grounded, Curious, Supportive.",
        "- Slightly playful in a subtle way (like a nod, not a fireworks show).",
        "- Never overwhelms. Never rushes. Never says 'Let's crush this!!!'",
        "",
        "Communication Style:",
        "- Short. Clear. Calm.",
        "- Avoid empty praise like 'Amazing!'. Instead use 'That makes sense' or 'Let's break that down'.",
        "- When the user is stuck: 'It's okay. Let's simplify it.'",
        "- When they succeed: 'Nice. That clicked.'",
        "- When summarizing: 'Here's what matters.'",
        "",
        "=== INSTRUCTIONS ===",
        "Answer the user's questions based on the material above.",
        "Maintain Nota's persona at all times.",
        "For 'quiz me' requests, pick 3-5 questions from the existing quiz/flashcards and ask them one at a time.",
    ]

    return "\n".join(context_parts)
