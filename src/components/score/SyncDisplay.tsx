import largeFdx from "../../assets/achievements/large/sync/fdx.png";
import largeFdxPlus from "../../assets/achievements/large/sync/fdx_plus.png";
import largeFs from "../../assets/achievements/large/sync/fs.png";
import largeFsPlus from "../../assets/achievements/large/sync/fs_plus.png";
import largeSync from "../../assets/achievements/large/sync/sync.png";
import smallFdx from "../../assets/achievements/small/sync/fdx.png";
import smallFdxPlus from "../../assets/achievements/small/sync/fdx_plus.png";
import smallFs from "../../assets/achievements/small/sync/fs.png";
import smallFsPlus from "../../assets/achievements/small/sync/fs_plus.png";
import smallSync from "../../assets/achievements/small/sync/sync.png";
import type { SyncStatus } from "../../utils/types";

type BadgeSize = "large" | "small";

interface SyncDisplayProps {
  status: SyncStatus | null | undefined;
  size: BadgeSize;
  className?: string;
}

const icons: Record<BadgeSize, Record<SyncStatus, string>> = {
  large: { Sync: largeSync, FS: largeFs, "FS+": largeFsPlus, FDX: largeFdx, "FDX+": largeFdxPlus },
  small: { Sync: smallSync, FS: smallFs, "FS+": smallFsPlus, FDX: smallFdx, "FDX+": smallFdxPlus },
};

const labels: Record<SyncStatus, string> = {
  Sync: "Sync play",
  FS: "Full sync",
  "FS+": "Full sync plus",
  FDX: "Full sync DX",
  "FDX+": "Full sync DX plus",
};

export function SyncDisplay({ status, size, className }: SyncDisplayProps) {
  if (!status) return null;

  return <img className={className} src={icons[size][status]} alt={labels[status]} />;
}
