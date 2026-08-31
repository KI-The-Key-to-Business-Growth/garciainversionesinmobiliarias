import { describe, expect, it } from 'vitest';
import { adaptPublicDevelopment, adaptPublicProperty } from '@/lib/2clics/adapters';
import { inspectPublicMetadata, parsePublicMetadata, stripInternalDescriptionTags } from '@/lib/2clics/metadata';

describe('parsePublicMetadata', () => {
  it('maps known public keys and keeps private values out', () => {
    const parsed = parsePublicMetadata([
      { metaKey: 'expenses', metaValue: '120000', metaId: '1' },
      { metaKey: 'expenses_currency', metaValue: 'AR$', metaId: '1b' },
      { metaKey: 'orientation', metaValue: 'Norte', metaId: '2' },
      { metaKey: 'description', metaValue: '<p>Texto con HTML</p>', metaId: '2a' },
      { metaKey: 'description_plain_text', metaValue: 'Texto limpio', metaId: '2b' },
      { metaKey: 'amount_bath', metaValue: '2', metaId: '2c' },
      { metaKey: 'amount_garage', metaValue: '1', metaId: '2d' },
      { metaKey: 'building_date_number', metaValue: '5', metaId: '2e' },
      { metaKey: 'building_date', metaValue: 'ESTRENAR', metaId: '2f' },
      { metaKey: 'private_note', metaValue: 'No publicar', metaId: '3' },
      { metaKey: 'info_contact', metaValue: 'Telefono privado', metaId: '3b' },
      { metaKey: 'unknown_publicish', metaValue: 'x', metaId: '4' },
    ]);

    expect(parsed.expenses).toBe('120000');
    expect(parsed.expensesCurrency).toBe('AR$');
    expect(parsed.orientation).toBe('Norte');
    expect(parsed.description).toBe('Texto limpio');
    expect(parsed.bathrooms).toBe('2');
    expect(parsed.garages).toBe('1');
    expect(parsed.antiquity).toBe('5 años');
    expect(parsed.condition).toBe('A estrenar');
    expect(JSON.stringify(parsed)).not.toContain('private_note');
    expect(JSON.stringify(parsed)).not.toContain('info_contact');
    expect(JSON.stringify(parsed)).not.toContain('unknown_publicish');
    expect(JSON.stringify(parsed)).not.toContain('No publicar');
    expect(JSON.stringify(parsed)).not.toContain('Telefono privado');
    expect(JSON.stringify(parsed)).not.toContain('ESTRENAR');

    const diagnostics = inspectPublicMetadata([
      { metaKey: 'expenses', metaValue: '120000', metaId: '1' },
      { metaKey: 'orientation', metaValue: 'Norte', metaId: '2' },
      { metaKey: 'private_note', metaValue: 'No publicar', metaId: '3' },
      { metaKey: 'info_contact', metaValue: 'Telefono privado', metaId: '3b' },
      { metaKey: 'unknown_publicish', metaValue: 'x', metaId: '4' },
    ]);
    expect(diagnostics.known).toEqual({ expenses: '120000', orientation: 'Norte' });
    expect(diagnostics.internalKeysPresent).toEqual(['private_note', 'info_contact']);
    expect(diagnostics.unknownPublicKeys).toEqual(['unknown_publicish']);
    expect(JSON.stringify(diagnostics)).not.toContain('No publicar');
    expect(JSON.stringify(diagnostics)).not.toContain('Telefono privado');
  });

  // Bug real confirmado 2026-08-26: el endpoint de DETALLE (`GET /api/property/{id}`) devuelve
  // `metaKey` = nombre semántico (ej. "amount_bath") + `metaId` = id numérico interno — el shape
  // que todos los tests/mocks de arriba ya usan. El endpoint de LISTADO/catálogo (`POST
  // /api/property`, usado por las cards) devuelve exactamente al revés: `metaKey` = id numérico +
  // `metaId` = nombre semántico. Probado contra la API real con la misma propiedad por ambos
  // endpoints. Sin este fix, cualquier campo derivado de meta_data (baños, cocheras, título
  // editorial, orientación, etc.) quedaba vacío para propiedades del catálogo aunque el dato
  // existiera, porque el código históricamente solo miraba `metaKey`.
  it('resuelve meta_data correctamente aunque metaKey/metaId vengan invertidos (shape del endpoint de listado)', () => {
    const parsed = parsePublicMetadata([
      { metaKey: '15257957', metaValue: 'Hermoso depto', metaId: 'title' },
      { metaKey: '14052216', metaValue: '2', metaId: 'amount_bath' },
      { metaKey: '14052217', metaValue: '1', metaId: 'amount_garage' },
      { metaKey: '14052218', metaValue: 'ESTRENAR', metaId: 'building_date' },
      { metaKey: '15257693', metaValue: 'Info confidencial del propietario', metaId: 'private_note' },
    ]);

    expect(parsed.title).toBe('Hermoso depto');
    expect(parsed.bathrooms).toBe('2');
    expect(parsed.garages).toBe('1');
    expect(parsed.condition).toBe('A estrenar');
    expect(JSON.stringify(parsed)).not.toContain('private_note');
    expect(JSON.stringify(parsed)).not.toContain('Info confidencial');

    const diagnostics = inspectPublicMetadata([
      { metaKey: '111', metaValue: 'x', metaId: 'unknown_publicish' },
      { metaKey: '112', metaValue: 'Info confidencial', metaId: 'private_note' },
    ]);
    expect(diagnostics.unknownPublicKeys).toEqual(['unknown_publicish']);
    expect(diagnostics.internalKeysPresent).toEqual(['private_note']);
  });

  // WEB GARCÍA V2 (Desarrollos, décima pasada) — la descripción pública de la propiedad 187676
  // (fuente de Faena) trae un tag interno de CRM/broker confirmado contra datos reales:
  // "[FABIANAGA-456]" como prefijo, seguido de una línea en blanco. `cleanMetaValue` (llamado por
  // `parseMetadata` para target === 'description') lo saca ANTES de que `metadata.description`
  // llegue a cualquier página — /propiedades/[id], /desarrollos y /desarrollos/[slug] leen todas
  // el mismo campo ya saneado, sin tocar la respuesta cruda de 2Clics.
  it('quita el tag interno "[FABIANAGA-<número>]" de la descripción pública sin tocar el resto del texto', () => {
    const parsed = parsePublicMetadata([
      {
        metaKey: 'description_plain_text',
        metaValue: '[FABIANAGA-456] Tras haber transformado Miami Beach en un centro global de arte, cultura, hospitalidad y diseño.',
      },
    ]);
    expect(parsed.description).toBe(
      'Tras haber transformado Miami Beach en un centro global de arte, cultura, hospitalidad y diseño.',
    );
    expect(parsed.description).not.toContain('FABIANAGA');
  });

  it('quita el tag real con salto de línea en blanco después (formato exacto confirmado contra 2Clics)', () => {
    const parsed = parsePublicMetadata([
      { metaKey: 'description_plain_text', metaValue: '[FABIANAGA-456]\n\nTras haber transformado Miami Beach...' },
    ]);
    expect(parsed.description).toBe('Tras haber transformado Miami Beach...');
  });

  it('reconoce variantes reales del mismo identificador (distintos números, confirmadas contra el dataset)', () => {
    for (const id of ['185', '490', '455', '427', '430', '428']) {
      const parsed = parsePublicMetadata([
        { metaKey: 'description_plain_text', metaValue: `[FABIANAGA-${id}]\n\n¡Bienvenido a un proyecto real!` },
      ]);
      expect(parsed.description).toBe('¡Bienvenido a un proyecto real!');
    }
  });

  it('NO borra corchetes legítimos que no coincidan con el patrón interno confirmado', () => {
    const parsed = parsePublicMetadata([
      { metaKey: 'description_plain_text', metaValue: 'Unidad reciclada [año 2020], a metros de la Rambla.' },
    ]);
    expect(parsed.description).toBe('Unidad reciclada [año 2020], a metros de la Rambla.');
  });

  it('stripInternalDescriptionTags: cobertura directa input/output (unitaria, sin pasar por meta_data)', () => {
    expect(stripInternalDescriptionTags('[FABIANAGA-456] Tras haber transformado Miami Beach...')).toBe(
      'Tras haber transformado Miami Beach...',
    );
    expect(stripInternalDescriptionTags('[FABIANAGA-456]\n\nTexto real.')).toBe('Texto real.');
    expect(stripInternalDescriptionTags('Sin ningún tag interno, texto normal.')).toBe(
      'Sin ningún tag interno, texto normal.',
    );
    expect(stripInternalDescriptionTags('Un texto con [corchetes legítimos] en el medio.')).toBe(
      'Un texto con [corchetes legítimos] en el medio.',
    );
  });
});

describe('2Clics public adapters', () => {
  it('adapts property detail without exposing raw agent contact data', () => {
    const property = adaptPublicProperty(
      {
        propertyId: 191127,
        address: 'Av. Corrientes',
        price: 150000,
        currency: 'USD',
        operationType: 'VENTA',
        webListing: 'DESTACADO',
        amountRoom: 3,
        amountBedroom: 2,
        coveredArea: 80,
        uncoveredArea: 20,
        totalArea: 100,
        state: { stateId: 1, name: 'Buenos Aires' },
        city: { cityId: 2, name: 'CABA' },
        neighborhood: { neighborhoodId: 3, name: 'Caballito' },
        images: [
          {
            imageId: 'img-1',
            url: 'https://cdn.2clics.com/front.jpg',
            thumbnailUrl: 'https://cdn.2clics.com/front-thumb.jpg',
          },
        ],
        meta_data: [
          { metaKey: 'garages', metaValue: '1' },
          { metaKey: 'amount_bath', metaValue: '2' },
          { metaKey: 'amount_room', metaValue: '3' },
          { metaKey: 'amount_bedroom', metaValue: '2' },
          { metaKey: 'covered_area', metaValue: '80' },
          { metaKey: 'total_area', metaValue: '100' },
          { metaKey: 'private_note', metaValue: 'No publicar' },
          { metaKey: 'unknown_publicish', metaValue: 'x' },
        ],
        amenities: [{ amenitieId: '10', name: 'Pileta', type: 'general' }],
        agent: {
          email: 'asesor@example.com',
          cellphone: '+5491111111111',
          fullName: 'Asesor',
        },
      },
      'AR',
    );

    expect(property.marketLabel).toBe('Buenos Aires');
    expect(property.propertyId).toBe(191127);
    expect(property.price).toBe(150000);
    expect(property.images[0]?.displayUrl).toBe('https://cdn.2clics.com/front.jpg');
    expect(property.metadata.garages).toBe('1');
    expect(property.metadata.bathrooms).toBe('2');
    expect(JSON.stringify(property)).not.toContain('asesor@example.com');
    expect(JSON.stringify(property)).not.toContain('private_note');
    expect(JSON.stringify(property)).not.toContain('unknown_publicish');
    expect(JSON.stringify(property)).not.toContain('No publicar');
  });

  it('uses the public URL slug before a doubtful address when metadata title is absent', () => {
    const property = adaptPublicProperty(
      {
        propertyId: 223702,
        address: 'avenida del Golf 1570, Nordelta Duplicado',
        url: 'https://www.garciainversiones.com.ar/propiedad/223702_departamento-en-alquiler-c-cochera-en-nordelta-sendero/',
      },
      'AR',
    );

    expect(property.title).toBe('Departamento en alquiler c cochera en nordelta sendero');
    expect(property.address).toBe('avenida del Golf 1570, Nordelta Duplicado');
  });

  it('classifies a Miami property by geographic data, not by credential region', () => {
    const property = adaptPublicProperty(
      {
        propertyId: 2020,
        address: 'Brickell Ave',
        state: { stateId: 12, name: 'Estados Unidos' },
        city: { cityId: 34, name: 'Florida' },
        neighborhood: { neighborhoodId: 56, name: 'Miami' },
      },
      'AR',
    );

    expect(property.region).toBe('US');
    expect(property.marketLabel).toBe('Miami');
  });

  it('keeps developments as their own public entity with unit references', () => {
    const development = adaptPublicDevelopment(
      {
        developmentId: 50,
        title: 'Torres del Sol',
        status: { statusId: 2, name: 'En construccion', appId: 'in_progress' },
        properties: [
          {
            propertyId: '1234',
            address: 'Unidad 3A',
            price: '150000',
            currency: 'USD',
            totalArea: '55',
          },
        ],
      },
      'AR',
    );

    expect(development.developmentId).toBe(50);
    expect(development.properties).toHaveLength(1);
    expect(development.properties[0]?.price).toBe(150000);
  });

  it('adapts a property whose description carries the internal CRM tag without exposing it in the public DTO', () => {
    const property = adaptPublicProperty(
      {
        propertyId: 187676,
        address: 'Faena, Miami',
        meta_data: [
          {
            metaKey: 'description_plain_text',
            metaValue: '[FABIANAGA-456]\n\nTras haber transformado Miami Beach en un centro global de arte.',
          },
        ],
      },
      'US',
    );
    expect(property.description).toBe('Tras haber transformado Miami Beach en un centro global de arte.');
    expect(JSON.stringify(property)).not.toContain('FABIANAGA');
  });

  it('classifies a Buenos Aires development by geographic data', () => {
    const development = adaptPublicDevelopment(
      {
        developmentId: 51,
        title: 'Proyecto BA',
        state: { stateId: 1, name: 'Bs.As. G.B.A. Norte' },
        city: { cityId: 2, name: 'Tigre' },
      },
      'US',
    );

    expect(development.region).toBe('AR');
    expect(development.marketLabel).toBe('Bs.As. G.B.A. Norte');
  });
});
