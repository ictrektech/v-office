interface DocEditorConstructor {
  new(id?: string, config: any): DocEditor;
  static defaultConfig: any;
  static version(): string;
  static warmUp(id?: string): void;
}

interface Window {
  DocsAPI?: {
    DocEditor: DocEditorConstructor;
  };
  // 宿主 → OnlyOffice 插件桥（如 agentic-search AI 助手插件）
  __voffice?: {
    getVOSAccessToken(): Promise<string | null>;
    getDocumentTitle(): string;
  };
}
