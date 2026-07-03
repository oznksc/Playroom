# Playroom — Editör İçi AI Game Agent Tasarım Dokümanı

> Bu doküman, `ROADMAP.md §13`'teki kararları uygulama seviyesinde detaylandırır.
> Yeni katman: **`@gamekit/agent`** paketi + CLI agent endpoint'leri + editör
> `AgentPanel` bileşeni. Editör içinden, kullanıcının kendi API anahtarıyla
> (BYOK) çalışan, Playroom MCP tool'larını kullanan bir AI agent.

## İçindekiler
1. [Amaç ve Kapsam](#1-amaç-ve-kapsam)
2. [Mimari](#2-mimari)
3. [Veri Akışı](#3-veri-akışı)
4. [Paket / Dosya Düzeni](#4-paket--dosya-düzeni)
5. [Editör UI Tasarımı](#5-editör-ui-tasarımı)
6. [BYOK Güvenlik Modeli](#6-byok-güvenlik-modeli)
7. [Tool-Use Protokolü](#7-tool-use-protokolü)
8. [Provider Adapter Sözleşmesi](#8-provider-adapter-sözleşmesi)
9. [Sistem Prompt Stratejisi](#9-sistem-prompt-stratejisi)
10. [Onay Akışı](#10-onay-akışı)
11. [Slash Komutlar](#11-slash-komutlar)
12. [Konuşma Geçmişi](#12-konuşma-geçmişi)
13. [CLI Endpoint Detayları](#13-cli-endpoint-detayları)
14. [Yeni MCP Araçları](#14-yeni-mcp-araçları)
15. [Sprint A Görevleri (Kod Ölçeğinde)](#15-sprint-a-görevleri-kod-ölçeğinde)
16. [Sprint B–D Yol Haritası](#16-sprint-bd-yol-haritası)
17. [Test Stratejisi](#17-test-stratejisi)
18. [Performans & Maliyet Notları](#18-performans--maliyet-notları)
19. [Açık Sorular ve Gelecek İş](#19-açık-sorular-ve-gelecek-iş)

---

## 1. Amaç ve Kapsam

### Amaç
- Editör açıkken, kullanıcı **doğal dille** veya **slash komutlarla** sahne
  inşa edebilsin.
- Agent, Playroom MCP'nin tüm tool'larını kullanabilsin (harici Claude/Cursor
  ile aynı yüzey).
- Kullanıcı kendi API anahtarını (BYOK) bağlasın; anahtar sunucuda
  kalıcı olmasın, editörden dışarı sızmasın.
- Destructive işlemler için açık onay alınsın; yanlışlıkla veri kaybı
  engellensin.

### Kapsam İçi (Sprint A)
- Anthropic Claude provider (Sonnet 4.5 + Haiku 4.5)
- SSE üzerinden streaming chat
- ReAct tool-use döngüsü (MCP tool'ları)
- Destructive-only onay modu
- Slash komutlar: `/spawn`, `/apply`, `/validate`, `/gravity`, `/clear`, `/help`
- BYOK: `localStorage` (web) + OS Keychain (Tauri)
- Geçmiş: `gamekit/agent/<scene>.json`

### Kapsam Dışı (Sprint B+)
- OpenAI, Google, Ollama, OpenAI-compatible provider'lar
- Vision (screenshot) desteği
- Plan-then-execute toplu onay
- Çoklu paralel agent
- Tauri dışı desktop (Electron vs.)

### Hedef Dışı
- Sunucu taraflı AI (proxy vs.) — tüm istekler kullanıcının makinesinden
  provider'a gider
- Token satışı, kendi model fine-tune
- Multiplayer / collaborative agent

---

## 2. Mimari

```
┌────────────────────────────────────────────────────────────┐
│  Editor (apps/editor) — Vite/React                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ BottomDrawer │ │  AgentPanel  │ │  AgentSettings     │  │
│  │ + agent tab  │ │  (chat+trace)│ │  (BYOK modal)      │  │
│  └──────┬───────┘ └──────┬───────┘ └─────────┬──────────┘  │
│         │ SSE            │ POST /api/agent/chat             │
│         ▼                ▼                                  │
│  EventSource / fetch+ReadableStream                        │
└─────────┬──────────────────┬───────────────────────────────┘
          │                  │
          ▼                  ▼
┌────────────────────────────────────────────────────────────┐
│  CLI (packages/cli) — http.createServer, 127.0.0.1:4177    │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │ existing /api/*  │  │ new /api/agent/*               │  │
│  │  /api/project    │  │  /providers  /keys             │  │
│  │  /api/scene      │  │  /models/:provider             │  │
│  │  /api/assets     │  │  /chat   /approve   /abort     │  │
│  └──────────────────┘  │  /history/:sceneId             │  │
│                        └────────────┬───────────────────┘  │
└─────────────────────────────────────┼──────────────────────┘
                                      │ stdio (MCP)
                                      ▼
┌────────────────────────────────────────────────────────────┐
│  @gamekit/agent  ──spawns──►  @gamekit/mcp                 │
│  ┌─────────────────────────────┐  ┌──────────────────────┐ │
│  │ providers/anthropic         │  │ mcp/client.ts        │ │
│  │ loop/agent.ts  (ReAct)      │◄─┤ mcp/tools.ts         │ │
│  │ loop/streaming.ts (SSE)     │  │ mcp/executor.ts      │ │
│  │ loop/approval.ts            │  └──────────────────────┘ │
│  │ system/prompt.ts            │                          │
│  │ store/keys.ts               │  stdio (MCP)             │
│  │ store/history-store.ts      │────────►  @gamekit/mcp    │
│  └─────────────────────────────┘                          │
└────────────────────────────────────────────────────────────┘
```

**Spawn modeli:** Editör ilk agent isteğinde CLI `@gamekit/mcp` sürecini
başlatır (her oturum başına bir süreç). Süreç editör kapatılana veya açıkça
sonlandırılana kadar yaşar. Süreç çökerse otomatik respawn (3 deneme, sonra
hata döner).

---

## 3. Veri Akışı

### Tipik "agent bir entity ekledi" akışı

```
1.  User: "Player'ın üstüne bir coin ekle"
        │
        │  POST /api/agent/chat
        │  { sceneId, message, model: "claude-sonnet-4.5", approvalMode: "destructive-only" }
        ▼
2.  CLI  → agent loop başlat
        │  system prompt + scene context hazırla
        │  MCP tools/list → 34 tool şeması
        │  messages: [system, user]
        ▼
3.  agent → Anthropic API (streaming)
        │  request: model + tools[] + messages
        ▼
4.  Anthropic → SSE tokens
        │  CLI SSE: event: token / data: { text: "..." }
        ▼
5.  User: "Sprite seçiyorum: coin.png var mı?"
        │  agent: add_entity({ name: "Coin", components: [...] })
        │  CLI SSE: event: tool_start
        │  agent → MCP client → @gamekit/mcp tools/call add_entity
        │  MCP: scene.json oku, validate et, yaz
        │  CLI SSE: event: tool_result
        │  tool sonucu modele geri besle
        ▼
6.  agent cevabı: "Coin eklendi, x=400, y=200. Test etmek için play basabilirsin."
        │  event: token
        ▼
7.  event: done
        │
        ▼
8.  Editör: snapshot refetch → canvas otomatik günceller
```

### Destructive tool akışı (`remove_asset` gibi)

```
1.  User: "kullanılmayan hero sprite'ı sil"
2.  agent: find_unused_assets({ type: "image" })   ← otomatik
3.  agent: remove_asset({ id: "old-hero" })        ← destructive!
4.  CLI approval kontrolü → destructive-only modda → approval gerekli
5.  CLI SSE: event: approval_request
           { requestId: "req_abc", tool: "remove_asset", args: {...} }
6.  Editör: modal aç → kullanıcı "Allow"a basar
7.  POST /api/agent/approve { requestId: "req_abc", decision: "allow" }
8.  CLI: tool çalıştır, sonucu modele besle
9.  CLI SSE: event: tool_result
```

### Abort akışı

```
1.  User: durdur butonu → POST /api/agent/abort
2.  CLI: aktif AbortSignal tetikle
3.  Provider stream iptal (fetch AbortController)
4.  MCP client: bekleyen tool call iptal (varsa)
5.  CLI SSE: event: done { reason: "aborted" }
6.  History'ye "aborted" damgası ekle
```

---

## 4. Paket / Dosya Düzeni

### Yeni paket
```
packages/agent/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                       # public exports
│   ├── server.ts                      # AgentHost class
│   ├── providers/
│   │   ├── types.ts                   # ProviderAdapter sözleşmesi
│   │   ├── anthropic.ts               # Sprint A
│   │   ├── openai.ts                  # Sprint B (placeholder)
│   │   ├── google.ts                  # Sprint B
│   │   ├── ollama.ts                  # Sprint B
│   │   └── openai-compatible.ts       # Sprint B
│   ├── mcp/
│   │   ├── client.ts                  # stdio MCP client
│   │   ├── tools.ts                   # MCP tools → model tools
│   │   └── executor.ts                # tool call → MCP call
│   ├── loop/
│   │   ├── agent.ts                   # ReAct ana döngü
│   │   ├── approval.ts                # onay mekanizması
│   │   ├── history.ts                 # in-memory mesaj listesi
│   │   └── streaming.ts               # SSE event encoder
│   ├── system/
│   │   ├── prompt.ts                  # buildSystemPrompt()
│   │   └── skills-loader.ts           # skill manifest → prompt parçası
│   └── store/
│       ├── keys.ts                    # BYOK vault interface
│       └── history-store.ts           # disk: .gamekit/agent/<scene>.json
└── test/
    ├── providers/anthropic.test.ts
    ├── mcp/tools.test.ts
    ├── loop/agent.test.ts
    └── loop/approval.test.ts
```

### CLI değişiklikleri
```
packages/cli/
├── src/
│   ├── server.ts                      # + agent route'ları
│   ├── agent/
│   │   ├── host.ts                    # AgentHost lifecycle
│   │   ├── routes.ts                  # /api/agent/* handler'ları
│   │   ├── sse.ts                     # SSE response helper
│   │   └── spawn-mcp.ts               # @gamekit/mcp child process
│   └── index.ts                       # (değişiklik yok)
```

### Editör eklemeleri
```
apps/editor/src/
├── components/
│   ├── AgentPanel.tsx                 # chat + tool trace (Sprint A)
│   ├── AgentSettings.tsx              # BYOK modal (Sprint A)
│   ├── AgentMessage.tsx               # mesaj satırı (Sprint A)
│   ├── AgentToolTrace.tsx             # tool call row (Sprint A)
│   ├── AgentApprovalModal.tsx         # onay modalı (Sprint A)
│   └── Topbar.tsx                     # + Sparkles ikonu
├── hooks/
│   ├── useAgent.ts                    # SSE tüketicisi (Sprint A)
│   ├── useAgentKeys.ts                # BYOK CRUD (Sprint A)
│   └── useAgentHistory.ts             # geçmiş listeleme (Sprint A)
├── lib/
│   ├── agent-stream.ts                # EventSource wrapper (Sprint A)
│   ├── agent-keys.ts                  # WebCrypto + localStorage (Sprint A)
│   └── agent-schemas.ts               # mesaj/tool tipleri (Sprint A)
└── styles/
    ├── _agent.scss                    # agent panel + modal
    └── styles.scss                    # import
```

---

## 5. Editör UI Tasarımı

### 5.1 Bottom Drawer Genişlemesi

Mevcut `activeBottomTab` tipi: `"assets" | "timeline" | "console"` →
yeni: `"assets" | "timeline" | "console" | "agent"`.

`Topbar` zaten `Cpu` ikonu barındırıyor; yanına `Sparkles` (lucide-react)
eklenir. Aktif agent tab'ında pulsing cyan dot (brief.md'deki glow deseni).

### 5.2 AgentPanel Yerleşimi

```
┌────────────────────────────────────────────────────────────────┐
│ ◉ Agent   Claude Sonnet 4.5   destructive-only  ⓘ   ⚙   ✕   │  ← header bar
├──────────────────────────────────────┬─────────────────────────┤
│ SOHBET (sol, %60)                    │ TOOL TRACE (sağ, %40)   │
│                                       │                         │
│ ┌─ user msg ────────────────────────┐│ 14:32:01  list_scenes   │
│ │ 8-bit tarzı bir platformer       ││             ok · 12ms   │
│ │ yapalım                            ││ 14:32:04  apply_skill   │
│ └────────────────────────────────────┘│             ok · 4ms    │
│                                       │ 14:32:05  add_entity    │
│ ┌─ agent msg ──────────────────────┐ │             waiting…    │
│ │ ▸ Skill: platformer.json          │ │ 14:32:06  import_asset  │
│ │   uygulanıyor.                    │ │             ⓘ needs     │
│ │                                   │ │             approval    │
│ │ ▸ Player + RigidBody eklendi      │ │ 14:32:09  validate_     │
│ │   (x=120, y=200, jump=600)        │ │             scene        │
│ │                                   │ │             ok · 8ms    │
│ │ ▸ Canvas'ta test etmek için       │ │                         │
│ │   play'e basabilirsin.            │ │                         │
│ └───────────────────────────────────┘ │                         │
│                                       │                         │
│ ▸ Agent yazıyor: "Sprite seçmek     │                         │
│   için mevcut asset'ler…"            │                         │
│                                       │                         │
├──────────────────────────────────────┴─────────────────────────┤
│ > /apply platformer                                          ⏎  │  ← input
└────────────────────────────────────────────────────────────────┘
```

**Header öğeleri:**
- ◉ yeşil dot: provider bağlı (kırmızı = hata, gri = hazır değil)
- Model dropdown (compact)
- Approval mode chip
- ⓘ bilgi: "Agent BYOK kullanır, anahtarınız bu makineden çıkmaz"
- ⚙ ayarlar modal'ı
- ✕ paneli kapat

### 5.3 Mesaj Tipleri

```ts
type AgentMessage =
  | { id: string; role: "user"; content: string; ts: number }
  | { id: string; role: "agent"; content: string; ts: number; tokens?: number }
  | { id: string; role: "tool"; tool: string; args: unknown; result?: unknown; status: "running" | "ok" | "error" | "needs-approval"; ms?: number; ts: number }
  | { id: string; role: "system"; content: string; ts: number };
```

Her `tool` mesajı collapsible: açılınca args + result JSON'u monospace
pencerede görünür. `error` mesajları kırmızı border + `Flame` ikonu.

### 5.4 Onay Modal'ı

```
┌─ Onay Gerekli ─────────────────────────────────────────────┐
│ Agent bir değişiklik yapmak üzere:                          │
│                                                              │
│   Tool:  remove_asset                                       │
│   Args:  { id: "old-hero-sprite" }                          │
│                                                              │
│   ⓘ Bu işlem geri alınamaz.                                 │
│                                                              │
│                              [Deny]    [Allow]              │
└──────────────────────────────────────────────────────────────┘
```

`Deny` → tool iptal, modele "user denied" geri besleme, agent devam eder.
`Allow` → tool çalışır, sonuç normal tool_result kanalıyla akar.
Modal dışında Esc kapatır (= Deny).

### 5.5 AgentSettings Modal'ı

```
┌─ AI Providers ──────────────────────────────────────────────┐
│ Provider       Model                  Status       Action   │
│ ● Anthropic    claude-sonnet-4-5       connected   [Edit]   │
│ ○ OpenAI       —                      —           [Add]    │
│ ○ Google       —                      —           [Add]    │
│ ○ Ollama       —                      —           [Add]    │
│ ○ Custom       —                      —           [Add]    │
│                                                              │
│ Default for chat:    [Anthropic · sonnet-4-5      ▾]        │
│ Approval mode:       ◉ Destructive only                      │
│                      ○ Always                                 │
│                      ○ Off                                    │
│                                                              │
│                               [Cancel]   [Save]              │
└──────────────────────────────────────────────────────────────┘
```

**Add / Edit sub-modal:**

```
┌─ Connect Anthropic ─────────────────────────────────────────┐
│                                                              │
│  API Key:    sk-ant-•••••••••••••••••••••••••••[paste]      │
│                                                              │
│  Model:      [claude-sonnet-4-5  ▾]    Ⓞ fetch list        │
│                                                              │
│  Custom base URL (opsiyonel):                                │
│  [ https://api.anthropic.com                       ]         │
│                                                              │
│  ⓘ Key sadece bu tarayıcıda saklanır (encrypted localStorage)│
│                                                              │
│                              [Cancel]   [Connect]            │
└──────────────────────────────────────────────────────────────┘
```

### 5.6 Slash Komut Paneli (ConsolePanel kalıbı)

ConsolePanel'in sağ kolonundaki "Slash Commands" listesi gibi, AgentPanel'de
de inline bir mini panel:

```
  /spawn   entity oluştur
  /apply   skill manifest'i uygula
  /gravity yerçekimi ayarla
  /validate sahneyi validate et
  /screenshot mevcut sahneyi analiz et
  /clear   konuşmayı sıfırla
  /help    komut listesi
```

---

## 6. BYOK Güvenlik Modeli

### 6.1 Web (CLI üzerinden Vite dev)

- **Depolama:** `localStorage["gamekit:agent:keys:v1"]` içinde
  `{ provider: encryptedKey }` map. EncryptedKey = WebCrypto AES-GCM.
- **Anahtar türetme:** `crypto.subtle.deriveKey` ile PBKDF2 (SHA-256, 100k
  iterasyon) → salt = `crypto.getRandomValues(16)`, base salt
  `localStorage["gamekit:agent:salt"]`'da.
- **Passphrase:** İlk eklemede kullanıcıdan alınır, sonraki oturumlarda
  aynı passphrase ile decrypt. Passphrase hatırlanmazsa anahtarlar silinir
  (graceful reset).
- **Not:** Tauri modunda bu passphrase akışı atlanır — doğrudan OS keychain.

### 6.2 Tauri (Desktop)

- `tauri-plugin-stronghold` ile macOS Keychain / Windows Credential Vault /
  Linux Secret Service'e yazma.
- Rust tarafı: `keychain_set`, `keychain_get`, `keychain_delete` komutları.
- Editör `invoke("keychain_get", { provider: "anthropic" })` ile okur.

### 6.3 Bellek & Loglama

- API key asla `console.log`, throw, error response'a düşmez.
- `keys.ts` her export'tan önce `***REDACTED***` maskesi uygular.
- Audit log: provider adı + model + tarih + tool call sayısı (key yok).

### 6.4 Veri Akış Garantileri

```
Editor (browser)  ──►  CLI (local node)  ──►  Provider API
                         │                      │
                         │  proxy (CORS)        │
                         │  in-memory key        │
                         ▼                      │
                       disk: localStorage       │
                       veya OS keychain          │
```

Key asla editörün process'inden provider'a direkt gitmez; CLI proxy'ler.
Tauri modunda Rust tarafı doğrudan provider'a gidebilir (webview'den
çıkmak gerekmez).

### 6.5 Telemetry / Opt-in

- "Anonymous usage stats" checkbox AgentSettings'te varsayılan OFF.
- Açılırsa: hangi tool çağrıldı, kaç token harcandı, hangi model kullanıldı
  (içerik yok, sadece metrik). Playroom sunucusuna POST (kullanıcı URL'i
  ayarlanabilir, varsayılan boş).

---

## 7. Tool-Use Protokolü

### 7.1 MCP → Model Şema Çevirisi

`@gamekit/mcp` `tools/list` döner:

```json
{
  "name": "add_entity",
  "description": "Add an entity to the current scene with given components",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "components": { "type": "array", "items": { ... } }
    },
    "required": ["name", "components"]
  }
}
```

Provider-agnostic normalize → model-specific:

**Anthropic:**
```json
{
  "name": "add_entity",
  "description": "Add an entity to the current scene with given components",
  "input_schema": { "type": "object", "properties": { ... }, "required": ["name", "components"] }
}
```

**OpenAI (Sprint B):**
```json
{
  "type": "function",
  "function": {
    "name": "add_entity",
    "description": "...",
    "parameters": { "type": "object", "properties": { ... }, "required": ["..."] }
  }
}
```

### 7.2 Destructive Tool Tagging

MCP tool'ları `destructive: true` annotation taşıyabilir. `tools.ts` bunları
okur ve `ProviderAdapter`'a `destructiveTools: Set<string>` listesi geçer.

`packages/mcp/src/schemas/skill.ts`'e benzer şekilde, her tool'un metadata'sı:

```ts
type ToolMeta = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  destructive?: boolean;     // ← Sprint A'da eklenecek
  readOnly?: boolean;        // ← Sprint A'da eklenecek
  sideEffects?: string[];    // ← ileride
};
```

Sprint A'da destructive olarak işaretlenecek tool'lar:
- `remove_asset`, `delete_scene`
- `remove_entity`, `remove_component` (entity'leri siliyorsa)
- `write_project` (top-level değişiklik)
- `import_asset` (yeni dosya yazar, onay gerekebilir — Sprint B karar)

### 7.3 ReAct Döngüsü

```ts
async function* runAgent(input: AgentInput): AsyncGenerator<SseEvent> {
  const tools = await mcpClient.listTools();
  const modelTools = toModelTools(tools);
  const system = await buildSystemPrompt({ ... });
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: input.message }
  ];

  let safetyCounter = 0;
  const MAX_TURNS = 25;

  while (safetyCounter++ < MAX_TURNS) {
    const stream = provider.stream({ model, messages, tools: modelTools });
    const { text, toolCalls } = await consumeStream(stream, yield*);
    //   ▲ yield token events to SSE

    if (text) {
      messages.push({ role: "assistant", content: text });
      yield { type: "token", data: { text } };
    }

    if (!toolCalls.length) {
      yield { type: "done" };
      return;
    }

    for (const call of toolCalls) {
      // Approval gate
      if (isDestructive(call, input.approvalMode)) {
        const reqId = nanoid();
        yield { type: "approval_request", data: { requestId: reqId, tool: call.name, args: call.args } };
        const decision = await waitForApproval(reqId, abortSignal);
        if (decision === "deny") {
          messages.push({ role: "user", content: `User denied tool: ${call.name}` });
          continue;
        }
      }

      yield { type: "tool_start", data: { tool: call.name, args: call.args } };
      const result = await mcpClient.callTool(call.name, call.args);
      yield { type: "tool_result", data: { tool: call.name, result, ok: !result.isError } };
      messages.push({ role: "tool", name: call.name, content: JSON.stringify(result) });
    }
  }

  yield { type: "error", data: { message: "Max turns exceeded" } };
}
```

### 7.4 Abort & Hata

- `AbortSignal` provider stream'e, MCP `tools/call`'a ve approval wait'e
  bağlanır.
- Provider 4xx/5xx → `event: error` + anlaşılır mesaj + retry önerisi.
- MCP çökerse: 3 deneme respawn, sonra `error` event.
- 429 (rate limit) → `retry_after` header'ı okunur, editöre bilgi verilir.

---

## 8. Provider Adapter Sözleşmesi

```ts
// providers/types.ts
export type ProviderMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

export type ModelTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type StreamInput = {
  model: string;
  messages: ProviderMessage[];
  tools: ModelTool[];
  signal: AbortSignal;
};

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "error"; message: string }
  | { type: "done"; usage?: { inputTokens: number; outputTokens: number } };

export interface ProviderAdapter {
  readonly id: "anthropic" | "openai" | "google" | "ollama" | "custom";
  readonly label: string;
  readonly defaultBaseUrl: string;
  readonly requiresApiKey: boolean;
  listModels(input: { apiKey: string; baseUrl?: string; signal: AbortSignal }): Promise<string[]>;
  stream(input: StreamInput): AsyncGenerator<StreamEvent>;
  validateKey(input: { apiKey: string; baseUrl?: string; signal: AbortSignal }): Promise<{ ok: boolean; reason?: string }>;
}
```

Sprint A'da sadece `anthropic.ts`. Diğer 4 adapter Sprint B'de (boş
implementasyon + interface uyumu).

### Anthropic spesifik notlar

- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Header'lar: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type`
- Streaming: SSE, event tipleri `message_start`, `content_block_start`,
  `content_block_delta` (text_delta / input_json_delta), `content_block_stop`,
  `message_delta`, `message_stop`
- Tool use: `content_block_start` `type: "tool_use"` block döner, takip eden
  delta'lar JSON parçaları içerir
- Token counting: `message_delta.usage.output_tokens` (final)

---

## 9. Sistem Prompt Stratejisi

```ts
async function buildSystemPrompt(ctx: PromptContext): Promise<string> {
  const sections: string[] = [];

  // 1. Identity
  sections.push(`You are Playroom Agent, an AI assistant inside the Playroom 2D game engine editor. You build scenes, entities, and game logic by calling the provided tools.

Playroom is a JSON-driven 2D engine targeting React Native (Skia) and Web (Phaser). The project file is at: <project>${ctx.projectPath}</project>. Active scene: <scene>${ctx.sceneId}</scene>.`);

  // 2. Schema
  sections.push(`## Available Components
${componentCheatsheet(ctx.schemaVersion)}

Component types: Transform, Sprite, AabbCollider, PlayerController, CameraFollow, Animation, RigidBody, CircleCollider, ... (see tools/list for full set).

Constraint: an entity can have at most one of each component type. Positions are in world pixels.`);

  // 3. Approval rules
  sections.push(`## Approval
Mode: ${ctx.approvalMode}
${ctx.approvalMode === "destructive-only" ? "Mutating tools (add_*, write_*, import_*) run automatically. Destructive tools (remove_*, delete_*) require user confirmation — call them as normal, the system handles the prompt." : ""}
${ctx.approvalMode === "always" ? "Every tool call requires user confirmation. The system handles the prompt automatically." : ""}
${ctx.approvalMode === "off" ? "No approval required. Run all tools directly." : ""}`);

  // 4. Scene context
  sections.push(`## Current Scene
${ctx.sceneSummary}

${ctx.selection ? `Selection: ${ctx.selection.entityIds.length} entities (${ctx.selection.entityIds.slice(0, 5).join(", ")}...)` : "No selection."}`);

  // 5. Skills
  if (ctx.skills.length > 0) {
    sections.push(`## Available Skills
${ctx.skills.map(s => `- ${s.name}: ${s.description}`).join("\n")}

To apply a skill, call the apply_skill tool with its name.`);
  }

  // 6. Workspace
  sections.push(`## Workspace
Viewport: ${ctx.viewport.width}×${ctx.viewport.height} (${ctx.orientation})
Gravity: (${ctx.gravity.x}, ${ctx.gravity.y})`);

  // 7. Behavioral rules
  sections.push(`## Rules
- Use the tools provided. Do not invent component types.
- Validate the scene with validate_scene after structural changes.
- Prefer minimal, targeted edits over broad rewrites.
- If a tool returns an error, read the message and adapt.
- Never call remove_* on the last entity of a scene without explicit user consent.
- Reply in the user's language.`);

  return sections.join("\n\n");
}
```

**Neden katmanlı:** Model her oturumda fresh context alır; tool şeması
değişirse prompt da değişir. Eski bilgi sızıntısı olmaz.

---

## 10. Onay Akışı

### 10.1 Mod Tanımları

```ts
type ApprovalMode = "destructive-only" | "always" | "off";

const DESTRUCTIVE_TOOLS = new Set([
  "remove_asset",
  "delete_scene",
  "remove_entity",
  "remove_component",
  "write_project",
]);

function needsApproval(tool: string, mode: ApprovalMode): boolean {
  if (mode === "off") return false;
  if (mode === "always") return true;
  return DESTRUCTIVE_TOOLS.has(tool);
}
```

### 10.2 Akış Detayı

```
Agent → tool call (e.g. remove_asset)
        │
        ▼
agent.ts: needsApproval("remove_asset", "destructive-only") → true
        │
        ▼
yield { type: "approval_request", requestId, tool, args }
        │
        ├─►  pendingApprovals.set(requestId, { resolve, reject })
        │
        ▼
Editör SSE event alır → modal açar
        │
        ├─►  User: Allow
        │   POST /api/agent/approve { requestId, decision: "allow" }
        │   pendingApprovals.get(requestId).resolve("allow")
        │
        ├─►  User: Deny
        │   POST /api/agent/approve { requestId, decision: "deny" }
        │   pendingApprovals.get(requestId).resolve("deny")
        │
        └─►  User: Abort (topbar durdur)
            POST /api/agent/abort
            Tüm pendingApprovals reject → "aborted"
```

### 10.3 Timeout

- Modal 5 dakika açık kalırsa otomatik "deny" (sessiz değil: editör
  konsoluna "approval timeout" log düşer).
- Configurable ileride (`agent_approval_timeout_ms`).

---

## 11. Slash Komutlar

Slash komutları LLM çağrısı yapmadan doğrudan tool'a gider; düşük gecikme.

| Komut | Tool call | Açıklama |
| --- | --- | --- |
| `/spawn <type> [x] [y]` | `add_entity` | Tek bileşenli entity ekler |
| `/apply <skill>` | `apply_skill` | Skill manifest'i uygular |
| `/validate` | `validate_scene` | Sahneyi validate eder, sonucu gösterir |
| `/gravity <y>` | (özel) | Proje gravity'sini günceller |
| `/screenshot` | (vizyon) | Canvas PNG çekip modele gönderir (Sprint C) |
| `/clear` | (lokal) | Mesaj geçmişini siler |
| `/help` | (lokal) | Komut listesini yazdırır |
| `/undo` | (özel) | Son agent değişikliğini geri al |
| `/export [path]` | (özel) | `gamekit export` çağırır |

Implementasyon: mesaj `/` ile başlıyorsa agent loop'a hiç girilmez, doğrudan
CLI tarafında parse edilip tek tool call üretilir. Sonuç mesaj olarak
gösterilir.

---

## 12. Konuşma Geçmişi

### 12.1 Dosya Formatı

`gamekit/agent/<sceneId>.json`:

```json
{
  "sceneId": "main.scene.json",
  "version": 1,
  "createdAt": "2026-06-01T12:00:00Z",
  "updatedAt": "2026-06-01T14:32:00Z",
  "turns": [
    {
      "id": "turn_abc",
      "ts": "2026-06-01T14:30:00Z",
      "user": "8-bit platformer yap",
      "agent": "Skill: platformer.json uygulanıyor. ...",
      "toolCalls": [
        { "tool": "apply_skill", "args": { "name": "platformer" }, "result": "ok", "ms": 12 }
      ]
    }
  ]
}
```

### 12.2 CLI Endpoint'leri

```
GET /api/agent/history/:sceneId
  → { turns: [...] } veya 404

DELETE /api/agent/history/:sceneId
  → 204
```

### 12.3 Editör UI

- Topbar'daki `🕒` ikonu → son 20 turn'ü listeler (tarih, özet)
- Tıklanınca o turn'ün full transcript'i modalda açılır
- "Resume from here" → o turn'den itibaren yeni session başlatır

### 12.4 Truncation

- Token bütçesi aşımı riski: 50 turn'den eskileri özetlenir
  (compact: user msg + agent final cevabı, tool calls atlanır)
- "Compact" tek başına bir tool call değil, agent loop içinde otomatik
- Kullanıcı isterse `/clear` ile tamamen sıfırlar

---

## 13. CLI Endpoint Detayları

### 13.1 `GET /api/agent/providers`

```json
{
  "providers": [
    { "id": "anthropic", "label": "Anthropic Claude", "defaultBaseUrl": "https://api.anthropic.com", "requiresApiKey": true, "defaultModel": "claude-sonnet-4-5" },
    { "id": "openai", "label": "OpenAI", "defaultBaseUrl": "https://api.openai.com", "requiresApiKey": true, "defaultModel": "gpt-4o", "supported": false },
    { "id": "google", "label": "Google AI", "defaultBaseUrl": "https://generativelanguage.googleapis.com", "requiresApiKey": true, "defaultModel": "gemini-2.0-flash", "supported": false },
    { "id": "ollama", "label": "Ollama (local)", "defaultBaseUrl": "http://127.0.0.1:11434", "requiresApiKey": false, "defaultModel": "llama3.1:8b", "supported": false },
    { "id": "custom", "label": "Custom (OpenAI-compatible)", "defaultBaseUrl": null, "requiresApiKey": true, "defaultModel": null, "supported": false }
  ]
}
```

Sprint A'da sadece `anthropic` `supported: true`, diğerleri `false`.

### 13.2 `POST /api/agent/keys`

```jsonc
// Request
{ "provider": "anthropic", "apiKey": "sk-ant-...", "baseUrl": null, "model": "claude-sonnet-4-5" }

// Response 200
{ "ok": true, "provider": "anthropic", "model": "claude-sonnet-4-5" }
```

Validation: `validateKey` provider'a istek atar (Sprint A: Anthropic
`/v1/messages` minimum 1 token test).

### 13.3 `POST /api/agent/chat`

```jsonc
// Request
{
  "sceneId": "main.scene.json",
  "message": "Player'ın üstüne coin ekle",
  "model": "claude-sonnet-4-5",
  "provider": "anthropic",
  "approvalMode": "destructive-only"
}

// Response: 200 text/event-stream
event: token
data: {"text": "Sprite seçmek için mevcut asset'lere bakıyorum…"}

event: tool_start
data: {"tool": "list_assets", "args": {}}

event: tool_result
data: {"tool": "list_assets", "result": {"assets": [...]}, "ok": true, "ms": 8}

event: done
data: {"usage": {"input": 412, "output": 89}}
```

### 13.4 `POST /api/agent/approve`

```jsonc
{ "requestId": "req_abc", "decision": "allow" }
→ 204
```

### 13.5 `POST /api/agent/abort`

```jsonc
{}
→ 204, mevcut chat stream'i event: done { reason: "aborted" } ile kapanır
```

### 13.6 Hata Yanıtları

- `400` validation error (zod)
- `401` key eksik veya invalid
- `404` sahne yok
- `429` provider rate limit (Retry-After header'ı iletilir)
- `500` MCP çöktü (respawn denendi, başarısız)
- `503` agent loop zaten meşgul

---

## 14. Yeni MCP Araçları

Sprint A için gerekli. `packages/mcp/src/schemas/` ve `tools/` altında.

### 14.1 `snapshot_undo_point`

```ts
{ name: "snapshot_undo_point", description: "Mark a manual undo point", destructive: false }
```

Editör undo stack'ine manuel nokta ekler. Agent her oturum başında ve büyük
değişikliklerden önce bunu çağırır.

### 14.2 `restore_snapshot`

```ts
{ name: "restore_snapshot", description: "Restore the scene to a previous snapshot", destructive: true }
```

`destructive: true` → onay gerekir.

### 14.3 `diff_scene_versions`

```ts
{ name: "diff_scene_versions", description: "Show the diff between two scene snapshots", destructive: false }
```

Argümanlar: `{ from: snapshotId, to?: "current" }`. JSON patch listesi döner.

### 14.4 `find_unused_assets`

```ts
{ name: "find_unused_assets", description: "List assets not referenced by any scene", destructive: false }
```

Cleanup için kullanılır.

### 14.5 `suggest_components`

```ts
{ name: "suggest_components", description: "Suggest typical component combinations for an entity role", destructive: false }
```

Argümanlar: `{ role: "player" | "enemy" | "collectible" | "platform" | ... }`.
Hafif heuristik + opsiyonel olarak `packages/mcp/skills/` ile aynı isimdeki
manifest'i döner.

### 14.6 `explain_scene`

```ts
{ name: "explain_scene", description: "Summarize the current scene: entity count, missing assets, perf notes", destructive: false }
```

Read-only metrik raporu.

### 14.7 `set_gravity` (Sprint A)

```ts
{ name: "set_gravity", description: "Set the project gravity vector", destructive: false }
```

`/gravity` slash komutunu destekler.

---

## 15. Sprint A Görevleri (Kod Ölçeğinde)

> Sprint A'nın kapsamı: kullanıcı editörde agent'a yazabilsin, Anthropic
> cevap versin, MCP tool'ları çalışsın, destructive işlemler onaylansın.

### 15.1 `packages/agent` paket iskeleti (1 PR)

- [ ] `packages/agent/package.json` — name, deps (`@modelcontextprotocol/sdk`,
      `@gamekit/schema`, `nanoid`, `eventsource-parser` vs.),
      peer dep `@gamekit/mcp`
- [ ] `packages/agent/tsconfig.json` — composite, declaration
- [ ] `packages/agent/src/index.ts` — public exports
- [ ] `pnpm-workspace.yaml`'a ekleme gerekiyor mu kontrol (yoksa otomatik)
- [ ] Root `tsconfig.base.json` path alias güncellemesi
- [ ] `pnpm install` çalıştır

### 15.2 Provider: Anthropic (1 PR)

- [ ] `providers/types.ts` — `ProviderAdapter`, `StreamEvent` tipleri
- [ ] `providers/anthropic.ts` — `listModels`, `stream`, `validateKey`
- [ ] `providers/anthropic.test.ts` — mock fetch, token + tool_call parse
- [ ] `eventsource-parser` ile SSE parse

### 15.3 MCP Client (1 PR)

- [ ] `mcp/client.ts` — `McpClient` sınıfı, stdio child process yönetimi
- [ ] `mcp/tools.ts` — `listTools`, `toModelTools(schema, providerId)`
- [ ] `mcp/executor.ts` — `callTool(name, args, signal)`
- [ ] `mcp/tools.test.ts` — fixture tool list, provider-specific çıktı doğrula

### 15.4 ReAct Loop (1 PR)

- [ ] `loop/agent.ts` — `runAgent(input, deps): AsyncGenerator<SseEvent>`
- [ ] `loop/history.ts` — mesaj listesi tipi, `appendUser`, `appendAssistant`
- [ ] `loop/approval.ts` — `ApprovalGate` sınıfı, pending request map
- [ ] `loop/streaming.ts` — `SseEvent` tipleri, encode helper
- [ ] `loop/agent.test.ts` — fixture: model 1 tool call + 1 token; approval deny
- [ ] `loop/approval.test.ts` — 3 mod için needsApproval, timeout, abort

### 15.5 Sistem Prompt (1 PR)

- [ ] `system/prompt.ts` — `buildSystemPrompt(ctx)`
- [ ] `system/skills-loader.ts` — `packages/mcp/skills/*.json` okur, özetler
- [ ] Komponent cheatsheet'i `packages/schema/src/index.ts`'ten derive et

### 15.6 BYOK Vault (1 PR)

- [ ] `store/keys.ts` — interface: `saveKey`, `getKey`, `deleteKey`,
      `listProviders`
- [ ] Web implementasyonu: WebCrypto + localStorage (editör tarafında)
- [ ] Tauri implementasyonu: invoke("keychain_*")
- [ ] `lib/agent-keys.ts` — editör tarafı wrapper

### 15.7 CLI Entegrasyonu (1 PR)

- [ ] `agent/host.ts` — `AgentHost` sınıfı: MCP spawn + loop yönetimi
- [ ] `agent/spawn-mcp.ts` — child process spawn + env
- [ ] `agent/routes.ts` — 7 endpoint handler
- [ ] `agent/sse.ts` — SSE response helper
- [ ] `server.ts`'e route'ları bağla

### 15.8 Yeni MCP Araçları (1 PR)

- [ ] `tools/snapshot.ts` (snapshot_undo_point, restore_snapshot, diff_scene_versions)
- [ ] `tools/scene-meta.ts` (find_unused_assets, explain_scene)
- [ ] `tools/suggestions.ts` (suggest_components)
- [ ] `tools/physics.ts` extension: `set_gravity`
- [ ] Her tool için zod schema + destructive flag
- [ ] `mcp/test/*.test.ts` — her tool için smoke test

### 15.9 Editör: AgentPanel (2 PR)

**PR 1: Statik UI + SSE tüketici**
- [ ] `components/AgentPanel.tsx` — iki sütun layout
- [ ] `components/AgentMessage.tsx`, `AgentToolTrace.tsx`
- [ ] `hooks/useAgent.ts` — SSE bağlantısı, mesaj state'i
- [ ] `lib/agent-stream.ts` — `EventSource` wrapper + abort
- [ ] `lib/agent-schemas.ts` — mesaj/tool tipleri
- [ ] `styles/_agent.scss` — panel + tool trace
- [ ] Bottom drawer tab entegrasyonu (`activeBottomTab` union güncelle)
- [ ] Topbar `Sparkles` ikonu + aktivasyon

**PR 2: BYOK + Onay**
- [ ] `components/AgentSettings.tsx` — provider listesi + add/edit
- [ ] `components/AgentApprovalModal.tsx`
- [ ] `hooks/useAgentKeys.ts` — CRUD
- [ ] Slash komutları: `/spawn`, `/apply`, `/validate`, `/gravity`,
      `/clear`, `/help`
- [ ] `useUndo` entegrasyonu: agent değişiklikleri snapshot alır

### 15.10 Testler (1 PR)

- [ ] `packages/agent/test/` — provider, mcp, loop, approval
- [ ] `packages/mcp/test/` — yeni tool'lar
- [ ] `packages/cli/test/agent.test.ts` — endpoint handler'lar
- [ ] `apps/editor/src/components/AgentPanel.test.tsx` — mount + mesaj render
- [ ] `apps/editor/src/components/AgentSettings.test.tsx` — provider add
- [ ] E2E: Playwright ile mock Anthropic → chat → tool call → canvas update

### 15.11 Dokümantör

- [ ] `docs/agent/quickstart.md` — kullanıcı için
- [ ] `docs/agent/architecture.md` — geliştirici için
- [ ] `ROADMAP.md`'de Sprint 0 tamamlandı işareti

---

## 16. Sprint B–D Yol Haritası

### Sprint B — Çoklu sağlayıcı + Tauri (Sprint A + 2 hafta)
- OpenAI, Google, Ollama, OpenAI-compatible adapter'ları
- `/api/agent/models/:provider` canlı listeleme
- Tauri `tauri-plugin-stronghold` + `keychain_*` komutları
- Approval mode toggle UI (`destructive-only` / `always` / `off`)
- Tool trace UI polish (süre grafiği, expand/collapse tüm tool call'lar)

### Sprint C — Vizyon + plan-then-execute (2 hafta)
- `/screenshot` → canvas PNG → vision model (base64 inline)
- Plan-then-execute: model önce `plan` tool'u ile adım listesi sunar;
  kullanıcı onaylarsa toplu execute
- Diff preview: 5+ tool call'luk değişiklik öncesi modal (ne değişecek?)
- History sayfalama + arama

### Sprint D — Orkestrasyon (3 hafta)
- `apply_skill` akışı: model skill seçer, `apply_skill` tool'unu çağırır,
  sonuçları zincirler
- Project-wide task: "tüm sahnelere coin ekle" gibi toplu iş
- Anomaly detector: validation hataları artarsa otomatik `restore_snapshot`
- Çoklu agent taslağı (paralel değil, kuyruk)

---

## 17. Test Stratejisi

### 17.1 Birim Testleri
- Provider adapter'lar: `fetch` mock'lanır, SSE parse, tool call parse
- MCP client: spawn mock'lanır, tools/list + tools/call
- ReAct loop: 1 turn (text only), 1 turn (1 tool call), 1 turn (destructive
  deny), 1 turn (max turns exceeded)
- Approval gate: 3 mod, timeout, abort
- BYOK vault: encrypt/decrypt round-trip, key maskeleme

### 17.2 Entegrasyon
- CLI endpoint'ler: `supertest` benzeri ile `startEditorServer` ayağa
  kaldır, istek at
- Editör hooks: `renderHook` ile SSE simülasyonu (mock provider)

### 17.3 E2E (Playwright)
1. `pnpm gamekit editor` başlat
2. Editör aç, agent tab'ına geç
3. BYOK modal'dan test API key ekle
4. Chat'e "platformer uygula" yaz
5. Tool call trace'de `apply_skill` görün, sonuç `ok`
6. Canvas'ta Player entity'si belirsin
7. Konuşma geçmişi `gamekit/agent/main.scene.json`'a yazılsın

### 17.4 Performans
- 100 turn'lük fixture → token bütçesi 200k altında mı
- 5 tool call'lu ortalama tur → SSE ilk token < 1s
- MCP client spawn → ilk tool call < 500ms

### 17.5 Güvenlik
- API key loglanmaz (test: console.log çağrısı spy'la, key içermez)
- API key response body'de dönmez (test: `/api/agent/keys` GET 404 veya masked)
- Approval timeout sonrası tool çalışmaz (test: 100ms timeout, deny)

---

## 18. Performans & Maliyet Notları

### 18.1 Token Maliyeti (Sprint A varsayımı)

- Sistem prompt: ~800 token (sahne büyüklüğüne bağlı)
- 1 turn (1 tool call): +500-1000 token
- Uzun session: 50 turn × 1000 = 50k token (Sonnet 4.5: ~$0.15/turn ortalama)

### 18.2 Optimizasyon Stratejileri
- `sceneSummary` aktif sahne için max 50 entity listeler (büyükse "...")
- Skill manifest'leri sadece ad + 1 cümle açıklama (full içerik
  `apply_skill` tool'unda)
- Tool call sonuçları > 2KB ise truncate + "full result at <path>" notu
- Compact: 50 turn'den eskileri özetlenir

### 18.3 Latency
- İlk token: 800-1500ms (Anthropic, kısa prompt)
- Tool call roundtrip: +200-500ms (MCP stdio)
- Onay modalı: kullanıcıya bağlı, ortalama 5-15s

### 18.4 Kaynak Kullanımı
- @gamekit/mcp child process: ~30MB RAM
- @gamekit/agent: ~10MB
- SSE buffer: 100KB/saniye peak (çok büyük tool call sonuçlarında sorun
  olabilir; 5MB/s buffer limit)

---

## 19. Açık Sorular ve Gelecek İş

### Sprint A'da Kararlaştırılacak (uygulama sırasında netleşecek)
- Web passphrase UI: her oturum başında sormak mı, yoksa "trust this
  device" toggle'ı mı? → Tauri'de yok, Web'de sade olmalı
- Default model dropdown'ı ilk açılışta ne göstermeli? → "Sonnet 4.5" +
  fetch başarısız olursa fallback
- Slash komutları için help mesajı nereden çekilsin? → hard-coded ilk
  sprint, ileride `agent_help.json` config

### Sprint A Dışı
- Multi-tab concurrency: iki editör tab'i aynı projeyi açarsa MCP state'i
  paylaşır mı? (Şu an: her CLI instance'ı bağımsız, ikinci tab ikinci
  CLI = sorun)
- Agent sonuçlarını git'e commit'lemek: `gamekit/agent/<scene>.json`
  default gitignore'da mı, opsiyonel mi?
- Custom base URL için self-signed cert desteği (Tauri)
- Provider outage fallback: Anthropic 5xx → otomatik retry yok Sprint A'da,
  kullanıcıya hata mesajı

### İleride (Sprint E+)
- Multi-modal: kullanıcı screenshot yapıştırır → vision model
- Tool zincirleme: "bu sprite'ı tüm enemy'lerde kullan"
- Test runner: agent "test senaryosu oluştur ve koş" diyebilir
- Collaboration: iki kullanıcı aynı anda agent çalıştırır (CRDT + lock)
- Voice input: Web Speech API ile transkripsiyon

---

## Ek A: Sözlük

| Terim | Anlam |
| --- | --- |
| **Agent** | LLM destekli, tool-use yapabilen, kullanıcı adına proje
  üzerinde işlem yapan AI asistan |
| **BYOK** | Bring Your Own Key — kullanıcı kendi API anahtarını
  sağlar, platform ücreti yok |
| **MCP** | Model Context Protocol — tool'ları standardize eden
  protokol, Playroom'un resmi arayüzü |
| **ReAct** | Reason + Act — modelin düşünüp tool çağırıp sonucu
  gözlemleyip tekrar düşündüğü döngü |
| **SSE** | Server-Sent Events — tek yönlü streaming, agent çıktısı
  için kullanılır |
| **Destructive tool** | Veri silen/üzerine yazan tool (`remove_*`,
  `delete_*`, `overwrite`) |

## Ek B: Bağımlılıklar

### Yeni (`packages/agent/package.json`)
- `@modelcontextprotocol/sdk` (zaten `@gamekit/mcp`'de)
- `eventsource-parser` — Anthropic SSE parse
- `nanoid` — request ID

### Mevcut Kullanımlar
- `@gamekit/schema` — component cheatsheet, validate
- `@gamekit/mcp` — `createMcpServer` ile child process

### Editör
- `lucide-react` (zaten var) — `Sparkles`, `Shield`, `Flame` ikonları
- WebCrypto API (built-in) — BYOK şifreleme
- Tauri: `tauri-plugin-stronghold` (Sprint B)

---

**Son güncelleme:** 2026-06-01 · **Durum:** Tasarım tamamlandı, Sprint A
başlangıcı için onay bekleniyor.
