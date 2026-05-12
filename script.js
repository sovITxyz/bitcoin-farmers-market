/* ── i18n ─────────────────────────────────────────────── */
const I18N = {
  en: {
    'nav.markets': 'Markets',
    'nav.offerings': "What's there",
    'nav.gallery': 'Gallery',
    'nav.videos': 'Videos',
    'nav.connect': 'Connect',
    'hero.kicker': '⚡️ Have fun staying permissionless ⚡️',
    'hero.title': 'A Bi weekly bitcoin market on the Salvadoran coast.',
    'hero.preferred': 'Bitcoin preferido',
    'hero.cta1': 'Find a market',
    'hero.cta2': "What's there?",
    'hero.when': 'Every other Saturday · 10 AM – 4 PM',
    'about.title': 'A Salvadoran circular-economy market',
    'about.lead': 'Bitcoin Farmers Market started in El Zonte in July 2023 — born out of the Bitcoin Beach community and run by a small crew of locals and volunteers. Every other Saturday, vendors gather at <strong>Club Cocal</strong> on the Surf City coast to sell food, coffee, crafts, and more. <strong>Bitcoin is the preferred currency</strong>, but cash is welcome. Bring a bag, bring a friend, and come spend your sats.',
    'about.p1.t': 'Bitcoin preferred',
    'about.p1.b': 'Lightning, on-chain, NFC — pay how you like. <em>Efectivo aceptado</em>.',
    'about.p2.t': 'Hyper-local',
    'about.p2.b': 'Salvadoran farmers, makers, cooks, roasters. Fresh, hand-made, often organic.',
    'about.p3.t': 'Built by community',
    'about.p3.b': 'Birthed at Bitcoin Beach with help from the bitcoiners who call El Salvador home.',
    'markets.title': 'Find us at Club Cocal.',
    'markets.lead': 'Every other Saturday on the Surf City coast — vendors set up beachside at Club Cocal in La Libertad.',
    'markets.cocal.sub': 'El Cocal · Surf City · La Libertad',
    'markets.day': 'Saturday',
    'markets.biweekly': 'biweekly',
    'markets.directions': 'Directions',
    'markets.note': '📅 Markets run every other Saturday — follow our X/Insta for the next confirmed date.',
    'offerings.title': "What you'll find",
    'offerings.lead': 'A rotating cast of Salvadoran producers, cooks, makers, and roasters. A taste of what shows up:',
    'o.beef.t':  'Grass-fed beef',         'o.beef.b':  'Pasture-raised, locally butchered.',
    'o.bacon.t': 'Bacon & pulled pork',    'o.bacon.b': 'Cerdo deshilachada y bacon casero.',
    'o.coffee.t':'Specialty coffee',       'o.coffee.b':'Single-origin, fresh-roasted Salvadoran beans.',
    'o.bread.t': 'Sourdough & baked goods','o.bread.b': 'Pan masa madre, hand-shaped.',
    'o.butter.t':'Raw butter & dairy',     'o.butter.b':'Mantequilla cruda · leche.',
    'o.honey.t': 'Honey & cacao',          'o.honey.b': 'Miel pura, raw cacao.',
    'o.veg.t':   'Fruit & veg',            'o.veg.b':   'Productos orgánicos, picked this week.',
    'o.soap.t':  'Tallow & artisan soap',  'o.soap.b':  'Jabón de tallow · jabón artesanal.',
    'o.food.t':  'Hot food & ceviche',     'o.food.b':  'Empanadas, ceviche, BBQ — eat on the spot.',
    'o.crafts.t':'Artisans & jewelry',     'o.crafts.b':'Artesanías, joyería, hand-made gifts.',
    'o.books.t': 'Books & merch',          'o.books.b': 'Bitcoin books, BFM merch, Berlín gear.',
    'o.hw.t':    'Bitcoin hardware',       'o.hw.b':    'Wallets, signers, hardware on the table.',
    'gallery.title': 'From the market',
    'gallery.lead': 'Real vendors. Real stalls. Real Sundays. (Tap any photo to enlarge.)',
    'posters.title': 'Past flyers',
    'posters.lead': 'A few of our past Sunday market posters.',
    'videos.title': 'Watch the market',
    'videos.lead': 'Stories from El Zonte, El Salvador.',
    'vendor.title': 'Want to be a vendor?',
    'vendor.body': "Local farmer, baker, maker, cook, or roaster — we'd love to have you. Send us a DM on X or Instagram and we'll set you up for the next market.",
    'vendor.cta1': 'DM us on X',
    'vendor.cta2': 'DM on Instagram',
    'connect.title': 'Connect',
    'connect.lead': 'Follow along, find the next market, or reach out.',
    'connect.cocal':  'Club Cocal · Surf City',
    'footer.tag': 'Have fun staying permissionless',
  },
  es: {
    'nav.markets': 'Mercados',
    'nav.offerings': 'Qué hay',
    'nav.gallery': 'Galería',
    'nav.videos': 'Videos',
    'nav.connect': 'Conectar',
    'hero.kicker': '⚡️ Diviértete quedándote permissionless ⚡️',
    'hero.title': 'Un mercado bitcoin quincenal en la costa salvadoreña.',
    'hero.preferred': 'Bitcoin preferido',
    'hero.cta1': 'Encuentra un mercado',
    'hero.cta2': '¿Qué hay?',
    'hero.when': 'Cada otro sábado · 10 AM – 4 PM',
    'about.title': 'Un mercado salvadoreño de economía circular',
    'about.lead': 'Bitcoin Farmers Market nació en El Zonte en julio del 2023 — surgido de la comunidad de Bitcoin Beach y manejado por un pequeño equipo de locales y voluntarios. Cada dos sábados, los vendedores se reúnen en <strong>Club Cocal</strong>, en la costa de Surf City, para vender comida, café, artesanías y más. <strong>Bitcoin es la moneda preferida</strong>, pero se acepta efectivo. Trae tu bolsa, trae a un amigo, y ven a gastar tus sats.',
    'about.p1.t': 'Bitcoin preferido',
    'about.p1.b': 'Lightning, on-chain, NFC — paga como prefieras. <em>Efectivo aceptado</em>.',
    'about.p2.t': 'Hiper-local',
    'about.p2.b': 'Agricultores, artesanos, cocineros y tostadores salvadoreños. Fresco, hecho a mano, muchas veces orgánico.',
    'about.p3.t': 'Construido por la comunidad',
    'about.p3.b': 'Nació en Bitcoin Beach con ayuda de los bitcoiners que llaman a El Salvador su hogar.',
    'markets.title': 'Nos encuentras en Club Cocal.',
    'markets.lead': 'Cada dos sábados en la costa de Surf City — los vendedores se instalan frente al mar en Club Cocal, La Libertad.',
    'markets.cocal.sub': 'El Cocal · Surf City · La Libertad',
    'markets.day': 'Sábado',
    'markets.biweekly': 'cada dos semanas',
    'markets.directions': 'Cómo llegar',
    'markets.note': '📅 El mercado abre cada dos sábados — síguenos en X/Insta para la próxima fecha confirmada.',
    'offerings.title': 'Qué encontrarás',
    'offerings.lead': 'Una rotación de productores, cocineros, artesanos y tostadores salvadoreños. Una probada de lo que aparece:',
    'o.beef.t':  'Carne grass-fed',         'o.beef.b':  'De pastoreo, carneada localmente.',
    'o.bacon.t': 'Bacon y cerdo deshilada', 'o.bacon.b': 'Cerdo deshilachada y bacon casero.',
    'o.coffee.t':'Café de especialidad',    'o.coffee.b':'Granos salvadoreños frescos, single origin.',
    'o.bread.t': 'Pan masa madre',          'o.bread.b': 'Pan artesanal, formado a mano.',
    'o.butter.t':'Mantequilla cruda · leche','o.butter.b':'Productos lácteos crudos.',
    'o.honey.t': 'Miel y cacao',            'o.honey.b': 'Miel pura, cacao crudo.',
    'o.veg.t':   'Frutas y verduras',       'o.veg.b':   'Productos orgánicos, cosechados esta semana.',
    'o.soap.t':  'Jabón de tallow',         'o.soap.b':  'Jabón artesanal y de tallow.',
    'o.food.t':  'Comida y ceviche',        'o.food.b':  'Empanadas, ceviche, BBQ — para comer ahí mismo.',
    'o.crafts.t':'Artesanías y joyería',    'o.crafts.b':'Hechos a mano por artistas locales.',
    'o.books.t': 'Libros y mercancía',      'o.books.b': 'Libros de bitcoin, BFM merch, mercancía Berlín.',
    'o.hw.t':    'Hardware Bitcoin',        'o.hw.b':    'Wallets, signers, hardware en la mesa.',
    'gallery.title': 'Desde el mercado',
    'gallery.lead': 'Vendedores reales. Puestos reales. Domingos reales. (Toca cualquier foto para ampliar.)',
    'posters.title': 'Afiches anteriores',
    'posters.lead': 'Algunos de nuestros afiches de domingos pasados.',
    'videos.title': 'Mira el mercado',
    'videos.lead': 'Historias desde El Zonte, El Salvador.',
    'vendor.title': '¿Quieres ser proveedor?',
    'vendor.body': 'Eres agricultor, panadero, artesano, cocinero o tostador local — nos encantaría tenerte. Mándanos un DM por X o Instagram y te coordinamos para el próximo mercado.',
    'vendor.cta1': 'DM en X',
    'vendor.cta2': 'DM en Instagram',
    'connect.title': 'Conectar',
    'connect.lead': 'Síguenos, encuentra el próximo mercado, o contáctanos.',
    'connect.cocal':  'Club Cocal · Surf City',
    'footer.tag': 'Diviértete quedándote permissionless',
  }
};

function applyLang(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('data-lang', lang);
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] != null) el.innerHTML = dict[key];
  });
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'en' ? 'ES' : 'EN';
  try { localStorage.setItem('bfm_lang', lang); } catch {}
}

const savedLang = (() => { try { return localStorage.getItem('bfm_lang'); } catch { return null; } })();
const initialLang = savedLang || (navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en');
applyLang(initialLang);

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-lang') === 'es' ? 'es' : 'en';
  applyLang(cur === 'en' ? 'es' : 'en');
});

/* ── lightbox ─────────────────────────────────────────── */
const lb = document.getElementById('lightbox');
const lbImg = lb?.querySelector('img');
const lbClose = lb?.querySelector('.lb-close');
const lbPrev = lb?.querySelector('.lb-prev');
const lbNext = lb?.querySelector('.lb-next');

let lbItems = [];
let lbIdx = 0;

function openLB(idx) {
  if (!lb || !lbItems.length) return;
  lbIdx = (idx + lbItems.length) % lbItems.length;
  lbImg.src = lbItems[lbIdx];
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLB() {
  if (!lb) return;
  lb.hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('.gitem').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    lbItems = Array.from(document.querySelectorAll('.gitem')).map(a => a.getAttribute('href'));
    const idx = lbItems.indexOf(el.getAttribute('href'));
    openLB(idx);
  });
});

lbClose?.addEventListener('click', closeLB);
lb?.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
lbPrev?.addEventListener('click', () => openLB(lbIdx - 1));
lbNext?.addEventListener('click', () => openLB(lbIdx + 1));
document.addEventListener('keydown', (e) => {
  if (lb?.hidden) return;
  if (e.key === 'Escape') closeLB();
  if (e.key === 'ArrowLeft') openLB(lbIdx - 1);
  if (e.key === 'ArrowRight') openLB(lbIdx + 1);
});
