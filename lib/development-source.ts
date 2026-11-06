import 'server-only';

import { getPublicPropertyById } from '@/lib/2clics/listings';
import type { SinglePropertyResult } from '@/lib/2clics/listings';
import { resolveDevelopmentCardImage } from '@/lib/development-assets';
import {
  getDevelopmentEditorialCuration,
  pickDevelopmentSource,
  toDevelopmentCardSource,
  toDevelopmentCardSourceFromCuration,
} from '@/lib/desarrollos';
import type { CuratedEntry } from '@/lib/desarrollos';
import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

// Carga ÚNICA de un desarrollo curado — índice /desarrollos, ficha /desarrollos/[id], metadata y
// Home pasan todos por acá, así que nunca discrepan sobre qué unidad es la fuente.
//
// Principio (ver `pickDevelopmentSource` en lib/desarrollos.ts): la existencia del desarrollo la
// decide la curaduría de García, nunca el estado de una unidad en 2Clics. Esta función NO devuelve
// "desarrollo no encontrado": siempre devuelve algo, aunque ninguna unidad esté activa.

export type PropertyFetcher = (propertyId: number) => Promise<SinglePropertyResult>;

export type LoadedDevelopment = {
  curation: DevelopmentCuration;
  // Fuente de datos vivos (ver `pickDevelopmentSource`), o `null` si ninguna unidad está activa.
  sourceProperty: PublicProperty | null;
  // Unidades activas, en el orden de `curation.propertyIds`.
  units: PublicProperty[];
  // `false` si algún pedido falló por una causa DISTINTA de "esta propiedad no está activa"
  // (error del proveedor, timeout, sin credenciales). En ese caso la ausencia de unidades NO
  // significa "sin disponibilidad" y la UI no debe afirmarlo.
  availabilityKnown: boolean;
};

export async function loadDevelopment(
  curation: DevelopmentCuration,
  fetchById: PropertyFetcher = getPublicPropertyById,
): Promise<LoadedDevelopment> {
  // Se consulta también `sourcePropertyId` si (por error de curaduría) no figurara en propertyIds.
  const ids = Array.from(new Set([...curation.propertyIds, curation.sourcePropertyId]));
  const results = await Promise.all(
    ids.map(async (propertyId): Promise<SinglePropertyResult> => {
      try {
        return await fetchById(propertyId);
      } catch {
        // Defensa extra: un throw inesperado se trata como falla del proveedor, nunca como baja.
        return { status: 'error', property: null };
      }
    }),
  );

  const byId = new Map<number, PublicProperty>();
  results.forEach((result, index) => {
    if (result.property) byId.set(ids[index], result.property);
  });

  const units = curation.propertyIds
    .map((propertyId) => byId.get(propertyId))
    .filter((property): property is PublicProperty => Boolean(property));
  const availabilityKnown = results.every((result) => result.status === 'ready' || result.status === 'not-found');

  return {
    curation,
    sourceProperty: pickDevelopmentSource(curation, orderedForPick(curation, byId)),
    units,
    availabilityKnown,
  };
}

// `pickDevelopmentSource` espera el orden de la curaduría; incluye la fuente aunque no esté en
// propertyIds para no perderla.
function orderedForPick(curation: DevelopmentCuration, byId: Map<number, PublicProperty>): PublicProperty[] {
  const ordered = curation.propertyIds.map((id) => byId.get(id)).filter((p): p is PublicProperty => Boolean(p));
  const source = byId.get(curation.sourcePropertyId);
  return source && !ordered.includes(source) ? [source, ...ordered] : ordered;
}

// Card del índice /desarrollos: SIEMPRE devuelve una entrada. Con fuente viva usa sus datos; sin
// ella, solo curaduría (nombre, ubicación curada, hero local si existe).
export async function loadCuratedEntry(
  curation: DevelopmentCuration,
  fetchById: PropertyFetcher = getPublicPropertyById,
): Promise<CuratedEntry> {
  const { sourceProperty } = await loadDevelopment(curation, fetchById);
  if (!sourceProperty) {
    const source = toDevelopmentCardSourceFromCuration(curation);
    source.image = resolveDevelopmentCardImage(curation.slug, []);
    return { curation, source };
  }
  // `cardImageIndex`: cada desarrollo con curaduría editorial propia decide qué imagen real cumple
  // la función de portada del índice — nunca `images[0]` a ciegas.
  const editorial = getDevelopmentEditorialCuration(curation.slug);
  const source = toDevelopmentCardSource(sourceProperty, curation.publicName, editorial?.cardImageIndex);
  // Un hero editorial local (render oficial), cuando existe, también es la portada de la card.
  source.image = resolveDevelopmentCardImage(curation.slug, sourceProperty.images);
  return { curation, source };
}
