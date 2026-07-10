# Playroom — Production 2D Game Engine Roadmap

Tracks all work required to evolve Playroom from MVP 0.1 into a production-ready
2D game engine. Each section: task → implementation points → related **MCP
tools** (new included) → related **Skill templates** (new included).
Schema is the contract; runtime + editor + MCP evolve together.

> Şu anki durum (v0.1.3): 10 bileşen tipi (+`Tilemap`), raycast (AABB/Circle/Polygon),
> MCP'ta `raycast` + `query_overlaps` + `add_tilemap` + `paint_tile` tools,
> sadece image asset, editörde play-in-editor aktif (mock floor ile),
> 18 MCP test + 7 runtime test, `@gamekit/agent` paketi dolu,
> Agent UI panel built ama MVP'de gizli.

---

## 0. Quick Wins (first 1-2 sprints)

1. [x] `RigidBody` + velocity-based hareket → statik `position` yerine dinamik his
   (angular velocity + fixed timestep eklendi, v0.1.1)
2. [x] `Tilemap` + paint tool → içerik üretimi 10x hızlanır (schema + MCP tools + runtime + editor rendering)
3. [x] Play-in-editor → geri bildirim döngüsü dakikadan saniyeye düşer
   (`MVP_SHOW_PLAY_CONTROLS=true`, mock floor ile, v0.1.1)
4. [x] MCP test → 10 physics test eklendi (editör smoke testi hâlâ eksik)
5. [x] `CircleCollider` runtime collision + editör render
6. [x] Raycast → mouse picking, AI, laser (runtime `collision.ts` + MCP tool)

---

## 1. Physics & Collision (most critical gap)

### Tasks
- [x] `CircleCollider` ve `PolygonCollider` ekle (şema + editör inspector + MCP)
- [x] `PolygonCollider` runtime collision — SAT detection + MTV resolution against AABB, circle, and polygon solids
- [x] `RigidBody` bileşeni: velocity, angularVelocity, mass, drag, isKinematic, gravityScale
- [x] Velocity-verlet entegrasyonu (sabit dt = 1/60) ve `fixedTimestep` accumulator
- [x] Katı layer/mask sistemi: runtime'da `applyAabbCollisions`/`applyCircleCollisions` mask filtresi kullanıyor
- [x] Trigger areas are overlap-only and never participate in solid collision resolution
- [x] Trigger enter/exit events (`onTriggerEnter`, `onTriggerExit`) with layer/mask filtering
- [x] Raycast (mouse picking, AI, laser) — `intersectRayAabb`/`Circle`/`Polygon` + `raycast()` entry point
- [x] Sleeping-body optimization — supported low-motion rigid bodies sleep after 0.5s and wake on force, impulse, or player input
- [x] Collision callbacks — `onTriggerEnter`/`onTriggerExit` and solid-contact `onCollisionEnter`

### MCP Araçları (yeni)
- [x] `add_collider` — sahneye `AabbCollider` / `CircleCollider` / `PolygonCollider` ekler
- [x] `add_rigid_body` — entity'ye `RigidBody` bağlar (`mass`, `isKinematic`, `gravityScale`)
- [x] `set_gravity` — proje/sahne yerçekimini ayarlar
- [x] `set_collision_layer` — entity layer/mask günceller
- [x] `raycast` — verilen noktadan verilen yöne ışın atar, ilk çarpışanı döner
- [x] `query_overlaps` — alan içindeki tüm collider'ları listeler (AI için)
- [x] `set_trigger` — collider'ı overlap-only yapar

### Skill Güncellemeleri
- `platformer.json` → `RigidBody` ile yeniden yaz (manuel hareket yerine)
- Yeni `physics-puzzle.json` (Angry Birds tarzı: kinematic tetikleme + gravity)
- Yeni `topdown-shooter.json` `CircleCollider` + `raycast` ile mermi için

---

## 2. Component Library (schema + runtime + editor + MCP sync)

### Tasks
- [x] `Tilemap` (self-contained: tileset asset + grid + flat tile array) — editör render + runtime Skia render
- [ ] `Text` bileşeni (font assetId, size, color, align)
- [ ] `AudioSource` + `AudioListener` (mp3/ogg/wav asset tipi) — şu an sadece image kabul
- [ ] `ParticleSystem` (emitter shape, lifetime, color over life, blending)
- [ ] `Light2D` (point/spot, range, intensity, color) — runtime-web Phaser ışıklarıyla eşle
- [ ] `StateMachine` (states + transitions + events)
- [ ] `Script` / behavior node (tetikli event handler, JSON DSL)
- [ ] `Tween` / timeline track başına easing curves
- [ ] `Path2D` + `FollowPath` (waypoint patrol)
- [ ] `NineSlice` sprite (UI ölçeklenebilir kenar)

### MCP Araçları (yeni)
- [x] `add_tilemap` — entity'ye `Tilemap` bileşeni ekler (tilesetId, tileWidth/Height, columns, gridWidth/Height)
- [x] `paint_tile` — tilemap üzerinde gridX/gridY pozisyonuna tileId yazar
- `add_text` — `Text` bileşeni ekler (font, boyut, hizalama)
- `import_audio` — mp3/ogg/wav import eder, `AudioSource` için `assetId` döner
- `add_audio_source` — entity'ye `AudioSource` bağlar (`playOnStart`, `loop`, `volume`)
- `add_particle_system` — emitter parametreleriyle `ParticleSystem` oluşturur
- `add_state_machine` — states + transitions + event'leri tanımlar
- `add_script` — JSON DSL ile event handler ekler
- `add_tween` — başlangıç/bitiş değerleri + easing curve
- `add_path` — waypoint listesi ile `Path2D` oluşturur
- `add_nine_slice` — 9-slice için `NineSlice` bileşeni

### Skill Güncellemeleri
- `puzzle.json` → `Text` + `AudioSource` ile zenginleştir
- Yeni `rpg-dialog.json` `Text` + `Script` event'leriyle
- Yeni `tower-defense.json` `Path2D` + `StateMachine` ile düşman davranışı
- Yeni `endless-runner.json` `Tween` + spawner pattern
- Yeni `visual-novel.json` `Text` + `Script` event bus

---

## 3. Input & Devices

### Tasks
- [ ] Virtual joystick / d-pad bileşeni (mobile için zorunlu)
- [ ] Input action map (`"jump"`, `"fire"`) → key/touch/gamepad binding
- [ ] Gamepad API desteği (web), Playroom vibration (mobile)
- [ ] Pointer event normalizasyonu (canvas → world koordinat)
- [ ] Gesture: swipe, pinch, hold

### MCP Araçları (yeni)
- `add_virtual_joystick` — mobile için d-pad/analog stick GUI bileşeni
- `define_input_action` — `{"name":"jump","keys":["Space"],"touch":true,"gamepad":"A"}` tanımlar
- `bind_input_action` — action'ı bir entity/script'e bağlar
- `simulate_input` — headless test için sentetik input

### Skill Güncellemeleri
- `platformer.json` → action map ile (`"move_left"`, `"jump"`) yeniden yaz
- Yeni `fighting-game.json` çoklu tuş + gamepad combo için

---

## 4. Scene Management & Data Flow

### Tasks
- [ ] Scene transition (fade, slide, custom) + `SceneManager` API
- [ ] Persistent state (sahneler arası değişken taşıma) — `GameStore` / save slot
- [ ] Save/load: `localStorage` (web), `AsyncStorage` (Expo), JSON serialize
- [ ] Prefab kütüphanesi (entity'yi kaydet, sahneye instantiate)
- [ ] Level select UI flow — `GameKitLevel` şemada var ama runtime'da unlocked mantığı yok
- [ ] Scriptable events (global pub/sub bus)

### MCP Araçları (yeni)
- `load_scene` — sahneyi yükler + transition tipi parametresi
- `define_scene_transition` — fade/slide/custom preset kayıt eder
- `set_persistent_var` / `get_persistent_var` — global state okur/yazar
- `save_game` / `load_game` — slot ismiyle serialize/deserialize
- `create_prefab` / `instantiate_prefab` — entity'den prefab üretir, sahneye koyar
- `set_level_unlocked` / `get_level_progress` — level select mantığı
- `emit_event` / `subscribe_event` — global event bus'a yazar/okur

### Skill Güncellemeleri
- Yeni `metroidvania.json` — birden çok sahne, `set_persistent_var` ile kilit/anahtar yönetimi
- Yeni `level-select.json` — `GameKitLevel` UI flow'u
- Yeni `roguelike.json` — run başında `load_game` + her odada `load_scene`

---

## 5. Editor (Not an Engine Without Play-in-Editor)

### Tasks
- [~] **Play-in-editor**: requestAnimationFrame loop + mock floor ile çalışıyor, ama Skia/Phaser runtime host değil
- [ ] Gizmos: collider yeşil çizgi, trigger mavi, rigid body velocity oku
- [ ] Tile paint mode + tile palette panel
- [ ] Animation preview (timeline altında sprite sheet viewer)
- [ ] Asset import drag-drop + audio waveform / sprite-sheet slice UI
- [ ] Find & replace / search across entities
- [ ] Çoklu sahne sekmesi (split view)
- [ ] Profiler overlay: FPS, draw calls, entity count, GC
- [ ] Hot-reload (scene.json değişince canvas yeniden yükle)
- [ ] Console: mevcut var ama runtime hatalarını buraya stream et
- [ ] Undo/redo kapsamı: `useUndo` hook var ama hangi mutation'ları kaydettiğini doğrula

### MCP Araçları (yeni)
- `play_scene` / `stop_scene` / `pause_scene` — editör play-state kontrolü
- `open_scene_in_editor` — belirli sahneyi editörde aktif eder
- `get_runtime_metrics` — FPS, draw call, entity count snapshot
- `editor_set_camera` — editör kamerasını ayarlar (zoom, pan)
- `editor_undo` / `editor_redo` — editör undo stack kontrolü
- `validate_scene_visual` — runtime gözünden sahneyi çalıştırıp hataları raporlar

### Skill Güncellemeleri
- Tüm skill'ler editörde "open + play" butonu ile test edilebilir olmalı
- Yeni `template-blank.json` — sıfırdan başlamak için boş sahne

---

## 6. CLI & Developer Experience

### Tasks
- [ ] `gamekit dev` watch-mode (scene değişti → simulator reload)
- [ ] `gamekit build` prod build (asset minify, JSON gzip, asset hash)
- [ ] `gamekit doctor` (env, bağımlılık, eksik asset uyarısı)
- [ ] `gamekit migrate <v1> <v2>` schema upgrade
- [ ] `gamekit profile <scene>` — runtime trace export
- [ ] `--port` zaten var; `--host`, `--https`, mTLS yok
- [ ] Asset packer (texture atlas, audio bank)

### MCP Araçları (yeni)
- `dev_server_status` — `gamekit editor`'ün ayakta olup olmadığını, portunu, PID'sini döner
- `build_project` — `gamekit build` çağırır, çıktı yolunu + süresini raporlar
- `run_doctor` — `gamekit doctor` çıktısını yapılandırılmış döner (lint + uyarı + hata)
- `migrate_project` — schema versiyonu yükseltir, breaking change listesini döner
- `export_profile` — runtime trace'i JSON/Markdown olarak dışa aktarır

### Skill Güncellemeleri
- Tüm skill manifest'leri `validate_project` ile doğrulanmalı
- Yeni `ci-template.json` — `run_doctor` + `build_project` çağrılarını zincirler

---

## 7. Testing, Quality, Observability

### Tasks
- [ ] MCP araçları için 0 test — `packages/mcp/test/*.test.ts` oluştur
- [ ] Editör için hiç test yok — Vitest + React Testing Library ekle (`SceneCanvas`, `Inspector`)
- [ ] Runtime integration testleri: collider çarpışma, kamera follow, animasyon frame advance
- [ ] Schema golden testleri (validator her örnek sahneyi onaylamalı)
- [ ] E2E: `pnpm test:e2e` Playwright ile editör → play → runtime render
- [ ] Determinism: sabit seed'li RNG, snapshot testleri
- [ ] Performance budget testi (sahnede 1000 entity render < 16ms)

### MCP Araçları (yeni)
- `run_tests` — vitest/test runner'ı tetikler, başarısız testleri döner
- `snapshot_scene` — sahne JSON'unu golden snapshot ile karşılaştırır
- `run_perf_budget` — sahneyi N entity ile doldurup frame süresini ölçer
- `lint_project` — validator + doctor birleşik, satır satır uyarılar

### Skill Güncellemeleri
- Her skill manifest'in altına `expectedEntities`, `expectedComponents` metadata ekle
- Snapshot testler bu metadata'ya göre regresyon yakalasın
- Yeni `perf-fixture-1000.json` — 1000 entity'li yük testi sahnesi

---

## 8. Cross-Platform Parity

### Tasks
- [ ] Şu an Phaser (`runtime-web`) ile Skia (`runtime`) davranışları senkron değil — referans test sahneleri
- [ ] iOS/Android Permissions (camera, mic, storage) için runtime API
- [ ] Web Worker / SharedArrayBuffer — fizik heavy sahnelerde UI donmasın
- [ ] WebGL fallback yok (Phaser Canvas/WebGL, Skia Metal/WebGL)

### MCP Araçları (yeni)
- `compare_runtime_outputs` — aynı sahneyi Skia ve Phaser'da render edip pixel diff raporlar
- `request_permission` — runtime'dan camera/mic/storage izni ister (mobile)
- `detect_runtime_capabilities` — aktif platform + GPU + permission envanteri

### Skill Güncellemeleri
- Her skill `platforms: ["web", "mobile"]` alanı taşır
- Yeni `ar-puzzle.json` (camera permission kullanan)

---

## 9. Content & User Experience

### Tasks
- [ ] Yeni proje wizard (genre seç → şablon → asset paketi)
- [ ] Sample projeler: platformer, top-down shooter, puzzle (skill şablonları var ama çalışan örnek eksik)
- [ ] Dokümantasyon sitesi (VitePress / Docusaurus) — API ref + tutorial
- [ ] In-app tutorial overlay (ilk açılışta 3 ipucu)
- [ ] Changelog / migration notes (her breaking change)

### MCP Araçları (yeni)
- `create_project_from_template` — wizard'ı MCP üzerinden yürütür
- `list_samples` — örnek proje envanteri
- `get_changelog` — son N sürümün breaking change özeti

### Skill Güncellemeleri
- Her skill'in `tutorial` alanı: ilk açılışta 3 ipucu göstermek için
- Yeni `tutorial-walkthrough.json` — sıfırdan play-in-editor'a öğretici

---

## 10. MCP / AI Integration

### Mevcut Durum
- 34 tool, `tools/{assets,entities,gui,gui-components,project,scenes,skills}.ts` altında
- Zod şemaları `schemas/{component,gui,gui-components,project,scene,skill}.ts`
- Prompts + resources mevcut

### Tasks
- [ ] Her tool'un zod şeması ile davranışı eşleşiyor mu doğrula
- [ ] Tool response'larına `version`/`warnings` ekle (breaking change işareti)
- [ ] Streaming output (uzun import/listeleme için)
- [ ] `validate_scene` aracı — motor başlatmadan LLM hataları erken görsün
- [ ] Resource listesi: `scene://<id>`, `entity://<id>` (read-only erişim)
- [ ] Rate limit / idempotency key (LLM retry senaryoları için)
- [ ] Tool call audit log (hangi AI hangi tool'u ne zaman çağırdı)

### Yeni MCP Araçları (özet)
| Tool | Amaç |
| --- | --- |
| `validate_scene` | Sahneyi motor başlatmadan validate eder |
| `simulate_runtime_step` | N frame simüle eder, son entity state'ini döner |
| `diff_scene_versions` | İki scene arasındaki değişiklikleri listeler |
| `find_unused_assets` | Sahnelerde referans edilmeyen asset'leri bulur |
| `batch_apply_edit` | Birden çok entity/component'i atomik günceller |
| `snapshot_undo_point` | Manuel undo noktası (LLM deneysel değişiklikler için) |
| `restore_snapshot` | Snapshot'a geri döner |
| `explain_error` | Runtime/validation hatasını insan-dilinde açıklar |
| `suggest_components` | Verilen entity için tipik bileşen kombinasyonu önerir (LLM context) |
| `explain_scene` | Sahneyi özetler (entity sayısı, eksik asset, performans notu) |

### Yeni MCP Resources
- `scene://<projectId>/<sceneId>` — sahne JSON (read-only)
- `entity://<projectId>/<sceneId>/<entityId>` — entity + bileşenleri
- `asset://<projectId>/<assetId>` — asset metadata + path
- `metrics://runtime` — son frame'in FPS/draw call snapshot
- `validation://project` — `validate_project` çıktısı cache

### Yeni MCP Prompts
- `add-player-platformer` — minimal platformer oyuncusu ekleme prompt'u
- `add-enemy-with-state-machine` — state machine'li düşman
- `wire-level-transition` — sahneler arası geçiş kurulumu
- `profile-bottleneck` — frame drop analiz prompt'u

---

## 11. New Skill Templates (recommended set)

`packages/mcp/skills/` altında yayınlanacak yeni manifest'ler. Her biri mevcut
`platformer.json` formatını takip eder; ek olarak `tutorial`, `platforms`,
`expectedEntities`, `expectedComponents` metadata alanları taşır.

| Dosya | Tür | Açıklama |
| --- | --- | --- |
| `physics-puzzle.json` | Fizik bulmaca | Angry Birds tarzı tetikleme + yerçekimi |
| `topdown-shooter.json` | Üstten bakış nişancı | `CircleCollider` + `raycast` mermi |
| `rpg-dialog.json` | RPG | `Text` + `Script` event bus + persistent state |
| `tower-defense.json` | Kule savunma | `Path2D` düşman + `StateMachine` |
| `endless-runner.json` | Sonsuz koşu | Spawner pattern + `Tween` |
| `visual-novel.json` | Görsel roman | `Text` + branch + asset swap |
| `fighting-game.json` | Dövüş | Gamepad combo + hitbox |
| `metroidvania.json` | Metroidvania | Çoklu sahne + persistent unlock |
| `level-select.json` | UI flow | `GameKitLevel` mantığı |
| `roguelike.json` | Roguelike | Procedural + `load_game`/`save_game` |
| `ar-puzzle.json` | AR bulmaca | Camera permission + marker |
| `rhythm-game.json` | Ritim | `AudioSource` + beat-sync tween |
| `card-game.json` | Kart oyunu | State machine + drag/drop GUI |
| `city-builder.json` | Şehir kurma | Tilemap grid + grid snap |
| `multiplayer-lobby.json` | Multiplayer placeholder | Future: network layer |
| `tutorial-walkthrough.json` | Eğitim | İlk açılış ipuçları |
| `template-blank.json` | Boş | Sıfırdan başlangıç |
| `perf-fixture-1000.json` | Perf testi | 1000 entity stress sahnesi |
| `ci-template.json` | CI/CD | `run_doctor` + `build_project` zinciri |

---

## 12. Cross-Cutting

- [ ] `useUndo` hook'unun hangi mutation'ları kaydettiğini test et, eksikleri tamamla
- [ ] `assets.ts` generate her zaman idempotent mi doğrula
- [ ] `parseScene`/`validateScene` her skill için golden test seti
- [ ] Telemetry opt-in: hangi tool/component ne sıklıkla kullanılıyor
- [ ] Localization (Türkçe/İngilizce editör string'leri)
- [ ] Theming: `brief.md`'deki renk token'larını runtime'a da uygula (debug overlay)

---

## 13. AI Game Agent (Editor BYOK) — HIGH PRIORITY

Motorun birincil amacı: React Native ile tüm platformlara çıktı veren ve
**editör içinden, kullanıcının kendi API anahtarıyla (BYOK) çalışan AI agent
ile oyun geliştirilebilen** bir 2D motor. Aşağıdaki tasarım bu hedefe yönelik.

### Kararlaştırılan Tasarım Kararları

| Topic | Decision |
| --- | --- |
| Varsayılan onay modu | `destructive-only` (`add_*` otomatik, `remove_*`/`delete_*`/`overwrite` modal açar) |
| BYOK depolama | Web: `localStorage` (proje bazlı), Tauri: OS Keychain (`tauri-plugin-stronghold`) |
| Konuşma geçmişi | `gamekit/agent/<scene>.json` (MCP `FileIO` deseniyle aynı) |
| İlk provider | Sadece Anthropic Claude (Sprint A); diğerleri Sprint B |

### Mimari

```
┌──────────────────────────────────────────────────────┐
│  Editor (apps/editor)                                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Bottom Drawer│  │  AgentPanel  │  │ AgentSettings│ │
│  │  + Agent tab │  │  (chat)      │  │  (BYOK UI)   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼────────────────┼──────────────────┼─────────┘
          │ SSE            │ POST /api/agent/chat
          ▼                ▼
┌──────────────────────────────────────────────────────┐
│  CLI (packages/cli) — 127.0.0.1:4177                 │
│  ┌──────────────────┐   ┌──────────────────────────┐ │
│  │ existing /api/*  │   │ new /api/agent/*         │ │
│  └──────────────────┘   │  - chat (SSE stream)     │ │
│                         │  - providers, models     │ │
│                         │  - keys (in-memory)      │ │
│                         │  - history, approve,     │ │
│                         │    abort                  │ │
│                         └─────┬────────────────────┘ │
│                               │ stdio (MCP)            │
│                               ▼                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ @gamekit/agent  ──spawns──►  @gamekit/mcp      │   │
│  │  (provider adapters,                            │   │
│  │   ReAct loop, streaming,                        │   │
│  │   approval, history)                            │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Key principle:** The agent does **not duplicate** the MCP tool list. The CLI
spawns one `@gamekit/mcp` process per editor session and uses the same tool
surface. An in-editor agent and an external Claude/Cursor use exactly the same
tools.

### Yeni Paket: `@gamekit/agent`

```
packages/agent/
├── src/
│   ├── index.ts
│   ├── server.ts                 # spawn MCP child + AgentHost
│   ├── providers/
│   │   ├── types.ts              # ProviderAdapter interface
│   │   ├── anthropic.ts          # Sprint A
│   │   ├── openai.ts             # Sprint B
│   │   ├── google.ts             # Sprint B
│   │   ├── ollama.ts             # Sprint B
│   │   └── openai-compatible.ts  # Sprint B (OpenRouter, Groq, vs.)
│   ├── mcp/
│   │   ├── client.ts             # stdio MCP client
│   │   ├── tools.ts              # MCP tools → model tool şeması
│   │   └── executor.ts           # tool call → MCP call → sonuç
│   ├── loop/
│   │   ├── agent.ts              # ReAct ana döngüsü
│   │   ├── approval.ts           # onay mekanizması
│   │   ├── history.ts            # konuşma + tool call geçmişi
│   │   └── streaming.ts          # SSE encoder
│   ├── system/
│   │   ├── prompt.ts             # Playroom domain sistem prompt
│   │   └── skills-loader.ts      # skill manifest → prompt injection
│   └── store/
│       ├── keys.ts               # BYOK vault
│       └── history-store.ts      # .gamekit/agent/<scene>.json
└── test/
```

### CLI Endpoint'leri (yeni)

```
GET    /api/agent/providers        # desteklenen provider preset listesi
POST   /api/agent/keys             # { provider, apiKey, baseUrl?, model }
DELETE /api/agent/keys/:provider
GET    /api/agent/models/:provider # canlı model listesi
POST   /api/agent/chat             # SSE stream
POST   /api/agent/approve          # { requestId, decision }
POST   /api/agent/abort
GET    /api/agent/history/:sceneId
```

**SSE event tipleri:** `token` · `tool_start` · `tool_result` · `approval_request` · `done` · `error`

### Editör UI

**Bottom drawer** mevcut tab'ları korur, dördüncüsü eklenir:
`"assets" | "timeline" | "console" | "agent"`

**`AgentPanel.tsx`** (iki sütun):
- Sol %60 — sohbet (mesajlar + input + slash komutlar)
- Sağ %40 — tool call trace (hangi MCP tool'u ne parametreyle çağırdı, süresi)

**`AgentSettings` modal** (Topbar `Sparkles` ikonu):
- Provider listesi (connected / ekle), default model seçimi
- Approval mode toggle: `destructive-only` | `always` | `off`
- API key alanları (maskelenmiş), base URL, model dropdown

**Onay modal'ı** — destructive tool geldiğinde editör ortasında:
- Tool adı + argümanları
- `Deny` / `Allow` butonları

**Slash komutlar** (ConsolePanel kalıbı):
`/spawn` · `/apply <skill>` · `/screenshot` · `/validate` · `/gravity <y>` · `/clear` · `/help`

### BYOK Güvenlik Modeli

| Katman | Web (CLI) | Tauri (Desktop) |
| --- | --- | --- |
| Depolama | `localStorage` (proje kökü bazlı) | OS Keychain |
| Bellek | CLI process env (request lifetime) | Aynı |
| Loglama | Key asla loglanmaz (`***REDACTED***`); audit log sadece provider + model | Aynı |
| Ağ | Editör → CLI → Provider (CORS için CLI proxy) | Doğrudan Rust tarafı |

API anahtarları editörden üçüncü tarafa gönderilmez (opt-in telemetry dışı).

### Tool-Use Döngüsü

1. Editör SSE açar → CLI agent loop'u başlatır
2. Loop, MCP `tools/list` çağrısı yapar → 34 tool'un şemasını alır
3. Şemaları model-native formata çevirir (Anthropic `tools[]`, OpenAI `tools[]`, vs.)
4. Sistem prompt'una ekler: schema versiyonu + skill özetleri + aktif sahne envanteri + onay modu kuralları
5. Model tool call üretir → executor MCP `tools/call` yapar
6. Sonuç modele geri beslenir → ya cevap ya da yeni tool call
7. Her adım SSE ile editöre `tool_start` / `tool_result` olarak yayınlanır
8. Destructive tool → `approval_request` → editör onaylar → devam

### Tasks (Sprint bazlı)

#### Sprint A — Çekirdek (öncelikli) ✅ v0.1.0
- [x] `packages/agent` paket iskeleti + tsconfig + workspace kaydı
- [x] `providers/anthropic.ts` (streaming tool-use)
- [x] `providers/lmstudio.ts` (ek: LM Studio local inference)
- [x] `providers/openrouter.ts` (ek: OpenRouter çoklu model)
- [x] `mcp/client.ts` stdio client + `mcp/tools.ts` şema çevirici
- [x] `loop/agent.ts` ReAct döngüsü, abort handling
- [x] `system/prompt.ts` Playroom domain prompt + skills-loader
- [x] CLI: `spawn @gamekit/mcp` + `/api/agent/{chat,providers,keys,abort}` + SSE
- [x] Editör: `AgentPanel.tsx` + `AgentSettings.tsx` + bottom drawer entegrasyonu (built ama MVP'de gizli, `// hidden for MVP`)
- [~] Topbar `Sparkles` ikonu + tab activation (UI built, active değil)
- [~] Onay modal'ı (`destructive-only` approval flow kodda var, editör entegrasyonu eksik)
- [x] Slash komutları: `/spawn`, `/gravity`, `/speed`, `/clear`, `/help` (ConsolePanel'de)
- [x] `localStorage` BYOK vault (proje bazlı)
- [x] `gamekit/agent/<scene>.json` history store + editörde listeleme
- [ ] Testler: provider adapter mock + MCP client + ReAct loop integration (yazılmamış)

#### Sprint B — Çoklu sağlayıcı + Tauri
- [ ] OpenAI + Google provider adapter
- [ ] Ollama + OpenAI-compatible adapter
- [ ] `/api/agent/models/:provider` canlı listeleme
- [ ] Tauri `tauri-plugin-stronghold` entegrasyonu
- [ ] Tool call trace UI (sağ kolon polish)
- [ ] Approval mode toggle UI (`destructive-only` / `always` / `off`)

#### Sprint C — Vizyon + plan-then-execute
- [ ] `/screenshot` komutu → canvas PNG → vision model
- [ ] Plan-then-execute: agent önce adım listesi sunar, kullanıcı onaylar, sonra toplu çalışır
- [ ] Undo snapshot: her agent oturumu başında otomatik undo noktası
- [ ] Diff önizleme: 5+ tool call'luk değişiklikten önce modal
- [ ] Konuşma geçmişi sayfalama + arama

#### Sprint D — Orkestrasyon
- [ ] Çoklu adım sub-agent: model gerektiğinde `apply_skill` tool'unu çağırır
- [ ] Project-wide task: "tüm sahnelere coin entity'si ekle" gibi toplu işlemler
- [ ] Anomaly detector: validation hataları artarsa otomatik geri sar

### Yeni MCP Araçları (Sprint A'da gerekli olanlar)
- `snapshot_undo_point` — manuel undo noktası (agent deneysel değişiklikler için)
- `restore_snapshot` — snapshot'a geri dön
- `diff_scene_versions` — iki sahne arasındaki farklar
- `find_unused_assets` — referans edilmeyen asset'leri bul
- `suggest_components` — verilen entity için tipik bileşen kombinasyonu öner
- `explain_scene` — sahneyi özetle (entity sayısı, eksik asset, performans notu)

### Yeni Skill Şablonları
- `tutorial-walkthrough.json` — sıfırdan agent ile ilk oyun (Sprint C)
- `agent-playground.json` — agent'ın test edileceği minimal sahne
- `diff-review.json` — agent değişikliklerini görsel olarak karşılaştırma şablonu

### Testler
- [ ] Provider adapter'ları mock'la (token streaming, tool call, hata)
- [ ] MCP stdio client: 34 tool'un listelenmesi, çağrılması
- [ ] ReAct loop: 5+ tool call'da token bütçesi aşımı kontrolü
- [ ] Approval flow: destructive tool geldiğinde SSE event'i + editör kararı
- [ ] BYOK vault: localStorage'a yazma/okuma, key maskeleme, redacted log
- [ ] Editör: `AgentPanel` mount + mesaj gönder + tool trace render
- [ ] E2E: editör → chat → tool call → sahne değişikliği → canvas'ta görünür

---

## Sprint Önerisi (güncellenmiş)

| Sprint | Focus | Output |
| --- | --- | --- |
| **0** | **AI Game Agent — Sprint A** | **Agent paketi + Anthropic/LMStudio/OpenRouter + ReAct loop + CLI API + editör UI (gizli)** ✅ v0.1.0 |
| **1** | **Fizik & Çarpışma Temeli** | **`RigidBody` + `CircleCollider` + `PolygonCollider` + layer/mask + velocity-verlet + MCP physics test** ✅ v0.1.1 |
| **2a** | **Raycast + query_overlaps** | **Raycast sistemi (AABB/Circle/Polygon) + MCP `raycast`/`query_overlaps` tools** ✅ v0.1.2 |
| **2b** | **Tilemap + paint tool** | **Tilemap bileşeni + `add_tilemap`/`paint_tile` MCP tools + editor/runtime rendering** ✅ v0.1.3 |
| 3 | Play-in-editor (gerçek runtime host) + Gizmos | Editörde Skia/Phaser runtime host + gizmo render |
| 4 | Audio + Text + Save/Load | Asset tipi genişleme, persistent state |
| 5 | State machine + Script + AI | Davranış sistemi |
| 6 | Agent Sprint B (çoklu sağlayıcı + Tauri) | OpenAI/Google/Ollama + keychain |
| 7 | Agent Sprint C (vizyon + plan-execute) | `/screenshot` + diff preview |
| 8 | Çapraz platform test + perf budget | Skia/Phaser parity, 1000 entity budget |
| 9 | İçerik & dokümantasyon | Sample skill'ler + docs sitesi |
