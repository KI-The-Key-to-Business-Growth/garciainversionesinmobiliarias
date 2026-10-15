import 'server-only';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Assets editoriales de /vender — mismo criterio que lib/development-assets.ts: solo material
// propio o autorizado por García (producción de propiedades, cámara, dron, visitas). Nunca stock
// ni imágenes descargadas de la web.
//
// Cada slot declara el archivo exacto esperado en `public/vender/`. Un slot solo se activa si el
// archivo EXISTE físicamente — mientras tanto el bloque se arma sin imagen (layout tipográfico),
// nunca con un placeholder.

export type SellAssetSlotId = 'SELL_ASSET_01' | 'SELL_ASSET_02' | 'SELL_ASSET_03' | 'SELL_ASSET_04';

export type SellAssetSlot = {
  id: SellAssetSlotId;
  file: string;
  // Texto alternativo descriptivo de lo que muestra la foto.
  alt: string;
  // Qué tiene que mostrar el archivo (para quien lo produzca o lo incorpore al repo).
  brief: string;
};

export const SELL_ASSET_SLOTS: SellAssetSlot[] = [
  {
    id: 'SELL_ASSET_01',
    file: 'propiedad.jpg',
    alt: 'Propiedad comercializada por García',
    brief: 'Propiedad / hero editorial — exterior o ambiente principal de una propiedad trabajada por García.',
  },
  {
    id: 'SELL_ASSET_02',
    file: 'produccion.jpg',
    alt: 'Producción de fotografía y video de una propiedad',
    brief: 'Producción foto/video — cámara, detrás de escena o resultado final de una producción propia.',
  },
  {
    id: 'SELL_ASSET_03',
    file: 'dron.jpg',
    alt: 'Toma aérea de una propiedad',
    brief: 'Dron / exterior — toma aérea propia de una propiedad o su entorno.',
  },
  {
    id: 'SELL_ASSET_04',
    file: 'gestion.jpg',
    alt: 'Visita a una propiedad',
    brief: 'Gestión / visita / detalle — recorrida, visita coordinada o detalle de una propiedad.',
  },
];

export type ResolvedSellAsset = { src: string; alt: string };
export type ResolvedSellAssets = Partial<Record<SellAssetSlotId, ResolvedSellAsset>>;

export function sellAssetPublicPath(file: string): string {
  return `/vender/${file}`;
}

// Solo los slots cuyo archivo existe.
export function resolveSellAssets(publicDir = path.join(process.cwd(), 'public')): ResolvedSellAssets {
  const resolved: ResolvedSellAssets = {};
  for (const slot of SELL_ASSET_SLOTS) {
    const publicPath = sellAssetPublicPath(slot.file);
    if (!existsSync(path.join(publicDir, publicPath))) continue;
    resolved[slot.id] = { src: publicPath, alt: slot.alt };
  }
  return resolved;
}
