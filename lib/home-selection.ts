import 'server-only';
import { formatPublicLocation } from '@/lib/2clics/format';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getDevelopmentEditorialCuration, resolveSafeDescription, resolveSourceTextSegment } from '@/lib/desarrollos';
import { resolveDevelopmentAssets, resolveDevelopmentCardImage } from '@/lib/development-assets';
import { getInvestmentEditorialCuration, resolveInvestmentImage } from '@/lib/investments';
import { getDevelopmentBySlug, getInvestmentOpportunityBySlug, isDevelopmentPublic } from '@/lib/site-curation';

// ── "Oportunidades seleccionadas" del Home — curaduría MANUAL de García ─────────────────────────
//
// Esta lista es la única fuente de la sección: orden, altas, bajas y reemplazos se hacen acá, sin
// tocar el Home. NO se autogenera desde el inventario de 2Clics (2Clics solo aporta imagen y
// ubicación de cada ficha ya curada). Cada entrada apunta a una landing existente:
//   - 'development' → slug de DEVELOPMENTS (lib/site-curation.ts) → /desarrollos/<slug>
//   - 'investment'  → slug de INVESTMENT_OPPORTUNITIES (lib/site-curation.ts) → /invertir/<slug>
// Una entrada cuyo slug no existe, está inactiva o cuya fuente no responde se omite en silencio
// (nunca una card rota ni un placeholder). Máximo HOME_SELECTION_MAX cards.
//
// Orden confirmado por García (pre-launch V2). Cuarto lugar VACANTE hasta nueva decisión: no
// agregar una cuarta oportunidad sin confirmación.
export type HomeSelectionEntry = { kind: 'development' | 'investment'; slug: string };

export const HOME_SELECTED_OPPORTUNITIES: HomeSelectionEntry[] = [
  { kind: 'development', slug: 'domus-brickell-center' },
  { kind: 'development', slug: 'benavidez-village' },
  { kind: 'investment', slug: '445-n-shore-drive' },
];

export const HOME_SELECTION_MAX = 4;

export type HomeSelectionCard = {
  key: string;
  kind: HomeSelectionEntry['kind'];
  // Rótulo semántico: "Desarrollo" / "Oportunidad de inversión" — nunca "Venta".
  kicker: string;
  name: string;
  location: string;
  // Descriptor editorial ya validado en la landing (intro del hero); null si no existe.
  descriptor: string | null;
  href: string;
  ctaLabel: string;
  image: { src: string; tag?: string } | null;
};

function firstText(value: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value || '').trim();
}

async function loadDevelopmentCard(slug: string): Promise<HomeSelectionCard | null> {
  const curation = getDevelopmentBySlug(slug);
  if (!curation || !isDevelopmentPublic(curation)) return null;
  const result = await getPublicPropertyById(curation.sourcePropertyId);
  const property = result.property;
  if (!property) return null;

  const editorial = getDevelopmentEditorialCuration(curation.slug);
  const image = resolveDevelopmentCardImage(curation.slug, property.images);
  const heroAsset = resolveDevelopmentAssets(curation.slug).hero?.[0];
  // Mismo intro que abre la ficha del desarrollo (CuratedDevelopmentDetailView).
  const descriptor = editorial
    ? firstText(resolveSourceTextSegment(resolveSafeDescription(property.description || '', editorial), editorial.introSegment))
    : '';

  return {
    key: `development:${curation.slug}`,
    kind: 'development',
    kicker: 'Desarrollo',
    name: curation.publicName || property.title || curation.name,
    location: editorial?.publicLocation || formatPublicLocation(property.location, property.region),
    descriptor: descriptor || null,
    href: `/desarrollos/${curation.slug}`,
    ctaLabel: 'Conocer el desarrollo',
    image: image
      ? { src: image.displayUrl, tag: heroAsset && image.displayUrl === heroAsset.src && heroAsset.kind === 'render' ? 'Imagen ilustrativa' : undefined }
      : null,
  };
}

async function loadInvestmentCard(slug: string): Promise<HomeSelectionCard | null> {
  const opportunity = getInvestmentOpportunityBySlug(slug);
  const curation = getInvestmentEditorialCuration(slug);
  if (!opportunity || !opportunity.active || !curation) return null;
  const result = await getPublicPropertyById(opportunity.sourcePropertyId);
  if (!result.property) return null;

  const image = resolveInvestmentImage(result.property.images, curation.openingImage);
  return {
    key: `investment:${opportunity.slug}`,
    kind: 'investment',
    kicker: 'Oportunidad de inversión',
    name: opportunity.name,
    location: curation.location,
    descriptor: curation.intro || null,
    href: `/invertir/${opportunity.slug}`,
    ctaLabel: 'Conocer la oportunidad',
    image: image ? { src: image.displayUrl } : null,
  };
}

export async function loadHomeSelection(
  entries: HomeSelectionEntry[] = HOME_SELECTED_OPPORTUNITIES,
): Promise<HomeSelectionCard[]> {
  const cards = await Promise.all(
    entries
      .slice(0, HOME_SELECTION_MAX)
      .map((entry) => (entry.kind === 'development' ? loadDevelopmentCard(entry.slug) : loadInvestmentCard(entry.slug))),
  );
  return cards.filter((card): card is HomeSelectionCard => card !== null);
}
