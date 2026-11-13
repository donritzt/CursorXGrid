import { wordBanks } from "./word-banks.js";

const fontFamilies = {
  inter: '"Inter", "Segoe UI", system-ui, sans-serif',
  system: '"Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  georgia: 'Georgia, "Times New Roman", serif'
};

const state = {
  mode: "time",
  value: 15,
  language: "nl",
  difficulty: "normal",
  words: [],
  lines: [],
  wordLineIndexes: [],
  typedWords: [],
  wordIndex: 0,
  currentInput: "",
  started: false,
  finished: false,
  correctedErrors: 0,
  isReplay: false,
  bestRun: null,
  progressSamples: [],
  startAt: 0,
  timerId: null,
  liveTimerId: null,
  renderedLineIndex: null
};

const els = {
  words: document.querySelector("#words"),
  caret: document.querySelector("#typing-caret"),
  ghostCaret: document.querySelector("#ghost-caret"),
  input: document.querySelector("#typing-input"),
  panel: document.querySelector("#typing-panel"),
  timer: document.querySelector("#timer"),
  liveWpm: document.querySelector("#live-wpm"),
  progressLabel: document.querySelector("#progress-label"),
  hint: document.querySelector("#test-hint"),
  timeOptions: document.querySelector("#time-options"),
  wordOptions: document.querySelector("#word-options"),
  difficultySelect: document.querySelector("#difficulty-select"),
  scoreList: document.querySelector("#score-list"),
  scoresPanel: document.querySelector("#scores-panel"),
  results: document.querySelector("#typing-results"),
  resultWpm: document.querySelector("#result-wpm"),
  resultAccuracy: document.querySelector("#result-accuracy"),
  resultErrors: document.querySelector("#result-errors"),
  replayButton: document.querySelector("#results-replay"),
  fontSelect: document.querySelector("#font-select"),
  toast: document.querySelector("#toast")
};

function shuffledWords(bank) {
  const words = [...bank];
  for (let index = words.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [words[index], words[randomIndex]] = [words[randomIndex], words[index]];
  }
  return words;
}

function resetTest({ words, bestRun = null, isReplay = false } = {}) {
  clearInterval(state.timerId);
  clearInterval(state.liveTimerId);
  state.timerId = null;
  state.liveTimerId = null;
  state.words = words ? [...words] : shuffledWords(wordBanks[state.language][state.difficulty]);
  state.typedWords = [];
  state.wordIndex = 0;
  state.currentInput = "";
  state.started = false;
  state.finished = false;
  state.correctedErrors = 0;
  state.isReplay = isReplay;
  state.bestRun = bestRun;
  state.progressSamples = [{ elapsedMs: 0, wordIndex: 0, charIndex: 0 }];
  state.startAt = 0;
  state.renderedLineIndex = null;
  setTimer(state.mode === "time" ? String(state.value) : `0/${state.value}`, false);
  els.liveWpm.textContent = "0";
  els.progressLabel.textContent = state.mode === "time" ? "tijd" : "woorden";
  els.hint.textContent = "";
  els.input.value = "";
  document.body.classList.remove("test-running", "test-finished");
  els.results.hidden = true;
  els.input.disabled = false;
  layoutWords();
  renderWords();
  focusInput();
}

function layoutWords() {
  const styles = window.getComputedStyle(els.words);
  const fontSize = styles.fontSize || "28px";
  const fontWeight = styles.fontWeight || "500";
  const fontFamily = styles.fontFamily || "monospace";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
  const maxWidth = Math.max(100, els.words.clientWidth);
  const wordGap = Number.parseFloat(fontSize) * (window.matchMedia("(max-width: 640px)").matches ? 0.52 : 0.68);
  const lines = [];
  const wordLineIndexes = new Array(state.words.length);
  let line = [];
  let lineWidth = 0;

  state.words.forEach((word, wordIndex) => {
    const wordWidth = context.measureText(word).width;
    const nextWidth = line.length ? lineWidth + wordGap + wordWidth : wordWidth;
    if (line.length && nextWidth > maxWidth) {
      lines.push(line);
      line = [];
      lineWidth = 0;
    }

    if (line.length) lineWidth += wordGap;
    line.push(wordIndex);
    lineWidth += wordWidth;
    wordLineIndexes[wordIndex] = lines.length;
  });

  if (line.length) lines.push(line);
  state.lines = lines;
  state.wordLineIndexes = wordLineIndexes;
}

function renderWords() {
  const fragment = document.createDocumentFragment();
  const activeLineIndex = state.wordLineIndexes[state.wordIndex] ?? state.lines.length - 1;
  const lineChanged = state.renderedLineIndex !== null && activeLineIndex !== state.renderedLineIndex;
  const firstLine = Math.max(0, Math.min(activeLineIndex - 1, state.lines.length - 3));
  const lastLine = Math.min(state.lines.length, firstLine + 3);

  for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
    const lineElement = document.createElement("div");
    lineElement.className = "word-line";
    if (lineIndex === activeLineIndex) {
      lineElement.classList.add("is-current");
      if (lineChanged) lineElement.classList.add("line-enter");
    } else {
      lineElement.classList.add(lineIndex < activeLineIndex ? "is-previous" : "is-next");
    }

    for (const wordIndex of state.lines[lineIndex]) {
      const target = state.words[wordIndex];
      const typed = wordIndex === state.wordIndex ? state.currentInput : (state.typedWords[wordIndex] || "");
      const wordElement = document.createElement("span");
      wordElement.className = "word";
      wordElement.dataset.wordIndex = String(wordIndex);

      for (let charIndex = 0; charIndex < target.length; charIndex += 1) {
        const character = document.createElement("span");
        character.className = "letter";
        character.textContent = target[charIndex];
        if (typed[charIndex] !== undefined) {
          character.classList.add(typed[charIndex] === target[charIndex] ? "correct" : "incorrect");
        }
        if (wordIndex === state.wordIndex && charIndex === state.currentInput.length) {
          character.classList.add("current");
        }
        wordElement.append(character);
      }

      if (wordIndex === state.wordIndex) {
        for (let charIndex = target.length; charIndex < state.currentInput.length; charIndex += 1) {
          const extra = document.createElement("span");
          extra.className = "extra-letter";
          extra.textContent = state.currentInput[charIndex];
          wordElement.append(extra);
        }
      }
      lineElement.append(wordElement);
    }
    fragment.append(lineElement);
  }

  state.renderedLineIndex = activeLineIndex;
  els.words.replaceChildren(fragment);
  positionCaret();
  updateGhostProgress();
}

function positionCaret() {
  positionCaretAt(els.caret, state.wordIndex, state.currentInput.length);
}

function positionCaretAt(caret, wordIndex, charIndex) {
  const word = els.words.querySelector(`[data-word-index="${wordIndex}"]`);
  if (!word) {
    caret.hidden = true;
    return;
  }

  const letters = word.querySelectorAll(".letter");
  const nextLetter = letters[charIndex];
  const target = nextLetter || word.lastElementChild;
  if (!target) {
    caret.hidden = true;
    return;
  }

  const panelRect = els.panel.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const left = nextLetter ? targetRect.left : targetRect.right;
  caret.hidden = false;
  caret.style.height = `${targetRect.height}px`;
  caret.style.transform = `translate3d(${left - panelRect.left}px, ${targetRect.top - panelRect.top}px, 0)`;
}

function getGhostProgress() {
  if (!state.isReplay || !state.bestRun || state.bestRun.trace.length === 0) return null;
  const elapsedMs = state.started ? performance.now() - state.startAt : 0;
  let progress = state.bestRun.trace[0];
  for (const sample of state.bestRun.trace) {
    if (sample.elapsedMs > elapsedMs) break;
    progress = sample;
  }
  return progress;
}

function updateGhostProgress() {
  const progress = getGhostProgress();
  if (!progress) {
    els.ghostCaret.hidden = true;
    return;
  }

  els.words.querySelectorAll(".word").forEach((word) => {
    const wordIndex = Number(word.dataset.wordIndex);
    word.querySelectorAll(".letter").forEach((letter, charIndex) => {
      const passed = wordIndex < progress.wordIndex ||
        (wordIndex === progress.wordIndex && charIndex < progress.charIndex);
      letter.classList.toggle("ghost-progress", passed);
    });
  });

  positionGhostCaret(progress);
}

function positionGhostCaret(progress) {
  let wordIndex = progress.wordIndex;
  let charIndex = progress.charIndex;
  let word = els.words.querySelector(`[data-word-index="${wordIndex}"]`);
  if (!word) {
    const visibleWords = [...els.words.querySelectorAll(".word")];
    if (visibleWords.length === 0) {
      els.ghostCaret.hidden = true;
      return;
    }

    const firstVisible = visibleWords[0];
    const lastVisible = visibleWords[visibleWords.length - 1];
    if (wordIndex < Number(firstVisible.dataset.wordIndex)) {
      word = firstVisible;
      wordIndex = Number(word.dataset.wordIndex);
      charIndex = 0;
    } else {
      word = lastVisible;
      wordIndex = Number(word.dataset.wordIndex);
      charIndex = word.querySelectorAll(".letter").length;
    }
  }
  positionCaretAt(els.ghostCaret, wordIndex, charIndex);
}

function recordProgress(force = false) {
  const last = state.progressSamples[state.progressSamples.length - 1];
  const charIndex = state.currentInput.length;
  if (!force && last && last.wordIndex === state.wordIndex && last.charIndex === charIndex) return;

  const elapsedMs = state.started ? performance.now() - state.startAt : 0;
  state.progressSamples.push({
    elapsedMs: Math.max(last ? last.elapsedMs : 0, elapsedMs),
    wordIndex: state.wordIndex,
    charIndex
  });
}

function setTimer(value, animate = true) {
  const nextValue = String(value);
  if (nextValue === els.timer.textContent) return;
  els.timer.textContent = nextValue;
  els.timer.classList.remove("timer-tick");
  if (!animate) return;
  void els.timer.offsetWidth;
  els.timer.classList.add("timer-tick");
}

function setFont(fontName) {
  const fontFamily = fontFamilies[fontName];
  if (!fontFamily) return;
  document.documentElement.style.setProperty("--font", fontFamily);
  localStorage.setItem("trendstype-font", fontName);
  layoutWords();
  renderWords();
}

function beginTest() {
  if (state.started || state.finished) return;
  state.started = true;
  state.startAt = performance.now();
  document.body.classList.add("test-running");
  layoutWords();
  els.hint.textContent = state.mode === "time" ? "Typ door tot de timer op nul staat" : `${state.value} woorden`;
  state.liveTimerId = window.setInterval(updateLiveWpm, 250);
  if (state.mode === "time") {
    state.timerId = window.setInterval(updateCountdown, 50);
  }
}

function updateLiveWpm() {
  if (!state.started || state.finished) return;
  const { correctChars } = countCharacters();
  const elapsedMinutes = Math.max(1000, performance.now() - state.startAt) / 60000;
  els.liveWpm.textContent = String(Math.round(correctChars / 5 / elapsedMinutes));
  updateGhostProgress();
}

function updateCountdown() {
  if (!state.started || state.finished) return;
  const elapsed = performance.now() - state.startAt;
  const remaining = Math.max(0, state.value * 1000 - elapsed);
  setTimer((remaining / 1000).toFixed(1));
  if (remaining <= 0) finishTest();
}

function countCharacters() {
  let correctChars = 0;
  let incorrectChars = 0;
  for (let index = 0; index <= state.wordIndex; index += 1) {
    const typed = index === state.wordIndex ? state.currentInput : (state.typedWords[index] || "");
    const target = state.words[index];
    for (let charIndex = 0; charIndex < typed.length; charIndex += 1) {
      if (typed[charIndex] === target[charIndex]) correctChars += 1;
      else incorrectChars += 1;
    }
    if (index < state.wordIndex) correctChars += 1;
  }
  return { correctChars, incorrectChars };
}

function finishTest() {
  if (state.finished) return;
  recordProgress(true);
  state.finished = true;
  clearInterval(state.timerId);
  clearInterval(state.liveTimerId);
  state.timerId = null;
  state.liveTimerId = null;

  const { correctChars, incorrectChars } = countCharacters();
  const errors = incorrectChars + state.correctedErrors / 2;
  const typedChars = correctChars + errors;
  const elapsedMs = Math.max(1000, performance.now() - state.startAt);
  const wpm = Math.round(correctChars / 5 / (elapsedMs / 60000));
  const accuracy = typedChars ? (correctChars / typedChars) * 100 : 0;
  if (!state.bestRun || wpm > state.bestRun.wpm) {
    state.bestRun = {
      words: [...state.words],
      wpm,
      trace: [...state.progressSamples]
    };
  }
  els.resultWpm.textContent = String(wpm);
  els.resultAccuracy.textContent = `${accuracy.toFixed(1)}%`;
  els.resultErrors.textContent = Number.isInteger(errors) ? String(errors) : errors.toFixed(1);
  els.results.hidden = false;
  els.input.disabled = true;
  els.input.blur();
  document.body.classList.add("test-finished");
}

function handleKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || state.finished) return;
  if (event.key === "Backspace") {
    event.preventDefault();
    if (!state.started) return;
    if (state.currentInput.length > 0) {
      const charIndex = state.currentInput.length - 1;
      if (state.currentInput[charIndex] !== state.words[state.wordIndex][charIndex]) {
        state.correctedErrors += 1;
      }
      state.currentInput = state.currentInput.slice(0, -1);
    } else if (state.wordIndex > 0) {
      state.wordIndex -= 1;
      state.currentInput = state.typedWords[state.wordIndex] || "";
      state.typedWords[state.wordIndex] = "";
    }
    recordProgress();
    if (state.mode === "words") {
      setTimer(`${Math.min(state.wordIndex, state.value)}/${state.value}`);
    }
    renderWords();
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (!state.started) beginTest();
    if (state.currentInput.length === 0) return;
    state.typedWords[state.wordIndex] = state.currentInput;
    state.currentInput = "";
    state.wordIndex += 1;
    recordProgress();
    if (state.mode === "words") {
      setTimer(`${Math.min(state.wordIndex, state.value)}/${state.value}`);
    }
    if (state.wordIndex >= state.words.length || (state.mode === "words" && state.wordIndex >= state.value)) {
      finishTest();
      return;
    }
    renderWords();
    return;
  }
  if (event.key.length !== 1 || event.key < " ") return;
  event.preventDefault();
  if (!state.started) beginTest();
  state.currentInput += event.key.toLocaleLowerCase();
  recordProgress();
  renderWords();
}

function replaySameText() {
  if (!state.finished || !state.bestRun) return;
  resetTest({
    words: state.bestRun.words,
    bestRun: state.bestRun,
    isReplay: true
  });
}

function focusInput() {
  els.input.focus({ preventScroll: true });
}

let resizeFrame;
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    layoutWords();
    renderWords();
  });
});

async function loadScores() {
  try {
    const response = await fetch("/api/scores", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Scores konden niet worden opgehaald.");
    const scores = await response.json();
    renderScores(scores);
  } catch (error) {
    els.scoreList.innerHTML = '<tr><td class="empty-state" colspan="5">Scoreboard tijdelijk niet beschikbaar</td></tr>';
    console.error(error);
  }
}

function renderScores(scores) {
  if (scores.length === 0) {
    els.scoreList.innerHTML = '<tr><td class="empty-state" colspan="5">Nog geen scores — wees de eerste!</td></tr>';
    return;
  }
  const fragment = document.createDocumentFragment();
  scores.forEach((score, index) => {
    const row = document.createElement("tr");
    const values = [
      { text: String(index + 1), className: index < 3 ? "rank-top" : "" },
      { text: score.name },
      { text: Number(score.wpm).toFixed(1) },
      { text: `${Number(score.accuracy).toFixed(1)}%` },
      { text: score.mode }
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value.text;
      if (value.className) cell.className = value.className;
      row.append(cell);
    }
    fragment.append(row);
  });
  els.scoreList.replaceChildren(fragment);
}

let toastTimeout;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => els.toast.classList.remove("visible"), 2400);
}

const navMenu = document.querySelector(".nav-menu");
const navMenuToggle = document.querySelector("#nav-menu-toggle");
const navMenuItems = document.querySelector("#main-tabs");

function setNavMenuOpen(open) {
  navMenu.classList.toggle("open", open);
  navMenuToggle.setAttribute("aria-expanded", String(open));
  navMenuItems.setAttribute("aria-hidden", String(!open));
}

navMenuToggle.addEventListener("click", () => setNavMenuOpen(!navMenu.classList.contains("open")));
navMenuToggle.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setNavMenuOpen(true);
    document.querySelector(".main-tab[aria-selected='true']").focus();
  }
});
document.addEventListener("click", (event) => {
  if (!navMenu.contains(event.target)) setNavMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navMenu.classList.contains("open")) {
    setNavMenuOpen(false);
    navMenuToggle.focus();
  }
});

function activateTab(tabName) {
  document.querySelectorAll(".main-tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden = !active;
  });
  document.querySelector("#current-tab-label").textContent = tabName === "scores" ? "Scores" : "Typetest";
  if (tabName === "scores") loadScores();
}

document.querySelectorAll(".main-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activateTab(tab.dataset.tab);
    setNavMenuOpen(false);
    if (tab.dataset.tab === "test") focusInput();
    else navMenuToggle.focus();
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll(".main-tab")];
    const index = tabs.indexOf(tab);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    tabs[nextIndex].focus();
    activateTab(tabs[nextIndex].dataset.tab);
  });
});

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".mode-button.active").classList.remove("active");
    button.classList.add("active");
    state.mode = button.dataset.mode;
    els.timeOptions.classList.toggle("hidden", state.mode !== "time");
    els.wordOptions.classList.toggle("hidden", state.mode !== "words");
    document.querySelectorAll(".value-button").forEach((option) => {
      option.classList.toggle("active", option.closest("#time-options, #word-options") === (state.mode === "time" ? els.timeOptions : els.wordOptions) && Number(option.dataset.value) === state.value);
    });
    const activeOption = (state.mode === "time" ? els.timeOptions : els.wordOptions).querySelector(".value-button.active");
    if (!activeOption) {
      const firstOption = (state.mode === "time" ? els.timeOptions : els.wordOptions).querySelector(".value-button");
      firstOption.classList.add("active");
      state.value = Number(firstOption.dataset.value);
    }
    resetTest();
  });
});

document.querySelectorAll(".value-button").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest("#time-options, #word-options");
    group.querySelector(".value-button.active").classList.remove("active");
    button.classList.add("active");
    state.value = Number(button.dataset.value);
    resetTest();
  });
});

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".language-button").forEach((languageButton) => {
      const isActive = languageButton === button;
      languageButton.classList.toggle("active", isActive);
      languageButton.setAttribute("aria-pressed", String(isActive));
    });
    state.language = button.dataset.language;
    resetTest();
  });
});

els.difficultySelect.addEventListener("change", () => {
  state.difficulty = els.difficultySelect.value;
  resetTest();
});

els.input.addEventListener("keydown", handleKeydown);
["copy", "cut", "paste", "drop"].forEach((eventName) => {
  els.panel.addEventListener(eventName, (event) => event.preventDefault());
});
els.panel.addEventListener("contextmenu", (event) => event.preventDefault());
els.panel.addEventListener("click", focusInput);
document.querySelector("#restart-button").addEventListener("click", resetTest);
document.querySelector("#results-restart").addEventListener("click", resetTest);
els.replayButton.addEventListener("click", replaySameText);
const savedFont = localStorage.getItem("trendstype-font");
if (Object.prototype.hasOwnProperty.call(fontFamilies, savedFont)) {
  els.fontSelect.value = savedFont;
}
document.documentElement.style.setProperty("--font", fontFamilies[els.fontSelect.value]);
els.fontSelect.addEventListener("change", () => setFont(els.fontSelect.value));

let restartArmed = false;
let restartTimeout = null;
document.addEventListener("keydown", (event) => {
  if (state.finished && event.key === "Escape") {
    event.preventDefault();
    restartArmed = false;
    window.clearTimeout(restartTimeout);
    restartTimeout = null;
    resetTest();
    return;
  }
  if (event.key === "Tab" && !event.shiftKey && els.scoresPanel.hidden && document.activeElement === els.input) {
    event.preventDefault();
    restartArmed = true;
    window.clearTimeout(restartTimeout);
    restartTimeout = window.setTimeout(() => {
      restartArmed = false;
      restartTimeout = null;
    }, 1500);
    showToast("Druk op enter om opnieuw te starten");
    return;
  }
  if (restartArmed && event.key === "Enter") {
    event.preventDefault();
    restartArmed = false;
    window.clearTimeout(restartTimeout);
    restartTimeout = null;
    window.clearTimeout(toastTimeout);
    els.toast.classList.remove("visible");
    resetTest();
  } else {
    restartArmed = false;
    window.clearTimeout(restartTimeout);
    restartTimeout = null;
  }
});

function cancelTestOnFocusLoss() {
  if (!state.started || state.finished || !els.scoresPanel.hidden) return;
  restartArmed = false;
  window.clearTimeout(restartTimeout);
  restartTimeout = null;
  resetTest();
  els.hint.textContent = "Test gestopt: je hebt het tabblad verlaten. Start opnieuw.";
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelTestOnFocusLoss();
});
window.addEventListener("blur", cancelTestOnFocusLoss);

resetTest();
window.setInterval(() => {
  if (!els.scoresPanel.hidden) loadScores();
}, 15000);
