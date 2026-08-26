export interface PackageDefinition {
  slug: "single-frame" | "duo-frame" | "triple-frame" | "five-frame";
  name: string;
  posterCount: number;
  priceMyr: number;
  freeAmendments: number;
}

// Display fallback only. Submitted orders always snapshot authoritative DB values.
export const PACKAGE_CATALOG: readonly PackageDefinition[] = [
  {
    slug: "single-frame",
    name: "Single Frame",
    posterCount: 1,
    priceMyr: 60,
    freeAmendments: 2,
  },
  {
    slug: "duo-frame",
    name: "Duo Frame",
    posterCount: 2,
    priceMyr: 110,
    freeAmendments: 4,
  },
  {
    slug: "triple-frame",
    name: "Triple Frame",
    posterCount: 3,
    priceMyr: 155,
    freeAmendments: 6,
  },
  {
    slug: "five-frame",
    name: "Five Frame",
    posterCount: 5,
    priceMyr: 230,
    freeAmendments: 10,
  },
] as const;

export function getPackageBySlug(slug: string): PackageDefinition | undefined {
  return PACKAGE_CATALOG.find((item) => item.slug === slug);
}

export function calculatePackagePrice(slug: string): number {
  const selectedPackage = getPackageBySlug(slug);

  if (!selectedPackage) {
    throw new Error(`Unknown package: ${slug}`);
  }

  return selectedPackage.priceMyr;
}
