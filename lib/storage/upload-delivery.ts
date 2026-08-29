"use client";

import {
  createPosterDeliveryStoragePath,
  type PosterDeliveryKind,
  validatePosterDeliveryFile,
} from "@/lib/orders/delivery";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { uploadFileToPrivateBucket } from "@/lib/storage/upload-draft";

export type PosterDeliveryUpload = {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

export async function uploadPosterDelivery({
  orderId,
  kind,
  file,
  onProgress,
}: {
  orderId: string;
  kind: PosterDeliveryKind;
  file: File;
  onProgress?: (percentage: number) => void;
}): Promise<PosterDeliveryUpload> {
  const validationError = validatePosterDeliveryFile(file);
  if (validationError) throw new Error(validationError);

  const storagePath = createPosterDeliveryStoragePath({
    orderId,
    kind,
    filename: file.name,
  });
  await uploadFileToPrivateBucket({
    bucketId: STORAGE_BUCKETS.orderAssets,
    storagePath,
    file,
    onProgress,
  });

  return {
    storagePath,
    originalFilename: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}
