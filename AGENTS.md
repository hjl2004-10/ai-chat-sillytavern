# Repository Guidelines

## Project Structure & Module Organization
The codebase combines a lightweight Flask API with a static front-end. `server.py` exposes JSON endpoints and orchestrates document parsing helpers in the root directory (`document_parser.py`, `debug_data.py`). Browser assets live alongside HTML entry points: JS modules such as `prompt-manager.js`, `world.js`, and `regex-manager.js` sit next to paired stylesheets (`*.css`). Reusable datasets, uploads, and runtime traces reside in `data/`, `uploads/`, and `logs/`. Python bytecode caches stay under `__pycache__/`; remove them before committing.

## Build, Test, and Development Commands
Use a virtual environment for Python tooling:
- `python -m venv .venv && source .venv/bin/activate` (PowerShell: `.venv\Scripts\Activate.ps1`) to isolate dependencies.
- `pip install -r requirements.txt` installs Flask, CORS, and parsing utilities.
- `python server.py` starts the development server on the configured port and serves bundled front-end files.
- `bash start.sh` or `.\start.bat` provides an end-to-end launch script that wires both backend and static assets.

## Coding Style & Naming Conventions
Follow PEP 8 for Python: 4-space indentation, `snake_case` functions, `CapWords` classes. Prefer docstrings for modules that expose public APIs. Front-end files use ES modules with `camelCase` functions and `kebab-case` CSS class names. Keep asset filenames descriptive (e.g., `document-upload.js`, `prompt-manager.css`). Run `python -m compileall` if you need to validate syntax offline.

## Testing Guidelines
Primary tests live alongside source utilities (`test_path.py`). Add new tests nearby or in a `tests/` folder using `pytest`. Execute `python -m pytest` from the repo root. Target high-confidence coverage for document parsing and any new Flask routes; mock external services or file I/O to keep feedback fast.

## Commit & Pull Request Guidelines
Match the existing conventional-emoji style: `<emoji> <concise summary>` (e.g., `✨ 完全修复重新生成按钮功能`). Reference related issues in the body, include reproduction steps, and paste relevant console or server logs. Pull requests should describe the user impact, outline manual test steps, and attach UI screenshots or GIFs when front-end changes alter visuals. Request review once CI (if configured) and local tests pass.

## Security & Configuration Tips
Store secrets outside the repo; use environment variables consumed by `server.py`. Validate uploaded files before processing. When debugging, redirect large artifacts to `data/` or `logs/` so they can be gitignored or purged easily.

## reply format
使用中文与用户交流
