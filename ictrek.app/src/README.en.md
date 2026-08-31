# V-Office

Local-first browser office suite for viewing and editing Word (.docx), Excel (.xlsx) and PowerPoint (.pptx) documents entirely in the browser. After installation it signs in via VOS automatically and uses private app storage assigned by VOS.

## Features

- Open and edit `.docx`, `.xlsx` and `.pptx` documents
- VOS single sign-on: VOS OIDC Fastpath authentication runs automatically — no manual login, no redirect loops
- Per-user private storage: each user can only list, open, save and download files under `<username>/`
- Agent API: the in-app guide documents how to list, download, upload, overwrite and delete the current user's files with a VOS OIDC token
- Quickly create new Word / Excel / PowerPoint documents
- Local files can still be opened and edited directly (local-first)

## Usage

After installation, open **V-Office** from the VOS sidebar:

1. The "Cloud documents" section lists files in the current user's private directory, with explicit Open and Download actions
2. Create a new document or open a local file to edit
3. The first save (Ctrl+S) of a new document asks for its file name; later saves overwrite that same file. Use the top-right button to close the document.
4. Open "API Guide" from the sidebar for endpoint, authentication and copyable agent examples.

## Notes

- No document path is requested during installation. VOS assigns private app storage and the app creates an isolated subdirectory for each username. It is not exposed under Public Files, and users cannot access one another's documents.
- Upgrading from a public-directory version leaves the previous directory and files untouched; they are not migrated or deleted automatically.
- Standalone deployments outside VOS keep the original behavior: documents stay in the browser (IndexedDB / local file handles) with no server dependency.
