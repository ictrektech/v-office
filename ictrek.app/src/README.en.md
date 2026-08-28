# ZIZIYI Office

Local-first browser office suite for viewing and editing Word (.docx), Excel (.xlsx) and PowerPoint (.pptx) documents entirely in the browser. After installation it signs in via VOS automatically and directly accesses the mapped document directory selected during installation.

## Features

- Open and edit `.docx`, `.xlsx` and `.pptx` documents
- VOS single sign-on: VOS OIDC Fastpath authentication runs automatically — no manual login, no redirect loops
- Per-user mapped-directory access: each user can only list, open and save files under `<username>/`
- Quickly create new Word / Excel / PowerPoint documents
- Local files can still be opened and edited directly (local-first)

## Usage

After installation, open **ZIZIYI Office** from the VOS sidebar:

1. The "Cloud documents" section lists files in the current user's private directory; click to open
2. Create a new document or open a local file to edit
3. The first save (Ctrl+S) of a new document asks for its file name; later saves overwrite that same file. Use the top-right button to close the document.

## Notes

- The "Document Storage Path" install option selects the host directory. The app creates an isolated subdirectory for each VOS username, and users cannot access one another's documents.
- Standalone deployments outside VOS keep the original behavior: documents stay in the browser (IndexedDB / local file handles) with no server dependency.
