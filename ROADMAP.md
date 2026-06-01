# GameKit → Gerçek Oyun Motoru Yol Haritası

Bu doküman, GameKit'in MVP 0.1 seviyesinden üretime hazır bir 2D oyun motoruna
geçişi için gereken işleri izler. Her bölüm: görev → uygulama noktaları → ilgili
**MCP araçları** (yeni eklenenler dahil) → ilgili **Skill şablonları** (yeni
eklenenler dahil). Şema sözleşmesi motor; runtime + editör + MCP üçlüsü birlikte
evrilir.

> Şu anki durum: 6 bileşen tipi (`Transform`, `Sprite`, `AabbCollider`,
> `PlayerController`, `CameraFollow`, `Animation`), sadece image asset, MCP'ta 34
> tool, editörde play-in-editor yok, MCP ve editörde 0 test.

---

## 0. Hızlı Kazanımlar (ilk 1-2 sprint)

1. `RigidBody` + velocity-based hareket → statik `position` yerine dinamik his
2. `Tilemap` + paint tool → içerik üretimi 10x hızlanır
3. Play-in-editor → geri bildirim döngüsü dakikadan saniyeye düşer
4. MCP için test + editör için en az 1 smoke test → regresyon güvenliği
5. `CircleCollider` + raycast → mouse picking açılır, AI/laser mümkün olur

---

## 1. Fizik & Çarpışma (en kritik eksik)

### Görevler
- [ ] `CircleCollider` ve `PolygonCollider` ekle (şema + editör inspector + runtime)
- [ ] `RigidBody` bileşeni: velocity, angularVelocity, mass, drag, isKinematic, gravityScale
- [ ] Velocity-verlet entegrasyonu (sabit dt = 1/60) ve `fixedTimestep` accumulator (`loop.ts`'te substep yok)
- [ ] Katı layer/mask sistemi: `AabbCollider` zaten `layer`/`mask` taşıyor ama runtime bunu hiç kullanmıyor
- [ ] Trigger alanları (overlap-only) + enter/exit olayları
- [ ] Raycast (mouse picking, AI, laser) — editörde de lazım olacak
- [ ] Sleeping body optimizasyonu
- [ ] Collision callback'leri (`onCollisionEnter`, `onTriggerEnter`)

### MCP Araçları (yeni)
- `add_collider` — sahneye `AabbCollider` / `CircleCollider` / `PolygonCollider` ekler
- `add_rigid_body` — entity'ye `RigidBody` bağlar (`mass`, `isKinematic`, `gravityScale`)
- `set_physics_gravity` — proje/sahne yerçekimini ayarlar
- `set_collision_layer` — entity layer/mask günceller
- `raycast` — verilen noktadan verilen yöne ışın atar, ilk çarpışanı döner
- `query_overlaps` — alan içindeki tüm collider'ları listeler (AI için)
- `set_trigger` — collider'ı overlap-only yapar

### Skill Güncellemeleri
- `platformer.json` → `RigidBody` ile yeniden yaz (manuel hareket yerine)
- Yeni `physics-puzzle.json` (Angry Birds tarzı: kinematic tetikleme + gravity)
- Yeni `topdown-shooter.json` `CircleCollider` + `raycast` ile mermi için

---

## 2. Bileşen Kütüphanesi (şema + runtime + editör + MCP senkron)

### Görevler
- [ ] `Tilemap` + `TiledSet` (`.tsx`/`.json` import) — editörde tile paint tool
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
- `add_tilemap` — `.tsx`/`.json` import eder, sahneye `Tilemap` + `TiledSet` ekler
- `paint_tile` — tilemap üzerinde tile yazar/okur
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

## 3. Input & Cihaz

### Görevler
- [ ] Virtual joystick / d-pad bileşeni (mobile için zorunlu)
- [ ] Input action map (`"jump"`, `"fire"`) → key/touch/gamepad binding
- [ ] Gamepad API desteği (web), GameKit vibration (mobile)
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

## 4. Sahne Yönetimi & Veri Akışı

### Görevler
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

## 5. Editör (Play-in-Editor Olmadan Motor Değil)

### Görevler
- [ ] **Play-in-editor**: editörün içinde Skia/Phaser runtime'ı host et, play/stop/pause tuşları
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

## 6. CLI & Geliştirici Deneyimi

### Görevler
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

## 7. Test, Kalite, Gözlemlenebilirlik

### Görevler
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

## 8. Çapraz Platform Eşitliği

### Görevler
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

## 9. İçerik & Kullanıcı Deneyimi

### Görevler
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

## 10. MCP / AI Entegrasyonu

### Mevcut Durum
- 34 tool, `tools/{assets,entities,gui,gui-components,project,scenes,skills}.ts` altında
- Zod şemaları `schemas/{component,gui,gui-components,project,scene,skill}.ts`
- Prompts + resources mevcut

### Görevler
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

## 11. Yeni Skill Şablonları (önerilen set)

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

## 12. Çapraz Kesim (cross-cutting)

- [ ] `useUndo` hook'unun hangi mutation'ları kaydettiğini test et, eksikleri tamamla
- [ ] `assets.ts` generate her zaman idempotent mi doğrula
- [ ] `parseScene`/`validateScene` her skill için golden test seti
- [ ] Telemetry opt-in: hangi tool/component ne sıklıkla kullanılıyor
- [ ] Localization (Türkçe/İngilizce editör string'leri)
- [ ] Theming: `brief.md`'deki renk token'larını runtime'a da uygula (debug overlay)

---

## Sprint Önerisi

| Sprint | Odak | Çıktı |
| --- | --- | --- |
| 1 | Hızlı kazanımlar + MCP test | `RigidBody` + `CircleCollider` + MCP test başlangıcı |
| 2 | Play-in-editor + Tilemap | Editörde play butonu + tile paint |
| 3 | Audio + Text + Save/Load | Asset tipi genişleme, persistent state |
| 4 | State machine + Script + AI | Davranış sistemi |
| 5 | Çapraz platform test + perf budget | Skia/Phaser parity, 1000 entity budget |
| 6 | İçerik & dokümantasyon | 10 sample skill + docs sitesi |
