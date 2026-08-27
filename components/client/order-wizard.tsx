"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Copy,
  FileCheck2,
  Landmark,
  Plus,
  QrCode,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  prepareOrderDraft,
  submitOrder,
} from "@/app/(client)/orders/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { removeOrderAsset, uploadOrderAsset } from "@/lib/storage/upload-draft";
import type { AssetType } from "@/lib/types/domain";
import type {
  OrderDraftInput,
  UploadedAssetInput,
} from "@/lib/validation/order";

const steps = [
  "Player",
  "Tournament",
  "Events",
  "Photos",
  "Sponsors",
  "Style",
  "Package",
  "Payment",
  "Review",
] as const;
const storageKey = "dinkframe.order-draft.v2";

type UploadableAssetType = Exclude<AssetType, "final_poster">;
type DraftEvent = { id: string; eventName: string; partnerName: string };
type DraftSponsor = { id: string; companyName: string };

type Draft = {
  playerName: string;
  instagramHandle: string;
  whatsapp: string;
  tournamentName: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  tournamentLocation: string;
  events: DraftEvent[];
  sponsors: DraftSponsor[];
  colorPreference: string;
  customColor: string;
  themePreference: string;
  customNotes: string;
  referenceUrl: string;
  preferredCompletionDate: string;
  packageSlug: string;
  confirmedAccurate: boolean;
};

export interface PackageOption {
  slug: string;
  name: string;
  posterCount: number;
  priceMyr: number;
  freeAmendments: number;
}

export interface ThemeOption {
  slug: string;
  name: string;
  description: string | null;
}

export interface PaymentInstructions {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  duitnowId: string | null;
  instructions: string | null;
  qrUrl: string | null;
}

export interface InitialProfile {
  fullName: string | null;
  whatsapp: string | null;
  instagramHandle: string | null;
}

function createBlankDraft(
  packages: PackageOption[],
  initialProfile: InitialProfile,
): Draft {
  return {
    playerName: initialProfile.fullName ?? "",
    instagramHandle: initialProfile.instagramHandle ?? "",
    whatsapp: initialProfile.whatsapp ?? "",
    tournamentName: "",
    tournamentStartDate: "",
    tournamentEndDate: "",
    tournamentLocation: "",
    events: [{ id: crypto.randomUUID(), eventName: "", partnerName: "" }],
    sponsors: [],
    colorPreference: "surprise",
    customColor: "#d8ff36",
    themePreference: "surprise",
    customNotes: "",
    referenceUrl: "",
    preferredCompletionDate: "",
    packageSlug: packages[0]?.slug ?? "",
    confirmedAccurate: false,
  };
}

export function OrderWizard({
  packages,
  themes,
  paymentInstructions,
  initialProfile,
}: {
  packages: PackageOption[];
  themes: ThemeOption[];
  paymentInstructions: PaymentInstructions;
  initialProfile: InitialProfile;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() =>
    createBlankDraft(packages, initialProfile),
  );
  const [draftId, setDraftId] = useState<string>();
  const [assets, setAssets] = useState<UploadedAssetInput[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [message, setMessage] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const [isSubmitting, startSubmission] = useTransition();

  const selectedPackage = useMemo(
    () => packages.find((item) => item.slug === draft.packageSlug),
    [draft.packageSlug, packages],
  );
  const playerPhotos = assets.filter(
    (asset) => asset.assetType === "player_photo",
  );
  const tournamentLogos = assets.filter(
    (asset) => asset.assetType === "tournament_logo",
  );
  const sponsorLogos = assets.filter(
    (asset) => asset.assetType === "sponsor_logo",
  );
  const paymentProofs = assets.filter(
    (asset) => asset.assetType === "payment_proof",
  );
  const isUploading = Object.keys(uploadProgress).length > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            draft?: Partial<Draft>;
            draftId?: string;
            assets?: UploadedAssetInput[];
          };
          setDraft({
            ...createBlankDraft(packages, initialProfile),
            ...parsed.draft,
          });
          setDraftId(parsed.draftId);
          setAssets(parsed.assets ?? []);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialProfile, packages]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ draft, draftId, assets }),
      );
    }
  }, [assets, draft, draftId, hydrated]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasDraftContent(draft) || assets.length > 0 || isUploading) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [assets.length, draft, isUploading]);

  const update = <Key extends keyof Draft>(field: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(undefined);
  };

  const ensureDraft = async () => {
    const result = await prepareOrderDraft(draftId);
    if (!result.ok) throw new Error(result.message);

    if (!result.reused && draftId && result.draftId !== draftId) {
      setAssets([]);
      setPreviewUrls({});
      if (assets.length > 0) {
        throw new Error(
          "This saved draft expired. Please upload the files again before submitting.",
        );
      }
    }
    setDraftId(result.draftId);
    return result.draftId;
  };

  const handleFiles = async (
    assetType: UploadableAssetType,
    fileList: FileList | null,
  ) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    if (
      assetType === "player_photo" &&
      playerPhotos.length + files.length > 8
    ) {
      setMessage("You can upload up to eight player photos.");
      return;
    }
    if (
      assetType === "sponsor_logo" &&
      sponsorLogos.length + files.length > 10
    ) {
      setMessage("You can upload up to ten sponsor logos.");
      return;
    }

    try {
      setMessage(undefined);
      const activeDraftId = await ensureDraft();

      for (const file of files) {
        const progressKey = `${assetType}:${file.name}:${file.lastModified}`;
        setUploadProgress((current) => ({ ...current, [progressKey]: 0 }));
        const uploaded = await uploadOrderAsset({
          draftId: activeDraftId,
          file,
          assetType,
          onProgress(percentage) {
            setUploadProgress((current) => ({
              ...current,
              [progressKey]: percentage,
            }));
          },
        });

        const replaced =
          assetType === "payment_proof"
            ? paymentProofs
            : assetType === "tournament_logo"
              ? tournamentLogos
              : [];

        setAssets((current) => [
          ...current.filter(
            (asset) =>
              !(
                (assetType === "payment_proof" &&
                  asset.assetType === "payment_proof") ||
                (assetType === "tournament_logo" &&
                  asset.assetType === "tournament_logo")
              ),
          ),
          uploaded,
        ]);
        if (file.type.startsWith("image/")) {
          setPreviewUrls((current) => ({
            ...current,
            [uploaded.storagePath]: URL.createObjectURL(file),
          }));
        }
        await Promise.all(replaced.map((asset) => removeOrderAsset(asset)));
        setUploadProgress((current) => {
          const next = { ...current };
          delete next[progressKey];
          return next;
        });
      }
    } catch (error) {
      setUploadProgress({});
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't upload that file. Please try again.",
      );
    }
  };

  const removeAsset = async (asset: UploadedAssetInput) => {
    try {
      await removeOrderAsset(asset);
      setAssets((current) =>
        current.filter((item) => item.storagePath !== asset.storagePath),
      );
      const preview = previewUrls[asset.storagePath];
      if (preview) URL.revokeObjectURL(preview);
      setPreviewUrls((current) => {
        const next = { ...current };
        delete next[asset.storagePath];
        return next;
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't remove that file.",
      );
    }
  };

  const nextStep = () => {
    const error = validateStep(step, draft, assets);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(undefined);
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const submit = () => {
    const error = validateStep(8, draft, assets);
    if (error) {
      setMessage(error);
      return;
    }

    startSubmission(async () => {
      try {
        const activeDraftId = await ensureDraft();
        const order: OrderDraftInput = {
          playerName: draft.playerName,
          instagramHandle: draft.instagramHandle,
          whatsapp: draft.whatsapp,
          tournamentName: draft.tournamentName,
          tournamentStartDate: draft.tournamentStartDate,
          tournamentEndDate: draft.tournamentEndDate,
          tournamentLocation: draft.tournamentLocation,
          events: draft.events.map((event, index) => ({
            eventName: event.eventName,
            partnerName: event.partnerName || undefined,
            sortOrder: index,
          })),
          sponsors: draft.sponsors
            .filter((sponsor) => sponsor.companyName.trim())
            .map((sponsor) => ({ companyName: sponsor.companyName })),
          colorPreference: draft.colorPreference,
          customColor:
            draft.colorPreference === "custom" ? draft.customColor : undefined,
          themePreference: draft.themePreference,
          customNotes: draft.customNotes || undefined,
          referenceUrl: draft.referenceUrl || undefined,
          preferredCompletionDate: draft.preferredCompletionDate || undefined,
          packageSlug: draft.packageSlug,
          confirmedAccurate: true,
        };
        const result = await submitOrder({
          draftId: activeDraftId,
          order,
          assets,
        });

        if (!result.ok) {
          setMessage(
            `${result.message}${result.errorId ? ` Reference: ${result.errorId}` : ""}`,
          );
          return;
        }

        window.localStorage.removeItem(storageKey);
        router.push(`/orders/${result.orderId}?submitted=1`);
        router.refresh();
      } catch (submissionError) {
        setMessage(
          submissionError instanceof Error
            ? submissionError.message
            : "We couldn't submit your order. Please try again.",
        );
      }
    });
  };

  return (
    <div className="grid gap-7 lg:grid-cols-[15rem_1fr]">
      <aside className="h-fit rounded-2xl border border-black/10 bg-white p-5 lg:sticky lg:top-28">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          <Cloud className="size-4" /> Draft protected as you go
        </div>
        <Progress value={((step + 1) / steps.length) * 100} className="mt-4" />
        <ol className="mt-5 space-y-1">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === step ? "bg-neutral-950 font-bold text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs ${index < step ? "bg-primary text-black" : "bg-neutral-100 text-neutral-600"}`}
                >
                  {index < step ? <Check className="size-3" /> : index + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="rounded-2xl border border-black/10 bg-white p-6 sm:p-9">
        <p className="eyebrow">
          Step {step + 1} of {steps.length}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">
          {steps[step]}
        </h2>

        <div className="mt-8 min-h-80">
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Player full name"
                value={draft.playerName}
                onChange={(value) => update("playerName", value)}
                required
              />
              <Field
                label="Instagram handle"
                value={draft.instagramHandle}
                onChange={(value) => update("instagramHandle", value)}
                placeholder="@player"
              />
              <Field
                label="WhatsApp number"
                value={draft.whatsapp}
                onChange={(value) => update("whatsapp", value)}
                required
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Tournament name"
                  value={draft.tournamentName}
                  onChange={(value) => update("tournamentName", value)}
                  required
                />
                <Field
                  label="Location"
                  value={draft.tournamentLocation}
                  onChange={(value) => update("tournamentLocation", value)}
                  required
                />
                <Field
                  label="Start date"
                  type="date"
                  value={draft.tournamentStartDate}
                  onChange={(value) => update("tournamentStartDate", value)}
                  required
                />
                <Field
                  label="End date"
                  type="date"
                  value={draft.tournamentEndDate}
                  onChange={(value) => update("tournamentEndDate", value)}
                  required
                />
                <Field
                  label="Preferred completion date"
                  type="date"
                  value={draft.preferredCompletionDate}
                  onChange={(value) => update("preferredCompletionDate", value)}
                />
              </div>
              <UploadArea
                title="Tournament logo"
                note="Upload one JPEG, PNG, or WebP logo."
                accept="image/jpeg,image/png,image/webp"
                onFiles={(files) => void handleFiles("tournament_logo", files)}
                disabled={isUploading}
              />
              <AssetList
                assets={tournamentLogos}
                previewUrls={previewUrls}
                onRemove={removeAsset}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {draft.events.map((event, index) => (
                <div
                  key={event.id}
                  className="grid gap-4 rounded-xl border border-black/10 p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Field
                    label={`Event ${index + 1}`}
                    value={event.eventName}
                    onChange={(value) =>
                      updateEvent(draft, update, event.id, "eventName", value)
                    }
                    required
                  />
                  <Field
                    label="Partner name"
                    value={event.partnerName}
                    onChange={(value) =>
                      updateEvent(draft, update, event.id, "partnerName", value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label={`Remove event ${index + 1}`}
                    disabled={draft.events.length === 1}
                    onClick={() =>
                      update(
                        "events",
                        draft.events.filter((item) => item.id !== event.id),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  update("events", [
                    ...draft.events,
                    { id: crypto.randomUUID(), eventName: "", partnerName: "" },
                  ])
                }
                disabled={draft.events.length >= 12}
              >
                <Plus /> Add another event
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <UploadArea
                title="Player photos"
                note="Upload 2–8 clear, high-resolution photos. Originals are preserved; large files resume automatically."
                accept="image/jpeg,image/png,image/webp"
                multiple
                onFiles={(files) => void handleFiles("player_photo", files)}
                disabled={isUploading}
              />
              <UploadProgress progress={uploadProgress} />
              <AssetList
                assets={playerPhotos}
                previewUrls={previewUrls}
                onRemove={removeAsset}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              {draft.sponsors.map((sponsor, index) => (
                <div key={sponsor.id} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Field
                      label={`Sponsor ${index + 1}`}
                      value={sponsor.companyName}
                      onChange={(value) =>
                        updateSponsor(draft, update, sponsor.id, value)
                      }
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove sponsor ${index + 1}`}
                    onClick={() =>
                      update(
                        "sponsors",
                        draft.sponsors.filter((item) => item.id !== sponsor.id),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  update("sponsors", [
                    ...draft.sponsors,
                    { id: crypto.randomUUID(), companyName: "" },
                  ])
                }
                disabled={draft.sponsors.length >= 10}
              >
                <Plus /> Add sponsor
              </Button>
              {draft.sponsors.length > 0 && (
                <>
                  <UploadArea
                    title="Sponsor logos"
                    note="Optional. Upload any JPEG, PNG, or WebP logos you have."
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onFiles={(files) => void handleFiles("sponsor_logo", files)}
                    disabled={isUploading}
                  />
                  <AssetList
                    assets={sponsorLogos}
                    previewUrls={previewUrls}
                    onRemove={removeAsset}
                  />
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Color direction"
                value={draft.colorPreference}
                onChange={(value) => update("colorPreference", value)}
                options={[
                  { value: "surprise", label: "Surprise Me" },
                  { value: "black-white", label: "Black & White" },
                  ...[
                    "blue",
                    "cyan",
                    "purple",
                    "green",
                    "red",
                    "orange",
                    "custom",
                  ].map((value) => ({ value, label: titleCase(value) })),
                ]}
              />
              <SelectField
                label="Theme"
                value={draft.themePreference}
                onChange={(value) => update("themePreference", value)}
                options={themes.map((theme) => ({
                  value: theme.slug,
                  label: theme.name,
                }))}
              />
              {draft.colorPreference === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-color">Custom color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-color"
                      type="color"
                      value={draft.customColor}
                      onChange={(event) =>
                        update("customColor", event.target.value)
                      }
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={draft.customColor}
                      onChange={(event) =>
                        update("customColor", event.target.value)
                      }
                      pattern="#[0-9a-fA-F]{6}"
                    />
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label htmlFor="notes">
                  Anything else you’d like us to know?
                </Label>
                <Textarea
                  id="notes"
                  className="mt-2"
                  value={draft.customNotes}
                  onChange={(event) =>
                    update("customNotes", event.target.value)
                  }
                  rows={5}
                  maxLength={2000}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Reference / inspiration link"
                  type="url"
                  value={draft.referenceUrl}
                  onChange={(value) => update("referenceUrl", value)}
                  placeholder="https://"
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => update("packageSlug", item.slug)}
                  className={`rounded-xl border p-5 text-left ${draft.packageSlug === item.slug ? "border-black bg-neutral-950 text-white" : "border-black/10"}`}
                >
                  <span className="text-lg font-bold">{item.name}</span>
                  <span className="mt-1 block text-3xl font-black">
                    RM{item.priceMyr}
                  </span>
                  <span className="mt-4 block text-sm opacity-60">
                    {item.posterCount} poster{item.posterCount > 1 ? "s" : ""} ·{" "}
                    {item.freeAmendments} amendments
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(32,42,12,.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-950 px-6 py-5 text-white">
                  <div>
                    <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
                      Amount to pay
                    </p>
                    <p className="font-heading mt-1 text-3xl font-bold">
                      RM{selectedPackage?.priceMyr}
                    </p>
                  </div>
                  <p className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-neutral-300">
                    {selectedPackage?.name}
                  </p>
                </div>

                <div className="grid lg:grid-cols-[1.05fr_.95fr]">
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/25 grid size-11 place-items-center rounded-2xl">
                        <Landmark className="size-5" />
                      </span>
                      <div>
                        <p className="font-heading text-xl font-bold">
                          Bank transfer
                        </p>
                        <p className="text-xs text-neutral-500">
                          Transfer the exact package amount
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 divide-y divide-black/8 rounded-2xl border border-black/8 bg-[#f8f9f3] px-4">
                      <PaymentDetail
                        label="Business name"
                        value={paymentInstructions.accountName}
                      />
                      <PaymentDetail
                        label="Account number"
                        value={paymentInstructions.accountNumber}
                        copyable
                      />
                      <PaymentDetail
                        label="Bank name"
                        value={paymentInstructions.bankName}
                      />
                      {paymentInstructions.duitnowId && (
                        <PaymentDetail
                          label="DuitNow ID"
                          value={paymentInstructions.duitnowId}
                          copyable
                        />
                      )}
                    </div>

                    {paymentInstructions.instructions && (
                      <p className="mt-5 text-sm leading-6 text-neutral-600">
                        {paymentInstructions.instructions}
                      </p>
                    )}
                  </div>

                  {paymentInstructions.qrUrl && (
                    <div className="border-t border-black/8 bg-[#f3f6eb] p-6 sm:p-8 lg:border-t-0 lg:border-l">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/25 grid size-11 place-items-center rounded-2xl">
                          <QrCode className="size-5" />
                        </span>
                        <div>
                          <p className="font-heading text-xl font-bold">
                            Scan to pay
                          </p>
                          <p className="text-xs text-neutral-500">
                            Touch &apos;n Go or any banking app
                          </p>
                        </div>
                      </div>
                      <a
                        href={paymentInstructions.qrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 block"
                      >
                        {/* Supports the public TnG QR and optional signed admin QR URLs. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentInstructions.qrUrl}
                          alt="Touch 'n Go payment QR code"
                          className="mx-auto h-auto w-full max-w-72 rounded-2xl border border-black/10 bg-white object-contain p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        />
                        <span className="mt-3 block text-center text-xs font-semibold underline underline-offset-4">
                          Open QR at full size
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">
                  Upload your payment receipt
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Once payment is complete, add the receipt so we can verify it.
                </p>
              </div>
              <UploadArea
                title="Payment receipt"
                note="Upload one JPEG, PNG, WebP, or PDF up to 10 MB. DINKFRAME confirms it manually."
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onFiles={(files) => void handleFiles("payment_proof", files)}
                disabled={isUploading}
              />
              <UploadProgress progress={uploadProgress} />
              <AssetList
                assets={paymentProofs}
                previewUrls={previewUrls}
                onRemove={removeAsset}
              />
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5">
              <div className="grid gap-5 rounded-xl bg-neutral-100 p-5 sm:grid-cols-2">
                <ReviewItem label="Player" value={draft.playerName} />
                <ReviewItem label="Tournament" value={draft.tournamentName} />
                <ReviewItem
                  label="Events"
                  value={draft.events
                    .map((event) => event.eventName)
                    .join(", ")}
                />
                <ReviewItem
                  label="Package"
                  value={`${selectedPackage?.name ?? ""} · RM${selectedPackage?.priceMyr ?? ""}`}
                />
                <ReviewItem
                  label="Creative direction"
                  value={`${titleCase(draft.colorPreference)} · ${themes.find((theme) => theme.slug === draft.themePreference)?.name ?? titleCase(draft.themePreference)}`}
                />
                <ReviewItem
                  label="Files"
                  value={`${playerPhotos.length} player photos · ${tournamentLogos.length} tournament logo · ${paymentProofs.length} payment proof`}
                />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={draft.confirmedAccurate}
                  onChange={(event) =>
                    update("confirmedAccurate", event.target.checked)
                  }
                  className="mt-0.5 size-4 accent-black"
                />
                I confirm that the information and uploaded assets are correct.
              </label>
            </div>
          )}
        </div>

        {message && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {message}
          </p>
        )}
        <div className="mt-8 flex justify-between border-t border-black/10 pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0 || isSubmitting}
          >
            <ArrowLeft /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={nextStep} disabled={isUploading}>
              Next <ArrowRight />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={isUploading || isSubmitting}
            >
              {isSubmitting ? "Submitting securely…" : "Submit order"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentDetail({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string | null;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function copyValue() {
    await navigator.clipboard.writeText(value ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold break-words text-neutral-950">
          {value}
        </p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={() => void copyValue()}
          className="hover:border-primary/60 hover:bg-primary/15 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold transition"
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function validateStep(
  step: number,
  draft: Draft,
  assets: UploadedAssetInput[],
): string | null {
  if (
    step === 0 &&
    (draft.playerName.trim().length < 2 || draft.whatsapp.trim().length < 8)
  )
    return "Add the player name and WhatsApp number.";
  if (
    step === 1 &&
    (!draft.tournamentName.trim() ||
      !draft.tournamentLocation.trim() ||
      !draft.tournamentStartDate ||
      !draft.tournamentEndDate)
  )
    return "Complete the tournament name, dates, and location.";
  if (step === 1 && draft.tournamentEndDate < draft.tournamentStartDate)
    return "Tournament end date must be on or after the start date.";
  if (
    step === 1 &&
    assets.filter((asset) => asset.assetType === "tournament_logo").length !== 1
  )
    return "Upload the tournament logo.";
  if (
    step === 2 &&
    draft.events.some((event) => event.eventName.trim().length < 2)
  )
    return "Add a name for every event.";
  if (step === 3) {
    const count = assets.filter(
      (asset) => asset.assetType === "player_photo",
    ).length;
    if (count < 2 || count > 8)
      return "Upload between two and eight player photos.";
  }
  if (
    step === 4 &&
    draft.sponsors.some((sponsor) => sponsor.companyName.trim().length < 2)
  )
    return "Complete or remove each sponsor name.";
  if (
    step === 5 &&
    draft.colorPreference === "custom" &&
    !/^#[0-9a-fA-F]{6}$/.test(draft.customColor)
  )
    return "Choose a valid custom color.";
  if (step === 6 && !draft.packageSlug) return "Choose a package.";
  if (
    step === 7 &&
    assets.filter((asset) => asset.assetType === "payment_proof").length !== 1
  )
    return "Upload one payment proof.";
  if (step === 8) {
    for (let index = 0; index < 8; index += 1) {
      const error: string | null = validateStep(index, draft, assets);
      if (error) return error;
    }
    if (!draft.confirmedAccurate)
      return "Confirm that the order information and assets are correct.";
  }
  return null;
}

function hasDraftContent(draft: Draft) {
  return Boolean(
    draft.playerName ||
    draft.whatsapp ||
    draft.tournamentName ||
    draft.customNotes,
  );
}
function updateEvent(
  draft: Draft,
  update: <Key extends keyof Draft>(field: Key, value: Draft[Key]) => void,
  id: string,
  field: "eventName" | "partnerName",
  value: string,
) {
  update(
    "events",
    draft.events.map((event) =>
      event.id === id ? { ...event, [field]: value } : event,
    ),
  );
}
function updateSponsor(
  draft: Draft,
  update: <Key extends keyof Draft>(field: Key, value: Draft[Key]) => void,
  id: string,
  value: string,
) {
  update(
    "sponsors",
    draft.sponsors.map((sponsor) =>
      sponsor.id === id ? { ...sponsor, companyName: value } : sponsor,
    ),
  );
}
function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && " *"}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input h-10 w-full rounded-lg border bg-white px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
function UploadArea({
  title,
  note,
  accept,
  multiple = false,
  disabled,
  onFiles,
}: {
  title: string;
  note: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/20 bg-neutral-50 p-7 text-center ${disabled ? "cursor-wait opacity-60" : "cursor-pointer hover:border-black"}`}
    >
      <Upload className="size-7" />
      <span className="mt-3 font-bold">{title}</span>
      <span className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
        {note}
      </span>
      <Input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
        className="sr-only"
      />
    </label>
  );
}
function UploadProgress({ progress }: { progress: Record<string, number> }) {
  const entries = Object.entries(progress);
  if (!entries.length) return null;
  return (
    <div className="space-y-3 rounded-xl bg-neutral-100 p-4">
      {entries.map(([name, value]) => (
        <div key={name}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="max-w-[70%] truncate">{name.split(":")[1]}</span>
            <span>{value}%</span>
          </div>
          <Progress value={value} />
        </div>
      ))}
    </div>
  );
}
function AssetList({
  assets,
  previewUrls,
  onRemove,
}: {
  assets: UploadedAssetInput[];
  previewUrls: Record<string, string>;
  onRemove: (asset: UploadedAssetInput) => Promise<void>;
}) {
  if (!assets.length) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {assets.map((asset) => (
        <li
          key={asset.storagePath}
          className="flex items-center gap-3 rounded-xl border border-black/10 p-3"
        >
          {previewUrls[asset.storagePath] ? (
            <div
              role="img"
              aria-label={`Preview of ${asset.originalFilename}`}
              className="size-14 shrink-0 rounded-lg bg-cover bg-center"
              style={{
                backgroundImage: `url(${previewUrls[asset.storagePath]})`,
              }}
            />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-neutral-100">
              <FileCheck2 className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {asset.originalFilename}
            </p>
            <p className="text-xs text-neutral-500">
              {formatBytes(asset.fileSize)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${asset.originalFilename}`}
            onClick={() => void onRemove(asset)}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        {label}
      </p>
      <p className="mt-1 font-medium">{value || "—"}</p>
    </div>
  );
}
function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}
