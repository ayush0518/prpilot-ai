import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Blocks, ChartNetwork } from "lucide-react";
import type { BlastRadius } from "@/app/types/prAnalysis";
import AnimatedNumber from "./AnimatedNumber";
import AnimatedProgressBar from "./AnimatedProgressBar";
import DashboardCard from "./DashboardCard";
import { cx, getLayerPalette, pluralize } from "./dashboardUtils";

type BlastRadiusGraphProps = {
  blastRadius?: BlastRadius | null;
};

export default function BlastRadiusGraph({
  blastRadius,
}: BlastRadiusGraphProps) {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(
    blastRadius?.affectedLayers[0] ?? null,
  );

  if (!blastRadius) {
    return (
      <DashboardCard
        title="Blast Radius"
        eyebrow="Impact Map"
        description="Architectural surface area touched by the PR."
        icon={ChartNetwork}
      >
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
          The layer graph will populate after analysis and show which parts of
          the stack are affected.
        </div>
      </DashboardCard>
    );
  }

  const chartData = blastRadius.affectedLayers
    .map((layer) => ({
      name: layer,
      value: blastRadius.layerCounts[layer] || 0,
      palette: getLayerPalette(layer),
    }))
    .sort((left, right) => right.value - left.value);

  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const totalFilesImpacted = chartData.reduce((total, item) => total + item.value, 0);
  const activeLayer =
    selectedLayer && blastRadius.affectedLayers.includes(selectedLayer)
      ? selectedLayer
      : blastRadius.affectedLayers[0] ?? null;
  const activeLayerPalette = activeLayer
    ? getLayerPalette(activeLayer)
    : getLayerPalette("Unknown");
  const selectedLayerDetails = activeLayer
    ? blastRadius.layerDetails[activeLayer]
    : undefined;
  const selectedLayerFileCount = activeLayer
    ? blastRadius.layerCounts[activeLayer] ?? 0
    : 0;
  const selectedLayerCriticalCount = selectedLayerDetails?.files.filter(
    (file) => file.isCritical,
  ).length ?? 0;

  const graphWidth = 680;
  const graphHeight = 420;
  const centerX = 340;
  const centerY = 248;
  const total = Math.max(chartData.length, 1);
  const orbitRadius =
    total === 1 ? 138 : total === 2 ? 184 : total === 3 ? 210 : 228;
  const startAngle = total === 1 ? -90 : -140;
  const endAngle = total === 1 ? -90 : -40;
  const graphNodes = chartData.map((item, index) => {
    const angle =
      total === 1
        ? -90
        : startAngle + ((endAngle - startAngle) / Math.max(total - 1, 1)) * index;
    const radians = (angle * Math.PI) / 180;

    return {
      ...item,
      x: centerX + Math.cos(radians) * orbitRadius,
      y: centerY + Math.sin(radians) * orbitRadius,
      size: 28 + (item.value / maxValue) * 18,
    };
  });

  const activeRatio = selectedLayerFileCount / maxValue;
  const intensity = Math.max(
    0.14,
    Math.min(1, blastRadius.impactScore / 100 * 0.68 + activeRatio * 0.32),
  );
  const heatCells = Array.from({ length: 24 }, (_, index) => {
    const progress = (index + 1) / 24;
    const opacity =
      progress <= intensity
        ? 0.22 + progress * 0.46
        : 0.06 + Math.max(0, intensity - progress + 0.22) * 0.12;

    return {
      key: `heat-${index}`,
      opacity,
      delay: index * 0.025,
    };
  });
  const centerPosition = {
    left: `${(centerX / graphWidth) * 100}%`,
    top: `${(centerY / graphHeight) * 100}%`,
  };
  const getHeatColor = (progress: number): string => {
    if (progress > intensity) {
      return "rgba(23, 37, 58, 0.82)";
    }

    const normalizedHeat = progress / Math.max(intensity, 0.01);

    if (normalizedHeat > 0.84) {
      return "#f59e0b";
    }

    if (normalizedHeat > 0.62) {
      return "#2dd4bf";
    }

    if (normalizedHeat > 0.34) {
      return activeLayerPalette.fill;
    }

    return "#164e63";
  };

  return (
    <DashboardCard
      title="Blast Radius"
      eyebrow="Impact Map"
      description="Architectural reach, layer concentration, and impacted files."
      icon={ChartNetwork}
      headerSlot={
        <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
          {blastRadius.affectedLayers.length}{" "}
          {pluralize(blastRadius.affectedLayers.length, "layer")}
        </span>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Layers affected
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {blastRadius.affectedLayers.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pluralize(blastRadius.affectedLayers.length, "layer")} in scope
            </p>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Files impacted
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {totalFilesImpacted}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Files inside the detected blast radius
            </p>
          </div>

          <div className="rounded-[20px] border border-cyan-400/18 bg-cyan-400/[0.06] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/70">
              Impact score
            </p>
            <AnimatedNumber
              value={blastRadius.impactScore}
              className="mt-3 block text-3xl font-semibold text-cyan-100"
            />
            <AnimatedProgressBar
              label="Weighted impact"
              value={blastRadius.impactScore}
              tone={
                blastRadius.impactScore >= 70
                  ? "block"
                  : blastRadius.impactScore >= 35
                    ? "caution"
                    : "primary"
              }
              showValue={false}
              size="sm"
              className="mt-3"
            />
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Active layer
            </p>
            <p className={cx("mt-3 text-2xl font-semibold", activeLayerPalette.textClass)}>
              {activeLayer ?? "Pending"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {selectedLayerFileCount} {pluralize(selectedLayerFileCount, "file")} selected
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] px-4 py-6">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />

              <div className="relative h-[340px] md:h-[380px] xl:h-[420px]">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  <motion.circle
                    cx={centerX}
                    cy={centerY}
                    r="110"
                    fill="none"
                    stroke="rgba(56,189,248,0.16)"
                    strokeDasharray="8 10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />

                  <motion.circle
                    cx={centerX}
                    cy={centerY}
                    r="68"
                    fill="rgba(8,15,31,0.86)"
                    stroke="rgba(56,189,248,0.22)"
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.45 }}
                  />

                  {graphNodes.map((node) => {
                    const isActive = node.name === activeLayer;

                    return (
                      <g key={`link-${node.name}`}>
                        <motion.line
                          x1={centerX}
                          y1={centerY}
                          x2={node.x}
                          y2={node.y}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: isActive ? 0.95 : 0.42 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          stroke={node.palette.fill}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          strokeDasharray={isActive ? "0" : "6 8"}
                        />
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={node.size}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isActive ? 0.18 : 0.08 }}
                          transition={{ duration: 0.35, delay: 0.12 }}
                          fill={node.palette.fill}
                        />
                      </g>
                    );
                  })}
                </svg>

                <div
                  className="pointer-events-none absolute flex h-[136px] w-[136px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950/88 text-center shadow-[0_0_100px_-46px_rgba(34,211,238,0.65)] backdrop-blur"
                  style={centerPosition}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100/70">
                    Scope center
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {blastRadius.affectedLayers.length}
                  </p>
                  <p className="mt-1 max-w-[11ch] text-xs leading-5 text-slate-400">
                    {pluralize(blastRadius.affectedLayers.length, "layer")} in reach
                  </p>
                </div>

                <div className="absolute inset-0">
                  {graphNodes.map((node, index) => {
                    const isActive = node.name === activeLayer;

                    return (
                      <motion.button
                        key={node.name}
                        type="button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.35,
                          delay: index * 0.08,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onClick={() => setSelectedLayer(node.name)}
                        className={cx(
                          "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-4 py-2.5 text-left shadow-[0_18px_45px_-28px_rgba(2,6,23,0.95)] backdrop-blur transition",
                          isActive
                            ? `${node.palette.softClass} shadow-[0_24px_60px_-30px_rgba(34,211,238,0.45)]`
                            : "border-white/10 bg-slate-950/78 hover:border-white/18",
                        )}
                        style={{
                          left: `${(node.x / graphWidth) * 100}%`,
                          top: `${(node.y / graphHeight) * 100}%`,
                        }}
                      >
                        <span
                          className={cx("h-2.5 w-2.5 rounded-full", node.palette.dotClass)}
                        />
                        <span className="max-w-[160px] truncate text-sm font-medium text-slate-100">
                          {node.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Heat field
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Active layer intensity across the impacted surface.
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                  {activeLayer ?? "No layer"}
                </span>
                <span className="text-sm text-slate-400">
                  {selectedLayerFileCount} {pluralize(selectedLayerFileCount, "file")}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {heatCells.map((cell, index) => {
                  const progress = (index + 1) / heatCells.length;
                  const heatColor = getHeatColor(progress);

                  return (
                    <motion.span
                      key={cell.key}
                      className="h-10 rounded-2xl border border-white/5"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: cell.opacity, y: 0 }}
                      transition={{ duration: 0.32, delay: cell.delay }}
                      style={{
                        backgroundColor: heatColor,
                        boxShadow: `0 0 26px -16px ${heatColor}`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                <span>Cool</span>
                <span className="text-cyan-100/70">Active</span>
                <span className="text-amber-200/80">Hot</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Critical touchpoints
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {selectedLayerCriticalCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Files in the selected layer that deserve closer attention.
                </p>
              </div>

              <div className="rounded-[24px] border border-cyan-400/16 bg-cyan-400/[0.06] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/70">
                  Reach summary
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  {blastRadius.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {chartData.map((item, index) => {
            const isActive = item.name === activeLayer;
            const criticalCount =
              blastRadius.layerDetails[item.name]?.files.filter(
                (file) => file.isCritical,
              ).length ?? 0;

            return (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                type="button"
                onClick={() => setSelectedLayer(item.name)}
                className={cx(
                  "w-full rounded-[20px] border px-4 py-3 text-left transition",
                  isActive
                    ? item.palette.softClass
                    : "border-white/10 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={cx("h-2.5 w-2.5 rounded-full", item.palette.dotClass)}
                      />
                      <p className={cx("truncate text-sm font-medium", item.palette.textClass)}>
                        {item.name}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.value} {pluralize(item.value, "file")}
                    </p>
                  </div>

                  {criticalCount > 0 ? (
                    <span className="shrink-0 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[11px] font-medium text-red-100">
                      {criticalCount} critical
                    </span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeLayer && selectedLayerDetails ? (
            <motion.div
              key={activeLayer}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2 text-slate-100">
                    <Blocks className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {activeLayer} layer details
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLayerDetails.count}{" "}
                      {pluralize(selectedLayerDetails.count, "file")}
                    </p>
                  </div>
                </div>

                {selectedLayerCriticalCount > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-100">
                    <AlertTriangle className="size-3.5" />
                    {selectedLayerCriticalCount} critical
                  </span>
                ) : null}
              </div>

              <div className="dashboard-scroll max-h-[280px] space-y-3 overflow-y-auto p-4">
                {selectedLayerDetails.files.map((file) => {
                  const palette = getLayerPalette(activeLayer);
                  const changeTypeClass =
                    file.changeType === "core"
                      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                      : file.changeType === "config"
                        ? "border-slate-400/20 bg-slate-400/10 text-slate-100"
                        : palette.chipClass;

                  return (
                    <div
                      key={`${activeLayer}-${file.path}-${file.reason}`}
                      className="rounded-[20px] border border-white/10 bg-slate-950/35 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {file.isCritical ? (
                              <AlertTriangle className="size-4 shrink-0 text-red-200" />
                            ) : (
                              <span
                                className={cx(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  palette.dotClass,
                                )}
                              />
                            )}
                            <p className="break-all font-mono text-xs text-slate-200">
                              {file.path}
                            </p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {file.reason}
                          </p>
                        </div>

                        <span
                          className={cx(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                            changeTypeClass,
                          )}
                        >
                          {file.changeType}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </DashboardCard>
  );
}
