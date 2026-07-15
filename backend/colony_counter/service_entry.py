"""
Frozen entry point for the Colony Auto Count sidecar.

Packaged builds (PyInstaller) run this instead of `python -m uvicorn …`.
Dev still uses the venv + uvicorn path from Electron.
"""
from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchy Colony Auto Count sidecar")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--log-level", default="warning")
    args = parser.parse_args(argv)

    # Import after argv parse so --help works even if heavy deps fail to load.
    import uvicorn
    from main import app

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        # Single-process; Electron manages lifecycle.
        workers=1,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
