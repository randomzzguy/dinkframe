"use client";

import { Upload } from "tus-js-client";

import { getPublicEnv } from "@/lib/config/env";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/storage/constants";
import { createClient } from "@/lib/supabase/browser";
import type { AssetType } from "@/lib/types/domain";
import type { UploadedAssetInput } from "@/lib/validation/order";

const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024;
const RESUMABLE_CHUNK_SIZE = 6 * 1024 * 1024;

type UploadableAssetType = Exclude<AssetType, "final_poster">;

export interface UploadOrderAssetOptions {
  draftId: string;
  file: File;
  assetType: UploadableAssetType;
  playerId?: string;
  onProgress?: (percentage: number) => void;
}

export async function uploadOrderAsset({
  draftId,
  file,
  assetType,
  playerId,
  onProgress,
}: UploadOrderAssetOptions): Promise<UploadedAssetInput> {
  const validationError = validateUploadFile(assetType, file);
  if (validationError) throw new Error(validationError);

  const bucketId =
    assetType === "payment_proof"
      ? STORAGE_BUCKETS.paymentProofs
      : STORAGE_BUCKETS.orderAssets;
  if (assetType === "player_photo" && !playerId) {
    throw new Error("Choose the player this photo belongs to.");
  }
  const storagePath = createStoragePath(
    draftId,
    assetType,
    file.name,
    playerId,
  );

  await uploadFileToPrivateBucket({
    bucketId,
    storagePath,
    file,
    onProgress,
  });

  return {
    assetType,
    bucketId,
    storagePath,
    originalFilename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    playerId: assetType === "player_photo" ? playerId : undefined,
  };
}

export async function uploadFileToPrivateBucket({
  bucketId,
  storagePath,
  file,
  onProgress,
}: {
  bucketId: string;
  storagePath: string;
  file: File;
  onProgress?: (percentage: number) => void;
}) {
  if (file.size > RESUMABLE_UPLOAD_THRESHOLD) {
    await uploadResumably(bucketId, storagePath, file, onProgress);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucketId)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error("We couldn't upload that file. Please try again.");
  onProgress?.(100);
}

export async function removeOrderAsset(asset: UploadedAssetInput) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(asset.bucketId)
    .remove([asset.storagePath]);

  if (error) {
    throw new Error("We couldn't remove that file. Please try again.");
  }
}

export function validateUploadFile(
  assetType: UploadableAssetType,
  file: Pick<File, "name" | "size" | "type">,
): string | null {
  if (file.name.length > 180)
    return "Use a filename shorter than 180 characters.";
  if (file.size <= 0) return "That file is empty.";

  if (assetType === "payment_proof") {
    if (
      !(UPLOAD_LIMITS.paymentProof.mimeTypes as readonly string[]).includes(
        file.type,
      )
    ) {
      return "Payment proof must be a JPEG, PNG, WebP, or PDF.";
    }
    if (file.size > UPLOAD_LIMITS.paymentProof.maxBytes) {
      return "Payment proof must be 10 MB or smaller.";
    }
    return null;
  }

  const limit =
    assetType === "player_photo"
      ? UPLOAD_LIMITS.playerImages
      : UPLOAD_LIMITS.logos;
  if (!(limit.mimeTypes as readonly string[]).includes(file.type)) {
    return "Images must be JPEG, PNG, or WebP files.";
  }
  if (file.size > limit.maxBytesEach) {
    return `That file exceeds the ${Math.round(limit.maxBytesEach / 1024 / 1024)} MB limit.`;
  }
  return null;
}

function createStoragePath(
  draftId: string,
  assetType: UploadableAssetType,
  filename: string,
  playerId?: string,
) {
  const directory: Record<UploadableAssetType, string> = {
    player_photo: "players",
    tournament_logo: "tournament",
    sponsor_logo: "sponsors",
    payment_proof: "payment",
  };
  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const playerDirectory =
    assetType === "player_photo" && playerId ? `/${playerId}` : "";
  return `orders/${draftId}/${directory[assetType]}${playerDirectory}/${crypto.randomUUID()}-${safeFilename || "upload"}`;
}

async function uploadResumably(
  bucketId: string,
  storagePath: string,
  file: File,
  onProgress?: (percentage: number) => void,
) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Sign in again before uploading.");
  }

  const env = getPublicEnv();
  const projectUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = projectUrl.hostname.split(".")[0];
  const endpoint = projectUrl.hostname.endsWith(".supabase.co")
    ? `${projectUrl.protocol}//${projectRef}.storage.supabase.co/storage/v1/upload/resumable`
    : `${projectUrl.origin}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: RESUMABLE_CHUNK_SIZE,
      headers: { authorization: `Bearer ${session.access_token}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucketId,
        objectName: storagePath,
        contentType: file.type,
        cacheControl: "3600",
      },
      onProgress(bytesSent, bytesTotal) {
        onProgress?.(Math.round((bytesSent / bytesTotal) * 100));
      },
      onError() {
        reject(new Error("We couldn't finish that upload. Please try again."));
      },
      onSuccess() {
        resolve();
      },
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads[0])
        upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }, reject);
  });
}
