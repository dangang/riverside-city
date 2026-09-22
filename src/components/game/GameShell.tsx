"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { History, Goal, MessageCircle, Users, LogOut } from "lucide-react";
import { IsoMap } from "@/components/city/IsoMap";
import { TopHud } from "@/components/hud/TopHud";
import { BuildTray } from "@/components/hud/BuildTray";
import { SidePanel } from "@/components/panels/SidePanel";
import {
  EventBanner,
  MilestoneModal,
  NameCityModal,
  OfflineModal,
  Toast,
} from "@/components/panels/Modals";
import { RIVERSIDE_PLOTS } from "@/lib/game/defs";
import { useGameStore } from "@/lib/game/store";
import type { BuildingType, CityState, GameCommand } from "@/lib/game/types";
import { runGameCommand } from "@/app/actions/game";
import Link from "next/link";

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

  const [pendingType, setPendingType] = useState<BuildingType | null>(
    "starter_house"
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null
  );
  const [, startTransition] = useTransition();
  const syncCounter = useRef(0);

  useEffect(() => {
    if (initialCloudState) {
      setCity(initialCloudState, "cloud");
    } else {
      hydrate();
    }
  }, [hydrate, initialCloudState, setCity]);

  useEffect(() => {
    if (!city) return;
    const id = window.setInterval(() => {
      dispatch({ type: "tick", now: Date.now() });
      if (mode === "cloud") {
        syncCounter.current += 1;
        if (syncCounter.current % 60 === 0) {
          void runGameCommand({ type: "tick", now: Date.now() }).then((res) => {
            if (res.ok) setCity(res.state, "cloud");
          });
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [city?.id, dispatch, mode, setCity]);

  const run = (cmd: GameCommand) => {
    if (mode === "cloud") {
      startTransition(async () => {
        const res = await runGameCommand(cmd);
        if (res.ok) setCity(res.state, "cloud");
        else {
          dispatch(cmd);
        }
      });
    } else {
      dispatch(cmd);
    }
  };

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
    <div className="game-root">
      <TopHud city={city} />

      <div className="game-toolbar">
        <button type="button" className="tool-btn" onClick={() => setPanel("goals")}>
          <Goal size={16} /> Goals
        </button>
        <button type="button" className="tool-btn" onClick={() => setPanel("feed")}>
          <MessageCircle size={16} /> Feed
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => setPanel("citizens")}
        >
          <Users size={16} /> People
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={() => setPanel("history")}
        >
          <History size={16} /> History
        </button>
        <div className="zoom-controls">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
          >
            +
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
          >
            −
          </button>
        </div>
        {cloudUser ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="tool-btn">
              <LogOut size={16} /> {cloudUser.email}
            </button>
          </form>
        ) : (
          <Link href="/login" className="tool-btn">
            Sign in to save
          </Link>
        )}
        {mode === "guest" && (
          <span className="guest-badge">Guest · local save</span>
        )}
      </div>

      {activeEvent && (
        <EventBanner
          event={activeEvent}
          onChoose={(choiceId) =>
            run({ type: "resolve_event", eventId: activeEvent.id, choiceId })
          }
        />
      )}

      <main
        className="city-viewport"
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
          }}
        >
          <IsoMap
            buildings={city.buildings}
            citizens={city.citizens}
            selectedBuildingId={selectedBuildingId}
            selectedCitizenId={selectedCitizenId}
            buildMode={buildMode}
            plots={RIVERSIDE_PLOTS}
            onSelectBuilding={(id) => {
              selectBuilding(id);
              setPanel("none");
            }}
            onSelectCitizen={(id) => {
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
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
