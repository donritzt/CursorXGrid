import { wordBanks } from "./word-banks.js";

const fontFamilies = {
  inter: '"Inter", "Segoe UI", system-ui, sans-serif',
  system: '"Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  georgia: 'Georgia, "Times New Roman", serif',
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
  totalTypedChars: 0,
  isReplay: false,
  bestRun: null,
  progressSamples: [],
  startAt: 0,
  timerId: null,
  liveTimerId: null,
  renderedLineIndex: null,
  transitioning: false,
  gameMode: "typing",
  raceScore: 0,
  raceBonusIndex: null,
  raceWordsUntilBonus: 0,
  raceTimeRemaining: 10000,
  raceLastTick: 0,
  raceBonuses: 0,
  raceStatusTimeout: null,
  raceCountdownId: null,
  raceCountdownValue: 3,
  testRunId: 0,
  sessionPromise: null,
  scoreSessionReady: false,
  scoreSaving: false,
  scoreSaved: false,
  scoreSubmission: null,
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
  resultRawWpm: document.querySelector("#result-raw-wpm"),
  resultAccuracy: document.querySelector("#result-accuracy"),
  resultErrors: document.querySelector("#result-errors"),
  resultConsistency: document.querySelector("#result-consistency"),
  resultsChart: document.querySelector("#results-chart"),
  replayButton: document.querySelector("#results-replay"),
  scoreForm: document.querySelector("#score-save-form"),
  scoreName: document.querySelector("#score-name"),
  scoreSaveButton: document.querySelector("#score-save-button"),
  scoreSaveStatus: document.querySelector("#score-save-status"),
  raceHud: document.querySelector("#race-hud"),
  raceScore: document.querySelector("#race-score"),
  raceBonusStatus: document.querySelector("#race-bonus-status"),
  raceCountdown: document.querySelector("#race-countdown"),
  raceCountdownNumber: document.querySelector("#race-countdown-number"),
  raceGameOver: document.querySelector("#race-game-over"),
  raceFinalScore: document.querySelector("#race-final-score"),
  raceBonusTotal: document.querySelector("#race-bonus-total"),
  raceLauncher: document.querySelector("#time-race-launcher"),
  raceRestart: document.querySelector("#race-restart"),
  raceExit: document.querySelector("#race-exit"),
  fontSelect: document.querySelector("#font-select"),
  toast: document.querySelector("#toast"),
};

function shuffledWords(bank) {
  const words = [...bank];
  for (let index = words.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [words[index], words[randomIndex]] = [words[randomIndex], words[index]];
  }
  return words;
}

function resetTest(options = {}) {
  if (state.transitioning) return;
  if (
    !state.finished ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyTestReset(options);
    return;
  }

  state.transitioning = true;
  els.results.classList.add("is-leaving");
  window.setTimeout(() => {
    const panelHeight = els.panel.getBoundingClientRect().height;
    document.body.classList.add("test-returning");
    applyTestReset(options);
    els.panel.style.height = "auto";
    const targetHeight = els.panel.getBoundingClientRect().height;
    els.panel.classList.add("results-transitioning");
    els.panel.style.height = `${panelHeight}px`;
    void els.panel.offsetHeight;
    els.panel.style.height = `${targetHeight}px`;

    window.setTimeout(() => {
      els.panel.style.height = "";
      els.panel.classList.remove("results-transitioning");
      document.body.classList.remove("test-returning");
      state.transitioning = false;
    }, 320);
  }, 190);
}

function applyTestReset({ words, bestRun = null, isReplay = false } = {}) {
  clearInterval(state.timerId);
  clearInterval(state.liveTimerId);
  clearInterval(state.raceCountdownId);
  window.clearTimeout(state.raceStatusTimeout);
  state.timerId = null;
  state.liveTimerId = null;
  state.raceCountdownId = null;
  state.raceStatusTimeout = null;
  state.testRunId += 1;
  state.sessionPromise = null;
  state.scoreSessionReady = false;
  state.scoreSaving = false;
  state.scoreSaved = false;
  state.scoreSubmission = null;
  state.gameMode = "typing";
  state.words = words
    ? [...words]
    : shuffledWords(wordBanks[state.language][state.difficulty]);
  state.typedWords = [];
  state.wordIndex = 0;
  state.currentInput = "";
  state.started = false;
  state.finished = false;
  state.correctedErrors = 0;
  state.totalTypedChars = 0;
  state.isReplay = isReplay;
  state.bestRun = bestRun;
  state.progressSamples = [
    { elapsedMs: 0, wordIndex: 0, charIndex: 0, totalTypedChars: 0 },
  ];
  state.startAt = 0;
  state.raceScore = 0;
  state.raceBonusIndex = null;
  state.raceWordsUntilBonus = 0;
  state.raceTimeRemaining = 10000;
  state.raceLastTick = 0;
  state.raceBonuses = 0;
  state.raceCountdownValue = 3;
  state.renderedLineIndex = null;
  setTimer(
    state.mode === "time" ? String(state.value) : `0/${state.value}`,
    false,
  );
  els.liveWpm.textContent = "0";
  els.progressLabel.textContent = state.mode === "time" ? "tijd" : "woorden";
  els.hint.textContent = "";
  els.input.value = "";
  document.body.classList.remove(
    "test-running",
    "test-finished",
    "time-race",
    "time-race-countdown",
    "time-race-finished",
  );
  els.results.hidden = true;
  els.scoreForm.hidden = true;
  els.scoreForm.reset();
  els.scoreName.disabled = false;
  els.scoreSaveButton.disabled = true;
  els.scoreSaveStatus.textContent = "";
  els.scoreSaveStatus.classList.remove("error");
  els.raceHud.hidden = true;
  els.raceCountdown.hidden = true;
  els.raceGameOver.hidden = true;
  els.raceBonusStatus.textContent = "";
  els.results.classList.remove("is-leaving");
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
  const wordGap =
    Number.parseFloat(fontSize) *
    (window.matchMedia("(max-width: 640px)").matches ? 0.52 : 0.68);
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
  const activeLineIndex =
    state.wordLineIndexes[state.wordIndex] ?? state.lines.length - 1;
  const lineChanged =
    state.renderedLineIndex !== null &&
    activeLineIndex !== state.renderedLineIndex;
  const firstLine = Math.max(
    0,
    Math.min(activeLineIndex - 1, state.lines.length - 3),
  );
  const lastLine = Math.min(state.lines.length, firstLine + 3);

  for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
    const lineElement = document.createElement("div");
    lineElement.className = "word-line";
    if (lineIndex === activeLineIndex) {
      lineElement.classList.add("is-current");
      if (lineChanged) lineElement.classList.add("line-enter");
    } else {
      lineElement.classList.add(
        lineIndex < activeLineIndex ? "is-previous" : "is-next",
      );
    }

    for (const wordIndex of state.lines[lineIndex]) {
      const target = state.words[wordIndex];
      const typed =
        wordIndex === state.wordIndex
          ? state.currentInput
          : state.typedWords[wordIndex] || "";
      const wordElement = document.createElement("span");
      wordElement.className = "word";
      if (
        state.gameMode === "time-race" &&
        wordIndex === state.raceBonusIndex
      ) {
        wordElement.classList.add("bonus-word");
      }
      wordElement.dataset.wordIndex = String(wordIndex);

      for (let charIndex = 0; charIndex < target.length; charIndex += 1) {
        const character = document.createElement("span");
        character.className = "letter";
        character.textContent = target[charIndex];
        if (typed[charIndex] !== undefined) {
          character.classList.add(
            typed[charIndex] === target[charIndex] ? "correct" : "incorrect",
          );
        }
        if (
          wordIndex === state.wordIndex &&
          charIndex === state.currentInput.length
        ) {
          character.classList.add("current");
        }
        wordElement.append(character);
      }

      if (wordIndex === state.wordIndex) {
        for (
          let charIndex = target.length;
          charIndex < state.currentInput.length;
          charIndex += 1
        ) {
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

function positionCaretAt(
  caret,
  wordIndex,
  charIndex,
  word = els.words.querySelector(`[data-word-index="${wordIndex}"]`),
) {
  if (!word) {
    caret.hidden = true;
    return;
  }

  const nextLetter = word.children[charIndex];
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

function updateWordAfterTyping() {
  const word = els.words.querySelector(
    `[data-word-index="${state.wordIndex}"]`,
  );
  if (!word) {
    renderWords();
    return;
  }

  const target = state.words[state.wordIndex];
  const charIndex = state.currentInput.length - 1;
  if (charIndex < target.length) {
    const letter = word.children[charIndex];
    letter.classList.remove("current");
    letter.classList.add(
      state.currentInput[charIndex] === target[charIndex]
        ? "correct"
        : "incorrect",
    );
  } else {
    const extra = document.createElement("span");
    extra.className = "extra-letter";
    extra.textContent = state.currentInput[charIndex];
    word.append(extra);
  }

  if (state.currentInput.length < target.length) {
    word.children[state.currentInput.length].classList.add("current");
  }
  positionCaretAt(els.caret, state.wordIndex, state.currentInput.length, word);
}

function updateWordAfterBackspace() {
  const word = els.words.querySelector(
    `[data-word-index="${state.wordIndex}"]`,
  );
  if (!word) {
    renderWords();
    return;
  }

  const target = state.words[state.wordIndex];
  const charIndex = state.currentInput.length;
  if (charIndex < target.length) {
    const letter = word.children[charIndex];
    letter.classList.remove("correct", "incorrect");
    letter.classList.add("current");
  } else {
    word.lastElementChild?.remove();
  }
  positionCaretAt(els.caret, state.wordIndex, state.currentInput.length, word);
}

function getGhostProgress() {
  if (!state.isReplay || !state.bestRun || state.bestRun.trace.length === 0)
    return null;
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
      const passed =
        wordIndex < progress.wordIndex ||
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
  if (
    !force &&
    last &&
    last.wordIndex === state.wordIndex &&
    last.charIndex === charIndex
  )
    return;

  const elapsedMs = state.started ? performance.now() - state.startAt : 0;
  state.progressSamples.push({
    elapsedMs: Math.max(last ? last.elapsedMs : 0, elapsedMs),
    wordIndex: state.wordIndex,
    charIndex,
    totalTypedChars: state.totalTypedChars,
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
  localStorage.setItem("cursorxgrid-font", fontName);
  layoutWords();
  renderWords();
}

function setScoreSaveStatus(message, isError = false) {
  els.scoreSaveStatus.textContent = message;
  els.scoreSaveStatus.classList.toggle("error", isError);
}

async function readApiResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("De server gaf een ongeldige reactie.");
  }
  if (!response.ok) {
    throw new Error(payload.error || "De aanvraag is mislukt.");
  }
  return payload;
}

async function openScoreSession(runId) {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ mode: `${state.mode}:${state.value}` }),
    });
    const payload = await readApiResponse(response);
    if (runId !== state.testRunId) return null;
    if (typeof payload.sessionId !== "string" || !payload.sessionId) {
      throw new Error("De server heeft geen testsessie aangemaakt.");
    }
    return payload.sessionId;
  } catch (error) {
    if (runId === state.testRunId) {
      setScoreSaveStatus(
        `Score opslaan niet beschikbaar: ${error.message}`,
        true,
      );
    }
    console.error("Could not start score session:", error);
    return null;
  }
}

async function prepareScoreSubmission(runId, correctChars, incorrectChars) {
  try {
    const sessionId = await state.sessionPromise;
    if (runId !== state.testRunId || !sessionId) return;
    const response = await fetch("/api/sessions/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });
    await readApiResponse(response);
    if (runId !== state.testRunId) return;

    if (correctChars + incorrectChars < 1) {
      setScoreSaveStatus("Er zijn geen getypte tekens om op te slaan.", true);
      return;
    }
    state.scoreSubmission = {
      sessionId,
      mode: `${state.mode}:${state.value}`,
      correctChars,
      incorrectChars,
    };
    state.scoreSessionReady = true;
    els.scoreSaveButton.disabled = false;
    setScoreSaveStatus("Vul je naam in om je score op te slaan.");
  } catch (error) {
    if (runId === state.testRunId) {
      setScoreSaveStatus(
        `Score opslaan niet beschikbaar: ${error.message}`,
        true,
      );
    }
    console.error("Could not finish score session:", error);
  }
}

function beginTest() {
  if (state.started || state.finished) return;
  state.started = true;
  state.startAt = performance.now();
  const runId = state.testRunId;
  state.sessionPromise = openScoreSession(runId);
  document.body.classList.add("test-running");
  layoutWords();
  els.hint.textContent =
    state.mode === "time"
      ? "Typ door tot de timer op nul staat"
      : `${state.value} woorden`;
  state.liveTimerId = window.setInterval(updateLiveWpm, 250);
  if (state.mode === "time") {
    state.timerId = window.setInterval(updateCountdown, 50);
  }
}

function updateLiveWpm() {
  if (!state.started || state.finished) return;
  const { correctChars } = countCharacters();
  const elapsedMinutes =
    Math.max(1000, performance.now() - state.startAt) / 60000;
  els.liveWpm.textContent = String(
    Math.round(correctChars / 5 / elapsedMinutes),
  );
  updateGhostProgress();
}

function updateCountdown() {
  if (!state.started || state.finished) return;
  const elapsed = performance.now() - state.startAt;
  const remaining = Math.max(0, state.value * 1000 - elapsed);
  setTimer((remaining / 1000).toFixed(1));
  if (remaining <= 0) finishTest();
}

function randomInt(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function startTimeRace() {
  if (state.transitioning) return;
  state.finished = false;
  applyTestReset();
  state.gameMode = "time-race";
  state.words = shuffledWords(
    wordBanks[state.language][state.difficulty],
  ).slice(0, 200);
  state.raceWordsUntilBonus = randomInt(3, 5);
  state.raceTimeRemaining = 10000;
  state.raceScore = 0;
  state.raceBonuses = 0;
  state.raceBonusIndex = null;
  els.raceScore.textContent = "0";
  els.raceBonusStatus.textContent = "";
  els.progressLabel.textContent = "tijd";
  els.hint.textContent = "Typ het woord en druk op spatie of enter";
  state.raceCountdownValue = 3;
  els.raceCountdownNumber.textContent = "3";
  els.raceCountdownNumber.classList.remove("pulse");
  void els.raceCountdownNumber.offsetWidth;
  els.raceCountdownNumber.classList.add("pulse");
  els.raceCountdown.hidden = false;
  els.raceHud.hidden = true;
  els.raceGameOver.hidden = true;
  els.input.disabled = true;
  document.body.classList.add("time-race", "time-race-countdown");
  state.raceCountdownId = window.setInterval(
    updateTimeRaceStartCountdown,
    1000,
  );
}

function updateTimeRaceStartCountdown() {
  state.raceCountdownValue -= 1;
  if (state.raceCountdownValue <= 0) {
    beginTimeRace();
    return;
  }
  els.raceCountdownNumber.classList.remove("pulse");
  void els.raceCountdownNumber.offsetWidth;
  els.raceCountdownNumber.textContent = String(state.raceCountdownValue);
  els.raceCountdownNumber.classList.add("pulse");
}

function beginTimeRace() {
  clearInterval(state.raceCountdownId);
  state.raceCountdownId = null;
  els.raceCountdown.hidden = true;
  els.raceHud.hidden = false;
  els.input.disabled = false;
  setTimer("10.0", false);
  document.body.classList.remove("time-race-countdown");
  state.started = true;
  state.startAt = performance.now();
  state.raceLastTick = state.startAt;
  document.body.classList.add("test-running");
  layoutWords();
  renderWords();
  state.timerId = window.setInterval(updateTimeRaceCountdown, 50);
  focusInput();
}

function updateTimeRaceCountdown() {
  if (!state.started || state.finished || state.gameMode !== "time-race")
    return;
  const now = performance.now();
  state.raceTimeRemaining = Math.max(
    0,
    state.raceTimeRemaining - (now - state.raceLastTick),
  );
  state.raceLastTick = now;
  setTimer((state.raceTimeRemaining / 1000).toFixed(1), false);
  if (state.raceTimeRemaining <= 0) finishTimeRace();
}

function handleTimeRaceKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || state.finished) return;
  if (event.key === "Backspace") {
    event.preventDefault();
    if (state.currentInput.length === 0) return;
    state.currentInput = state.currentInput.slice(0, -1);
    updateWordAfterBackspace();
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (state.currentInput !== state.words[state.wordIndex]) {
      els.hint.textContent = "Onjuist woord — verbeter je invoer.";
      els.raceBonusStatus.textContent = "Onjuist woord";
      window.clearTimeout(state.raceStatusTimeout);
      state.raceStatusTimeout = window.setTimeout(() => {
        els.raceBonusStatus.textContent = "";
      }, 1200);
      return;
    }

    const wasBonus = state.raceBonusIndex === state.wordIndex;
    state.typedWords[state.wordIndex] = state.currentInput;
    state.currentInput = "";
    state.wordIndex += 1;
    state.raceScore += 1;
    els.raceScore.textContent = String(state.raceScore);

    if (state.wordIndex >= state.words.length - 10) {
      state.words.push(
        ...shuffledWords(wordBanks[state.language][state.difficulty]).slice(
          0,
          50,
        ),
      );
      layoutWords();
    }

    if (wasBonus) {
      state.raceBonusIndex = null;
      state.raceWordsUntilBonus = randomInt(3, 5);
      state.raceTimeRemaining += 3000;
      els.raceBonusStatus.textContent = "+3 seconden!";
      window.clearTimeout(state.raceStatusTimeout);
      state.raceStatusTimeout = window.setTimeout(() => {
        els.raceBonusStatus.textContent = "";
      }, 1400);
      setTimer((state.raceTimeRemaining / 1000).toFixed(1), false);
      state.raceBonuses += 1;
    } else {
      state.raceWordsUntilBonus -= 1;
      if (state.raceWordsUntilBonus <= 0) {
        state.raceBonusIndex = state.wordIndex;
      }
    }

    els.hint.textContent = "Typ het woord en druk op spatie of enter";
    renderWords();
    return;
  }
  if (event.key.length !== 1 || event.key < " ") return;
  event.preventDefault();
  state.currentInput += event.key.toLocaleLowerCase();
  state.totalTypedChars += 1;
  updateWordAfterTyping();
}

function finishTimeRace() {
  if (state.finished || state.gameMode !== "time-race") return;
  state.finished = true;
  state.started = false;
  state.raceTimeRemaining = 0;
  clearInterval(state.timerId);
  window.clearTimeout(state.raceStatusTimeout);
  state.timerId = null;
  state.raceStatusTimeout = null;
  setTimer("0.0", false);
  els.input.disabled = true;
  els.input.blur();
  els.raceHud.hidden = true;
  els.raceFinalScore.textContent = String(state.raceScore);
  els.raceBonusTotal.textContent = state.raceBonuses
    ? `${state.raceBonuses} bonuswoord${state.raceBonuses === 1 ? "" : "en"} geraakt`
    : "Geen bonuswoorden geraakt";
  els.raceGameOver.hidden = false;
  document.body.classList.remove("test-running");
  document.body.classList.add("time-race-finished");
}

function exitTimeRace() {
  if (state.gameMode !== "time-race") return;
  state.finished = false;
  applyTestReset();
}

function countCharacters() {
  let correctChars = 0;
  let incorrectChars = 0;
  for (let index = 0; index <= state.wordIndex; index += 1) {
    const typed =
      index === state.wordIndex
        ? state.currentInput
        : state.typedWords[index] || "";
    const target = state.words[index];
    for (let charIndex = 0; charIndex < typed.length; charIndex += 1) {
      if (typed[charIndex] === target[charIndex]) correctChars += 1;
      else incorrectChars += 1;
    }
    if (index < state.wordIndex) correctChars += 1;
  }
  return { correctChars, incorrectChars };
}

function getSpeedSamples(trace, elapsedMs) {
  const durationMs = Math.max(1000, elapsedMs);
  const sampleTimes = [];
  for (let sampleTime = 1000; sampleTime < durationMs; sampleTime += 1000) {
    sampleTimes.push(sampleTime);
  }
  sampleTimes.push(durationMs);

  let endIndex = 0;
  let startIndex = 0;
  return sampleTimes.map((sampleTime) => {
    const windowStart = Math.max(0, sampleTime - 1000);
    while (
      endIndex + 1 < trace.length &&
      trace[endIndex + 1].elapsedMs <= sampleTime
    )
      endIndex += 1;
    while (
      startIndex + 1 < trace.length &&
      trace[startIndex + 1].elapsedMs <= windowStart
    )
      startIndex += 1;

    const endChars = trace[endIndex]?.totalTypedChars || 0;
    const startChars = trace[startIndex]?.totalTypedChars || 0;
    const windowMs = Math.min(1000, sampleTime);
    return {
      elapsedMs: sampleTime,
      rawWpm: ((endChars - startChars) * 60000) / (5 * windowMs),
    };
  });
}

function calculateConsistency(samples) {
  const average =
    samples.reduce((total, sample) => total + sample.rawWpm, 0) /
    samples.length;
  if (!Number.isFinite(average) || average <= 0) return 0;

  const variance =
    samples.reduce(
      (total, sample) => total + (sample.rawWpm - average) ** 2,
      0,
    ) / samples.length;
  const variation = Math.sqrt(variance) / average;
  return Math.round(Math.max(0, Math.min(100, (1 - variation) * 100)));
}

function renderResultsChart(samples, elapsedMs) {
  const svg = els.resultsChart;
  const title = svg.querySelector("title");
  title.textContent = `Raw WPM per seconde tijdens een test van ${(elapsedMs / 1000).toFixed(1)} seconden`;
  svg.replaceChildren(title);

  const width = svg.clientWidth || 640;
  const height = svg.clientHeight || 190;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const padding = { top: 12, right: 12, bottom: 28, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const durationMs = Math.max(1000, elapsedMs);
  const peakWpm = Math.max(20, ...samples.map((sample) => sample.rawWpm));
  const maxWpm = Math.ceil(peakWpm / 20) * 20;
  const createElement = (name, attributes, text) => {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      name,
    );
    Object.entries(attributes).forEach(([attribute, value]) =>
      element.setAttribute(attribute, String(value)),
    );
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const getX = (timeMs) => padding.left + (timeMs / durationMs) * plotWidth;
  const getY = (wpm) => padding.top + plotHeight - (wpm / maxWpm) * plotHeight;

  [0, maxWpm / 2, maxWpm].forEach((wpm) => {
    const y = getY(wpm);
    svg.append(
      createElement("line", {
        x1: padding.left,
        y1: y,
        x2: width - padding.right,
        y2: y,
        class: "chart-grid-line",
      }),
      createElement(
        "text",
        {
          x: padding.left - 8,
          y: y + 4,
          class: "chart-axis-label",
          "text-anchor": "end",
        },
        String(Math.round(wpm)),
      ),
    );
  });

  const points = [{ elapsedMs: 0, rawWpm: 0 }, ...samples];
  const pointList = points.map(
    (sample) => `${getX(sample.elapsedMs)},${getY(sample.rawWpm)}`,
  );
  const linePath = pointList
    .map((point, index) => `${index === 0 ? "M" : "L"}${point}`)
    .join(" ");
  svg.append(createElement("path", { d: linePath, class: "chart-line" }));

  const durationSeconds = elapsedMs / 1000;
  [0, durationSeconds / 2, durationSeconds].forEach((seconds) => {
    const x = getX(seconds * 1000);
    svg.append(
      createElement(
        "text",
        {
          x,
          y: height - 5,
          class: "chart-axis-label",
          "text-anchor":
            seconds === 0
              ? "start"
              : seconds === durationSeconds
                ? "end"
                : "middle",
        },
        `${seconds.toFixed(seconds % 1 ? 1 : 0)}s`,
      ),
    );
  });
}

function finishTest() {
  if (state.finished) return;
  const runId = state.testRunId;
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
  const rawWpm = Math.round(state.totalTypedChars / 5 / (elapsedMs / 60000));
  const accuracy = typedChars ? (correctChars / typedChars) * 100 : 0;
  const speedSamples = getSpeedSamples(state.progressSamples, elapsedMs);
  const consistency = calculateConsistency(speedSamples);
  if (!state.bestRun || wpm > state.bestRun.wpm) {
    state.bestRun = {
      words: [...state.words],
      wpm,
      trace: [...state.progressSamples],
    };
  }
  els.resultWpm.textContent = String(wpm);
  els.resultRawWpm.textContent = String(rawWpm);
  els.resultAccuracy.textContent = `${accuracy.toFixed(1)}%`;
  els.resultErrors.textContent = Number.isInteger(errors)
    ? String(errors)
    : errors.toFixed(1);
  els.resultConsistency.textContent = `${consistency}%`;
  els.results.hidden = false;
  els.scoreForm.hidden = false;
  els.scoreSaveButton.disabled = true;
  setScoreSaveStatus("Score wordt gecontroleerd...");
  void prepareScoreSubmission(
    runId,
    correctChars,
    Math.max(0, state.totalTypedChars - correctChars),
  );
  els.input.disabled = true;
  els.input.blur();
  document.body.classList.remove("test-running");
  document.body.classList.add("test-finished");
  renderResultsChart(speedSamples, elapsedMs);
  els.results.classList.remove("is-leaving");
}

function handleKeydown(event) {
  if (state.transitioning) {
    event.preventDefault();
    return;
  }
  if (state.gameMode === "time-race") {
    handleTimeRaceKeydown(event);
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || state.finished) return;
  if (event.key === "Backspace") {
    event.preventDefault();
    if (!state.started) return;
    if (state.currentInput.length > 0) {
      const charIndex = state.currentInput.length - 1;
      if (
        state.currentInput[charIndex] !==
        state.words[state.wordIndex][charIndex]
      ) {
        state.correctedErrors += 1;
      }
      state.currentInput = state.currentInput.slice(0, -1);
      updateWordAfterBackspace();
    } else if (state.wordIndex > 0) {
      state.wordIndex -= 1;
      state.currentInput = state.typedWords[state.wordIndex] || "";
      state.typedWords[state.wordIndex] = "";
      recordProgress();
      if (state.mode === "words") {
        setTimer(`${Math.min(state.wordIndex, state.value)}/${state.value}`);
      }
      renderWords();
      return;
    } else {
      return;
    }
    recordProgress();
    if (state.mode === "words") {
      setTimer(`${Math.min(state.wordIndex, state.value)}/${state.value}`);
    }
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (!state.started) beginTest();
    if (state.currentInput.length === 0) return;
    state.typedWords[state.wordIndex] = state.currentInput;
    state.currentInput = "";
    state.wordIndex += 1;
    state.totalTypedChars += 1;
    recordProgress();
    if (state.mode === "words") {
      setTimer(`${Math.min(state.wordIndex, state.value)}/${state.value}`);
    }
    if (
      state.wordIndex >= state.words.length ||
      (state.mode === "words" && state.wordIndex >= state.value)
    ) {
      finishTest();
      return;
    }
    renderWords();
    return;
  }
  if (event.key.length !== 1 || event.key < " ") return;
  event.preventDefault();
  const isFirstCharacter = !state.started;
  if (isFirstCharacter) beginTest();
  state.currentInput += event.key.toLocaleLowerCase();
  state.totalTypedChars += 1;
  recordProgress();
  if (isFirstCharacter) renderWords();
  else updateWordAfterTyping();
}

function replaySameText() {
  if (!state.finished || !state.bestRun) return;
  resetTest({
    words: state.bestRun.words,
    bestRun: state.bestRun,
    isReplay: true,
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
    const response = await fetch("/api/scores", {
      headers: { Accept: "application/json" },
    });
    const scores = await readApiResponse(response);
    renderScores(scores);
  } catch (error) {
    els.scoreList.innerHTML =
      '<tr><td class="empty-state" colspan="5">Scoreboard tijdelijk niet beschikbaar</td></tr>';
    els.scoreList.querySelector("td").textContent =
      `Scores niet beschikbaar: ${error.message}`;
    console.error(error);
  }
}

function renderScores(scores) {
  if (scores.length === 0) {
    els.scoreList.innerHTML =
      '<tr><td class="empty-state" colspan="5">Nog geen scores — wees de eerste!</td></tr>';
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
      { text: score.mode },
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
  toastTimeout = window.setTimeout(
    () => els.toast.classList.remove("visible"),
    2400,
  );
}

const navMenu = document.querySelector(".nav-menu");
const navMenuToggle = document.querySelector("#nav-menu-toggle");
const navMenuItems = document.querySelector("#main-tabs");

function setNavMenuOpen(open) {
  navMenu.classList.toggle("open", open);
  navMenuToggle.setAttribute("aria-expanded", String(open));
  navMenuItems.setAttribute("aria-hidden", String(!open));
}

navMenuToggle.addEventListener("click", () =>
  setNavMenuOpen(!navMenu.classList.contains("open")),
);
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
  document.body.classList.toggle("scores-view", tabName === "scores");
  document.querySelectorAll(".main-tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden =
      !active;
  });
  document.querySelector("#current-tab-label").textContent =
    tabName === "scores" ? "Scores" : "Typetest";
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
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll(".main-tab")];
    const index = tabs.indexOf(tab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
            tabs.length;
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
      option.classList.toggle(
        "active",
        option.closest("#time-options, #word-options") ===
          (state.mode === "time" ? els.timeOptions : els.wordOptions) &&
          Number(option.dataset.value) === state.value,
      );
    });
    const activeOption = (
      state.mode === "time" ? els.timeOptions : els.wordOptions
    ).querySelector(".value-button.active");
    if (!activeOption) {
      const firstOption = (
        state.mode === "time" ? els.timeOptions : els.wordOptions
      ).querySelector(".value-button");
      firstOption.classList.add("active");
      state.value = Number(firstOption.dataset.value);
    }
    resetTest();
  });
});

els.raceLauncher.addEventListener("click", startTimeRace);
els.raceRestart.addEventListener("click", startTimeRace);
els.raceExit.addEventListener("click", exitTimeRace);

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
els.panel.addEventListener("click", (event) => {
  if (
    event.target.closest("button") ||
    (state.gameMode === "time-race" && state.finished)
  )
    return;
  focusInput();
});
document.querySelector("#restart-button").addEventListener("click", resetTest);
document.querySelector("#results-restart").addEventListener("click", resetTest);
els.replayButton.addEventListener("click", replaySameText);
els.scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !state.finished ||
    state.gameMode !== "typing" ||
    !state.scoreSessionReady ||
    state.scoreSaving ||
    state.scoreSaved
  )
    return;

  const name = els.scoreName.value.trim();
  if (!name) {
    setScoreSaveStatus("Vul je naam in om je score op te slaan.", true);
    els.scoreName.focus();
    return;
  }

  const runId = state.testRunId;
  state.scoreSaving = true;
  els.scoreName.disabled = true;
  els.scoreSaveButton.disabled = true;
  setScoreSaveStatus("Score opslaan...");
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ...state.scoreSubmission, name }),
    });
    const score = await readApiResponse(response);
    if (runId !== state.testRunId) return;
    state.scoreSaved = true;
    state.scoreSessionReady = false;
    setScoreSaveStatus(
      `Score opgeslagen: ${Number(score.wpm).toFixed(1)} WPM.`,
    );
    void loadScores();
  } catch (error) {
    if (runId === state.testRunId) {
      els.scoreName.disabled = false;
      els.scoreSaveButton.disabled = false;
      setScoreSaveStatus(`Score opslaan mislukt: ${error.message}`, true);
    }
    console.error("Could not save score:", error);
  } finally {
    if (runId === state.testRunId) state.scoreSaving = false;
  }
});
const savedFont = localStorage.getItem("cursorxgrid-font");
if (Object.prototype.hasOwnProperty.call(fontFamilies, savedFont)) {
  els.fontSelect.value = savedFont;
}
document.documentElement.style.setProperty(
  "--font",
  fontFamilies[els.fontSelect.value],
);
els.fontSelect.addEventListener("change", () => setFont(els.fontSelect.value));

let restartArmed = false;
let restartTimeout = null;
document.addEventListener("keydown", (event) => {
  if (state.gameMode === "time-race") {
    if (event.key === "Escape") {
      event.preventDefault();
      exitTimeRace();
    }
    return;
  }
  if (state.transitioning) {
    event.preventDefault();
    return;
  }
  if (
    state.finished &&
    event.key === "Enter" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    replaySameText();
    return;
  }
  if (state.finished && event.key === "Escape") {
    event.preventDefault();
    resetTest();
    return;
  }
  if (state.started && event.key === "Escape") {
    event.preventDefault();
    restartArmed = false;
    window.clearTimeout(restartTimeout);
    restartTimeout = null;
    resetTest();
    els.hint.textContent =
      "Test afgebroken — typ een letter om opnieuw te beginnen.";
    return;
  }
  if (
    event.key === "Tab" &&
    !event.shiftKey &&
    els.scoresPanel.hidden &&
    document.activeElement === els.input
  ) {
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
  if (
    state.gameMode === "time-race" &&
    state.raceCountdownId &&
    !state.finished
  ) {
    exitTimeRace();
    return;
  }
  if (!state.started || state.finished || !els.scoresPanel.hidden) return;
  restartArmed = false;
  window.clearTimeout(restartTimeout);
  restartTimeout = null;
  resetTest();
  els.hint.textContent =
    "Test gestopt: je hebt het tabblad verlaten. Start opnieuw.";
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelTestOnFocusLoss();
});
window.addEventListener("blur", cancelTestOnFocusLoss);

resetTest();
window.setInterval(() => {
  if (!els.scoresPanel.hidden) loadScores();
}, 15000);

if (window.cursorXGridDesktop) {
  document.querySelector("#fullscreen-hint").hidden = false;
}

if (window.cursorXGridUpdates) {
  const notice = document.querySelector("#update-notice");
  const message = document.querySelector("#update-message");
  const progress = document.querySelector("#update-progress");
  const action = document.querySelector("#update-action");
  const dismiss = document.querySelector("#update-dismiss");
  let updateState = { status: "idle" };
  let dismissed = false;

  function isTestInProgress() {
    return (
      (state.started && !state.finished) ||
      state.transitioning ||
      state.raceCountdownId !== null
    );
  }

  function showUpdateState() {
    notice.hidden =
      isTestInProgress() || dismissed || updateState.status === "idle";
    if (notice.hidden) return;
    action.hidden = !["available", "downloaded"].includes(updateState.status);
    progress.hidden = updateState.status !== "downloading";
    if (updateState.status === "available") {
      message.textContent = `Nieuwe versie ${updateState.version} is beschikbaar.`;
      action.textContent = "Update downloaden";
    } else if (updateState.status === "downloaded") {
      message.textContent = `Versie ${updateState.version} is klaar. CursorXGrid sluit kort en start automatisch opnieuw.`;
      action.textContent = "Installeren en herstarten";
    } else if (updateState.status === "downloading") {
      if (Number.isFinite(updateState.percent)) {
        progress.value = updateState.percent;
        message.textContent = `Update wordt gedownload... ${updateState.percent}%`;
      } else {
        progress.removeAttribute("value");
        message.textContent = "Update wordt gedownload...";
      }
    } else if (updateState.status === "installing") {
      message.textContent =
        "Update wordt geïnstalleerd. CursorXGrid start zo opnieuw.";
    } else {
      message.textContent = updateState.message || "Updatecontrole mislukt.";
    }
  }

  function receiveUpdate(nextState) {
    if (nextState.status !== updateState.status) dismissed = false;
    updateState = nextState;
    showUpdateState();
  }

  window.cursorXGridUpdates.onState(receiveUpdate);
  window.cursorXGridUpdates
    .getState()
    .then(receiveUpdate)
    .catch((error) => {
      console.error("Update-informatie ophalen mislukt:", error);
      receiveUpdate({
        status: "error",
        message: "Update-informatie ophalen mislukt.",
      });
    });
  action.addEventListener("click", async () => {
    if (isTestInProgress()) return;
    try {
      if (updateState.status === "available")
        await window.cursorXGridUpdates.download();
      else if (updateState.status === "downloaded")
        await window.cursorXGridUpdates.install();
    } catch (error) {
      console.error("Updateactie mislukt:", error);
      receiveUpdate({ status: "error", message: "Updateactie mislukt." });
    }
  });
  dismiss.addEventListener("click", () => {
    dismissed = true;
    showUpdateState();
  });
  window.setInterval(showUpdateState, 250);
}
