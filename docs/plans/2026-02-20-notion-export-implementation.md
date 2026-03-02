# Notion Export Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users push Noteably study materials directly into their Notion workspace via OAuth, with smart content mapping (summary/notes → pages, flashcards/quiz → databases).

**Architecture:** New `integrations` Django app handles OAuth and connection storage. A `notion_exporter.py` module in the `export` app does the Notion API calls. Frontend adds a `NotionExportModal` component and a "Connected Apps" section in Profile.

**Tech Stack:** `notion-client` (Python SDK), Django ORM, DRF, React + TypeScript, TanStack Query, Radix UI dialogs, Tailwind CSS.

**Worktree:** `.worktrees/notion-export` on branch `feature/notion-export`

---

### Task 1: Add notion-client dependency

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: Add the package**

Append to `backend/requirements.txt`:
```
notion-client>=2.2.1
```

**Step 2: Install in virtualenv**

```bash
cd backend && source venv/bin/activate && pip install notion-client
```
Expected: Successfully installed notion-client

**Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add notion-client dependency"
```

---

### Task 2: Create the integrations app scaffold

**Files:**
- Create: `backend/apps/integrations/__init__.py`
- Create: `backend/apps/integrations/apps.py`
- Create: `backend/apps/integrations/models.py`
- Create: `backend/apps/integrations/views.py`
- Create: `backend/apps/integrations/urls.py`
- Create: `backend/apps/integrations/serializers.py`
- Create: `backend/apps/integrations/tests/__init__.py`
- Create: `backend/apps/integrations/tests/test_models.py`

**Step 1: Write failing test for NotionConnection model**

`backend/apps/integrations/tests/test_models.py`:
```python
"""Tests for integrations models."""
import uuid
from django.test import TestCase
from apps.integrations.models import NotionConnection


class NotionConnectionModelTest(TestCase):
    def test_create_notion_connection(self):
        user_id = uuid.uuid4()
        conn = NotionConnection.objects.create(
            user_id=user_id,
            access_token="secret_abc123",
            workspace_id="ws_001",
            workspace_name="My Workspace",
        )
        self.assertEqual(str(conn.user_id), str(user_id))
        self.assertEqual(conn.workspace_name, "My Workspace")
        self.assertIsNone(conn.default_page_id)

    def test_one_connection_per_user(self):
        user_id = uuid.uuid4()
        NotionConnection.objects.create(
            user_id=user_id,
            access_token="token1",
            workspace_id="ws_001",
            workspace_name="WS",
        )
        with self.assertRaises(Exception):
            NotionConnection.objects.create(
                user_id=user_id,
                access_token="token2",
                workspace_id="ws_002",
                workspace_name="WS2",
            )
```

**Step 2: Run test to verify it fails**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_models -v 2
```
Expected: FAIL — `ModuleNotFoundError: No module named 'apps.integrations'`

**Step 3: Create the app files**

`backend/apps/integrations/__init__.py`:
```python
```

`backend/apps/integrations/apps.py`:
```python
from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.integrations"
```

`backend/apps/integrations/models.py`:
```python
"""Models for third-party integrations."""
import uuid
from django.db import models


class NotionConnection(models.Model):
    """Stores a user's Notion OAuth connection."""

    user_id = models.UUIDField(unique=True, db_index=True)
    access_token = models.TextField()
    workspace_id = models.CharField(max_length=255)
    workspace_name = models.CharField(max_length=255)
    workspace_icon = models.TextField(blank=True)
    default_page_id = models.CharField(max_length=255, null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notion_connections"

    def __str__(self):
        return f"NotionConnection(user={self.user_id}, workspace={self.workspace_name})"
```

`backend/apps/integrations/tests/__init__.py`:
```python
```

**Step 4: Register app in Django settings**

In `backend/config/settings.py`, find `INSTALLED_APPS` and add:
```python
"apps.integrations",
```

**Step 5: Create and apply migration**

```bash
cd backend && source venv/bin/activate
python manage.py makemigrations integrations
python manage.py migrate
```
Expected: Created and applied migration for `notion_connections` table.

**Step 6: Run test to verify it passes**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_models -v 2
```
Expected: OK (2 tests)

**Step 7: Commit**

```bash
git add backend/apps/integrations/ backend/config/settings.py
git commit -m "feat(integrations): add NotionConnection model and app scaffold"
```

---

### Task 3: OAuth views — auth redirect and callback

**Files:**
- Modify: `backend/apps/integrations/views.py`
- Create: `backend/apps/integrations/tests/test_oauth_views.py`
- Modify: `backend/apps/integrations/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Write failing tests**

`backend/apps/integrations/tests/test_oauth_views.py`:
```python
"""Tests for Notion OAuth views."""
import uuid
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient
from apps.integrations.models import NotionConnection


def _make_request_with_user(client, user_id):
    """Helper: attach user_id to request like auth middleware does."""
    client.user_id = str(user_id)


class NotionAuthRedirectTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_auth_redirect_returns_redirect(self):
        """GET /auth/ should redirect to Notion OAuth URL."""
        with patch("apps.integrations.views.settings") as mock_settings:
            mock_settings.NOTION_CLIENT_ID = "test_client_id"
            mock_settings.NOTION_REDIRECT_URI = "http://localhost:8000/api/integrations/notion/callback/"
            response = self.client.get("/api/integrations/notion/auth/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("notion.so/oauth/authorize", response["Location"])
        self.assertIn("test_client_id", response["Location"])


class NotionCallbackTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_id = uuid.uuid4()

    @patch("apps.integrations.views.exchange_notion_code")
    def test_callback_stores_connection(self, mock_exchange):
        """Callback with valid code stores NotionConnection."""
        mock_exchange.return_value = {
            "access_token": "secret_abc",
            "workspace_id": "ws_001",
            "workspace_name": "Test WS",
            "workspace_icon": "",
        }
        # Simulate middleware by forcing user_id onto session
        session = self.client.session
        session["user_id"] = str(self.user_id)
        session.save()

        with patch("apps.integrations.views._get_user_id_from_request") as mock_uid:
            mock_uid.return_value = self.user_id
            response = self.client.get(
                "/api/integrations/notion/callback/",
                {"code": "auth_code_123"},
            )

        self.assertIn(response.status_code, [200, 302])
        self.assertTrue(NotionConnection.objects.filter(user_id=self.user_id).exists())

    def test_callback_without_code_returns_error(self):
        """Callback without code param returns 400."""
        response = self.client.get("/api/integrations/notion/callback/")
        self.assertEqual(response.status_code, 400)
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_oauth_views -v 2
```
Expected: FAIL — views/urls not yet implemented.

**Step 3: Implement the OAuth views**

`backend/apps/integrations/views.py`:
```python
"""Views for Notion OAuth integration."""
import logging
import urllib.parse
import requests

from django.conf import settings
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAuthenticated
from .models import NotionConnection

logger = logging.getLogger(__name__)

NOTION_OAUTH_URL = "https://api.notion.com/v1/oauth/authorize"
NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"


def _get_user_id_from_request(request):
    """Extract user_id from request (set by auth middleware)."""
    return getattr(request, "user_id", None)


def exchange_notion_code(code: str) -> dict:
    """Exchange OAuth code for access token. Returns token payload dict."""
    resp = requests.post(
        NOTION_TOKEN_URL,
        json={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.NOTION_REDIRECT_URI,
        },
        auth=(settings.NOTION_CLIENT_ID, settings.NOTION_CLIENT_SECRET),
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "access_token": data["access_token"],
        "workspace_id": data["workspace_id"],
        "workspace_name": data.get("workspace_name", ""),
        "workspace_icon": data.get("workspace_icon", "") or "",
    }


@api_view(["GET"])
def notion_auth_redirect(request):
    """Redirect user to Notion OAuth consent screen."""
    params = {
        "client_id": settings.NOTION_CLIENT_ID,
        "response_type": "code",
        "owner": "user",
        "redirect_uri": settings.NOTION_REDIRECT_URI,
    }
    url = f"{NOTION_OAUTH_URL}?{urllib.parse.urlencode(params)}"
    return redirect(url)


@api_view(["GET"])
def notion_callback(request):
    """Handle OAuth callback from Notion."""
    code = request.query_params.get("code")
    if not code:
        return Response({"error": "Missing code parameter"}, status=status.HTTP_400_BAD_REQUEST)

    user_id = _get_user_id_from_request(request)
    if not user_id:
        # Redirect to frontend with error if no session user
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}/profile?notion=error")

    try:
        token_data = exchange_notion_code(code)
    except Exception as e:
        logger.error(f"Notion token exchange failed: {e}")
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}/profile?notion=error")

    NotionConnection.objects.update_or_create(
        user_id=user_id,
        defaults={
            "access_token": token_data["access_token"],
            "workspace_id": token_data["workspace_id"],
            "workspace_name": token_data["workspace_name"],
            "workspace_icon": token_data["workspace_icon"],
        },
    )

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return redirect(f"{frontend_url}/profile?notion=connected")
```

**Step 4: Wire up URLs**

`backend/apps/integrations/urls.py`:
```python
"""URL configuration for integrations app."""
from django.urls import path
from . import views

urlpatterns = [
    path("auth/", views.notion_auth_redirect, name="notion_auth"),
    path("callback/", views.notion_callback, name="notion_callback"),
    path("status/", views.notion_status, name="notion_status"),
    path("disconnect/", views.notion_disconnect, name="notion_disconnect"),
    path("pages/", views.notion_pages, name="notion_pages"),
    path("settings/", views.notion_settings, name="notion_settings"),
    path("export/<uuid:job_id>/", views.notion_export, name="notion_export"),
]
```

In `backend/config/urls.py`, add:
```python
path("api/integrations/notion/", include("apps.integrations.urls")),
```

**Step 5: Run tests to verify they pass**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_oauth_views -v 2
```
Expected: OK (3 tests)

**Step 6: Commit**

```bash
git add backend/apps/integrations/ backend/config/urls.py
git commit -m "feat(integrations): add Notion OAuth redirect and callback views"
```

---

### Task 4: Status, disconnect, pages, and settings views

**Files:**
- Modify: `backend/apps/integrations/views.py`
- Create: `backend/apps/integrations/tests/test_management_views.py`

**Step 1: Write failing tests**

`backend/apps/integrations/tests/test_management_views.py`:
```python
"""Tests for Notion connection management views."""
import uuid
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIClient
from apps.integrations.models import NotionConnection


def _auth_client(user_id):
    """Return an APIClient with mocked auth middleware."""
    client = APIClient()
    client.force_authenticate(user={"id": str(user_id)})
    return client, user_id


class NotionStatusTest(TestCase):
    def test_status_not_connected(self):
        client = APIClient()
        user_id = uuid.uuid4()
        with patch("apps.integrations.views._get_user_id_from_request", return_value=user_id):
            response = client.get("/api/integrations/notion/status/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["connected"])

    def test_status_connected(self):
        client = APIClient()
        user_id = uuid.uuid4()
        NotionConnection.objects.create(
            user_id=user_id,
            access_token="tok",
            workspace_id="ws1",
            workspace_name="My WS",
        )
        with patch("apps.integrations.views._get_user_id_from_request", return_value=user_id):
            response = client.get("/api/integrations/notion/status/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["connected"])
        self.assertEqual(response.data["workspace_name"], "My WS")


class NotionDisconnectTest(TestCase):
    def test_disconnect_removes_connection(self):
        client = APIClient()
        user_id = uuid.uuid4()
        NotionConnection.objects.create(
            user_id=user_id, access_token="tok", workspace_id="ws1", workspace_name="WS"
        )
        with patch("apps.integrations.views._get_user_id_from_request", return_value=user_id):
            response = client.delete("/api/integrations/notion/disconnect/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(NotionConnection.objects.filter(user_id=user_id).exists())


class NotionSettingsTest(TestCase):
    def test_update_default_page(self):
        client = APIClient()
        user_id = uuid.uuid4()
        NotionConnection.objects.create(
            user_id=user_id, access_token="tok", workspace_id="ws1", workspace_name="WS"
        )
        with patch("apps.integrations.views._get_user_id_from_request", return_value=user_id):
            response = client.put(
                "/api/integrations/notion/settings/",
                {"default_page_id": "page_abc123"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        conn = NotionConnection.objects.get(user_id=user_id)
        self.assertEqual(conn.default_page_id, "page_abc123")
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_management_views -v 2
```
Expected: FAIL — views not yet defined.

**Step 3: Implement the views**

Append to `backend/apps/integrations/views.py`:
```python
@api_view(["GET"])
def notion_status(request):
    """Return connection status for the current user."""
    user_id = _get_user_id_from_request(request)
    try:
        conn = NotionConnection.objects.get(user_id=user_id)
        return Response({
            "connected": True,
            "workspace_name": conn.workspace_name,
            "workspace_icon": conn.workspace_icon,
            "default_page_id": conn.default_page_id,
        })
    except NotionConnection.DoesNotExist:
        return Response({"connected": False})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def notion_disconnect(request):
    """Delete the user's Notion connection."""
    user_id = _get_user_id_from_request(request)
    NotionConnection.objects.filter(user_id=user_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notion_pages(request):
    """List the user's top-level Notion pages for destination picker."""
    user_id = _get_user_id_from_request(request)
    try:
        conn = NotionConnection.objects.get(user_id=user_id)
    except NotionConnection.DoesNotExist:
        return Response({"error": "Notion not connected"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from notion_client import Client
        notion = Client(auth=conn.access_token)
        results = notion.search(filter={"value": "page", "property": "object"}, page_size=50)
        pages = [
            {"id": p["id"], "title": _get_page_title(p)}
            for p in results.get("results", [])
            if p["object"] == "page"
        ]
        return Response({"pages": pages})
    except Exception as e:
        logger.error(f"Failed to fetch Notion pages: {e}")
        return Response({"error": "Failed to fetch pages"}, status=status.HTTP_502_BAD_GATEWAY)


def _get_page_title(page: dict) -> str:
    """Extract plain text title from a Notion page object."""
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            title_parts = prop.get("title", [])
            return "".join(t.get("plain_text", "") for t in title_parts)
    return "Untitled"


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def notion_settings(request):
    """Update the user's default Notion destination page."""
    user_id = _get_user_id_from_request(request)
    try:
        conn = NotionConnection.objects.get(user_id=user_id)
    except NotionConnection.DoesNotExist:
        return Response({"error": "Notion not connected"}, status=status.HTTP_400_BAD_REQUEST)

    default_page_id = request.data.get("default_page_id")
    conn.default_page_id = default_page_id or None
    conn.save(update_fields=["default_page_id"])
    return Response({"default_page_id": conn.default_page_id})
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_management_views -v 2
```
Expected: OK (4 tests)

**Step 5: Commit**

```bash
git add backend/apps/integrations/
git commit -m "feat(integrations): add Notion status, disconnect, pages, and settings views"
```

---

### Task 5: Build notion_exporter.py (smart mapping engine)

**Files:**
- Create: `backend/apps/export/notion_exporter.py`
- Create: `backend/apps/export/tests/__init__.py`
- Create: `backend/apps/export/tests/test_notion_exporter.py`

**Step 1: Write failing tests**

`backend/apps/export/tests/test_notion_exporter.py`:
```python
"""Tests for Notion export smart mapping."""
from unittest.mock import patch, MagicMock, call
from django.test import TestCase
from apps.export.notion_exporter import (
    _build_summary_blocks,
    _build_notes_blocks,
    _build_flashcard_db_payload,
    _build_quiz_db_payload,
)


class SummaryBlocksTest(TestCase):
    def test_builds_heading_paragraph_and_bullets(self):
        content = {
            "title": "Biology 101",
            "summary": "Cells are the basic unit of life.",
            "key_points": ["Cells have nuclei", "Mitochondria produce energy"],
        }
        blocks = _build_summary_blocks(content)
        types = [b["type"] for b in blocks]
        self.assertIn("heading_1", types)
        self.assertIn("paragraph", types)
        self.assertIn("bulleted_list_item", types)

    def test_handles_missing_key_points(self):
        content = {"title": "Test", "summary": "A summary."}
        blocks = _build_summary_blocks(content)
        types = [b["type"] for b in blocks]
        self.assertNotIn("bulleted_list_item", types)


class NotesBlocksTest(TestCase):
    def test_plain_text_becomes_paragraph(self):
        content = {"content": "This is a note.\n\nSecond paragraph."}
        blocks = _build_notes_blocks(content)
        self.assertTrue(len(blocks) >= 1)
        self.assertEqual(blocks[0]["type"], "paragraph")


class FlashcardDbPayloadTest(TestCase):
    def test_payload_has_correct_properties(self):
        payload = _build_flashcard_db_payload()
        props = payload["properties"]
        self.assertIn("Front", props)
        self.assertIn("Back", props)
        self.assertIn("Tags", props)
        self.assertEqual(props["Front"]["title"], {})
        self.assertEqual(props["Tags"]["multi_select"], {})


class QuizDbPayloadTest(TestCase):
    def test_payload_has_correct_properties(self):
        payload = _build_quiz_db_payload()
        props = payload["properties"]
        self.assertIn("Question", props)
        self.assertIn("Correct Answer", props)
        self.assertIn("Explanation", props)
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.export.tests.test_notion_exporter -v 2
```
Expected: FAIL — module not found.

**Step 3: Implement notion_exporter.py**

`backend/apps/export/notion_exporter.py`:
```python
"""Notion export engine — smart-maps Noteably content to Notion blocks/databases."""
import logging
from typing import List, Dict, Any, Optional

from apps.ingestion.models import Job

logger = logging.getLogger(__name__)


# ── Block builders ────────────────────────────────────────────────────────────

def _rich_text(text: str) -> List[Dict]:
    return [{"type": "text", "text": {"content": text[:2000]}}]


def _build_summary_blocks(content: dict) -> List[Dict]:
    blocks = []
    if content.get("title"):
        blocks.append({
            "object": "block", "type": "heading_1",
            "heading_1": {"rich_text": _rich_text(content["title"])},
        })
    if content.get("summary"):
        blocks.append({
            "object": "block", "type": "paragraph",
            "paragraph": {"rich_text": _rich_text(content["summary"])},
        })
    for point in content.get("key_points", []):
        blocks.append({
            "object": "block", "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": _rich_text(point)},
        })
    return blocks


def _build_notes_blocks(content: dict) -> List[Dict]:
    blocks = []
    raw = content.get("content", "")
    for para in raw.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        if para.startswith("## "):
            blocks.append({
                "object": "block", "type": "heading_2",
                "heading_2": {"rich_text": _rich_text(para[3:])},
            })
        elif para.startswith("# "):
            blocks.append({
                "object": "block", "type": "heading_1",
                "heading_1": {"rich_text": _rich_text(para[2:])},
            })
        else:
            blocks.append({
                "object": "block", "type": "paragraph",
                "paragraph": {"rich_text": _rich_text(para[:2000])},
            })
    return blocks


# ── Database schema builders ──────────────────────────────────────────────────

def _build_flashcard_db_payload() -> Dict:
    return {
        "properties": {
            "Front": {"title": {}},
            "Back": {"rich_text": {}},
            "Tags": {"multi_select": {}},
        }
    }


def _build_quiz_db_payload() -> Dict:
    return {
        "properties": {
            "Question": {"title": {}},
            "Option A": {"rich_text": {}},
            "Option B": {"rich_text": {}},
            "Option C": {"rich_text": {}},
            "Option D": {"rich_text": {}},
            "Correct Answer": {"rich_text": {}},
            "Explanation": {"rich_text": {}},
        }
    }


# ── Main export function ──────────────────────────────────────────────────────

def export_to_notion(
    job: Job,
    access_token: str,
    parent_page_id: Optional[str],
    material_types: List[str],
) -> str:
    """
    Push job content to Notion. Returns the URL of the created parent page.
    """
    from notion_client import Client
    notion = Client(auth=access_token)

    # Build parent reference
    parent = (
        {"type": "page_id", "page_id": parent_page_id}
        if parent_page_id
        else {"type": "workspace", "workspace": True}
    )

    # Create the top-level parent page
    parent_page = notion.pages.create(
        parent=parent,
        properties={
            "title": {"title": _rich_text(f"{job.filename} — Study Materials")}
        },
    )
    parent_page_id_created = parent_page["id"]
    parent_ref = {"type": "page_id", "page_id": parent_page_id_created}

    # Summary → page
    if "summary" in material_types:
        summaries = [gc for gc in job.generated_content.all() if gc.type == "summary"]
        for s in summaries:
            if isinstance(s.content, dict):
                notion.pages.create(
                    parent=parent_ref,
                    properties={"title": {"title": _rich_text("Summary")}},
                    children=_build_summary_blocks(s.content),
                )

    # Notes → page
    if "notes" in material_types:
        notes = [gc for gc in job.generated_content.all() if gc.type == "notes"]
        for n in notes:
            if isinstance(n.content, dict):
                notion.pages.create(
                    parent=parent_ref,
                    properties={"title": {"title": _rich_text("Notes")}},
                    children=_build_notes_blocks(n.content),
                )

    # Flashcards → inline database
    if "flashcards" in material_types:
        fc_content = [gc for gc in job.generated_content.all() if gc.type == "flashcards"]
        if fc_content:
            cards = fc_content[0].content.get("flashcards", [])
            if cards:
                db_payload = _build_flashcard_db_payload()
                db = notion.databases.create(
                    parent=parent_ref,
                    title=_rich_text("Flashcards"),
                    is_inline=True,
                    **db_payload,
                )
                for card in cards:
                    tags = card.get("tags", [])
                    notion.pages.create(
                        parent={"type": "database_id", "database_id": db["id"]},
                        properties={
                            "Front": {"title": _rich_text(card.get("front", ""))},
                            "Back": {"rich_text": _rich_text(card.get("back", ""))},
                            "Tags": {"multi_select": [{"name": t} for t in tags]},
                        },
                    )

    # Quiz → inline database
    if "quiz" in material_types or "quizzes" in material_types:
        quiz_content = [gc for gc in job.generated_content.all() if gc.type in ["quiz", "quizzes"]]
        if quiz_content:
            questions = quiz_content[0].content.get("questions", [])
            if questions:
                db_payload = _build_quiz_db_payload()
                db = notion.databases.create(
                    parent=parent_ref,
                    title=_rich_text("Quiz"),
                    is_inline=True,
                    **db_payload,
                )
                for q in questions:
                    options = q.get("options", [])
                    correct_idx = (
                        q.get("correct_answer") or q.get("correctAnswer") or q.get("correct_option") or 0
                    )
                    correct_letter = chr(64 + correct_idx) if isinstance(correct_idx, int) and correct_idx > 0 else str(correct_idx)
                    notion.pages.create(
                        parent={"type": "database_id", "database_id": db["id"]},
                        properties={
                            "Question": {"title": _rich_text(q.get("question", q.get("text", "")))},
                            "Option A": {"rich_text": _rich_text(options[0] if len(options) > 0 else "")},
                            "Option B": {"rich_text": _rich_text(options[1] if len(options) > 1 else "")},
                            "Option C": {"rich_text": _rich_text(options[2] if len(options) > 2 else "")},
                            "Option D": {"rich_text": _rich_text(options[3] if len(options) > 3 else "")},
                            "Correct Answer": {"rich_text": _rich_text(correct_letter)},
                            "Explanation": {"rich_text": _rich_text(q.get("explanation", ""))},
                        },
                    )

    return parent_page.get("url", "")
```

`backend/apps/export/tests/__init__.py`:
```python
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.export.tests.test_notion_exporter -v 2
```
Expected: OK (5 tests)

**Step 5: Commit**

```bash
git add backend/apps/export/notion_exporter.py backend/apps/export/tests/
git commit -m "feat(export): add Notion smart mapping exporter"
```

---

### Task 6: Notion export endpoint

**Files:**
- Modify: `backend/apps/integrations/views.py`
- Create: `backend/apps/integrations/tests/test_export_view.py`

**Step 1: Write failing test**

`backend/apps/integrations/tests/test_export_view.py`:
```python
"""Tests for the Notion export endpoint."""
import uuid
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from apps.integrations.models import NotionConnection
from apps.ingestion.models import Job


class NotionExportViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_id = uuid.uuid4()
        NotionConnection.objects.create(
            user_id=self.user_id,
            access_token="secret_tok",
            workspace_id="ws1",
            workspace_name="WS",
        )
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="lecture.mp4",
            file_size_bytes=1000,
            file_type="video/mp4",
            storage_url="https://storage.example.com/file",
            status="completed",
            material_types=["summary", "flashcards"],
        )

    @patch("apps.integrations.views.export_to_notion")
    @patch("apps.integrations.views._get_user_id_from_request")
    def test_export_returns_notion_url(self, mock_uid, mock_export):
        mock_uid.return_value = self.user_id
        mock_export.return_value = "https://www.notion.so/page-abc"
        response = self.client.post(
            f"/api/integrations/notion/export/{self.job.id}/",
            {"material_types": ["summary"]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("notion_url", response.data)
        self.assertEqual(response.data["notion_url"], "https://www.notion.so/page-abc")

    @patch("apps.integrations.views._get_user_id_from_request")
    def test_export_fails_if_not_connected(self, mock_uid):
        other_user = uuid.uuid4()
        mock_uid.return_value = other_user
        response = self.client.post(
            f"/api/integrations/notion/export/{self.job.id}/",
            {"material_types": ["summary"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    @patch("apps.integrations.views._get_user_id_from_request")
    def test_export_fails_if_job_not_completed(self, mock_uid):
        mock_uid.return_value = self.user_id
        self.job.status = "generating_summary"
        self.job.save()
        response = self.client.post(
            f"/api/integrations/notion/export/{self.job.id}/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations.tests.test_export_view -v 2
```
Expected: FAIL

**Step 3: Implement the export view**

Append to `backend/apps/integrations/views.py`:
```python
from apps.export.notion_exporter import export_to_notion
from apps.ingestion.models import Job


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notion_export(request, job_id):
    """Push job content to the user's Notion workspace."""
    user_id = _get_user_id_from_request(request)

    # Verify Notion connection
    try:
        conn = NotionConnection.objects.get(user_id=user_id)
    except NotionConnection.DoesNotExist:
        return Response({"error": "Notion not connected"}, status=status.HTTP_400_BAD_REQUEST)

    # Verify job ownership and status
    try:
        job = Job.objects.get(id=job_id, user_id=user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    if job.status != "completed":
        return Response({"error": "Job must be completed before export"}, status=status.HTTP_400_BAD_REQUEST)

    material_types = request.data.get("material_types") or job.material_types

    try:
        notion_url = export_to_notion(
            job=job,
            access_token=conn.access_token,
            parent_page_id=conn.default_page_id,
            material_types=material_types,
        )
        return Response({"notion_url": notion_url})
    except Exception as e:
        logger.error(f"Notion export failed: {e}")
        return Response({"error": "Export to Notion failed"}, status=status.HTTP_502_BAD_GATEWAY)
```

**Step 4: Run all integration tests**

```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations -v 2
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add backend/apps/integrations/
git commit -m "feat(integrations): add Notion export endpoint"
```

---

### Task 7: Add env vars to backend settings

**Files:**
- Modify: `backend/config/settings.py`

**Step 1: Add settings**

Find the env var block in `backend/config/settings.py` and add:
```python
NOTION_CLIENT_ID = env("NOTION_CLIENT_ID", default="")
NOTION_CLIENT_SECRET = env("NOTION_CLIENT_SECRET", default="")
NOTION_REDIRECT_URI = env("NOTION_REDIRECT_URI", default="http://localhost:8000/api/integrations/notion/callback/")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
```

**Step 2: Add to .env.example** (if it exists, otherwise skip)

```
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:8000/api/integrations/notion/callback/
FRONTEND_URL=http://localhost:5173
```

**Step 3: Commit**

```bash
git add backend/config/settings.py
git commit -m "chore: add Notion OAuth env vars to settings"
```

---

### Task 8: Frontend — integrations API service

**Files:**
- Create: `frontend/src/lib/api/services/integrations.ts`
- Create: `frontend/src/hooks/useNotionIntegration.ts`

**Step 1: Create the API service**

`frontend/src/lib/api/services/integrations.ts`:
```typescript
import apiClient from '../client';

export interface NotionStatus {
  connected: boolean;
  workspace_name?: string;
  workspace_icon?: string;
  default_page_id?: string | null;
}

export interface NotionPage {
  id: string;
  title: string;
}

export interface NotionExportRequest {
  material_types?: string[];
}

export interface NotionExportResponse {
  notion_url: string;
}

export const notionService = {
  getStatus: async (): Promise<NotionStatus> => {
    const res = await apiClient.get<NotionStatus>('/integrations/notion/status/');
    return res.data;
  },

  disconnect: async (): Promise<void> => {
    await apiClient.delete('/integrations/notion/disconnect/');
  },

  getPages: async (): Promise<NotionPage[]> => {
    const res = await apiClient.get<{ pages: NotionPage[] }>('/integrations/notion/pages/');
    return res.data.pages;
  },

  updateSettings: async (defaultPageId: string | null): Promise<void> => {
    await apiClient.put('/integrations/notion/settings/', { default_page_id: defaultPageId });
  },

  exportJob: async (jobId: string, params: NotionExportRequest): Promise<NotionExportResponse> => {
    const res = await apiClient.post<NotionExportResponse>(
      `/integrations/notion/export/${jobId}/`,
      params,
    );
    return res.data;
  },

  getAuthUrl: (): string => {
    const base = import.meta.env.VITE_API_URL ?? '';
    return `${base}/api/integrations/notion/auth/`;
  },
};
```

**Step 2: Create the hook**

`frontend/src/hooks/useNotionIntegration.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notionService } from '@/lib/api/services/integrations';

export function useNotionStatus() {
  return useQuery({
    queryKey: ['notion', 'status'],
    queryFn: notionService.getStatus,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotionDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notionService.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notion', 'status'] }),
  });
}

export function useNotionExport(jobId: string) {
  return useMutation({
    mutationFn: (materialTypes?: string[]) =>
      notionService.exportJob(jobId, { material_types: materialTypes }),
  });
}

export function useNotionPages() {
  return useQuery({
    queryKey: ['notion', 'pages'],
    queryFn: notionService.getPages,
    enabled: false, // Only fetch when needed
  });
}
```

**Step 3: Commit**

```bash
git add frontend/src/lib/api/services/integrations.ts frontend/src/hooks/useNotionIntegration.ts
git commit -m "feat(frontend): add Notion integration API service and hooks"
```

---

### Task 9: NotionExportModal component

**Files:**
- Create: `frontend/src/components/export/NotionExportModal.tsx`

**Step 1: Implement the modal**

`frontend/src/components/export/NotionExportModal.tsx`:
```tsx
import { useState } from 'react';
import { ExternalLink, Loader2, Unlink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNotionStatus, useNotionDisconnect, useNotionExport } from '@/hooks/useNotionIntegration';
import { notionService } from '@/lib/api/services/integrations';
import type { MaterialType } from '@/types';

interface NotionExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  availableMaterialTypes: MaterialType[];
}

const MATERIAL_LABELS: Record<string, string> = {
  summary: 'Summary',
  notes: 'Notes',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  quizzes: 'Quiz',
};

export function NotionExportModal({
  open,
  onOpenChange,
  jobId,
  availableMaterialTypes,
}: NotionExportModalProps) {
  const { data: status, isLoading: statusLoading } = useNotionStatus();
  const disconnect = useNotionDisconnect();
  const exportMutation = useNotionExport(jobId);

  const uniqueTypes = [...new Set(availableMaterialTypes.map((t) => (t === 'quizzes' ? 'quiz' : t)))];
  const [selected, setSelected] = useState<string[]>(uniqueTypes);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);

  const handleConnectNotion = () => {
    const authUrl = notionService.getAuthUrl();
    const popup = window.open(authUrl, 'notion-oauth', 'width=600,height=700');
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        // Status query will auto-refetch via invalidation or stale check
        window.location.reload(); // Simple refresh to pick up new connection
      }
    }, 500);
  };

  const handleToggle = (type: string) => {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleExport = async () => {
    const result = await exportMutation.mutateAsync(selected);
    setNotionUrl(result.notion_url);
  };

  if (statusLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Export to Notion
          </DialogTitle>
          <DialogDescription>
            Push your study materials directly into your Notion workspace.
          </DialogDescription>
        </DialogHeader>

        {!status?.connected ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Connect your Notion account to get started.</p>
            <Button onClick={handleConnectNotion} className="w-full">
              Connect Notion
            </Button>
          </div>
        ) : notionUrl ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-green-600 font-medium">Export complete!</p>
            <Button asChild variant="outline" className="w-full">
              <a href={notionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Notion
              </a>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1 py-2">
              <p className="text-xs text-muted-foreground mb-3">
                Workspace: <span className="font-medium">{status.workspace_name}</span>
                {' · '}
                Destination: <span className="font-medium">{status.default_page_id ? 'Custom page' : 'Workspace root'}</span>
              </p>
              <p className="text-sm font-medium mb-2">Select materials to export:</p>
              {uniqueTypes.map((type) => (
                <div key={type} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`notion-type-${type}`}
                    checked={selected.includes(type)}
                    onCheckedChange={() => handleToggle(type)}
                  />
                  <Label htmlFor={`notion-type-${type}`}>{MATERIAL_LABELS[type] ?? type}</Label>
                </div>
              ))}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unlink className="w-3 h-3 mr-1" />
                Disconnect
              </Button>
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending || selected.length === 0}
                className="flex-1"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  'Export'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/export/NotionExportModal.tsx
git commit -m "feat(frontend): add NotionExportModal component"
```

---

### Task 10: Wire up ExportButton and Profile page

**Files:**
- Modify: `frontend/src/components/export/ExportButton.tsx`
- Modify: `frontend/src/pages/Profile.tsx`

**Step 1: Add Notion option to ExportButton**

In `frontend/src/components/export/ExportButton.tsx`:

1. Add imports at the top:
```tsx
import { useState } from 'react';
import { NotionExportModal } from './NotionExportModal';
```

2. Add `useState` for modal open state inside the component:
```tsx
const [notionModalOpen, setNotionModalOpen] = useState(false);
```

3. Add a new `DropdownMenuItem` before the closing `</DropdownMenuContent>`:
```tsx
<DropdownMenuItem onClick={() => setNotionModalOpen(true)} disabled={isLoading}>
  <Zap className="w-4 h-4 mr-2" />
  Export to Notion
</DropdownMenuItem>
```

4. Add the modal after the `</DropdownMenu>` closing tag:
```tsx
<NotionExportModal
  open={notionModalOpen}
  onOpenChange={setNotionModalOpen}
  jobId={jobId}
  availableMaterialTypes={materialTypes}
/>
```

5. Add `Zap` to the lucide-react import.

**Step 2: Add Connected Apps section to Profile page**

In `frontend/src/pages/Profile.tsx`:

1. Add imports:
```tsx
import { useNotionStatus, useNotionDisconnect } from '@/hooks/useNotionIntegration';
import { notionService } from '@/lib/api/services/integrations';
import { Zap, Unlink } from 'lucide-react';
```

2. Inside the `Profile` component, add hooks:
```tsx
const { data: notionStatus } = useNotionStatus();
const notionDisconnect = useNotionDisconnect();
```

3. Add a "Connected Apps" tab. Find the `<Tabs>` block in the Profile JSX and add a new tab trigger and content:

In `TabsList`:
```tsx
<TabsTrigger value="integrations">Integrations</TabsTrigger>
```

In `TabsContent` (add after the last existing tab content):
```tsx
<TabsContent value="integrations" className="space-y-4">
  <Card>
    <CardHeader>
      <h3 className="text-lg font-semibold">Connected Apps</h3>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5" />
          <div>
            <p className="font-medium">Notion</p>
            {notionStatus?.connected ? (
              <p className="text-sm text-muted-foreground">{notionStatus.workspace_name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>
        {notionStatus?.connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => notionDisconnect.mutate()}
            disabled={notionDisconnect.isPending}
          >
            <Unlink className="w-3 h-3 mr-1" />
            Disconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = notionService.getAuthUrl()}
          >
            Connect
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

**Step 3: Verify frontend compiles**

```bash
cd frontend && npm run build
```
Expected: Build succeeds with no TypeScript errors.

**Step 4: Commit**

```bash
git add frontend/src/components/export/ExportButton.tsx frontend/src/pages/Profile.tsx
git commit -m "feat(frontend): wire up Notion export button and profile integrations tab"
```

---

### Task 11: Handle notion=connected query param on profile page load

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

**Step 1: Detect the query param after OAuth redirect**

After the OAuth callback the backend redirects to `/profile?notion=connected`. Add this effect to the Profile component:

```tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
```

Inside the component:
```tsx
const location = useLocation();
const queryClient = useQueryClient();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('notion') === 'connected') {
    queryClient.invalidateQueries({ queryKey: ['notion', 'status'] });
    navigate(ROUTES.PROFILE, { replace: true });
  }
}, [location.search]);
```

**Step 2: Verify frontend compiles**

```bash
cd frontend && npm run build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat(frontend): refresh Notion status after OAuth redirect"
```

---

## Final Verification

Run all backend tests:
```bash
cd backend && source venv/bin/activate && python manage.py test apps.integrations apps.export.tests -v 2
```
Expected: All tests pass.

Run frontend build:
```bash
cd frontend && npm run build
```
Expected: No errors.
