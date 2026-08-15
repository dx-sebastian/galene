/* ═══════════════════════════════════════════════════════════════════
   EL CATÁLOGO DE PREVENCIÓN — una sola fuente para dos vistas.

   Los datos salieron del componente cuando cada pieza ganó su propia
   página: el mostrador (/productos) y la ficha (/productos/<id>) leen
   de aquí, y así el nombre de un producto no puede decir una cosa en
   la lista y otra dentro.

   QUÉ ES CADA CAMPO, y por qué hay dos textos:

   · lema — una frase. Es TODO lo que se lee en el mostrador, junto al
     nombre y la foto: el dueño mandó quitar los sellos y recortar el
     texto de las tarjetas, y lo que queda tiene que vender solo.
   · gancho — el resumen de una línea. Lo usa la descripción social de
     la ficha (og:description); en la tarjeta ya no se pinta.
   · descripcion — los párrafos de verdad. Viven en la ficha, donde
     hay sitio para leerlos.
   · especs — la tabla. En el mostrador no aparece; en la ficha va
     abierta, sin plegar: quien entró a la ficha vino a esto.

   (El campo `sello` —«Reutilizable», «Un solo uso»— se retiró con los
   badges. Lo que decía vive en las especificaciones, dentro de la
   ficha, que es donde se compara de verdad.)

   LAS TRES REGLAS DE LA SECCIÓN siguen en pie (ver Acerca):
   nada promete seguridad total, nada traslada la carga a quien lo
   sufre, y no hay precio mientras la importación se esté cerrando.
   ═══════════════════════════════════════════════════════════════════ */

export const PRODUCTOS = [
  {
    id: 'funda-coletero',
    nombre: 'La funda coletero',
    lema: 'Se lleva en la muñeca. Cuida tu copa.',
    gancho: 'De día es un coletero; de noche se abre sobre la boca del vaso.',
    descripcion: [
      'Una funda de tela elástica que durante el día es un coletero y ' +
      'por la noche se abre sobre la boca de tu vaso o tu copa. ' +
      'Discreta hasta que hace falta.',
      'Se estira sobre el borde y deja un ojal para el pitillo: puedes ' +
      'beber sin destaparla. Cuando termines vuelve a la muñeca, se ' +
      'lava a mano y aguanta cientos de noches.',
    ],
    especs: [
      ['Material', 'Tela elástica, lavable a mano'],
      ['Sirve para', 'Vasos y copas de boca ancha'],
      ['Se lleva', 'Como coletero, en la muñeca o el pelo'],
      ['Vida útil', 'Reutilizable, cientos de noches'],
    ],
  },
  {
    id: 'sombrero-lata',
    nombre: 'El sombrero de lata',
    lema: 'La lata también sale de noche.',
    gancho: 'Tapa de silicona a presión para latas estándar.',
    descripcion: [
      'Una tapa de silicona que se ajusta a presión sobre cualquier ' +
      'lata estándar y deja pasar solo tu propio sorbo. Se enjuaga y ' +
      'vuelve al bolso.',
      'La lata es el envase que más se deja solo en una mesa, porque ' +
      'parece cerrada y no lo está. Este capuchón la cierra de verdad ' +
      'entre sorbo y sorbo, y se nota al tacto si alguien lo movió.',
    ],
    especs: [
      ['Material', 'Silicona de grado alimentario'],
      ['Sirve para', 'Latas estándar y delgadas'],
      ['Se lleva', 'Plano, en cualquier bolsillo'],
      ['Vida útil', 'Reutilizable, apto para enjuague'],
    ],
  },
  {
    id: 'funda-llavero',
    nombre: 'La funda de llavero',
    lema: 'La que siempre está, porque vive en tus llaves.',
    gancho: 'La misma funda elástica, plegada en un estuche de llavero.',
    descripcion: [
      'La misma funda elástica, plegada dentro de un estuche que cuelga ' +
      'del llavero. Para la noche que no estaba planeada, que es la ' +
      'mayoría.',
      'Sales a hacer un mandado, alguien propone una cerveza y ya no ' +
      'vuelves a casa a buscar nada: la funda salió contigo cuando ' +
      'cogiste las llaves. El estuche la mantiene limpia en el bolso.',
    ],
    especs: [
      ['Material', 'Estuche de polipiel, funda de tela elástica'],
      ['Sirve para', 'Vasos y copas de boca ancha'],
      ['Se lleva', 'En las llaves, siempre'],
      ['Vida útil', 'Reutilizable; el estuche la protege'],
    ],
  },
  {
    id: 'sellos',
    nombre: 'Los sellos adhesivos',
    lema: 'Un sello discreto para vasos que van y vienen.',
    gancho: 'Láminas adhesivas con sitio para el pitillo. El sello roto avisa.',
    descripcion: [
      'Láminas adhesivas que sellan la boca del vaso y dejan sitio para ' +
      'el pitillo. De un solo uso: se nota si alguien lo levantó, y esa ' +
      'es exactamente su función.',
      'Sirven para la noche de muchos vasos —uno por ronda— y para ' +
      'quien prefiere no llevar nada que haya que lavar. La hoja plana ' +
      'cabe en la billetera y no se nota al sentarse.',
    ],
    especs: [
      ['Material', 'Lámina adhesiva sin residuo'],
      ['Sirve para', 'Casi cualquier vaso, con o sin pitillo'],
      ['Se lleva', 'Hoja plana, cabe en la billetera'],
      ['Vida útil', 'Un uso por sello — el sello roto avisa'],
    ],
  },
  {
    id: 'tapon-botella',
    nombre: 'El tapón de botella',
    lema: 'La botella queda cerrada hasta que tú digas.',
    gancho: 'Capuchón de silicona para la botella entre sorbo y sorbo.',
    descripcion: [
      'Un capuchón de silicona que abraza la boca de la botella entre ' +
      'sorbo y sorbo. Para las noches largas en las que la botella se ' +
      'queda en la mesa y tú no.',
      'Vienen dos en cada paquete, y esa es la idea: uno para ti y uno ' +
      'para quien salió contigo. Cerrar dos botellas cuesta lo mismo ' +
      'que cerrar una.',
    ],
    especs: [
      ['Material', 'Silicona de grado alimentario'],
      ['Sirve para', 'Botellas de boca estándar'],
      ['Se lleva', 'Par de tapones, bolsillo o bolso'],
      ['Vida útil', 'Reutilizable, apto para enjuague'],
    ],
  },
];

/* El crédito de las fotografías va con los datos porque acompaña a la
   foto donde sea que se pinte: mostrador y ficha lo dicen igual. */
export const CREDITO_FOTOS =
  'Fotografías del fabricante (NightCap®), usadas en el marco del ' +
  'acuerdo de distribución.';
