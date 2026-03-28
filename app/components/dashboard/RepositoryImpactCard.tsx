import { FileCode2, FolderTree } from "lucide-react";
import type { BlastRadius } from "@/app/types/prAnalysis";
import AnimatedProgressBar from "./AnimatedProgressBar";
import DashboardCard from "./DashboardCard";

type RepositoryData = {
  changedFiles: string[];
  totalFiles: number;
};

type RepositoryImpactCardProps = {
  repositoryData?: RepositoryData;
  blastRadius?: BlastRadius | null;
};

function getAreaLabel(filePath: string): string {
  const segments = filePath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "Root";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  return `${segments[0]}/${segments[1]}`;
}

export default function RepositoryImpactCard({
  repositoryData,
  blastRadius,
}: RepositoryImpactCardProps) {
  if (!repositoryData) {
    return (
      <DashboardCard
        title="Repository Impact"
        eyebrow="Code Surface"
        description="Changed files and concentrated repository areas."
        icon={FolderTree}
      >
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
          Repository impact details will appear after analysis completes.
        </div>
      </DashboardCard>
    );
  }

  const areaCounts = new Map<string, number>();
  repositoryData.changedFiles.forEach((file) => {
    const area = getAreaLabel(file);
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  });

  const hotspots = Array.from(areaCounts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const maxHotspot = Math.max(...hotspots.map((item) => item.count), 1);

  return (
    <DashboardCard
      title="Repository Impact"
      eyebrow="Code Surface"
      description="Changed files and concentrated repository areas."
      icon={FolderTree}
      headerSlot={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
          {repositoryData.totalFiles} files
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Files changed
            </p>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {repositoryData.changedFiles.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {areaCounts.size} repository area{areaCounts.size === 1 ? "" : "s"} touched
              {blastRadius ? ` across ${blastRadius.affectedLayers.length} layers` : ""}.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Hotspots
            </p>
            <div className="mt-4 space-y-3">
              {hotspots.map((hotspot, index) => (
                <AnimatedProgressBar
                  key={hotspot.area}
                  label={hotspot.area}
                  value={(hotspot.count / maxHotspot) * 100}
                  showValue={false}
                  hint={`${hotspot.count} file${hotspot.count === 1 ? "" : "s"}`}
                  tone="primary"
                  size="sm"
                  delay={index * 0.05}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Changed files</p>
              <p className="mt-1 text-xs text-slate-500">
                Full file list for impact review
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2 text-slate-200">
              <FileCode2 className="size-4" />
            </div>
          </div>

          <div className="dashboard-scroll mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {repositoryData.changedFiles.map((file) => (
              <div
                key={file}
                className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-2.5"
              >
                <p className="break-all font-mono text-xs text-slate-300">{file}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
