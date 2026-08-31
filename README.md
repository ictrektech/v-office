<p align="center">
  <img src="./public/logo.svg" width="120" height="120" alt="V-Office Logo">
</p>

<h1 align="center">V-Office</h1>

<p align="center">
  <strong>A modern, local-first Office document preview and editing solution.</strong>
</p>

<p align="center">
  <a href="https://github.com/ictrektech/v-office/releases/latest"><img src="https://img.shields.io/github/v/release/ictrektech/v-office" alt="Latest Release"></a>
  <img src="https://img.shields.io/badge/framework-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/license-AGPL%20v3-orange.svg" alt="License">
</p>

<p align="center">
  <a href="https://github.com/ictrektech/v-office"><strong>Source Code</strong></a> | <a href="README.zh-CN.md">中文版</a> | <span>English</span>
</p>

---

## 🚀 Overview

**V-Office** is a browser-based suite for viewing and editing Word, Excel and PowerPoint documents. Standalone deployments keep documents local to the browser. VOS deployments add automatic sign-in, per-user private app storage, 10-second auto-save, cloud document management and an Agent API.

### Deployment Modes

- **VOS App**: install `com.ictrek.v-office` from the VOS App Store for private storage and Agent API support.
- **Standalone**: run the Next.js static export without a storage service for browser-local document editing.

## ✨ Key Features

- **📂 Multi-Format Support**: Open and edit `.docx`, `.xlsx`, and `.pptx` files.
- **🔒 Local-First**: Files are processed locally in your browser, ensuring data privacy.
- **⚡ Fast & Responsive**: Built with Next.js 15+ and optimized for performance.
- **🛠️ Rich Tools**: Integrated with advanced editing capabilities.
- **📦 Persistent Storage**: Uses IndexedDB for local file management.
- **🌐 Cloud Integration**: Easy file selection via Uppy (Google Drive, Dropbox, OneDrive).
- **💾 VOS Auto-save**: Edited documents save every 10 seconds; the first save asks for a name, and cloud documents can be opened, downloaded, renamed or deleted.
- **🤖 VOS Agent API**: VOS deployments expose a versioned, per-user document API for listing, downloading, uploading, overwriting, renaming, and deleting files, with an in-app guide.

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb`)
- **Deployment**: Docker images and a pull-mode VOS package for AMD64 and ARM64

## 🛠️ Getting Started

### Prerequisites

- Node.js 22+
- pnpm (recommended)

### Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:ictrektech/v-office.git
   cd v-office
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚢 Deployment

- **Production build**: `pnpm build`
- **VOS images and package**: see [`ictrek.app/README.md`](ictrek.app/README.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

## 📜 License

This project is licensed under the **GNU Affero General Public License Version 3 (AGPL v3)**.

## 🙏 Acknowledgments

Special thanks to the following projects that made this possible:

- [ONLYOFFICE Web Apps](https://github.com/ONLYOFFICE/web-apps)
- [OnlyOffice x2t WASM](https://github.com/cryptpad/onlyoffice-x2t-wasm) - High-performance document conversion in the browser.
- [ONLYOFFICE SDKJS](https://github.com/ONLYOFFICE/sdkjs)
- [Office Converters](https://github.com/cryptpad/office-converters)

---

<p align="center">
  Built with ❤️ for a better office experience.
</p>
