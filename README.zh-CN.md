<p align="center">
  <img src="./public/logo.svg" width="120" height="120" alt="V-Office Logo">
</p>

<h1 align="center">V-Office</h1>

<p align="center">
  <strong>一款现代化、本地优先的 Office 文档预览与编辑解决方案。</strong>
</p>

<p align="center">
  <a href="https://github.com/ictrektech/v-office/releases/latest"><img src="https://img.shields.io/github/v/release/ictrektech/v-office" alt="最新版本"></a>
  <img src="https://img.shields.io/badge/%E6%A1%86%E6%9E%B6-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-AGPL%20v3-orange.svg" alt="License">
</p>

<p align="center">
  <a href="https://github.com/ictrektech/v-office"><strong>源代码</strong></a> | <span>中文版</span> | <a href="README.md">English</a>
</p>

---

## 🚀 概览

**V-Office** 是一款在浏览器中查看和编辑 Word、Excel、PowerPoint 文档的办公套件。独立部署时文档保留在浏览器本地；VOS 部署额外提供免登录、按用户隔离的应用私有存储、每 10 秒自动保存、云端文档管理和 Agent API。

### 部署模式

- **VOS 应用**：从 VOS 应用商店安装 `com.ictrek.v-office`，使用私有存储和 Agent API。
- **独立部署**：运行 Next.js 静态导出，不依赖存储服务，文档在浏览器本地编辑。

## ✨ 核心特性

- **📂 多格式支持**: 支持打开和编辑 `.docx`、`.xlsx` 和 `.pptx` 文件。
- **🔒 本地优先**: 所有文件均在浏览器本地处理，确保数据隐私。
- **⚡ 快速且响应迅速**: 基于 Next.js 15+ 构建，并针对性能进行了优化。
- **🛠️ 丰富工具**: 集成了先进的编辑功能。
- **📦 持久化存储**: 使用 IndexedDB 进行本地文件管理。
- **🌐 云端集成**: 通过 Uppy 轻松选择文件（支持 Google Drive、Dropbox、OneDrive）。
- **💾 VOS 自动保存**: 编辑中的文档每 10 秒自动保存；新文档首次保存时提示命名，云端文档支持打开、下载、重命名和删除。
- **🤖 VOS Agent API**: VOS 部署提供按用户隔离的版本化文档 API，可列出、下载、上传覆盖、重命名和删除文档；应用内提供接入指南。

## 🛠️ 技术栈

- **框架**: [Next.js](https://nextjs.org/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **UI 组件**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **数据库**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (通过 `idb`)
- **部署**: AMD64、ARM64 Docker 镜像和 pull-mode VOS 应用包

## 🛠️ 快速开始

### 前提条件

- Node.js 22+
- pnpm (推荐)

### 安装步骤

1. 克隆仓库:

   ```bash
   git clone git@github.com:ictrektech/v-office.git
   cd v-office
   ```

2. 安装依赖:

   ```bash
   pnpm install
   ```

3. 启动开发服务器:

   ```bash
   pnpm dev
   ```

4. 在浏览器中访问 [http://localhost:3000](http://localhost:3000)。

## 🚢 部署

- **生产环境构建**：`pnpm build`
- **VOS 镜像与应用包**：参见 [`ictrek.app/README.md`](ictrek.app/README.md)

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request 或开启 Issue。

## 📜 许可证

本项目采用 **GNU Affero General Public License Version 3 (AGPL v3)** 开源协议。

## 🙏 鸣谢

特别感谢以下开源项目，是它们让本项目成为可能：

- [ONLYOFFICE Web Apps](https://github.com/ONLYOFFICE/web-apps)
- [OnlyOffice x2t WASM](https://github.com/cryptpad/onlyoffice-x2t-wasm) - 浏览器内高性能文档转换。
- [ONLYOFFICE SDKJS](https://github.com/ONLYOFFICE/sdkjs)
- [Office Converters](https://github.com/cryptpad/office-converters)

---

<p align="center">
  用心打造更好的办公体验。❤️
</p>
