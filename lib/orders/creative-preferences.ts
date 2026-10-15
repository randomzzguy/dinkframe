const THEME_NAMES: Record<string, string> = {
  minimalist: "Minimalism",
  "clean-premium": "Clean & Premium",
  "powerful-athletic": "Powerful / Athletic",
  futuristic: "Futuristic",
  cyberpunk: "Cyberpunk",
  "luxury-sports": "Luxury Sports",
  editorial: "Editorial Design",
  neon: "Neon",
  urban: "Urban",
  cinematic: "Cinematic",
  "japanese-inspired": "Japanese-inspired",
  tropical: "Tropical",
  experimental: "Experimental",
  claymorphism: "Claymorphism",
  cybercore: "Cybercore",
  "neo-brutalism": "Neo-Brutalism",
  scrapbook: "Scrapbook",
  surrealism: "Surrealism",
  "y2k-aesthetic": "Y2K Aesthetic",
  "pixel-art": "Pixel Art",
  synthwave: "Synthwave",
  glassmorphism: "Glassmorphism",
  neumorphism: "Neumorphism",
  "bento-grid": "Bento Grid",
  "swiss-design": "Swiss Design",
  maximalism: "Maximalism",
  "luxury-typography": "Luxury Typography",
  "conceptual-sketch": "Conceptual Sketch",
  ethereal: "Ethereal",
  bohemian: "Bohemian",
  victorian: "Victorian",
  "wabi-sabi": "Wabi-Sabi",
  surprise: "Surprise Me",
};

const THEME_PROMPT_DIRECTIONS: Record<string, string> = {
  claymorphism:
    "Use soft inflated 3D forms, rounded clay-like surfaces, friendly depth, and tactile shadows while keeping the athlete powerful rather than toy-like.",
  cybercore:
    "Use dense internet-age interface fragments, chrome digital type, scan artifacts, data layers, and controlled technological chaos.",
  "neo-brutalism":
    "Use blunt geometry, thick outlines, hard offset shadows, intentionally raw type, flat color blocks, and unapologetic contrast.",
  scrapbook:
    "Build a layered handmade collage with torn-paper edges, tape, stamps, cutouts, scribbles, and imperfect physical overlap.",
  surrealism:
    "Create a dreamlike impossible scene with symbolic scale shifts, unexpected spatial relationships, and seamless visual transformations.",
  "y2k-aesthetic":
    "Use optimistic turn-of-the-millennium styling: chrome, translucent plastic, bubbles, glossy gradients, starbursts, and playful techno type.",
  "pixel-art":
    "Translate supporting graphics into a deliberate pixel-grid language with crisp stepped edges, limited-resolution motifs, and arcade-era typography; keep faces recognizable and photographic unless explicitly directed otherwise.",
  synthwave:
    "Use retro-futurist sunset energy, horizon grids, luminous gradients, chrome accents, and cinematic 1980s electronic-poster typography.",
  glassmorphism:
    "Use layered translucent panels, frosted refraction, luminous edge highlights, soft depth, and highly legible type over atmospheric imagery.",
  neumorphism:
    "Use restrained monochromatic surfaces with softly extruded and inset forms, subtle paired shadows, and precise tactile hierarchy without sacrificing contrast.",
  "bento-grid":
    "Organize the story into a disciplined modular grid of varied panels, with one dominant athlete cell and compact supporting information cells.",
  editorial:
    "Use a sophisticated magazine system with assertive headline typography, intentional columns, art-directed cropping, captions, and generous hierarchy.",
  "swiss-design":
    "Use an objective asymmetric grid, sans-serif typography, disciplined alignment, mathematical spacing, and minimal geometric accents.",
  minimalist:
    "Reduce the composition to essential imagery and copy, using generous negative space, precise alignment, restrained details, and one clear focal point.",
  maximalism:
    "Create a controlled visual abundance of layered type, patterns, textures, imagery, and scale contrasts while preserving a readable hierarchy.",
  "luxury-typography":
    "Make refined display typography the signature element, using elegant scale, premium spacing, subtle ornamental detail, and editorial restraint.",
  "conceptual-sketch":
    "Combine the finished athlete image with expressive construction lines, annotations, gestural marks, diagram fragments, and intentional unfinished-paper energy.",
  ethereal:
    "Use weightless light, translucent atmosphere, soft bloom, flowing forms, and spacious dreamlike depth while maintaining crisp essential copy.",
  bohemian:
    "Use warm organic layers, handcrafted patterns, natural textures, expressive curves, and eclectic artisanal details in a cohesive composition.",
  victorian:
    "Use ornate period-inspired framing, engraved detail, decorative flourishes, formal symmetry, and dramatic serif typography without faux historical claims.",
  cyberpunk:
    "Use a high-tech urban night language with neon infrastructure, rain-slick depth, holographic details, glitch texture, and sharp condensed type.",
  "wabi-sabi":
    "Use quiet asymmetry, honest material texture, weathered imperfection, muted natural space, and restrained typography that celebrates transience.",
};

export function formatThemeName(value: string) {
  return THEME_NAMES[value] ?? humanize(value);
}

export function getThemePromptDirection(value: string) {
  const name = formatThemeName(value);
  const direction = THEME_PROMPT_DIRECTIONS[value];
  return direction ? `${name} — ${direction}` : name;
}

export function formatColorPalette(
  preference: string,
  customColor: string | null | undefined,
  secondaryColors: readonly string[] = [],
) {
  const primary =
    preference === "custom" && customColor
      ? `Custom (${customColor.toUpperCase()})`
      : humanize(preference);
  const labels = [`Primary: ${primary}`];
  if (secondaryColors[0]) {
    labels.push(`Secondary: ${secondaryColors[0].toUpperCase()}`);
  }
  if (secondaryColors[1]) {
    labels.push(`Accent: ${secondaryColors[1].toUpperCase()}`);
  }
  return labels.join(" · ");
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
