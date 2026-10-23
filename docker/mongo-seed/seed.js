// Datos de demo (rama demo-sample-data). Lo ejecuta el servicio `mongo-seed` de docker-compose.yml con
// mongosh contra la base de MONGODB_URI. Todos los datos son ficticios.
//
// Idempotente: inserta o actualiza cada documento por su clave (login, CIF, código, nombre), así que no borra
// nada que no sea de la demo y cada `docker compose up -d` deja los datos de demo como aquí se definen.
// Los roles no se cargan: los crea el servidor al arrancar (ensureDefaultRoles).

/* global db, print -- globales de mongosh */

const now = new Date();

function upsert(collection, key, fields, onInsert = {}) {
  db.getCollection(collection).updateOne(
    key,
    { $set: { ...key, ...fields, updatedAt: now }, $setOnInsert: { createdAt: now, ...onInsert } },
    { upsert: true },
  );
}

// ── Usuarios ─────────────────────────────────────────────────────────────────────────────────────────────
// Contraseña de todos: Demo1234! (bcrypt, coste 10, como apps/server/src/utils/password.ts).
const DEMO_PASSWORD_HASH = '$2a$10$5wAfCAIvZkI2bSpUf75zeOYTj9JCbOG.6BMlfxQe5WEGozuMd514a';

const users = [
  { login: 'admin@demo.local', name: 'Laura Martínez', role: 'Administrador', status: 'Activo' },
  { login: 'comercial@demo.local', name: 'Javier Soler', role: 'Comercial', status: 'Activo' },
  { login: 'almacen@demo.local', name: 'Marta Ferrer', role: 'Almacén', status: 'Activo' },
  {
    login: 'administracion@demo.local',
    name: 'Pablo Ruiz',
    role: 'Administración',
    status: 'Activo',
  },
  { login: 'bloqueado@demo.local', name: 'Sergio Navarro', role: 'Comercial', status: 'Bloqueado' },
];

for (const { login, ...user } of users) {
  upsert(
    'users',
    { login },
    { ...user, passwordHash: DEMO_PASSWORD_HASH, isBootstrap: false },
    { theme: null, tableDensity: null, moneyFormat: null, homeScreen: null, lastLoginAt: null },
  );
}

// ── Proveedores ──────────────────────────────────────────────────────────────────────────────────────────
const suppliers = [
  { cif: 'B46123401', name: 'Aceites Sierra de Espadán', leadTimeDays: 5, yearPurchases: 48210.75 },
  { cif: 'B46123402', name: 'Conservas del Grao', leadTimeDays: 3, yearPurchases: 31480.2 },
  { cif: 'A46123403', name: 'Harinas y Pastas Turia', leadTimeDays: 4, yearPurchases: 22915.6 },
  { cif: 'B03123404', name: 'Legumbres La Marina', leadTimeDays: 7, yearPurchases: 9870.0 },
  {
    cif: 'B12123405',
    name: 'Aguas de Montanejos Distribución',
    leadTimeDays: 2,
    yearPurchases: 18340.9,
  },
  { cif: 'B46123406', name: 'Refrescos Levante', leadTimeDays: 2, yearPurchases: 27655.45 },
  {
    cif: 'B46123407',
    name: 'Bodegas Utiel-Requena Selección',
    leadTimeDays: 10,
    yearPurchases: 15420.0,
  },
  { cif: 'B46123408', name: 'Limpiezas Albufera', leadTimeDays: 4, yearPurchases: 12760.3 },
  { cif: 'B03123409', name: 'Papelera Alcoyana', leadTimeDays: 6, yearPurchases: 8935.15 },
  {
    cif: 'B46123410',
    name: 'Higiene Personal Mediterránea',
    leadTimeDays: null,
    yearPurchases: 4120.0,
  },
  {
    cif: 'B46123411',
    name: 'Embutidos Requena (antiguo)',
    leadTimeDays: 5,
    yearPurchases: 0,
    active: false,
  },
  {
    cif: 'B12123412',
    name: 'Cafés Castellón (antiguo)',
    leadTimeDays: null,
    yearPurchases: 0,
    active: false,
  },
];

for (const { cif, active = true, ...supplier } of suppliers) {
  upsert('suppliers', { cif }, { ...supplier, active });
}

const supplierId = (cif) => db.suppliers.findOne({ cif }, { _id: 1 })._id;

// ── Productos ────────────────────────────────────────────────────────────────────────────────────────────
const C = {
  aceites: ['alimentacion', 'Alimentación', 'aceites', 'Aceites'],
  conservas: ['alimentacion', 'Alimentación', 'conservas', 'Conservas'],
  pastas: ['alimentacion', 'Alimentación', 'pastas', 'Pastas y harinas'],
  legumbres: ['alimentacion', 'Alimentación', 'legumbres', 'Legumbres'],
  aguas: ['bebidas', 'Bebidas', 'aguas', 'Aguas'],
  refrescos: ['bebidas', 'Bebidas', 'refrescos', 'Refrescos'],
  vinos: ['bebidas', 'Bebidas', 'vinos', 'Vinos'],
  limpieza: ['drogueria', 'Droguería', 'limpieza', 'Limpieza'],
  papel: ['drogueria', 'Droguería', 'papel', 'Papel'],
  higiene: ['higiene', 'Higiene', null, null],
};

// [código, nombre, categoría, CIF del proveedor, stock, mínimo, precio]
const products = [
  ['ACE-0101', 'Aceite de oliva virgen extra 5 L', C.aceites, 'B46123401', 84, 20, 34.9],
  ['ACE-0102', 'Aceite de oliva virgen extra 1 L (caja 12)', C.aceites, 'B46123401', 12, 15, 98.4],
  ['ACE-0103', 'Aceite de girasol 5 L', C.aceites, 'B46123401', 0, 10, 12.75],
  ['CON-0201', 'Atún claro en aceite pack 3×80 g', C.conservas, 'B46123402', 240, 60, 3.15],
  ['CON-0202', 'Tomate triturado 400 g (caja 24)', C.conservas, 'B46123402', 35, 40, 14.4],
  ['CON-0203', 'Pimiento del piquillo 250 g', C.conservas, 'B46123402', 96, 24, 2.6],
  ['PAS-0301', 'Macarrones 1 kg (fardo 10)', C.pastas, 'A46123403', 58, 20, 11.9],
  ['PAS-0302', 'Espaguetis 500 g (fardo 20)', C.pastas, 'A46123403', 44, 20, 12.8],
  ['PAS-0303', 'Harina de trigo 1 kg (fardo 10)', C.pastas, 'A46123403', 7, 15, 8.5],
  ['LEG-0401', 'Garbanzo cocido 400 g (caja 12)', C.legumbres, 'B03123404', 30, 12, 9.6],
  ['LEG-0402', 'Lenteja pardina 1 kg', C.legumbres, 'B03123404', 0, 20, 2.35],
  ['AGU-0501', 'Agua mineral 1,5 L (pack 6)', C.aguas, 'B12123405', 320, 100, 2.1],
  ['AGU-0502', 'Agua mineral 0,5 L (pack 24)', C.aguas, 'B12123405', 150, 80, 5.4],
  ['REF-0601', 'Refresco de naranja 2 L', C.refrescos, 'B46123406', 64, 48, 1.45],
  ['REF-0602', 'Refresco de cola lata 33 cl (pack 24)', C.refrescos, 'B46123406', 18, 30, 13.2],
  ['REF-0603', 'Horchata 1 L (caja 6)', C.refrescos, 'B46123406', 42, 12, 10.5],
  ['VIN-0701', 'Vino tinto Bobal crianza 75 cl', C.vinos, 'B46123407', 72, 24, 6.8],
  ['VIN-0702', 'Cava brut nature 75 cl', C.vinos, 'B46123407', 4, 12, 7.95],
  ['LIM-0801', 'Lejía 2 L (caja 6)', C.limpieza, 'B46123408', 110, 30, 6.6],
  ['LIM-0802', 'Friegasuelos 1,5 L', C.limpieza, 'B46123408', 26, 24, 1.9],
  ['LIM-0803', 'Lavavajillas a mano 1 L', C.limpieza, 'B46123408', 0, 18, 1.55],
  ['PAP-0901', 'Papel higiénico doble capa (pack 12)', C.papel, 'B03123409', 90, 40, 4.75],
  ['PAP-0902', 'Rollo de cocina (pack 6)', C.papel, 'B03123409', 22, 30, 5.2],
  ['HIG-1001', 'Gel de ducha 750 ml', C.higiene, 'B46123410', 48, 12, 2.4],
  ['HIG-1002', 'Champú 400 ml', C.higiene, null, 15, 12, 2.95],
];

for (const [
  code,
  name,
  [categoryId, category, subcategoryId, subcategory],
  cif,
  stock,
  minStock,
  price,
] of products) {
  upsert(
    'products',
    { code },
    {
      name,
      categoryId,
      category,
      subcategoryId,
      subcategory,
      supplier: cif ? supplierId(cif) : null,
      stock,
      minStock,
      price,
    },
  );
}

// ── Clientes ─────────────────────────────────────────────────────────────────────────────────────────────
// [nombre, población, riesgo máximo (null = sin límite), saldo pendiente, último pedido]
const customers = [
  ['Bar Restaurante El Racó', 'Gandia', 3000, 420.5, '2026-10-21'],
  ['Ultramarinos Hermanos Peris', 'Alzira', 5000, 2890.0, '2026-10-19'],
  ['Supermercado La Plaça', 'Sueca', 12000, 10840.35, '2026-10-22'],
  ['Cafetería Central', 'Valencia', 1500, 0, '2026-09-30'],
  ['Hostal Mar Blau', 'Cullera', 4000, 1650.8, '2026-10-12'],
  ['Comestibles Doña Amparo', 'Xàtiva', 2000, 2150.0, '2026-08-28'],
  ['Restaurante Arrocería La Barraca', 'El Palmar', 6000, 1980.25, '2026-10-20'],
  ['Autoservicio Montaña', 'Ontinyent', null, 3540.6, '2026-10-15'],
  ['Colegio Sagrado Corazón (comedor)', 'Torrent', 8000, 0, '2026-10-01'],
  ['Pizzería Bella Napoli', 'Burjassot', 2500, 960.0, '2026-10-18'],
  ['Mercado Municipal · Puesto 14', 'Paterna', 1000, 120.0, '2026-07-14'],
  ['Hotel Playa Levante', 'Benidorm', 15000, 6720.4, '2026-10-16'],
  ['Tienda Gourmet Sabors', 'Dénia', 3500, -80.0, '2026-10-09'],
  ['Club Náutico Oliva', 'Oliva', null, 0, null],
  ['Bar La Esquina', null, 1200, 1140.0, '2026-10-02'],
];

for (const [name, city, maxRisk, balance, lastOrder] of customers) {
  upsert(
    'customers',
    { name },
    {
      city,
      maxRisk,
      balance,
      lastOrderDate: lastOrder ? new Date(`${lastOrder}T00:00:00Z`) : null,
    },
  );
}

print(
  `Datos de demo cargados en «${db.getName()}»: ${users.length} usuarios, ${suppliers.length} proveedores, ` +
    `${products.length} productos y ${customers.length} clientes.`,
);
