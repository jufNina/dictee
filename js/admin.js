import { storage } from './storage.js';

const ADMIN_KEY = 'dicteeOpenPackages';

export function getOpenPackages(allPackages, settings) {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('pakketten');
  if (fromUrl) return fromUrl.split(',').filter(Boolean);

  const saved = storage.get(ADMIN_KEY, null);
  if (Array.isArray(saved) && saved.length) return saved;

  return settings.defaultOpenPackages || allPackages.map(p => p.id);
}

export function renderAdmin({ packages, openIds, onChange }) {
  const admin = document.getElementById('adminView');
  const nav = document.getElementById('mainNav');
  nav.classList.add('hidden');
  admin.classList.remove('hidden');

  admin.innerHTML = `
    <div class="admin-top">
      <div>
        <h2>Leerkrachtpagina</h2>
        <p>Vink aan welke woordpakketten leerlingen mogen oefenen.</p>
      </div>
      <a class="secondary-button" href="./">Leerlingpagina</a>
    </div>
    <ul class="admin-list" id="adminPackageList"></ul>
    <div class="button-row">
      <button class="primary-button" id="saveAdminButton" type="button">Bewaar op deze computer</button>
      <button class="secondary-button" id="copyStudentLinkButton" type="button">Kopieer leerlinglink</button>
    </div>
    <p class="hint">De leerlinglink bevat alleen de aangevinkte woordpakketten. Deel die link met je klas.</p>
    <div id="studentLinkBox" class="copy-box"></div>
  `;

  const list = document.getElementById('adminPackageList');
  packages.forEach(pkg => {
    const li = document.createElement('li');
    li.className = 'admin-row';
    li.innerHTML = `
      <label>
        <input type="checkbox" value="${pkg.id}" ${openIds.includes(pkg.id) ? 'checked' : ''} />
        ${pkg.title}
      </label>
      <span>${pkg.words.length} woorden</span>
    `;
    list.appendChild(li);
  });

  const selected = () => [...list.querySelectorAll('input:checked')].map(input => input.value);
  const linkBox = document.getElementById('studentLinkBox');
  const makeLink = () => {
    const ids = selected();
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('pakketten', ids.join(','));
    return url.toString();
  };
  const updateLink = () => { linkBox.textContent = makeLink(); };
  list.addEventListener('change', updateLink);
  updateLink();

  document.getElementById('saveAdminButton').addEventListener('click', () => {
    const ids = selected();
    storage.set(ADMIN_KEY, ids);
    onChange(ids);
    alert('Bewaard op deze computer. Gebruik de leerlinglink om dezelfde selectie met leerlingen te delen.');
  });

  document.getElementById('copyStudentLinkButton').addEventListener('click', async () => {
    const link = makeLink();
    try {
      await navigator.clipboard.writeText(link);
      alert('Leerlinglink gekopieerd.');
    } catch {
      prompt('Kopieer deze leerlinglink:', link);
    }
  });
}
