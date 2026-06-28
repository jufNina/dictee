import { renderAdmin, getOpenPackages } from './admin.js';
import { Dictation, getLastMistakes, getResults, clearResults } from './dictee.js';
import { getStudentName, setStudentName } from './reporting.js';

const state = {
  packages: [],
  settings: { defaultOpenPackages: [] },
  openIds: [],
  currentPackage: null,
  dictation: null
};

const views = ['practiceView', 'dictationView', 'finishView', 'repeatView', 'resultsView'];

function showView(id) {
  views.forEach(viewId => document.getElementById(viewId).classList.toggle('hidden', viewId !== id));
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view && id.toLowerCase().startsWith(btn.dataset.view));
  });
}

async function loadData() {
  const [packagesRes, settingsRes] = await Promise.all([
    fetch('data/wordpackages.json'),
    fetch('data/settings.json').catch(() => null)
  ]);
  state.packages = await packagesRes.json();
  if (settingsRes && settingsRes.ok) state.settings = await settingsRes.json();
  state.openIds = getOpenPackages(state.packages, state.settings);
}

function renderPackages() {
  const grid = document.getElementById('packageGrid');
  grid.innerHTML = '';
  const visible = state.packages.filter(pkg => state.openIds.includes(pkg.id));

  if (!visible.length) {
    grid.innerHTML = '<p>Er zijn nog geen woordpakketten opengezet.</p>';
    return;
  }

  visible.forEach(pkg => {
    const button = document.createElement('button');
    button.className = 'package-card';
    button.type = 'button';
    button.innerHTML = `<h3>${pkg.title}</h3><p>${pkg.words.length} woorden</p>`;
    button.addEventListener('click', () => {
      if (!getStudentName()) {
        document.getElementById('studentNameStatus').textContent = 'Vul eerst je naam in.';
        document.getElementById('studentNameInput').focus();
        return;
      }
      startPackage(pkg);
    });
    grid.appendChild(button);
  });
}

function startPackage(pkg, customWords = null) {
  state.currentPackage = pkg;
  showView('dictationView');
  state.dictation.start(pkg, customWords);
}

function renderFinish(result, mistakes) {
  showView('finishView');
  document.getElementById('scoreText').textContent = `Score: ${result.score}/${result.total}`;
  const summary = document.getElementById('mistakeSummary');
  if (mistakes.length) {
    summary.innerHTML = `<p>Deze woorden waren fout bij de eerste poging:</p><ul>${mistakes.map(w => `<li>${w.text}</li>`).join('')}</ul>`;
    document.getElementById('repeatMistakesButton').classList.remove('hidden');
  } else {
    summary.innerHTML = '<p>Alles was juist bij de eerste poging.</p>';
    document.getElementById('repeatMistakesButton').classList.add('hidden');
  }
  renderResults();
}

function renderRepeat() {
  const data = getLastMistakes();
  const info = document.getElementById('repeatInfo');
  const btn = document.getElementById('startRepeatButton');

  if (!data || !data.words || !data.words.length) {
    info.textContent = 'Er zijn nog geen foutwoorden om te herhalen.';
    btn.disabled = true;
    return;
  }

  info.textContent = `Herhaal ${data.words.length} foutwoorden uit ${data.packageTitle}.`;
  btn.disabled = false;
  btn.onclick = () => {
    const pkg = state.packages.find(p => p.id === data.packageId);
    if (pkg) startPackage(pkg, data.words);
  };
}

function renderResults() {
  const list = document.getElementById('resultsList');
  const results = getResults();
  if (!results.length) {
    list.innerHTML = '<p>Nog geen resultaten.</p>';
    return;
  }
  list.innerHTML = `<ul class="results-list">${results.map(result => {
    const date = new Date(result.date).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });
    const name = result.studentName ? `<br>Leerling: ${result.studentName}` : '';
    return `<li class="result-item"><strong>${result.packageTitle}</strong>${name}<br>Score: ${result.score}/${result.total}<br><span>${date}</span></li>`;
  }).join('')}</ul>`;
}

function wireEvents() {
  state.dictation = new Dictation({ onFinish: renderFinish, settings: state.settings });

  const nameInput = document.getElementById('studentNameInput');
  const nameStatus = document.getElementById('studentNameStatus');
  nameInput.value = getStudentName();
  if (nameInput.value) nameStatus.textContent = `Ingelogd als ${nameInput.value}`;

  document.getElementById('saveNameButton').addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameStatus.textContent = 'Vul eerst je naam in.';
      nameInput.focus();
      return;
    }
    setStudentName(name);
    nameStatus.textContent = `Ingelogd als ${name}`;
  });

  nameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('saveNameButton').click();
    }
  });

  document.getElementById('playButton').addEventListener('click', () => state.dictation.play());
  document.getElementById('checkButton').addEventListener('click', () => state.dictation.check());
  document.getElementById('nextButton').addEventListener('click', () => state.dictation.next());
  document.getElementById('showWordButton').addEventListener('click', () => state.dictation.showWord());
  document.getElementById('backButton').addEventListener('click', () => showView('practiceView'));
  document.getElementById('newPracticeButton').addEventListener('click', () => showView('practiceView'));
  document.getElementById('repeatMistakesButton').addEventListener('click', () => {
    renderRepeat();
    showView('repeatView');
  });
  document.getElementById('startRepeatButton').addEventListener('click', () => {});
  document.getElementById('clearResultsButton').addEventListener('click', () => {
    if (confirm('Resultaten wissen op dit toestel?')) {
      clearResults();
      renderResults();
    }
  });

  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'practice') showView('practiceView');
      if (view === 'repeat') { renderRepeat(); showView('repeatView'); }
      if (view === 'results') { renderResults(); showView('resultsView'); }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || document.getElementById('dictationView').classList.contains('hidden')) return;
    event.preventDefault();
    const nextDisabled = document.getElementById('nextButton').disabled;
    if (!nextDisabled) state.dictation.next();
    else state.dictation.check();
  });
}

async function init() {
  try {
    await loadData();
    wireEvents();
    renderPackages();
    renderResults();

    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
      renderAdmin({
        packages: state.packages,
        openIds: state.openIds,
        onChange: ids => {
          state.openIds = ids;
          renderPackages();
        }
      });
    }
  } catch (error) {
    document.querySelector('.container').innerHTML = `<section class="card"><h2>Er ging iets mis</h2><p>Controleer of index.html, css, js, data en audio in de hoofdmap van GitHub staan.</p><pre>${error.message}</pre></section>`;
  }
}

init();
