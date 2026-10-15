import type { Metadata } from 'next';
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import SellView from '@/components/sell/SellView';
import { resolveSellAssets } from '@/lib/sell-assets';

export const metadata: Metadata = {
  title: 'Vender | García Inversiones Inmobiliarias',
  description:
    'Analizamos la propiedad, su contexto y tu objetivo antes de definir cómo conviene presentarla y salir al mercado.',
  alternates: { canonical: '/vender' },
};

export default function VenderPage() {
  return (
    <>
      <Header />
      <main>
        <SellView assets={resolveSellAssets()} />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
