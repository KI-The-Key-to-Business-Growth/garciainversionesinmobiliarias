import { redirect } from 'next/navigation';

type PropiedadesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// /propiedades dejó de ser un catálogo público mezclado: las entradas de catálogo son /comprar y
// /alquilar. Las fichas /propiedades/[id] siguen siendo las URLs canónicas de cada propiedad. Un
// link viejo con filtros conserva los filtros y cae en la intención correcta según `operacion`.
export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const params = (await searchParams) || {};
  const operation = Array.isArray(params.operacion) ? params.operacion[0] : params.operacion;
  const target = operation === 'alquiler' || operation === 'temporario' ? '/alquilar' : '/comprar';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'operacion' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  const queryString = query.toString();
  redirect(queryString ? `${target}?${queryString}` : target);
}
