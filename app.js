'use strict';
const API = 'https://jsonplaceholder.typicode.com/users';
const $ = selector => document.querySelector(selector);
const state = { users: [], favorites: new Set(), onlyFavorites: false, query: '', busy: false };
let installPrompt = null;
let lastFocus = null;
try {
  const saved = JSON.parse(localStorage.getItem('pocketstore-favorites') || '[]');
  if (Array.isArray(saved)) state.favorites = new Set(saved.filter(Number.isInteger));
} catch { /* El catálogo funciona aunque el almacenamiento esté restringido. */ }

const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function notify(message) { $('#notice').textContent = message; $('#notice').hidden = !message; }
function connection() {
  $('#connection').textContent = navigator.onLine ? 'Con conexión' : 'Sin conexión';
  $('#connection').classList.toggle('offline', !navigator.onLine);
  $('#refresh').disabled = state.busy || !navigator.onLine;
}
function render() {
  const filtered = state.users.filter(user => (!state.onlyFavorites || state.favorites.has(user.id)) && normalize([user.name, user.email, user.address.city, user.company.name].join(' ')).includes(normalize(state.query)));
  $('#total').textContent = state.users.length;
  $('#favorite-count').textContent = state.users.filter(user => state.favorites.has(user.id)).length;
  $('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'contacto disponible' : 'contactos disponibles'}`;
  $('#grid').replaceChildren(...filtered.map(card));
  $('#empty').hidden = filtered.length > 0;
  $('#empty-title').textContent = state.onlyFavorites && !state.query ? 'Tu lista empieza con una estrella' : 'No encontramos coincidencias';
  $('#empty-text').textContent = state.onlyFavorites && !state.query ? 'Marca un contacto como favorito para encontrarlo aquí.' : 'Prueba con otro nombre, ciudad o empresa.';
}
function card(user) {
  const article = node('article', 'card');
  const top = node('div', 'card-top');
  const avatar = node('div', 'avatar', user.name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join(''));
  avatar.setAttribute('aria-hidden', 'true');
  const saved = state.favorites.has(user.id);
  const star = node('button', `icon-button${saved ? ' saved' : ''}`, saved ? '★' : '☆');
  star.dataset.favorite = user.id;
  star.setAttribute('aria-label', `${saved ? 'Quitar de' : 'Añadir a'} favoritos a ${user.name}`);
  star.setAttribute('aria-pressed', saved);
  star.addEventListener('click', () => {
    saved ? state.favorites.delete(user.id) : state.favorites.add(user.id);
    try { localStorage.setItem('pocketstore-favorites', JSON.stringify([...state.favorites])); }
    catch { notify('El navegador no permite guardar favoritos. Se conservarán durante esta sesión.'); }
    render();
    const replacement = document.querySelector(`[data-favorite="${user.id}"]`);
    (replacement || $('#favorites')).focus();
  });
  top.append(avatar, star);
  article.append(top, node('h3', '', user.name), node('p', 'username', `@${user.username || user.id}`));
  for (const [symbol, text] of [['✉', user.email], ['⌖', user.address.city]]) {
    const line = node('p', 'meta');
    const icon = node('span', '', symbol);
    icon.setAttribute('aria-hidden', 'true');
    line.append(icon, document.createTextNode(text));
    article.append(line);
  }
  const bottom = node('div', 'card-bottom');
  const company = node('span', 'company', user.company.name);
  company.title = user.company.name;
  const details = node('button', 'details-button', 'Ver ficha ↗');
  details.setAttribute('aria-label', `Ver ficha de ${user.name}`);
  details.addEventListener('click', () => showDetails(user, details));
  bottom.append(company, details);
  article.append(bottom);
  return article;
}
function showDetails(user, trigger) {
  lastFocus = trigger;
  const list = node('dl');
  const address = [user.address.street, user.address.suite, user.address.city, user.address.zipcode].filter(Boolean).join(', ');
  for (const [label, value] of [['Correo', user.email], ['Teléfono', user.phone || 'No disponible'], ['Empresa', user.company.name], ['Dirección', address], ['Sitio web', user.website || 'No disponible']]) {
    list.append(node('dt', '', label), node('dd', '', value));
  }
  $('#detail-content').replaceChildren(node('h2', '', user.name), node('p', 'username', `@${user.username || user.id}`), list);
  $('#details').showModal();
}
$('#close-details').addEventListener('click', () => $('#details').close());
$('#details').addEventListener('close', () => { if (lastFocus?.isConnected) lastFocus.focus(); });
$('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
function setFilter(favorites) {
  state.onlyFavorites = favorites;
  for (const [id, active] of [['all', !favorites], ['favorites', favorites]]) {
    $(`#${id}`).classList.toggle('active', active);
    $(`#${id}`).setAttribute('aria-pressed', active);
  }
  render();
}
$('#all').addEventListener('click', () => setFilter(false));
$('#favorites').addEventListener('click', () => setFilter(true));
$('#refresh').addEventListener('click', loadUsers);
window.addEventListener('offline', () => { connection(); notify('Estás sin conexión. Puedes buscar, consultar fichas y guardar favoritos.'); });
window.addEventListener('online', () => { connection(); loadUsers(); });
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install').hidden = false; });
window.addEventListener('appinstalled', () => { installPrompt = null; $('#install').hidden = true; });
$('#install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('#install').hidden = true;
});
function validUsers(data) {
  return Array.isArray(data) && data.length > 0 && data.every(user => Number.isInteger(user.id) && typeof user.name === 'string' && typeof user.email === 'string' && typeof user.address?.city === 'string' && typeof user.company?.name === 'string');
}
async function loadUsers() {
  if (state.busy) return;
  state.busy = true;
  connection();
  $('#refresh').textContent = 'Actualizando…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(API, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('API no disponible');
    const users = await response.json();
    if (!validUsers(users)) throw new Error('Respuesta inválida');
    state.users = users;
    const source = response.headers.get('X-PocketStore-Source') || 'network';
    const stamp = response.headers.get('X-PocketStore-Saved-At');
    $('#source').textContent = source === 'network' ? 'Datos actualizados · JSONPlaceholder' : source === 'cache' ? 'Copia guardada en este dispositivo' : 'Datos de demostración · copia incluida';
    $('#source').title = stamp ? `Guardado: ${new Date(stamp).toLocaleString('es-MX')}` : '';
    notify(source === 'network' ? '' : source === 'cache' ? 'La API no está disponible. Mostramos la última copia guardada.' : 'La API no está disponible. Mostramos los contactos de demostración incluidos.');
    render();
  } catch {
    notify(state.users.length ? 'No pudimos actualizar. Tu catálogo local sigue disponible.' : 'No fue posible cargar el catálogo. Vuelve a abrir la app con conexión.');
    $('#source').textContent = 'Datos de demostración · copia incluida';
  } finally {
    clearTimeout(timer);
    state.busy = false;
    $('#refresh').textContent = '↻ Actualizar';
    connection();
  }
}
async function registerWorker() {
  if (!('serviceWorker' in navigator)) { $('#offline-ready').textContent = 'Este navegador no admite el modo offline.'; return; }
  try {
    await navigator.serviceWorker.register('./sw.js');
    // El tiempo límite evita bloquear la API si el SW no termina de instalarse.
    await Promise.race([
      (async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
        $('#offline-ready').textContent = 'App y contactos guardados. Ya puedes desconectarte.';
      })(),
      new Promise(resolve => setTimeout(resolve, 6000))
    ]);
  } catch { $('#offline-ready').textContent = 'No se pudo preparar el modo offline. Usa localhost o HTTPS.'; }
}
async function start() {
  connection();
  try {
    const response = await fetch('./data/users.json');
    if (!response.ok) throw new Error('Copia local no disponible');
    const data = await response.json();
    if (!validUsers(data)) throw new Error('Copia local inválida');
    state.users = data;
    render();
  } catch { notify('No se pudo cargar la copia incluida. Intentaremos consultar la API.'); }
  await registerWorker();
  await loadUsers();
}
start();
