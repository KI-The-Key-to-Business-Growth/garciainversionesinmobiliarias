import { describe, expect, it } from 'vitest';
import { buildPropertyInquiryLead } from '@/lib/2clics/property-inquiry';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

function fd(obj: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(obj)) formData.set(key, value);
  return formData;
}

describe('2Clics property inquiry payload', () => {
  it('builds a property-specific lead message with property_app_id and public context', () => {
    const result = buildPropertyInquiryLead(
      fd({
        property_app_id: '206734',
        property_region: 'US',
        property_title: 'Departamento en Miami',
        page_url: 'http://localhost:3000/propiedades/206734',
        name: 'Ana Garcia',
        email: 'ana@example.com',
        phone: '+1 305 555 1234',
        message: 'Quiero coordinar una visita.',
        _form_loaded_at: String(Date.now() - 5000),
      }),
      HUMAN_UA,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.region).toBe('US');
    expect(result.payload.input.property_app_id).toBe(206734);
    expect(result.payload.input.development_app_id).toBeUndefined();
    expect(result.payload.input.message).toContain('Quiero coordinar una visita.');
    expect(result.payload.input.message).toContain('Departamento en Miami');
    expect(result.payload.input.message).toContain('http://localhost:3000/propiedades/206734');
    expect(JSON.stringify(result.payload)).not.toContain('api_key');
  });

  it('rejects submissions without a valid property id', () => {
    const result = buildPropertyInquiryLead(
      fd({
        property_app_id: '',
        property_region: 'AR',
        name: 'Ana Garcia',
        email: 'ana@example.com',
        phone: '+54 9 11 5555 5555',
        message: 'Me interesa.',
        _form_loaded_at: String(Date.now() - 5000),
      }),
      HUMAN_UA,
    );

    expect(result).toMatchObject({
      ok: false,
      state: { ok: false, message: 'No pudimos identificar la propiedad.' },
    });
  });
});
