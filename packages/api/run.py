#!/usr/bin/env python3
"""Entry point for running the Charts Agent API server."""

import os
import sys

# Add the api package to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")

    print(f"Starting Charts Agent API on {host}:{port}")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.environ.get("ENVIRONMENT") != "production",
    )
