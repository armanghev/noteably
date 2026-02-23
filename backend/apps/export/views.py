"""Export views for generating downloadable files."""
import io
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAuthenticated
from apps.ingestion.models import Job
from apps.ingestion.r2_storage import upload_bytes_to_r2, get_signed_url
from .formatters import export_markdown, export_json, export_pdf
from .serializers import ExportRequestSerializer, ExportResponseSerializer

logger = logging.getLogger(__name__)




@api_view(["POST"])
@permission_classes([IsAuthenticated])
def export_job(request):
    """
    Export a job's generated content in the specified format.
    
    POST /api/export
    {
        "job_id": "uuid",
        "format": "markdown" | "json" | "pdf",
        "material_types": ["summary", "notes", ...],  # Optional
        "options": {
            "include_transcript": false,
            "include_metadata": true
        }
    }
    """
    serializer = ExportRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    job_id = serializer.validated_data['job_id']
    format_type = serializer.validated_data['format']
    material_types = serializer.validated_data.get('material_types')
    options = serializer.validated_data.get('options', {})
    
    # Get and verify job
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found or access denied"},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # Verify job is completed
    if job.status != 'completed':
        return Response(
            {"error": "Job must be completed before export"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # PDF export is available to all users (no paywall)
    
    try:
        # Generate export file
        if format_type == 'markdown':
            content = export_markdown(job, material_types)
            file_content = content.encode('utf-8')
            file_ext = 'md'
            content_type = 'text/markdown'
        elif format_type == 'json':
            content = export_json(job, material_types)
            file_content = json.dumps(content, indent=2).encode('utf-8')
            file_ext = 'json'
            content_type = 'application/json'
        elif format_type == 'pdf':
            file_content = export_pdf(job, material_types, options)
            file_ext = 'pdf'
            content_type = 'application/pdf'
        else:
            return Response(
                {"error": f"Unsupported format: {format_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = "".join(c for c in job.filename if c.isalnum() or c in (' ', '-', '_')).rstrip()
        file_name = f"{safe_filename}_{timestamp}.{file_ext}"
        
        # Upload to R2 in job's exports directory
        # Structure: {job_id}/exports/{format_type}/{filename}
        subfolder = f"exports/{format_type}"
        storage_url = upload_bytes_to_r2(
            content=file_content,
            filename=file_name,
            job_id=str(job_id),
            content_type=content_type,
            subfolder=subfolder,
        )

        # Key format: {job_id}/exports/{format_type}/{filename}
        key = f"{job_id}/{subfolder}/{file_name}"

        # Generate signed URL (expires in 1 hour)
        download_url = get_signed_url(key, expires_in=3600)
        expires_at = datetime.now() + timedelta(hours=1)
        
        response_data = {
            "download_url": download_url,
            "file_name": file_name,
            "file_size": len(file_content),
            "expires_at": expires_at.isoformat(),
        }
        
        # Log export event
        logger.info(f"Export generated: user={request.user_id}, job={job_id}, format={format_type}")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ImportError as e:
        logger.error(f"PDF export failed: {e}")
        return Response(
            {"error": "PDF export is not available. Please install reportlab."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as e:
        logger.exception(f"Export failed: {e}")
        return Response(
            {"error": f"Export failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
