import { useState, useCallback } from "react";
import type {
  GameServicesDef,
  GameServiceAchievement,
  GameServiceLeaderboard,
} from "@gamekit/schema";
import {
  Trophy,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Apple,
  Flame,
  Award,
  ListOrdered,
} from "lucide-react";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  Button,
  IconButton,
  Input,
  NumberField,
  Select,
  Badge,
  CheckboxField,
  Switch,
  SegmentedControl,
  cn,
} from "@/ui";

export interface GameServicesPanelProps {
  gameServices?: GameServicesDef;
  onUpdateGameServices: (def: GameServicesDef) => Promise<void>;
}

export function GameServicesPanel({
  gameServices = { enabled: false, achievements: [], leaderboards: [] },
  onUpdateGameServices,
}: GameServicesPanelProps) {
  const [activeTab, setActiveTab] = useState<"achievements" | "leaderboards">("achievements");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleEnabled = useCallback(() => {
    onUpdateGameServices({
      ...gameServices,
      enabled: !gameServices.enabled,
    });
  }, [gameServices, onUpdateGameServices]);

  const handleAddAchievement = () => {
    const nextNum = (gameServices.achievements?.length ?? 0) + 1;
    const newAch: GameServiceAchievement = {
      id: `achievement_${nextNum}`,
      name: `Achievement ${nextNum}`,
      description: "Unlock by reaching a milestone",
      type: "standard",
      hidden: false,
      providers: {},
    };
    onUpdateGameServices({
      ...gameServices,
      achievements: [...(gameServices.achievements ?? []), newAch],
    });
    setExpandedItems((prev) => new Set(prev).add(newAch.id));
  };

  const handleUpdateAchievement = (index: number, patch: Partial<GameServiceAchievement>) => {
    const list = [...(gameServices.achievements ?? [])];
    list[index] = { ...list[index], ...patch };
    onUpdateGameServices({ ...gameServices, achievements: list });
  };

  const handleDeleteAchievement = (index: number) => {
    const list = [...(gameServices.achievements ?? [])];
    list.splice(index, 1);
    onUpdateGameServices({ ...gameServices, achievements: list });
  };

  const handleAddLeaderboard = () => {
    const nextNum = (gameServices.leaderboards?.length ?? 0) + 1;
    const newLb: GameServiceLeaderboard = {
      id: `leaderboard_${nextNum}`,
      name: `Leaderboard ${nextNum}`,
      order: "descending",
      providers: {},
    };
    onUpdateGameServices({
      ...gameServices,
      leaderboards: [...(gameServices.leaderboards ?? []), newLb],
    });
    setExpandedItems((prev) => new Set(prev).add(newLb.id));
  };

  const handleUpdateLeaderboard = (index: number, patch: Partial<GameServiceLeaderboard>) => {
    const list = [...(gameServices.leaderboards ?? [])];
    list[index] = { ...list[index], ...patch };
    onUpdateGameServices({ ...gameServices, leaderboards: list });
  };

  const handleDeleteLeaderboard = (index: number) => {
    const list = [...(gameServices.leaderboards ?? [])];
    list.splice(index, 1);
    onUpdateGameServices({ ...gameServices, leaderboards: list });
  };

  const handleSeedPresets = () => {
    const starterAchievements: GameServiceAchievement[] = [
      {
        id: "first_play",
        name: "First Steps",
        description: "Launch and play your first run",
        type: "standard",
        hidden: false,
        providers: {
          googlePlay: "CgkI_first_steps",
          gameCenter: "grp.first_steps",
          steam: "ACH_FIRST_STEPS",
        },
      },
      {
        id: "coin_collector",
        name: "Coin Collector",
        description: "Collect 100 gold coins across your runs",
        type: "incremental",
        steps: 100,
        hidden: false,
        providers: {
          googlePlay: "CgkI_coin_collector",
          gameCenter: "grp.coin_collector",
          steam: "ACH_COIN_COLLECTOR",
        },
      },
      {
        id: "master_clear",
        name: "Untouchable",
        description: "Complete a level without taking damage",
        type: "standard",
        hidden: true,
        providers: {
          googlePlay: "CgkI_untouchable",
          gameCenter: "grp.untouchable",
          steam: "ACH_UNTOUCHABLE",
        },
      },
    ];

    const starterLeaderboards: GameServiceLeaderboard[] = [
      {
        id: "high_score",
        name: "High Scores",
        order: "descending",
        providers: {
          googlePlay: "CgkI_high_scores",
          gameCenter: "grp.high_scores",
          steam: "LEADERBOARD_HIGH_SCORES",
        },
      },
      {
        id: "speedrun",
        name: "Fastest Clear Time",
        order: "ascending",
        providers: {
          googlePlay: "CgkI_fastest_clear",
          gameCenter: "grp.fastest_clear",
          steam: "LEADERBOARD_FASTEST_CLEAR",
        },
      },
    ];

    onUpdateGameServices({
      enabled: true,
      achievements: starterAchievements,
      leaderboards: starterLeaderboards,
    });
  };

  const achievements = gameServices.achievements ?? [];
  const leaderboards = gameServices.leaderboards ?? [];

  return (
    <Panel className="flex flex-col h-full bg-bg-surface overflow-hidden">
      <PanelHeader className="border-b border-border-default px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <PanelTitle className="text-sm font-semibold text-text-primary">Game Services</PanelTitle>
        </div>

        <Switch
          variant="success"
          size="sm"
          checked={gameServices.enabled}
          onCheckedChange={handleToggleEnabled}
          aria-label={gameServices.enabled ? "Disable Game Services" : "Enable Game Services"}
          title={gameServices.enabled ? "Disable Game Services" : "Enable Game Services"}
        />
      </PanelHeader>

      <PanelBody className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Status banner */}
        <div
          className={cn(
            "rounded-md border p-2.5 flex items-start gap-2.5 text-xs transition-colors",
            gameServices.enabled
              ? "border-accent-green/30 bg-accent-green/10 text-text-secondary"
              : "border-border-default bg-bg-base/60 text-text-muted"
          )}
        >
          <Award
            size={16}
            className={
              gameServices.enabled
                ? "text-accent-green shrink-0 mt-0.5"
                : "text-text-muted shrink-0 mt-0.5"
            }
          />
          <div>
            <p className="font-medium text-text-primary">
              {gameServices.enabled ? "Services Active" : "Services Disabled"}
            </p>
            <p className="mt-0.5 leading-relaxed">
              Mapped to Google Play Games (v2), Apple Game Center, and Steam. Handlers in scenes
              dispatch unlocks and scores automatically.
            </p>
          </div>
        </div>

        {/* Project App IDs */}
        <div className="rounded-md border border-border-default bg-bg-base/80 p-2.5 space-y-2">
          <span className="text-[11px] font-semibold text-text-secondary block">
            Google Play Console App ID
          </span>
          <div className="flex items-center gap-2">
            <span title="Google Play Games">
              <Gamepad2 size={14} className="text-green-400 shrink-0" />
            </span>
            <Input
              value={gameServices.googlePlayAppId ?? ""}
              onChange={(e) =>
                onUpdateGameServices({
                  ...gameServices,
                  googlePlayAppId: e.target.value,
                })
              }
              placeholder="e.g. 123456789012 (found in Play Console)"
              className="text-xs font-mono"
            />
          </div>
          <p className="text-[10px] text-text-muted">
            Required for Android builds. Injected into AndroidManifest and strings.xml automatically
            on export.
          </p>
        </div>

        {/* Tab switchers */}
        <SegmentedControl
          fullWidth
          size="md"
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "achievements" | "leaderboards")}
          options={[
            {
              value: "achievements",
              label: "Achievements",
              icon: <Award size={13} />,
              badge: achievements.length,
            },
            {
              value: "leaderboards",
              label: "Leaderboards",
              icon: <ListOrdered size={13} />,
              badge: leaderboards.length,
            },
          ]}
        />

        {/* Tab Content: Achievements */}
        {activeTab === "achievements" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">Project Achievements</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddAchievement}
                className="gap-1 text-xs"
              >
                <Plus size={12} /> Add Achievement
              </Button>
            </div>

            {achievements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-default p-4 text-center space-y-2 bg-bg-base/40">
                <Trophy size={24} className="mx-auto text-text-muted opacity-60" />
                <p className="text-xs text-text-muted">No achievements configured yet.</p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSeedPresets}
                  className="gap-1 mx-auto text-xs"
                >
                  <Sparkles size={12} /> Seed Starter Achievements
                </Button>
              </div>
            ) : (
              achievements.map((ach, idx) => {
                const isExpanded = expandedItems.has(ach.id);
                return (
                  <div
                    key={ach.id || idx}
                    className="rounded-md border border-border-default bg-bg-base/80 overflow-hidden transition-all"
                  >
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-bg-elevated/40"
                      onClick={() => toggleExpanded(ach.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-text-muted shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-text-muted shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-text-primary truncate">
                              {ach.name || "Untitled"}
                            </span>
                            <Badge
                              variant={ach.type === "incremental" ? "default" : "muted"}
                              className="text-[10px] py-0 px-1"
                            >
                              {ach.type}
                            </Badge>
                            {ach.hidden && (
                              <Badge variant="purple" className="text-[9px] py-0 px-1">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-text-muted truncate mt-0.5">{ach.id}</p>
                        </div>
                      </div>

                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAchievement(idx);
                        }}
                        title="Delete achievement"
                        className="text-text-muted hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border-default/60 p-3 space-y-3 bg-bg-base/30">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-text-secondary block mb-1">
                              ID (Slug)
                            </label>
                            <Input
                              value={ach.id}
                              onChange={(e) => handleUpdateAchievement(idx, { id: e.target.value })}
                              placeholder="first_coin"
                              className="text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-secondary block mb-1">
                              Display Title
                            </label>
                            <Input
                              value={ach.name}
                              onChange={(e) =>
                                handleUpdateAchievement(idx, { name: e.target.value })
                              }
                              placeholder="First Coin"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-text-secondary block mb-1">
                            Description
                          </label>
                          <Input
                            value={ach.description ?? ""}
                            onChange={(e) =>
                              handleUpdateAchievement(idx, { description: e.target.value })
                            }
                            placeholder="Collect your very first coin in the level"
                            className="text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-text-secondary block mb-1">
                              Type
                            </label>
                            <Select
                              value={ach.type}
                              onChange={(e) => {
                                const val = e.target.value as "standard" | "incremental";
                                handleUpdateAchievement(idx, {
                                  type: val,
                                  steps: val === "incremental" ? (ach.steps ?? 10) : undefined,
                                });
                              }}
                              className="text-xs"
                            >
                              <option value="standard">Standard</option>
                              <option value="incremental">Incremental</option>
                            </Select>
                          </div>

                          {ach.type === "incremental" && (
                            <div>
                              <NumberField
                                label="Target Steps"
                                value={ach.steps ?? 10}
                                min={1}
                                onChange={(val) =>
                                  handleUpdateAchievement(idx, {
                                    steps: Math.max(1, Math.round(val)),
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>

                        <CheckboxField
                          label="Hidden / Secret (Concealed until unlocked)"
                          checked={ach.hidden ?? false}
                          onChange={(checked) => handleUpdateAchievement(idx, { hidden: checked })}
                        />

                        {/* Store Provider ID Mappings */}
                        <div className="rounded border border-border-default/80 bg-bg-surface p-2.5 space-y-2 mt-2">
                          <span className="text-[11px] font-semibold text-text-secondary block">
                            Store Provider Identifiers
                          </span>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span title="Google Play Games">
                                <Gamepad2 size={13} className="text-green-400 shrink-0" />
                              </span>
                              <Input
                                value={ach.providers?.googlePlay ?? ""}
                                onChange={(e) =>
                                  handleUpdateAchievement(idx, {
                                    providers: { ...ach.providers, googlePlay: e.target.value },
                                  })
                                }
                                placeholder="Google Play ID (CgkI...)"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span title="Apple Game Center">
                                <Apple size={13} className="text-neutral-300 shrink-0" />
                              </span>
                              <Input
                                value={ach.providers?.gameCenter ?? ""}
                                onChange={(e) =>
                                  handleUpdateAchievement(idx, {
                                    providers: { ...ach.providers, gameCenter: e.target.value },
                                  })
                                }
                                placeholder="Game Center ID (grp.achievement)"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span title="Steam">
                                <Flame size={13} className="text-cyan-400 shrink-0" />
                              </span>
                              <Input
                                value={ach.providers?.steam ?? ""}
                                onChange={(e) =>
                                  handleUpdateAchievement(idx, {
                                    providers: { ...ach.providers, steam: e.target.value },
                                  })
                                }
                                placeholder="Steam API Name (ACH_...)"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab Content: Leaderboards */}
        {activeTab === "leaderboards" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">Project Leaderboards</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddLeaderboard}
                className="gap-1 text-xs"
              >
                <Plus size={12} /> Add Leaderboard
              </Button>
            </div>

            {leaderboards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-default p-4 text-center space-y-2 bg-bg-base/40">
                <ListOrdered size={24} className="mx-auto text-text-muted opacity-60" />
                <p className="text-xs text-text-muted">No leaderboards configured yet.</p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSeedPresets}
                  className="gap-1 mx-auto text-xs"
                >
                  <Sparkles size={12} /> Seed Starter Presets
                </Button>
              </div>
            ) : (
              leaderboards.map((lb, idx) => {
                const isExpanded = expandedItems.has(lb.id);
                return (
                  <div
                    key={lb.id || idx}
                    className="rounded-md border border-border-default bg-bg-base/80 overflow-hidden transition-all"
                  >
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-bg-elevated/40"
                      onClick={() => toggleExpanded(lb.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-text-muted shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-text-muted shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-text-primary truncate">
                              {lb.name || "Untitled"}
                            </span>
                            <Badge variant="muted" className="text-[10px] py-0 px-1">
                              {lb.order === "ascending" ? "Best Time (ASC)" : "High Score (DESC)"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-text-muted truncate mt-0.5">{lb.id}</p>
                        </div>
                      </div>

                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLeaderboard(idx);
                        }}
                        title="Delete leaderboard"
                        className="text-text-muted hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border-default/60 p-3 space-y-3 bg-bg-base/30">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-text-secondary block mb-1">
                              ID (Slug)
                            </label>
                            <Input
                              value={lb.id}
                              onChange={(e) => handleUpdateLeaderboard(idx, { id: e.target.value })}
                              placeholder="high_scores"
                              className="text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-secondary block mb-1">
                              Title
                            </label>
                            <Input
                              value={lb.name}
                              onChange={(e) =>
                                handleUpdateLeaderboard(idx, { name: e.target.value })
                              }
                              placeholder="High Scores"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-text-secondary block mb-1">
                            Ranking Order
                          </label>
                          <Select
                            value={lb.order}
                            onChange={(e) =>
                              handleUpdateLeaderboard(idx, {
                                order: e.target.value as "ascending" | "descending",
                              })
                            }
                            className="text-xs"
                          >
                            <option value="descending">Highest Score First (Descending)</option>
                            <option value="ascending">Lowest Value / Time First (Ascending)</option>
                          </Select>
                        </div>

                        {/* Store Provider ID Mappings */}
                        <div className="rounded border border-border-default/80 bg-bg-surface p-2.5 space-y-2 mt-2">
                          <span className="text-[11px] font-semibold text-text-secondary block">
                            Store Provider Identifiers
                          </span>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span title="Google Play Games">
                                <Gamepad2 size={13} className="text-green-400 shrink-0" />
                              </span>
                              <Input
                                value={lb.providers?.googlePlay ?? ""}
                                onChange={(e) =>
                                  handleUpdateLeaderboard(idx, {
                                    providers: { ...lb.providers, googlePlay: e.target.value },
                                  })
                                }
                                placeholder="Google Play ID (CgkI...)"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span title="Apple Game Center">
                                <Apple size={13} className="text-neutral-300 shrink-0" />
                              </span>
                              <Input
                                value={lb.providers?.gameCenter ?? ""}
                                onChange={(e) =>
                                  handleUpdateLeaderboard(idx, {
                                    providers: { ...lb.providers, gameCenter: e.target.value },
                                  })
                                }
                                placeholder="Game Center ID (grp.leaderboard)"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span title="Steam">
                                <Flame size={13} className="text-cyan-400 shrink-0" />
                              </span>
                              <Input
                                value={lb.providers?.steam ?? ""}
                                onChange={(e) =>
                                  handleUpdateLeaderboard(idx, {
                                    providers: { ...lb.providers, steam: e.target.value },
                                  })
                                }
                                placeholder="Steam Leaderboard Name"
                                className="text-[11px] font-mono h-7"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
