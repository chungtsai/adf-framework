---
id: DEV-SOLID-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# SOLID 設計原則：定義、檢核與驗證

## 目的
讓新寫或修改的程式容易理解、修改與測試：每個類別的職責清楚，新增行為時不必到處修改既有程式，相依關係可以在測試中替換。規則以「可以在 Code Review 中判斷的違反訊號」描述，不以行數或方法數等數字作為唯一判斷依據。

## 適用範圍
- 適用於本次新增或修改的程式（依 `DEV-REVIEW-001` 的審查範圍）。既有程式不因本規範自行重構；需要整理時另開 `REFACTOR`。
- 以專案的分層為準（例如 Controller → Service → Repository／Mapper）。DTO、Entity、設定類別等純資料結構不套用 S 與 D 的拆分要求。
- 避免過度設計：只有一種實作、也不需要在測試中替換的元件，不必為了符合規範而建立介面或抽象類別。

## 規則

### S — 單一職責（Single Responsibility）
- **DEV-SOLID-001-R1 一個類別只有一個修改理由**：一個類別或方法只負責一件事（同一層級、同一業務主題）。
  - 違反訊號：同一類別同時處理 HTTP 請求解析、業務規則與 SQL；一個方法同時查詢、產生檔案、寄信；類別名稱需要用「And」「Manager」「Util」才說得清楚；修改畫面欄位與修改計算規則都要改到同一個類別。
  - 做法：依職責拆成獨立元件（例如 `AccountService` 處理規則、`AccountExporter` 產生檔案、`Mailer` 寄信），由上一層組合。
- **DEV-SOLID-001-R2 分層職責**：Controller 只負責輸入轉換、呼叫 Service 與回應；業務規則（`BR-*`）放在 Service 或 Domain；SQL 只在 Repository／Mapper。
  - 違反訊號：Controller 中有 `if` 判斷業務狀態或直接呼叫 Mapper；Mapper／SQL 中寫業務判斷（例如在 SQL 中決定狀態是否可以修改）。

### O — 開放封閉（Open/Closed）
- **DEV-SOLID-001-R3 新增種類不改既有分支**：預期會增加種類的行為（付款方式、匯出格式、通知管道、審核規則等）以多型、策略（Strategy）或對照表擴充，新增一個種類時不需要修改既有種類的程式。
  - 違反訊號：同一個 `switch`／`if-else` 依型別或代碼判斷，散落在兩個以上的位置；每新增一種類型都要修改多個既有方法。
  - 例外：只有兩三種且明確不會增加的分支，可以保留簡單的 `if`，在 Design 中註明。

### L — 里氏替換（Liskov Substitution）
- **DEV-SOLID-001-R4 子類別可以取代父類別**：子類別或介面實作必須遵守上層的約定：接受相同範圍的輸入、回傳相同意義的結果、不拋出上層沒有宣告的例外、不讓呼叫端需要判斷實際型別。
  - 違反訊號：覆寫的方法拋出 `UnsupportedOperationException` 或直接空白不做事；呼叫端出現 `instanceof` 判斷實作類別；子類別加嚴輸入檢查（父類別接受的值子類別拒絕）或放寬回傳（父類別保證不為 Null，子類別回傳 Null）。
  - 做法：無法完整遵守約定時，不使用繼承，改拆成不同介面或用組合。

### I — 介面隔離（Interface Segregation）
- **DEV-SOLID-001-R5 介面依使用者需求切分**：介面只包含使用端需要的方法；不同使用端需要不同組方法時，拆成多個小介面。
  - 違反訊號：實作類別必須實作用不到的方法（空白或拋出例外）；一個介面同時包含查詢、異動、匯出、排程等不相關的方法，各使用端只用其中一小部分。
  - 做法：例如把查詢與異動分開（`AccountQuery`、`AccountCommand`），唯讀的使用端只依賴查詢介面。

### D — 相依反轉（Dependency Inversion）
- **DEV-SOLID-001-R6 依賴抽象並由外部注入**：高層模組（業務規則）不直接建立低層實作（資料存取、外部系統、檔案、時間、亂數），而是透過建構子注入（Constructor Injection）取得；需要在測試中替換或有多種實作的相依，以介面宣告。
  - 違反訊號：Service 中 `new XxxDao()`、`new RestTemplate()`；直接呼叫靜態方法存取資料庫或外部 API；業務邏輯直接呼叫 `LocalDate.now()`、`new Date()`、`Math.random()` 而無法在測試中固定；使用欄位注入（`@Autowired` 放在欄位上）導致不透過框架就無法建立物件。
  - 做法：以建構子注入 Repository、外部服務 Client 與 `Clock`；外部系統以本專案定義的介面包裝，不讓第三方型別滲入業務層。

## 檢核表（Code Review 使用）
| 原則 | 規則 | 檢核問題 | 判定 |
|---|---|---|---|
| S | R1 | 這個類別／方法的修改理由能用一句話說完嗎？ | 不能 → `MAJOR` |
| S | R2 | Controller 有業務判斷、SQL 有業務規則嗎？ | 有 → `MAJOR` |
| O | R3 | 新增一種類型需要修改兩個以上既有分支嗎？ | 需要 → `MAJOR` |
| L | R4 | 有 `UnsupportedOperationException`、空白覆寫或 `instanceof` 判斷實作嗎？ | 有 → `MAJOR` |
| I | R5 | 有實作類別被迫實作用不到的方法嗎？ | 有 → `MAJOR` |
| D | R6 | 業務層有 `new` 低層實作、靜態存取外部資源或無法固定的時間與亂數嗎？ | 有 → `MAJOR` |
| — | 適用範圍 | 是否為了符合原則而建立只有一種實作、沒有替換需求的介面？ | 是 → `MINOR`（過度設計） |

違反本規範一律為 `MAJOR`（依 `DEV-REVIEW-001-R4`）；Human 可以核准例外並記錄理由，例如時程限制下先保留、另開 `REFACTOR`。

## 範例
```java
// 違反 R1、R3、R6：同一方法處理查詢、依格式分支產生檔案、直接 new 低層實作
public byte[] export(Cond c, String type) {
  List<Account> list = new AccountDao().find(c);
  if ("xlsx".equals(type)) { /* 產生 Excel */ } else if ("csv".equals(type)) { /* 產生 CSV */ }
  new MailClient().send(...);
}

// 符合：職責拆分、依格式擴充、建構子注入
public class AccountExportService {
  private final AccountRepository repo;
  private final Map<String, AccountExporter> exporters; // 新增格式只要新增一個 AccountExporter 實作
  public AccountExportService(AccountRepository repo, List<AccountExporter> list) {
    this.repo = repo;
    this.exporters = list.stream().collect(toMap(AccountExporter::format, e -> e));
  }
  public byte[] export(Cond c, String format) {
    AccountExporter e = exporters.get(format);
    if (e == null) throw new BizException("MSG_FORMAT_UNSUPPORTED", format);
    return e.write(repo.find(c));
  }
}
```

## 移轉專案
MIGRATION 依 Target 架構撰寫新程式時適用本規範；不得為了符合 SOLID 而改變 Legacy Business Semantics。Legacy 的大型類別依 Design 拆分到 Target 的分層，拆分前後的行為以 Characterization／比對測試確認一致。

## 驗證方式
- Code Review：依「檢核表」逐項檢查本次變更，發現以 `DEV-SOLID-001-R<n>` 記錄（格式依 `DEV-REVIEW-001-R5`）。
- 可替換性測試（D）：Service 的單元測試能以替身（Stub／Mock）取代 Repository、外部服務與 `Clock`，不需要連線資料庫或外部系統、不需要啟動框架就能建立 Service。
- 擴充測試（O）：新增一種類型（例如新的匯出格式）只新增一個實作類別與其測試，既有類別的差異為零或只有註冊設定。
- 替換測試（L）：同一組約定測試（Contract Test）對每個實作都執行並通過；呼叫端程式沒有 `instanceof` 判斷實作類別。
- 搜尋檢查：在本次變更中搜尋 `UnsupportedOperationException`、業務層的 `new .*(Dao|Repository|Client)\(`、`LocalDate.now()`、`instanceof`，每個結果都有合理說明或已修正。
