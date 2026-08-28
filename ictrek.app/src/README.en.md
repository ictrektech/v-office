# ZIZIYI Office

Local-first browser office suite for viewing and editing Word (.docx), Excel (.xlsx) and PowerPoint (.pptx) documents entirely in the browser. After installation it signs in via VOS automatically, and each user's documents live in their own private space on the server.

## Features

- Open and edit `.docx`, `.xlsx` and `.pptx` documents
- VOS single sign-on: VOS OIDC Fastpath authentication runs automatically — no manual login, no redirect loops
- Per-user isolation: documents are stored in separate per-username server directories
- Quickly create new Word / Excel / PowerPoint documents
- Local files can still be opened and edited directly (local-first)

## Usage

After installation, open **ZIZIYI Office** from the VOS sidebar:

1. The "Cloud documents" section on the home page lists the current user's server-side documents; click to open
2. Create a new document or open a local file to edit
3. Saving in the editor (Ctrl+S) stores the document in the current user's private cloud space

## Notes

- The "Document Storage Path" install option selects the host directory; all users' files live in per-username subdirectories below it.
- Standalone deployments outside VOS keep the original behavior: documents stay in the browser (IndexedDB / local file handles) with no server dependency.
