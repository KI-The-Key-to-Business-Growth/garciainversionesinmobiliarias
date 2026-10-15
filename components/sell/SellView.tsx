import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ResolvedSellAsset, ResolvedSellAssets } from '@/lib/sell-assets';

// /vender (V2.2) — la página narra cómo trabaja García con un propietario:
// entender → analizar → posicionar → presentar → comercializar → acompañar.
// Sin claims de velocidad, precio ni resultado. Las fotos salen solo de slots locales
// (lib/sell-assets.ts); sin archivo, cada bloque se arma tipográficamente.

const CONTACT_HREF = '/contacto';

type Stage = { title: string; paragraphs: string[] };

const STAGES: Stage[] = [
  {
    title: 'Entendemos la propiedad y el objetivo',
    paragraphs: [
      'Conocemos el inmueble, sus características y el contexto de la venta. También entendemos qué espera lograr el propietario y si existen tiempos o condiciones que debamos considerar.',
    ],
  },
  {
    title: 'Analizamos el mercado y definimos el posicionamiento',
    paragraphs: [
      'Revisamos la información disponible, propiedades comparables, oferta que compite en el mercado y características particulares del inmueble para definir una estrategia de salida.',
    ],
  },
  {
    title: 'Preparamos la propiedad para comunicarla',
    paragraphs: [
      'Definimos qué necesitamos mostrar y de qué manera.',
      'Según cada propiedad, podemos producir fotografía, video, tomas de dron y materiales digitales que ayuden a presentarla con claridad y a destacar lo que realmente tiene valor.',
    ],
  },
  {
    title: 'Salimos al mercado y gestionamos el interés',
    paragraphs: [
      'Publicamos en los canales definidos, atendemos consultas, coordinamos visitas y hacemos seguimiento de las personas interesadas.',
      'No se trata solamente de generar contactos, sino de entender qué respuesta está teniendo la propiedad y qué información nos devuelve el mercado.',
    ],
  },
  {
    title: 'Negociamos y acompañamos la operación',
    paragraphs: [
      'Cuando aparece una propuesta concreta, acompañamos la conversación, la negociación y las distintas etapas necesarias para avanzar hacia la operación.',
      'Nuestro trabajo no termina cuando alguien consulta.',
    ],
  },
];

const STRATEGY_FACTORS = [
  { label: 'Propiedad', text: 'Qué tiene, cómo está, dónde se encuentra y qué la diferencia.' },
  { label: 'Mercado', text: 'Con qué alternativas compite y qué está ocurriendo en ese segmento.' },
  { label: 'Objetivo', text: 'Qué busca conseguir el propietario y en qué contexto.' },
  { label: 'Presentación', text: 'Cómo hacemos visible lo que realmente merece ser mostrado.' },
];

const INCLUDED = [
  'Análisis de la propiedad y su contexto.',
  'Definición de posicionamiento y estrategia comercial.',
  'Preparación y comunicación según cada inmueble.',
  'Publicación y difusión en los canales correspondientes.',
  'Gestión de consultas, visitas y seguimiento.',
  'Negociación y acompañamiento de la operación.',
];

function stageNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function SellPhoto({ asset, className, sizes }: { asset: ResolvedSellAsset; className: string; sizes: string }) {
  return (
    <div className={`sell-photo ${className}`}>
      <Image src={asset.src} alt={asset.alt} fill sizes={sizes} style={{ objectFit: 'cover', objectPosition: 'center' }} />
    </div>
  );
}

export default function SellView({ assets = {} }: { assets?: ResolvedSellAssets }) {
  const propertyPhoto = assets.SELL_ASSET_01;
  const productionPhotos = [assets.SELL_ASSET_02, assets.SELL_ASSET_03].filter(
    (asset): asset is ResolvedSellAsset => Boolean(asset),
  );
  const managementPhoto = assets.SELL_ASSET_04;

  return (
    <>
      {/* 1. Hero */}
      <section className="twoclics-catalog-hero twoclics-catalog-hero--compact sell-hero">
        <div className="container">
          <h1>Vender una propiedad empieza por entender qué necesitás lograr.</h1>
          <p>
            Analizamos la propiedad, su contexto y tu objetivo antes de definir cómo conviene
            presentarla y salir al mercado.
          </p>
          <div className="sell-hero-cta">
            <Link className="btn btn-primary" href={CONTACT_HREF}>
              Quiero conversar sobre mi propiedad
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Antes de publicar */}
      <section className="sell-block">
        <div className="container">
          <div className="sell-lead reveal">
            <h2>No empezamos por el aviso.</h2>
            <div className="sell-lead-copy">
              <p>
                Cada venta tiene un contexto distinto. Antes de definir un precio o publicar una
                propiedad, buscamos entender qué se está vendiendo, cuál es la situación del
                propietario y qué espera conseguir con la operación.
              </p>
              <p>
                A partir de eso analizamos cómo posicionarla, cómo presentarla y qué estrategia
                comercial puede tener más sentido.
              </p>
            </div>
          </div>
          {propertyPhoto ? (
            <SellPhoto asset={propertyPhoto} className="sell-photo--wide reveal" sizes="(max-width: 780px) 100vw, 1240px" />
          ) : null}
        </div>
      </section>

      {/* 3. Cómo trabajamos — grilla 2 + 2 + 1; en mobile, carril horizontal */}
      <section className="sell-block sell-block--process">
        <div className="container">
          <h2 className="sell-heading reveal">Cómo trabajamos</h2>
          <ol className="sell-stages reveal">
            {STAGES.map((stage, index) => (
              <li key={stage.title} className="sell-stage">
                <span className="sell-stage-index">{stageNumber(index)}</span>
                <div className="sell-stage-body">
                  <h3>{stage.title}</h3>
                  {stage.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Precio y posicionamiento */}
      <section className="sell-block">
        <div className="container">
          <div className="sell-lead reveal">
            <h2>El precio es una parte de la estrategia, no toda la estrategia.</h2>
            <div className="sell-lead-copy">
              <p>
                Una propiedad puede estar bien presentada y mal posicionada, o tener un precio
                razonable pero una comunicación que no ayuda a entenderla.
              </p>
              <p>Por eso analizamos en conjunto:</p>
            </div>
          </div>
          <dl className="sell-factors reveal">
            {STRATEGY_FACTORS.map((factor) => (
              <div key={factor.label} className="sell-factor">
                <dt>{factor.label}</dt>
                <dd>{factor.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 5. Producción y presentación */}
      <section className={`sell-block sell-block--production${productionPhotos.length ? ' has-photos' : ''}`}>
        <div className="container">
          <div className="sell-production reveal">
            <div className="sell-production-copy">
              <h2>Mostrar bien una propiedad también forma parte de venderla.</h2>
              <p>
                La presentación no reemplaza al producto ni al precio, pero puede ayudar a que una
                persona entienda mejor qué está viendo.
              </p>
              <p>
                Según el inmueble y la estrategia definida, García puede desarrollar fotografía,
                video, tomas aéreas y piezas de comunicación para construir una presentación
                coherente en todos los canales.
              </p>
            </div>
            <blockquote className="sell-quote">
              <p>
                No producimos contenido para hacer que una propiedad parezca algo que no es. Lo
                usamos para mostrarla mejor.
              </p>
            </blockquote>
          </div>
          {productionPhotos.length ? (
            <div className={`sell-production-media sell-production-media--${productionPhotos.length} reveal`}>
              {productionPhotos.map((asset) => (
                <SellPhoto key={asset.src} asset={asset} className="sell-photo--production" sizes="(max-width: 780px) 100vw, 620px" />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* 6. Gestión comercial */}
      <section className="sell-block">
        <div className="container">
          <div className={`sell-management reveal${managementPhoto ? ' has-photo' : ''}`}>
            {managementPhoto ? (
              <SellPhoto asset={managementPhoto} className="sell-photo--side" sizes="(max-width: 780px) 100vw, 560px" />
            ) : null}
            <div className="sell-management-copy">
              <h2>Cada consulta necesita seguimiento.</h2>
              <p>Publicar una propiedad no significa esperar a que llegue el comprador.</p>
              <p>
                Respondemos consultas, coordinamos visitas, escuchamos objeciones y devoluciones,
                hacemos seguimiento y mantenemos al propietario informado sobre lo que sucede
                durante la comercialización.
              </p>
              <p className="sell-management-note">
                Si la respuesta del mercado indica que conviene revisar una decisión, lo
                conversamos antes de cambiar la estrategia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Transparencia — bloque navy */}
      <section className="sell-statement">
        <div className="container sell-statement-inner reveal">
          <h2>Información clara para tomar decisiones durante todo el proceso.</h2>
          <p>
            No podemos prometer cuánto va a tardar una venta ni asegurar de antemano cuál será el
            resultado final.
          </p>
          <p className="sell-statement-strong">
            Sí podemos analizar, explicar lo que estamos viendo, trabajar la presentación,
            gestionar el interés y acompañar cada decisión con transparencia.
          </p>
        </div>
      </section>

      {/* 8. Qué incluye */}
      <section className="sell-block">
        <div className="container">
          <h2 className="sell-heading reveal">Qué incluye nuestro trabajo</h2>
          <ul className="sell-included reveal">
            {INCLUDED.map((item, index) => (
              <li key={item}>
                <span className="sell-included-index">{stageNumber(index)}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Cierre */}
      <section className="section-sm project-cta-final sell-cta-final">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Estás pensando en vender una propiedad?</h2>
              <p>
                Conversemos primero sobre la propiedad y tu situación. Después podremos analizar
                cuál puede ser la mejor forma de llevarla al mercado.
              </p>
            </div>
            <Link className="btn btn-primary" href={CONTACT_HREF}>
              Hablar con García
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
