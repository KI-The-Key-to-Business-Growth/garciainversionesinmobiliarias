import { redirect } from 'next/navigation';
import { getActiveInvestmentOpportunities } from '@/lib/site-curation';

// Compatibilidad: esta ruta era la experiencia principal de "Proyectos especiales" en la primera
// pasada de V2 (rechazada). Con una sola oportunidad real hoy, ya no tiene sentido como landing
// propia — redirige a la landing específica activa (o a /invertir si no hubiera ninguna).
export default function ProyectosEspecialesRedirectPage() {
  const [first] = getActiveInvestmentOpportunities();
  redirect(first ? `/invertir/${first.slug}` : '/invertir');
}
