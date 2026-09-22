"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  History,
  Goal,
  MessageCircle,
  Users,
  LogOut,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Focus,
} from "lucide-react";
import { IsoMap, isoToScreen } from "@/components/city/IsoMap";
import { TopHud } from "@/components/hud/TopHud";
import { BuildTray } from "@/components/hud/BuildTray";
import {
  ArrivalToast,
  FxLayer,
  SaveIndicator,
} from "@/components/hud/FxLayer";
import { SidePanel } from "@/components/panels/SidePanel";
import {
  EventBanner,
  MilestoneModal,
  NameCityModal,
  OfflineModal,
  OutcomeToast,
  Toast,
} from "@/components/panels/Modals";
import { RIVERSIDE_PLOTS } from "@/lib/game/defs";
import { BUILDING_DEFS } from "@/lib/game/defs";
import { useGameStore } from "@/lib/game/store";
import { useFxStore, resolveDayPhase } from "@/lib/game/fxStore";
import type { BuildingType, CityState, GameCommand } from "@/lib/game/types";
import { runGameCommand } from "@/app/actions/game";
import { sfx, setAudioMuted, setAudioVolume } from "@/lib/audio/sfx";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function GameShell({
  cloudUser,
  initialCloudState,
}: {
  cloudUser?: { email: string } | null;
  initialCloudState?: CityState | null;
}) {
  const {
    city,
    hydrated,
    hydrate,
    dispatch,
    mode,
    setCity,
    selectedBuildingId,
    selectedCitizenId,
    selectBuilding,
    selectCitizen,
    buildMode,
    setBuildMode,
    panel,
    setPanel,
    toast,
    clearToast,
  } = useGameStore();

  const fx = useFxStore();
  const [pendingType, setPendingType] = useState<BuildingType | null>(
    "starter_house"
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [outcome, setOutcome] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null
  );
  const prevLevels = useRef<Record<string, number>>({});
  const [, startTransition] = useTransition();
  const syncCounter = useRef(0);
  const phase = resolveDayPhase(fx.dayMode);
  const night = phase === "night" || phase === "evening";

  useEffect(() => {
    if (initialCloudState) {
      setCity(initialCloudState, "cloud");
    } else {
      hydrate();
    }
  }, [hydrate, initialCloudState, setCity]);

  useEffect(() => {
    setAudioMuted(fx.muted);
    setAudioVolume(fx.volume);
  }, [fx.muted, fx.volume]);

  useEffect(() => {
    if (!city) return;
    const id = window.setInterval(() => {
      const before = useGameStore.getState().city;
      dispatch({ type: "tick", now: Date.now() });
      const after = useGameStore.getState().city;
      if (before && after) {
        for (const b of after.buildings) {
          const prev = prevLevels.current[b.id] ?? b.level;
          if (b.level > prev) {
            const def = BUILDING_DEFS[b.type];
            const pos = isoToScreen(b.plotX, b.plotY);
            if (b.level >= def.maxLevel) {
              sfx.max();
              fx.setCelebratingMax(b.id);
              fx.pushParticles({ x: 50 + pos.left, y: 40 + pos.top, kind: "max" });
              fx.pushFloat({
                text: "MAX!",
                x: 50 + pos.left,
                y: 20 + pos.top,
                kind: "max",
              });
              window.setTimeout(() => fx.setCelebratingMax(null), 1800);
            } else {
              sfx.upgradeDone();
              fx.pushFloat({
                text: `+ Level ${b.level}`,
                x: 50 + pos.left,
                y: 24 + pos.top,
                kind: "level",
              });
              fx.pushParticles({
                x: 50 + pos.left,
                y: 40 + pos.top,
                kind: "spark",
              });
            }
          }
          prevLevels.current[b.id] = b.level;
        }
        if (
          after.lastIncomePulseAt !== before.lastIncomePulseAt &&
          after.buildings[0]
        ) {
          const b = after.buildings[0];
          const pos = isoToScreen(b.plotX, b.plotY);
          fx.pushFloat({
            text: `+${formatMoney(Math.round((after.money - before.money) * 4))}`,
            x: 40 + pos.left,
            y: 10 + pos.top,
            kind: "money",
          });
        }
      }
      if (mode === "cloud") {
        syncCounter.current += 1;
        if (syncCounter.current % 60 === 0) {
          fx.setSaveStatus("saving");
          void runGameCommand({ type: "tick", now: Date.now() }).then((res) => {
            if (res.ok) {
              setCity(res.state, "cloud");
              fx.setSaveStatus("saved");
              window.setTimeout(() => fx.setSaveStatus("idle"), 1200);
            } else fx.setSaveStatus("error");
          });
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [city?.id, dispatch, mode, setCity, fx]);

  const run = (cmd: GameCommand) => {
    if (mode === "cloud") {
      fx.setSaveStatus("saving");
      startTransition(async () => {
        const res = await runGameCommand(cmd);
        if (res.ok) {
          setCity(res.state, "cloud");
          applyFx(res.fx, res.state);
          if (res.state.lastEventOutcome && cmd.type === "resolve_event") {
            setOutcome(res.state.lastEventOutcome);
          }
          fx.setSaveStatus("saved");
          window.setTimeout(() => fx.setSaveStatus("idle"), 1200);
        } else {
          fx.setSaveStatus("error");
        }
      });
    } else {
      const beforePop = city?.citizens.length ?? 0;
      const result = dispatch(cmd);
      if (!result?.ok || !result.state) return;
      applyFx(result.fx, result.state);
      if (result.state.lastEventOutcome && cmd.type === "resolve_event") {
        setOutcome(result.state.lastEventOutcome);
      }
      if (result.state.citizens.length > beforePop) sfx.arrive();
      fx.setSaveStatus("saved");
      window.setTimeout(() => fx.setSaveStatus("idle"), 800);
    }
  };

  const applyFx = (
    resultFx: import("@/lib/game/types").CommandResult["fx"],
    state: CityState
  ) => {
    if (!resultFx) return;
    if (resultFx.kind === "build") {
      sfx.build();
      if (resultFx.buildingId) {
        fx.setConstructing(resultFx.buildingId);
        window.setTimeout(() => fx.setConstructing(null), 900);
      }
      if (resultFx.plotX != null && resultFx.plotY != null) {
        const pos = isoToScreen(resultFx.plotX, resultFx.plotY);
        fx.pushParticles({ x: 48 + pos.left, y: 36 + pos.top, kind: "dust" });
        const b = state.buildings.find((x) => x.id === resultFx.buildingId);
        if (b) {
          fx.pushFloat({
            text: BUILDING_DEFS[b.type].name,
            x: 40 + pos.left,
            y: pos.top,
            kind: "info",
          });
        }
      }
      if (resultFx.amount != null) {
        fx.pushFloat({
          text: formatMoney(resultFx.amount),
          x: typeof window !== "undefined" ? window.innerWidth / 2 - 40 : 200,
          y: 90,
          kind: "money",
        });
      }
    }
    if (resultFx.kind === "upgrade") sfx.upgradeStart();
    if (resultFx.kind === "max") sfx.max();
    if (resultFx.kind === "money" || resultFx.kind === "reward") sfx.reward();
    if (resultFx.kind === "arrive") sfx.arrive();
    if (resultFx.kind === "alert") sfx.alert();
  };

  // Focus selected building
  useEffect(() => {
    if (!selectedBuildingId || !city) return;
    const b = city.buildings.find((x) => x.id === selectedBuildingId);
    if (!b) return;
    const pos = isoToScreen(b.plotX, b.plotY);
    setPan({ x: -pos.left * zoom * 0.15, y: -pos.top * zoom * 0.15 });
  }, [selectedBuildingId]);

  if (!hydrated && !city) {
    return <div className="boot-screen">Opening city…</div>;
  }
  if (!city) {
    return <div className="boot-screen">Opening city…</div>;
  }

  const building =
    city.buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const citizen =
    city.citizens.find((c) => c.id === selectedCitizenId) ?? null;
  const activeEvent = city.events.find((e) => e.status === "active");
  const showSide = panel !== "none" || building || citizen;

  return (
    <div className={cn("game-root", `phase-${phase}`)}>
      <TopHud city={city} />
      <SaveIndicator />

      <div className="game-toolbar">
        <button
          type="button"
          className="tool-btn"
          onClick={() => {
            sfx.click();
            setPanel("goals");
          }}
        >
          <Goal size={16} /> Goals
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => {
            sfx.click();
            setPanel("feed");
          }}
        >
          <MessageCircle size={16} /> Pulse
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => {
            sfx.click();
            setPanel("citizens");
          }}
        >
          <Users size={16} /> People
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => {
            sfx.click();
            setPanel("history");
          }}
        >
          <History size={16} /> History
        </button>
        <div className="zoom-controls">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setZoom((z) => Math.min(1.7, z + 0.1))}
          >
            +
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setZoom((z) => Math.max(0.55, z - 0.1))}
          >
            −
          </button>
          <button
            type="button"
            className="tool-btn"
            title="Reset view"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Focus size={14} />
          </button>
        </div>
        <button
          type="button"
          className="tool-btn"
          title="Mute"
          onClick={() => fx.setMuted(!fx.muted)}
        >
          {fx.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          type="button"
          className="tool-btn"
          title="Day / Night"
          onClick={() => {
            const order: Array<"auto" | "day" | "night"> = [
              "auto",
              "day",
              "night",
            ];
            const i = order.indexOf(fx.dayMode);
            fx.setDayMode(order[(i + 1) % order.length]!);
          }}
        >
          {fx.dayMode === "night" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {cloudUser ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="tool-btn">
              <LogOut size={16} /> {cloudUser.email}
            </button>
          </form>
        ) : (
          <Link href="/signup" className="tool-btn">
            Sign up to save
          </Link>
        )}
        {mode === "guest" && (
          <span className="guest-badge">Guest · local save</span>
        )}
      </div>

      {activeEvent && (
        <EventBanner
          event={activeEvent}
          onChoose={(choiceId) => {
            sfx.alert();
            run({ type: "resolve_event", eventId: activeEvent.id, choiceId });
          }}
        />
      )}

      <main
        className="city-viewport"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.08 : 0.08;
          setZoom((z) => Math.min(1.7, Math.max(0.55, z + delta)));
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            px: pan.x,
            py: pan.y,
          };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({
            x: drag.current.px + (e.clientX - drag.current.x),
            y: drag.current.py + (e.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <div
          className="city-pan-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: drag.current ? "none" : "transform 0.25s ease",
          }}
        >
          <IsoMap
            buildings={city.buildings}
            citizens={city.citizens}
            selectedBuildingId={selectedBuildingId}
            selectedCitizenId={selectedCitizenId}
            buildMode={buildMode}
            constructingId={fx.constructingId}
            celebratingMaxId={fx.celebratingMaxId}
            night={night}
            parkPromoActive={!!(city.parkPromoUntil && city.parkPromoUntil > city.tickAt)}
            plots={RIVERSIDE_PLOTS}
            onSelectBuilding={(id) => {
              sfx.click();
              selectBuilding(id);
              setPanel("none");
            }}
            onSelectCitizen={(id) => {
              sfx.click();
              selectCitizen(id);
              setPanel("none");
            }}
            onPlotClick={(x, y) => {
              if (!pendingType) return;
              run({
                type: "build",
                buildingType: pendingType,
                plotX: x,
                plotY: y,
              });
              setBuildMode(false);
            }}
          />
        </div>
        <FxLayer />
      </main>

      <BuildTray
        city={city}
        selectedType={pendingType}
        onSelectType={setPendingType}
        buildMode={buildMode}
        onToggleBuild={() => setBuildMode(!buildMode)}
      />

      {showSide && (
        <SidePanel
          city={city}
          building={panel === "none" ? building : null}
          citizen={panel === "none" ? citizen : null}
          panel={panel}
          onClose={() => {
            setPanel("none");
            selectBuilding(null);
            selectCitizen(null);
          }}
          onDispatch={run}
        />
      )}

      {city.tutorialStep === "name_city" && (
        <NameCityModal onSubmit={(name) => run({ type: "name_city", name })} />
      )}
      {city.pendingOffline && (
        <OfflineModal
          city={city}
          onCollect={() => run({ type: "collect_offline" })}
        />
      )}
      {city.pendingMilestone && (
        <MilestoneModal
          milestone={city.pendingMilestone}
          onContinue={() => run({ type: "dismiss_milestone" })}
        />
      )}
      {city.arrivalNote && Date.now() - city.arrivalNote.at < 3000 && (
        <ArrivalToast
          name={city.arrivalNote.name}
          detail={city.arrivalNote.detail}
          onDone={() => {}}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
      {outcome && (
        <OutcomeToast text={outcome} onDone={() => setOutcome(null)} />
      )}
    </div>
  );
}
