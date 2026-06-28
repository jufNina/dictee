const state = {
  packages: [],
  currentWords: [],
  currentIndex: 0,
  firstTry: true,
  firstAttemptErrors: [],
  correctFirstTry: 0,
  currentMode: "practice",
  sessionTitle: ""
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function init() {
  bindElements();
  bindEvents();
  applyTheme();
  state.packages = await fetch("data/wordpackages.json").then(r => r.json());
  fillPackages();
  updateReviewInfo();
  renderResults();
}

function bindElements() {
  [
    "packageSelect", "amountSelect", "shuffleToggle", "startButton", "dictationCard",
    "progress", "playButton", "answerInput", "checkButton", "showButton", "nextButton",
    "feedback", "shownAnswer", "randomAmount", "randomStartButton", "reviewInfo",
    "reviewButton", "clearReviewButton", "resultsList", "autoPlayToggle", "doublePlayToggle",
    "resetButton", "themeButton"
  ].forEach(id => els[id] = $(id));
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  els.startButton.addEventListener("click", startPractice);
  els.randomStartButton.addEventListener("click", startRandom);
  els.reviewButton.addEventListener("click", startReview);
  els.clearReviewButton.addEventListener("click", clearReview);
  els.playButton.addEventListener("click", playCurrent);
  els.checkButton.addEventListener("click", checkAnswer);
  els.showButton.addEventListener("click", showAnswer);
  els.nextButton.addEventListener("click", nextWord);
  els.answerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") checkAnswer();
  });
  els.resetButton.addEventListener("click", resetResults);
  els.themeButton.addEventListener("click", toggleTheme);
}

function fillPackages() {
  els.packageSelect.innerHTML = state.packages
    .map(pkg => `<option value="${pkg.id}">${pkg.title}</option>`)
    .join("");
}

function switchView(view) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === view));
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === view));
  renderResults();
  updateReviewInfo();
}

function startPractice() {
  const pkg = state.packages.find(item => item.id === els.packageSelect.value);
  const amount = Math.min(Number(els.amountSelect.value), pkg.words.length);
  let words = els.shuffleToggle.checked ? shuffle(pkg.words) : [...pkg.words];
  beginSession(words.slice(0, amount), pkg.title);
}

function startRandom() {
  const allWords = state.packages.flatMap(pkg => pkg.words.map(word => ({ ...word, source: pkg.title })));
  const amount = Math.min(Number(els.randomAmount.value), allWords.length);
  beginSession(shuffle(allWords).slice(0, amount), "Willekeurig dictee");
  switchView("practice");
}

function startReview() {
  const reviewWords = load("reviewWords", []);
  if (reviewWords.length === 0) {
    els.reviewInfo.textContent = "Er zijn nog geen foutwoorden om te herhalen.";
    return;
  }
  beginSession(reviewWords, "Herhaling");
  switchView("practice");
}

function beginSession(words, title) {
  state.currentWords = words;
  state.currentIndex = 0;
  state.firstTry = true;
  state.firstAttemptErrors = [];
  state.correctFirstTry = 0;
  state.sessionTitle = title;
  els.dictationCard.classList.remove("hidden");
  showCurrentWord();
}

function showCurrentWord() {
  const total = state.currentWords.length;
  els.progress.textContent = `Woord ${state.currentIndex + 1} van ${total}`;
  els.answerInput.value = "";
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.shownAnswer.textContent = "";
  els.nextButton.disabled = true;
  els.answerInput.focus();
  state.firstTry = true;
  if (els.autoPlayToggle.checked) setTimeout(playCurrent, 250);
}

function currentWord() {
  return state.currentWords[state.currentIndex];
}

function playCurrent() {
  const word = currentWord();
  const audio = new Audio(word.audio);
  audio.play();
  if (els.doublePlayToggle.checked) {
    setTimeout(() => new Audio(word.audio).play(), 1800);
  }
}

function checkAnswer() {
  const word = currentWord();
  const correct = normalize(els.answerInput.value) === normalize(word.answer);

  if (correct) {
    if (state.firstTry) state.correctFirstTry += 1;
    els.feedback.textContent = "Juist";
    els.feedback.className = "feedback good";
    els.nextButton.disabled = false;
    return;
  }

  if (state.firstTry) {
    state.firstAttemptErrors.push(word);
    state.firstTry = false;
  }
  els.feedback.textContent = "Nog niet juist. Probeer opnieuw.";
  els.feedback.className = "feedback bad";
  els.nextButton.disabled = true;
  els.answerInput.select();
}

function showAnswer() {
  els.shownAnswer.textContent = currentWord().answer;
}

function nextWord() {
  if (state.currentIndex < state.currentWords.length - 1) {
    state.currentIndex += 1;
    showCurrentWord();
    return;
  }
  finishSession();
}

function finishSession() {
  const total = state.currentWords.length;
  const score = state.correctFirstTry;
  els.feedback.textContent = `Score: ${score}/${total}`;
  els.feedback.className = "feedback good";
  els.nextButton.disabled = true;
  els.answerInput.value = "";
  els.shownAnswer.textContent = "";

  const existingReview = load("reviewWords", []);
  const merged = [...existingReview, ...state.firstAttemptErrors];
  const unique = Array.from(new Map(merged.map(word => [word.audio, word])).values());
  save("reviewWords", unique);

  const results = load("results", []);
  results.unshift({
    title: state.sessionTitle,
    score,
    total,
    date: new Date().toLocaleString("nl-BE")
  });
  save("results", results.slice(0, 30));
  updateReviewInfo();
  renderResults();
}

function updateReviewInfo() {
  const reviewWords = load("reviewWords", []);
  els.reviewInfo.textContent = reviewWords.length === 0
    ? "Fout geschreven woorden verschijnen hier na een dictee."
    : `Er staan ${reviewWords.length} woorden klaar voor herhaling.`;
}

function clearReview() {
  save("reviewWords", []);
  updateReviewInfo();
}

function renderResults() {
  const results = load("results", []);
  if (results.length === 0) {
    els.resultsList.innerHTML = "<p>Er zijn nog geen resultaten.</p>";
    return;
  }
  els.resultsList.innerHTML = results.map(result => `
    <article>
      <strong>${result.title}</strong><br>
      Score: ${result.score}/${result.total}<br>
      <small>${result.date}</small>
    </article>
  `).join("");
}

function resetResults() {
  if (!confirm("Alle resultaten wissen?")) return;
  save("results", []);
  save("reviewWords", []);
  renderResults();
  updateReviewInfo();
}

function applyTheme() {
  const theme = load("theme", "light");
  document.body.classList.toggle("dark", theme === "dark");
  els.themeButton.textContent = theme === "dark" ? "Licht" : "Donker";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  save("theme", isDark ? "dark" : "light");
  els.themeButton.textContent = isDark ? "Licht" : "Donker";
}

init();
