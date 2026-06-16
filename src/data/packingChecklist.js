// Packing Checklist — static catalog (CC_BRIEF_PACKING_CHECKLIST Stage B).
// Versioned, global, import-free (serialisable). The screen maps the string `icon`
// field to a lucide component via its own icon registry.
//
// Template rule: an item is visible when activeTemplate.max >= item.lvl.
//   lvl 0 = appears even in 'training'; 1 = 'oneday'+; 2 = 'full' only.
// Item shape: { id, label, lvl, crit?, target? } — crit:true = critical;
//   target:n = counted item (stepper, auto-done at n); else binary.

export const CATALOG_VERSION = 1;

export const TEMPLATES = [
  { id: 'full',     label: 'Pełny wyjazd',      max: 2, sub: 'Turniej, kilka dni' },
  { id: 'oneday',   label: 'Sparing · 1 dzień', max: 1, sub: 'Jednodniówka' },
  { id: 'training', label: 'Trening',           max: 0, sub: 'Lokalnie, sam sprzęt' },
];

export const CATS = [
  { id: 'gear', name: 'Sprzęt do grania', icon: 'Target', items: [
    { id: 'maska',        label: 'Maska',                  lvl: 0, crit: true },
    { id: 'szyba_clear',  label: 'Szyba clear',            lvl: 0, crit: true },
    { id: 'szyba_mirror', label: 'Szyba mirror (zapas)',   lvl: 1 },
    { id: 'cover',        label: 'Cover na maskę',         lvl: 1 },
    { id: 'marker',       label: 'Marker',                 lvl: 0, crit: true },
    { id: 'lufy',         label: 'Lufy',                   lvl: 0 },
    { id: 'barrelbag',    label: 'Barrel bag',             lvl: 1 },
    { id: 'loader',       label: 'Loader (spłuka)',        lvl: 0, crit: true },
    { id: 'butla',        label: 'Butla (powietrze)',      lvl: 0, crit: true },
    { id: 'pas',          label: 'Pas + pody',             lvl: 0, crit: true },
    { id: 'baterie',      label: 'Baterie',                lvl: 0 },
    { id: 'kabel_loader', label: 'Kabel do spłuki',        lvl: 1 },
    { id: 'wyciory',      label: 'Wyciory',                lvl: 0 },
    { id: 'smar',         label: 'Smar',                   lvl: 0 },
    { id: 'klucze',       label: 'Klucze / imbusy',        lvl: 0 },
    { id: 'reg',          label: 'ID gracza / rejestracja', lvl: 0, crit: true },
  ]},
  { id: 'match', name: 'Strój meczowy', icon: 'Shirt', items: [
    { id: 'jersey',     label: 'Jersey',                 lvl: 0, crit: true },
    { id: 'slide',      label: 'Slide shorty',           lvl: 0 },
    { id: 'spodnie_pb', label: 'Spodnie paintballowe',   lvl: 0 },
    { id: 'kolana',     label: 'Ochraniacze na kolana',  lvl: 0 },
    { id: 'lokcie',     label: 'Ochraniacze na łokcie',  lvl: 0 },
    { id: 'rekawiczki', label: 'Rękawiczki',             lvl: 0 },
    { id: 'baselayer',  label: 'Koszulka termoaktywna',  lvl: 0 },
    { id: 'coldlayer',  label: 'Warstwa na zimno',       lvl: 1 },
    { id: 'headband',   label: 'Headbandy',              lvl: 0 },
    { id: 'durag',      label: 'Durag',                  lvl: 1 },
    { id: 'czapka_pb',  label: 'Czapka',                 lvl: 1 },
  ]},
  { id: 'clothes', name: 'Ubrania', icon: 'Backpack', items: [
    { id: 'shirts',       label: 'Koszulki',               lvl: 2, target: 5 },
    { id: 'briefs',       label: 'Majtki',                 lvl: 2, target: 6 },
    { id: 'socks',        label: 'Skarpetki',              lvl: 2, target: 7 },
    { id: 'pants_casual', label: 'Spodnie',                lvl: 2, target: 2 },
    { id: 'bluza',        label: 'Bluza',                  lvl: 2 },
    { id: 'dresy',        label: 'Dresy do uwalenia',      lvl: 2 },
    { id: 'bluza_chill',  label: 'Bluza do uwalenia',      lvl: 2 },
    { id: 'shorts',       label: 'Krótkie spodnie',        lvl: 2 },
    { id: 'runshoes',     label: 'Buty do biegania',       lvl: 1 },
    { id: 'shoes',        label: 'Buty / sandały',         lvl: 1 },
    { id: 'klapki',       label: 'Klapki',                 lvl: 1 },
    { id: 'cap',          label: 'Czapka z daszkiem / beanie', lvl: 1 },
    { id: 'jacket',       label: 'Kurtka',                 lvl: 1 },
    { id: 'raincoat',     label: 'Kurtka przeciwdeszczowa', lvl: 1 },
    { id: 'poncho',       label: 'Ponczo',                 lvl: 2 },
    { id: 'towel',        label: 'Ręcznik',                lvl: 1 },
  ]},
  { id: 'hygiene', name: 'Higiena', icon: 'Droplets', items: [
    { id: 'toothbrush', label: 'Szczoteczka + pasta', lvl: 1 },
    { id: 'soap',       label: 'Mydło w płynie',      lvl: 2 },
    { id: 'toiletry',   label: 'Kosmetyczka',         lvl: 2 },
    { id: 'wipes',      label: 'Mokre chusteczki',    lvl: 0 },
  ]},
  { id: 'health', name: 'Zdrowie', icon: 'Heart', items: [
    { id: 'meds',       label: 'Leki',                  lvl: 0 },
    { id: 'solpadeine', label: 'Solpadeine',            lvl: 1 },
    { id: 'ointment',   label: 'Maści',                 lvl: 1 },
    { id: 'eyedrops',   label: 'Krople do oczu',        lvl: 1 },
    { id: 'lenses',     label: 'Soczewki kontaktowe',   lvl: 0 },
    { id: 'glasses',    label: 'Okulary',               lvl: 0 },
    { id: 'sunglasses', label: 'Okulary przeciwsłoneczne', lvl: 1 },
  ]},
  { id: 'tech', name: 'Elektronika', icon: 'Smartphone', items: [
    { id: 'phone',          label: 'Telefon prywatny',       lvl: 0 },
    { id: 'phone_work',     label: 'Telefon służbowy',       lvl: 1 },
    { id: 'charger',        label: 'Ładowarka do telefonu',  lvl: 0 },
    { id: 'powerbank',      label: 'Powerbank',              lvl: 0 },
    { id: 'earphones',      label: 'Słuchawki',              lvl: 1 },
    { id: 'laptop',         label: 'Laptop',                 lvl: 2 },
    { id: 'laptop_charger', label: 'Ładowarka do laptopa',   lvl: 2 },
  ]},
  { id: 'docs', name: 'Dokumenty i kasa', icon: 'Wallet', items: [
    { id: 'id_card',  label: 'Dowód osobisty', lvl: 0, crit: true },
    { id: 'passport', label: 'Paszport',       lvl: 2, crit: true },
    { id: 'card',     label: 'Karta',          lvl: 0 },
    { id: 'cash',     label: 'Gotówka',        lvl: 0 },
  ]},
  { id: 'other', name: 'Inne', icon: 'Package', items: [
    { id: 'water',      label: 'Bidon na wodę',      lvl: 0 },
    { id: 'sandwiches', label: 'Kanapki na drogę',   lvl: 1 },
    { id: 'pump',       label: 'Pompka do materaca', lvl: 2 },
    { id: 'book',       label: 'Książka',            lvl: 2 },
  ]},
];
