#!/usr/bin/env python
"""
Test script for API Key flow.
1. Creates an API key (requires JWT).
2. Uses the API key to upload a file (simulating ESP32).
3. Revokes the API key.
"""

import os
from io import BytesIO

import requests

# Configuration
API_URL_BASE = "http://localhost:8000/api"
SUPABASE_TOKEN = os.getenv("TEST_TOKEN", "YOUR_SUPABASE_JWT_TOKEN_HERE")


def create_test_audio_file():
    """Create a small test MP3 file."""
    mp3_header = bytes([0xFF, 0xFB, 0x90, 0x00] * 32)
    return BytesIO(mp3_header * 10)


def test_flow():
    print("🔑 Testing API Key Flow")

    if SUPABASE_TOKEN == "YOUR_SUPABASE_JWT_TOKEN_HERE":
        print("❌ Error: Please set TEST_TOKEN env var with a valid Supabase JWT.")
        return

    # 1. Create API Key
    print("\n1. Creating API Key...")
    headers_jwt = {"Authorization": f"Bearer {SUPABASE_TOKEN}"}
    try:
        resp = requests.post(
            f"{API_URL_BASE}/auth/api-keys/create",
            json={"name": "Test Key from Script"},
            headers=headers_jwt,
        )
        if resp.status_code != 201:
            print(f"❌ Failed to create key: {resp.text}")
            return

        data = resp.json()
        full_key = data["key"]
        key_id = data["api_key"]["id"]
        print(f"✅ Key created: {full_key[:10]}...")

    except Exception as e:
        print(f"❌ Connection error: {e}")
        return

    # 2. Upload with API Key
    print("\n2. Testing Upload with API Key...")
    test_file = create_test_audio_file()
    files = {"file": ("api_key_test.mp3", test_file, "audio/mp3")}
    data_opts = {"material_types": '["summary"]', "options": "{}"}
    headers_apikey = {"Authorization": f"Bearer {full_key}"}

    try:
        resp = requests.post(
            f"{API_URL_BASE}/process",
            files=files,
            data=data_opts,
            headers=headers_apikey,
        )

        if resp.status_code == 201:
            print("✅ Upload successful with API Key!")
            print(f"   Job ID: {resp.json().get('job_id')}")
        else:
            print(f"❌ Upload failed: {resp.status_code} {resp.text}")

    except Exception as e:
        print(f"❌ Upload error: {e}")

    # 3. Revoke Key
    print("\n3. Revoking API Key...")
    try:
        resp = requests.delete(
            f"{API_URL_BASE}/auth/api-keys/{key_id}", headers=headers_jwt
        )
        if resp.status_code == 204:
            print("✅ Key revoked.")
        else:
            print(f"❌ Failed to revoke: {resp.text}")

    except Exception as e:
        print(f"❌ Revoke error: {e}")


if __name__ == "__main__":
    test_flow()
