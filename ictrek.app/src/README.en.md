# V-Office

Local-first browser office suite for viewing and editing Word (.doc/.docx), Excel (.xlsx) and PowerPoint (.pptx) documents entirely in the browser. After installation it signs in via VOS automatically and uses private app storage assigned by VOS.

## Features

- Open and edit `.docx`, `.xlsx` and `.pptx` documents
- VOS single sign-on: VOS OIDC Fastpath authentication runs automatically — no manual login, no redirect loops
- Per-user private storage: each user can only list, open, save, download and rename files under `<username>/`
- Shared folder documents: browse the public and per-user folders granted through the platform's data-access authorization (NAS folders are granted the same way) and edit their Word / Excel / PPT / PDF files; saving writes the edited document back to the same file on the share.
- Auto-save: pending edits are saved every 10 seconds; the first save of a new document asks for a file name
- Agent API: the in-app guide documents how to list, download, upload, overwrite, rename and delete the current user's files with a VOS OIDC token
- Quickly create new Word / Excel / PowerPoint documents
- Local files can still be opened and edited directly (local-first)

## Usage

After installation, open **V-Office** from the VOS sidebar:

1. The "My Documents" section lists files in the current user's private directory, with explicit Open, Download and Rename actions
2. Tabs above the "My Documents" list switch to the mounted shared folders (grant them first under the platform's data-access authorization, with read-write permission to save back); folders open in place, and saving an edited document writes it back to the same file on the share
3. Create a new document or open a local file to edit
4. The first manual or automatic save of a new document asks for its file name. Pending edits are then written back to that file every 10 seconds. Use the top-right button to close the document.
5. Open "API Guide" from the sidebar for endpoint, authentication and copyable agent examples.

## Notes

- No document path is requested during installation. VOS assigns private app storage and the app creates an isolated subdirectory for each username. It is not exposed under Public Files, and users cannot access one another's documents.
- What the app may reach through shared folders is decided by the platform's data-access authorization (public folders / user data, granted read-write or read-only), with no app-side configuration. Saving writes back to the original file; if the grant or mount is read-only the save fails with an error and the original stays untouched.
- Upgrading from a public-directory version leaves the previous directory and files untouched; they are not migrated or deleted automatically.
- Standalone deployments outside VOS keep the original behavior: documents stay in the browser (IndexedDB / local file handles) with no server dependency.
