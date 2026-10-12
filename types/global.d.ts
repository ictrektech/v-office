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
  // 宿主 → OnlyOffice 插件桥（供编辑器内插件读取文档信息 / 换 VOS 令牌）
  __voffice?: {
    getVOSAccessToken(): Promise<string | null>;
    getDocumentTitle(): string;
  };
}
