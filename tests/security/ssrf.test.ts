import { describe, it, expect } from 'vitest';
import { isPublicHttpsUrl, sanitizeImageUrl, sanitizeVideoUrl } from '@/lib/security/ssrf';

describe('isPublicHttpsUrl (anti-SSRF)', () => {
  it('acepta https público con extensión de imagen', () => {
    expect(isPublicHttpsUrl('https://cdn.2clics.com.ar/foto.jpg')).toBe(true);
    expect(isPublicHttpsUrl('https://cdn.example.com/img')).toBe(true); // sin extensión ok
  });
  it('rechaza http no seguro', () => {
    expect(isPublicHttpsUrl('http://cdn.example.com/foto.jpg')).toBe(false);
  });
  it('rechaza localhost y loopback', () => {
    expect(isPublicHttpsUrl('https://localhost/foto.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://127.0.0.1/foto.jpg')).toBe(false);
  });
  it('rechaza IPs privadas', () => {
    expect(isPublicHttpsUrl('https://10.0.0.5/x.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://192.168.1.1/x.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://172.16.0.1/x.jpg')).toBe(false);
  });
  it('rechaza cloud metadata', () => {
    expect(isPublicHttpsUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPublicHttpsUrl('https://metadata.google.internal/x')).toBe(false);
  });
  it('rechaza extensiones peligrosas', () => {
    expect(isPublicHttpsUrl('https://cdn.example.com/payload.exe')).toBe(false);
  });
});

describe('sanitizeImageUrl', () => {
  it('devuelve la URL si es válida, vacío si no', () => {
    expect(sanitizeImageUrl('https://cdn.example.com/foto.webp')).toBe(
      'https://cdn.example.com/foto.webp',
    );
    expect(sanitizeImageUrl('https://10.0.0.1/x.jpg')).toBe('');
  });
});

describe('sanitizeVideoUrl', () => {
  it('acepta https público sin restricción de extensión', () => {
    expect(sanitizeVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube.com/watch?v=abc',
    );
  });
  it('rechaza IPs privadas y http', () => {
    expect(sanitizeVideoUrl('https://192.168.0.2/v')).toBe('');
    expect(sanitizeVideoUrl('http://youtube.com/x')).toBe('');
  });
});
