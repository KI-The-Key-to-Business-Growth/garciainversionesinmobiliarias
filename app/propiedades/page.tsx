import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import PropertiesComingSoon from '@/components/sections/PropertiesComingSoon';
import { PROPERTIES_ENABLED } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Propiedades | García Inversiones Inmobiliarias',
  description:
    'Propiedades seleccionadas en Argentina y mercados internacionales: Estados Unidos, Uruguay, Dubái y España.',
  alternates: { canonical: '/propiedades' },
};

export default function PropiedadesPage() {
  return (
    <>
      <Header />
      <main>
        {/* Fase 5: cuando PROPERTIES_ENABLED=true se renderiza el listado con filtros
            (PropertyFilters + PropertyGrid) consumiendo searchProperties(). */}
        {PROPERTIES_ENABLED ? <PropertiesComingSoon /> : <PropertiesComingSoon />}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
