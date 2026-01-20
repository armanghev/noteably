"""Export formatters for different file formats."""
import io
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from apps.ingestion.models import Job

logger = logging.getLogger(__name__)


def export_markdown(job: Job, material_types: Optional[List[str]] = None) -> str:
    """Generate markdown export for job."""
    if material_types is None:
        material_types = job.material_types
    
    content_parts = []
    
    # Add header
    content_parts.append(f"# Study Materials: {job.filename}\n")
    if job.completed_at:
        content_parts.append(f"**Generated:** {job.completed_at.strftime('%Y-%m-%d %H:%M:%S')}\n")
    content_parts.append(f"**Job ID:** {job.id}\n\n---\n\n")
    
    # Add summaries
    if 'summary' in material_types:
        summaries = [gc for gc in job.generated_content.all() if gc.type == 'summary']
        for summary in summaries:
            content = summary.content
            if isinstance(content, dict):
                if 'title' in content:
                    content_parts.append(f"## {content['title']}\n\n")
                if 'summary' in content:
                    content_parts.append(f"{content['summary']}\n\n")
                if 'key_points' in content and content['key_points']:
                    content_parts.append("### Key Points\n\n")
                    for point in content['key_points']:
                        content_parts.append(f"- {point}\n")
                content_parts.append("\n---\n\n")
    
    # Add notes
    if 'notes' in material_types:
        notes = [gc for gc in job.generated_content.all() if gc.type == 'notes']
        for note in notes:
            content = note.content
            if isinstance(content, dict):
                if 'content' in content:
                    content_parts.append("## Notes\n\n")
                    content_parts.append(f"{content['content']}\n\n")
                    content_parts.append("---\n\n")
    
    return ''.join(content_parts)


def export_json(job: Job, material_types: Optional[List[str]] = None, format: str = 'generic') -> Dict[str, Any]:
    """Generate JSON export for job."""
    if material_types is None:
        material_types = job.material_types
    
    export_data: Dict[str, Any] = {
        "metadata": {
            "filename": job.filename,
            "generated_at": job.completed_at.isoformat() if job.completed_at else None,
            "job_id": str(job.id)
        }
    }
    
    # Add flashcards
    if 'flashcards' in material_types:
        flashcards_content = [gc for gc in job.generated_content.all() if gc.type == 'flashcards']
        if flashcards_content:
            flashcards = flashcards_content[0].content
            if isinstance(flashcards, dict) and 'flashcards' in flashcards:
                if format == 'anki':
                    export_data['deckName'] = job.filename
                    export_data['modelName'] = 'Basic'
                    export_data['cards'] = [
                        {
                            "front": card.get('front', ''),
                            "back": card.get('back', ''),
                            "tags": card.get('tags', [])
                        }
                        for card in flashcards['flashcards']
                    ]
                else:
                    export_data['flashcards'] = flashcards['flashcards']
    
    # Add quizzes
    if 'quiz' in material_types or 'quizzes' in material_types:
        quiz_content = [gc for gc in job.generated_content.all() if gc.type in ['quiz', 'quizzes']]
        if quiz_content:
            quiz = quiz_content[0].content
            if isinstance(quiz, dict) and 'questions' in quiz:
                export_data['quizzes'] = [
                    {
                        "question": q.get('question', q.get('text', '')),
                        "options": q.get('options', []),
                        "correct_answer": q.get('correct_answer') or q.get('correctAnswer') or q.get('correct_option'),
                        "explanation": q.get('explanation', '')
                    }
                    for q in quiz['questions']
                ]
    
    return export_data


def export_pdf(job: Job, material_types: Optional[List[str]] = None, options: Optional[Dict[str, Any]] = None) -> bytes:
    """Generate PDF export for job."""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
    except ImportError:
        logger.error("reportlab not installed. Install with: pip install reportlab")
        raise ImportError("reportlab is required for PDF export. Install with: pip install reportlab")
    
    if material_types is None:
        material_types = job.material_types
    if options is None:
        options = {}
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2d2d2d'),
        spaceAfter=12,
        spaceBefore=20,
    )
    
    # Cover page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(f"<b>{job.filename}</b>", title_style))
    story.append(Spacer(1, 0.5*inch))
    if job.completed_at:
        story.append(Paragraph(f"Generated: {job.completed_at.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(PageBreak())
    
    # Table of contents placeholder
    story.append(Paragraph("Table of Contents", heading_style))
    toc_items = []
    if 'summary' in material_types:
        toc_items.append("Summary")
    if 'notes' in material_types:
        toc_items.append("Notes")
    if 'flashcards' in material_types:
        toc_items.append("Flashcards")
    if 'quiz' in material_types or 'quizzes' in material_types:
        toc_items.append("Quiz")
    
    for item in toc_items:
        story.append(Paragraph(f"• {item}", styles['Normal']))
        story.append(Spacer(1, 6))
    
    story.append(PageBreak())
    
    # Add summaries
    if 'summary' in material_types:
        summaries = [gc for gc in job.generated_content.all() if gc.type == 'summary']
        for summary in summaries:
            content = summary.content
            if isinstance(content, dict):
                story.append(Paragraph("Summary", heading_style))
                if 'title' in content:
                    story.append(Paragraph(f"<b>{content['title']}</b>", styles['Heading2']))
                if 'summary' in content:
                    story.append(Paragraph(content['summary'].replace('\n', '<br/>'), styles['Normal']))
                if 'key_points' in content and content['key_points']:
                    story.append(Spacer(1, 12))
                    story.append(Paragraph("<b>Key Points:</b>", styles['Heading3']))
                    for point in content['key_points']:
                        story.append(Paragraph(f"• {point}", styles['Normal']))
                story.append(PageBreak())
    
    # Add notes
    if 'notes' in material_types:
        notes = [gc for gc in job.generated_content.all() if gc.type == 'notes']
        for note in notes:
            content = note.content
            if isinstance(content, dict) and 'content' in content:
                story.append(Paragraph("Notes", heading_style))
                # Convert markdown-like content to HTML for PDF
                notes_text = content['content'].replace('\n\n', '<br/><br/>').replace('\n', '<br/>')
                story.append(Paragraph(notes_text, styles['Normal']))
                story.append(PageBreak())
    
    # Add flashcards
    if 'flashcards' in material_types:
        flashcards_content = [gc for gc in job.generated_content.all() if gc.type == 'flashcards']
        if flashcards_content:
            flashcards = flashcards_content[0].content
            if isinstance(flashcards, dict) and 'flashcards' in flashcards:
                story.append(Paragraph("Flashcards", heading_style))
                for idx, card in enumerate(flashcards['flashcards'], 1):
                    story.append(Paragraph(f"<b>Card {idx}</b>", styles['Heading3']))
                    story.append(Paragraph(f"<b>Q:</b> {card.get('front', '')}", styles['Normal']))
                    story.append(Paragraph(f"<b>A:</b> {card.get('back', '')}", styles['Normal']))
                    story.append(Spacer(1, 12))
                story.append(PageBreak())
    
    # Add quizzes
    if 'quiz' in material_types or 'quizzes' in material_types:
        quiz_content = [gc for gc in job.generated_content.all() if gc.type in ['quiz', 'quizzes']]
        if quiz_content:
            quiz = quiz_content[0].content
            if isinstance(quiz, dict) and 'questions' in quiz:
                story.append(Paragraph("Quiz", heading_style))
                for idx, q in enumerate(quiz['questions'], 1):
                    story.append(Paragraph(f"<b>Question {idx}</b>", styles['Heading3']))
                    story.append(Paragraph(q.get('question', q.get('text', '')), styles['Normal']))
                    story.append(Spacer(1, 6))
                    for opt_idx, option in enumerate(q.get('options', []), 1):
                        marker = "✓" if opt_idx == (q.get('correct_answer') or q.get('correctAnswer') or q.get('correct_option') or 0) else "○"
                        story.append(Paragraph(f"{marker} {chr(64 + opt_idx)}. {option}", styles['Normal']))
                    if q.get('explanation'):
                        story.append(Spacer(1, 6))
                        story.append(Paragraph(f"<i>Explanation: {q['explanation']}</i>", styles['Normal']))
                    story.append(Spacer(1, 12))
                story.append(PageBreak())
    
    doc.build(story)
    return buffer.getvalue()
