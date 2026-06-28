import { playAudio } from './audio.js';
import { storage } from './storage.js';

const RESULTS_KEY = 'dicteeResults';
const MISTAKES_KEY = 'dicteeMistakes';

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFC')
    .replace(/[’']/g, '')
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class Dictation {
  constructor({ onFinish }) {
    this.onFinish = onFinish;
    this.package = null;
    this.words = [];
    this.index = 0;
    this.attemptedCurrentWord = false;
    this.currentWordWasCorrectFirstTry = false;
    this.firstTryCorrect = new Set();
    this.firstTryWrong = [];
    this.finished = false;
  }

  start(pkg, customWords = null) {
    this.package = pkg;
    this.words = customWords || pkg.words;
    this.index = 0;
    this.attemptedCurrentWord = false;
    this.currentWordWasCorrectFirstTry = false;
    this.firstTryCorrect = new Set();
    this.firstTryWrong = [];
    this.finished = false;
    this.renderWord();
  }

  current() {
    return this.words[this.index];
  }

  audioPath(word = this.current()) {
    return `${this.package.folder}/${word.audio}`;
  }

  renderWord() {
    const word = this.current();
    document.getElementById('dictationTitle').textContent = this.package.title;
    document.getElementById('progressText').textContent = `Woord ${this.index + 1} van ${this.words.length}`;
    document.getElementById('answerInput').value = '';
    document.getElementById('answerInput').disabled = false;
    document.getElementById('answerInput').focus();
    document.getElementById('nextButton').disabled = true;
    document.getElementById('checkButton').disabled = false;
    document.getElementById('shownWord').classList.add('hidden');
    document.getElementById('shownWord').textContent = '';
    this.setFeedback('', '');
    this.attemptedCurrentWord = false;
    this.currentWordWasCorrectFirstTry = false;
    setTimeout(() => this.play(), 200);
  }

  play() {
    return playAudio(this.audioPath()).catch(() => {
      this.setFeedback('De audio kan niet worden afgespeeld. Controleer de map en bestandsnaam.', 'error');
    });
  }

  check() {
    if (this.finished) return;
    const input = document.getElementById('answerInput').value;
    const word = this.current();
    const isCorrect = normalize(input) === normalize(word.text);

    if (!this.attemptedCurrentWord) {
      this.attemptedCurrentWord = true;
      if (isCorrect) {
        this.currentWordWasCorrectFirstTry = true;
        this.firstTryCorrect.add(this.index);
      } else {
        this.currentWordWasCorrectFirstTry = false;
        this.firstTryWrong.push(word);
      }
    }

    if (isCorrect) {
      this.setFeedback('Juist. Druk op Enter voor het volgende woord.', 'success');
      document.getElementById('answerInput').disabled = true;
      document.getElementById('nextButton').disabled = false;
      document.getElementById('checkButton').disabled = true;
    } else {
      this.setFeedback('Nog niet juist. Probeer opnieuw.', 'error');
      document.getElementById('answerInput').focus();
      document.getElementById('answerInput').select();
    }
  }

  next() {
    if (document.getElementById('nextButton').disabled) return;
    if (this.index < this.words.length - 1) {
      this.index += 1;
      this.renderWord();
    } else {
      this.finish();
    }
  }

  showWord() {
    const box = document.getElementById('shownWord');
    box.textContent = `Juiste schrijfwijze: ${this.current().text}`;
    box.classList.remove('hidden');
  }

  setFeedback(message, type) {
    const el = document.getElementById('feedback');
    el.textContent = message;
    el.className = `feedback ${type || ''}`;
  }

  finish() {
    this.finished = true;
    const score = this.firstTryCorrect.size;
    const total = this.words.length;
    const result = {
      packageId: this.package.id,
      packageTitle: this.package.title,
      score,
      total,
      date: new Date().toISOString(),
      mistakes: this.firstTryWrong.map(w => w.text)
    };

    const results = storage.get(RESULTS_KEY, []);
    results.unshift(result);
    storage.set(RESULTS_KEY, results.slice(0, 30));

    storage.set(MISTAKES_KEY, {
      packageId: this.package.id,
      packageTitle: this.package.title,
      words: this.firstTryWrong
    });

    this.onFinish(result, this.firstTryWrong);
  }
}

export function getLastMistakes() {
  return storage.get(MISTAKES_KEY, null);
}

export function getResults() {
  return storage.get(RESULTS_KEY, []);
}

export function clearResults() {
  storage.remove(RESULTS_KEY);
}
