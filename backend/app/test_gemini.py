"""
Drop-in replacement for the original test-gemini.js.
Tests Google Gemini API connection via the backend's service layer.

Usage:
    python -m app.test_gemini
"""
import asyncio
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)


async def main():
    from app.services.gemini_service import test_connection

    print("=" * 60)
    print("Avana Gemini API Connection Test")
    print("=" * 60)

    result = await test_connection()

    print(f"\nAPI Key Configured: {result.get('apiKeyConfigured', False)}")
    print(f"API Key Preview  : {result.get('apiKeyPreview', 'N/A')}")
    print(f"Model            : {result.get('model', 'N/A')}")
    print(f"Python Version   : {result.get('pythonVersion', 'N/A')}")
    print(f"Timestamp        : {result.get('timestamp', 'N/A')}")

    if result.get("success"):
        print(f"\n✓ CONNECTION SUCCESSFUL")
        print(f"  Test Message  : {result.get('testMessage', 'N/A')}")
        print(f"  Test Response : {result.get('testResponse', 'N/A')}")
    else:
        print(f"\n✗ CONNECTION FAILED")
        print(f"  Error: {result.get('error', 'Unknown error')}")

    print("\n" + "=" * 60)
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
