# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the Colony Auto Count sidecar.

Build via: npm run build:colony-backend
(Do not invoke pyinstaller on this file directly unless DISTPATH/SPECPATH
are set — the Node build script passes those.)
"""
from __future__ import annotations

import os
from pathlib import Path

from PyInstaller.building.api import COLLECT, EXE, PYZ
from PyInstaller.building.build_main import Analysis
from PyInstaller.utils.hooks import collect_all, collect_submodules

ROOT = Path(SPECPATH)  # noqa: F821 — injected by PyInstaller
ENTRY = ROOT / "service_entry.py"
MODE = os.environ.get("COLONY_PYINSTALLER_MODE", "onedir").strip().lower()
ONEFILE = MODE == "onefile"
NAME = "colony_counter_service"

datas: list = []
binaries: list = []
hiddenimports: list[str] = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "multipart",
    "python_multipart",
    "main",
]

for pkg in (
    "cv2",
    "skimage",
    "scipy",
    "uvicorn",
    "fastapi",
    "starlette",
    "anyio",
    "pydantic",
    "numpy",
    "PIL",
):
    try:
        pkg_datas, pkg_binaries, pkg_hidden = collect_all(pkg)
        datas += pkg_datas
        binaries += pkg_binaries
        hiddenimports += pkg_hidden
    except Exception as exc:  # noqa: BLE001
        print(f"[colony.spec] collect_all({pkg!r}) skipped: {exc}")

hiddenimports += collect_submodules("image_processing")

# Deduplicate while preserving order
_seen: set[str] = set()
_unique_hidden: list[str] = []
for name in hiddenimports:
    if name not in _seen:
        _seen.add(name)
        _unique_hidden.append(name)
hiddenimports = _unique_hidden

a = Analysis(
    [str(ENTRY)],
    pathex=[str(ROOT)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "pytest", "IPython"],
    noarchive=False,
)

pyz = PYZ(a.pure)

if ONEFILE:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name=NAME,
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=False,
        console=True,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
    )
else:
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name=NAME,
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=False,
        console=True,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.datas,
        name=NAME,
    )
