import type { AssetType } from "@/lib/types/domain";

const assetFolders: Record<AssetType, string> = {
  player_photo: "assets/player-photos",
  tournament_logo: "assets/tournament",
  sponsor_logo: "assets/sponsors",
  payment_proof: "assets/payment",
  final_poster: "final-posters",
};

export function createOrderExportFilename({
  orderNumber,
  playerName,
  tournamentName,
}: {
  orderNumber: string;
  playerName: string;
  tournamentName: string;
}) {
  return `${sanitizeArchiveSegment(orderNumber)}-${sanitizeArchiveSegment(playerName)}-${sanitizeArchiveSegment(tournamentName)}.zip`;
}

export function createAssetArchivePath(
  asset: {
    id: string;
    asset_type: AssetType;
    original_filename: string;
  },
  index: number,
) {
  const filename = sanitizeFilename(asset.original_filename);
  return `${assetFolders[asset.asset_type]}/${String(index + 1).padStart(2, "0")}-${asset.id.slice(0, 8)}-${filename}`;
}

export function sanitizeArchiveSegment(value: string) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || "untitled";
}

function sanitizeFilename(value: string) {
  const lastSegment = value.split(/[\\/]/).at(-1) ?? "asset";
  const dotIndex = lastSegment.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex < lastSegment.length - 1;
  const stem = hasExtension ? lastSegment.slice(0, dotIndex) : lastSegment;
  const extension = hasExtension
    ? lastSegment
        .slice(dotIndex + 1)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10)
        .toLowerCase()
    : "";
  const safeStem = sanitizeArchiveSegment(stem);
  return extension ? `${safeStem}.${extension}` : safeStem;
}
