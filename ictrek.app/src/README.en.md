# ZIZIYI Office

Local-first browser office suite for viewing and editing Word (.docx), Excel (.xlsx) and PowerPoint (.pptx) documents entirely in the browser. After installation it signs in via VOS automatically and directly accesses the mapped document directory selected during installation.

## Features

- Open and edit `.docx`, `.xlsx` and `.pptx` documents
- VOS single sign-on: VOS OIDC Fastpath authentication runs automatically — no manual login, no redirect loops
- Direct mapped-directory access: list, open and save files at the root of the mapped host document directory
- Quickly create new Word / Excel / PowerPoint documents
- Local files can still be opened and edited directly (local-first)

## Usage

After installation, open **ZIZIYI Office** from the VOS sidebar:

1. The "Cloud documents" section on the home page lists files in the mapped document directory; click to open
2. Create a new document or open a local file to edit
3. Saving in the editor (Ctrl+S) writes the document directly to the mapped directory; a failed save stays an error and never changes into a browser download

## Notes

- The "Document Storage Path" install option selects the host directory; the app directly accesses supported documents at its root.
- Standalone deployments outside VOS keep the original behavior: documents stay in the browser (IndexedDB / local file handles) with no server dependency.
