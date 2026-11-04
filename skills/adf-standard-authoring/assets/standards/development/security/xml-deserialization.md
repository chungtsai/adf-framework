---
id: DEV-SEC-XML-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# XML 外部實體（XXE）與不安全的反序列化

## 適用情境
功能會解析 XML、SOAP、SVG、Office 文件（`.xlsx`、`.docx` 內部為 XML），或使用 Java 序列化、可指定型別的 JSON／YAML 反序列化時適用。

## 規則
- **DEV-SEC-XML-001-R1 停用 DTD 與外部實體**：所有 XML 解析器（`DocumentBuilderFactory`、`SAXParserFactory`、`XMLInputFactory`、`TransformerFactory`、`SchemaFactory`、JAXB、dom4j）停用 DOCTYPE 與外部實體，例如 `setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`；集中由共用工具建立解析器。
- **DEV-SEC-XML-001-R2 Office 與 SVG**：使用維持更新的函式庫（例如 Apache POI 新版）解析 Office 文件；上傳的 SVG 不直接在本系統網域顯示（依 `DEV-SEC-UPLOAD-001`）。
- **DEV-SEC-XML-001-R3 禁止 Java 原生反序列化外部資料**：不得對使用者輸入、Cookie、外部系統的資料使用 `ObjectInputStream.readObject`、`XMLDecoder`、XStream 預設設定；改用 JSON 等資料格式並綁定到明確的 DTO。
- **DEV-SEC-XML-001-R4 JSON／YAML 不允許任意型別**：Jackson 不啟用 Default Typing（`enableDefaultTyping`、`@JsonTypeInfo(use = Id.CLASS)`），必要時以允許的型別清單限制；YAML 使用安全載入（例如 SnakeYAML `SafeConstructor`）。
- **DEV-SEC-XML-001-R5 大小限制**：XML 與 JSON 請求限制大小與巢狀深度，防止 Billion Laughs 等資源耗盡。

## 驗證方式
- 送出含 `<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>` 的 XML 與 Office 檔：被拒絕或實體不被展開，回應不含檔案內容。
- Code Review：搜尋 `readObject`、`XMLDecoder`、`enableDefaultTyping`、未設定安全 Feature 的 XML Factory。
