const state = {
  currentSlide: 0,
  timerRunning: false,
  sessionLength: 0,
  elapsedTime: 0,
  slides: [],
  selectedFile: '',
  deckTitle: '',
  timerIntervalId: null,
  timerStartedAt: null,
  touchStartX: 0,
  touchStartY: 0,
  touchStartAt: 0,
};

const elements = {
  deckName: document.getElementById('deckName'),
  elapsedTime: document.getElementById('elapsedTime'),
  remainingTime: document.getElementById('remainingTime'),
  meanTime: document.getElementById('meanTime'),
  timerToggle: document.getElementById('timerToggle'),
  slideCard: document.getElementById('slideCard'),
  slideKicker: document.getElementById('slideKicker'),
  slideTitle: document.getElementById('slideTitle'),
  slideContent: document.getElementById('slideContent'),
  speakerNotes: document.getElementById('speakerNotes'),
  fileSelectorModal: document.getElementById('fileSelectorModal'),
  fileStatus: document.getElementById('fileStatus'),
  fileList: document.getElementById('fileList'),
  refreshFiles: document.getElementById('refreshFiles'),
  fileButtonTemplate: document.getElementById('fileButtonTemplate'),
  timerModal: document.getElementById('timerModal'),
  timerForm: document.getElementById('timerForm'),
  sessionLength: document.getElementById('sessionLength'),
  skipTimer: document.getElementById('skipTimer'),
};

function init() {
  bindEvents();
  updateDeckName();
  updateTimerDisplay();
  renderSlide();
  void loadSlideFiles();
}

function bindEvents() {
  elements.deckName.addEventListener('click', () => void loadSlideFiles());
  elements.deckName.addEventListener('keydown', onDeckNameKeyDown);
  elements.refreshFiles.addEventListener('click', () => void loadSlideFiles());
  elements.timerToggle.addEventListener('click', onTimerToggle);
  elements.timerForm.addEventListener('submit', onTimerSubmit);
  elements.skipTimer.addEventListener('click', closeTimerModal);

  document.addEventListener('keydown', onKeyDown);
  elements.slideCard.addEventListener('touchstart', onTouchStart, { passive: true });
  elements.slideCard.addEventListener('touchend', onTouchEnd, { passive: true });
}

async function loadSlideFiles() {
  setFileStatus('Loading available slide files…');
  elements.fileList.replaceChildren();
  openModal(elements.fileSelectorModal);

  try {
    const payload = await fetchJson('/api/list-slides');
    const files = normalizeFileList(payload);

    if (!files.length) {
      setFileStatus('No slide files were returned by the API.');
      return;
    }

    setFileStatus('Select a deck to load.');
    renderFileList(files);
  } catch (error) {
    setFileStatus(error.message || 'Unable to load slide files.');
  }
}

function normalizeFileList(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.files)
      ? payload.files
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  return candidates
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry.name === 'string') {
        return entry.name;
      }

      if (entry && typeof entry.filename === 'string') {
        return entry.filename;
      }

      return '';
    })
    .filter(Boolean);
}

function renderFileList(files) {
  elements.fileList.replaceChildren();

  files.forEach((filename) => {
    const button = elements.fileButtonTemplate.content.firstElementChild.cloneNode(true);
    button.textContent = filename;
    button.dataset.filename = filename;
    button.addEventListener('click', () => void loadSlideFile(filename));
    elements.fileList.appendChild(button);
  });
}

async function loadSlideFile(filename) {
  setFileStatus(`Loading ${filename}…`);

  try {
    const { response, payload: data } = await fetchResponse(`/api/get-slide?filename=${encodeURIComponent(filename)}`);
    const isValid = data?.isValid ?? data?.IsValid;
    const errors = data?.errors ?? data?.Errors;
    const slideSet = data?.slideSet ?? data?.SlideSet;

    if (!response.ok && isValid === false) {
      throw new Error(`Slide validation failed: ${formatErrors(errors)}`);
    }

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, response.statusText) || `Request failed with ${response.status}`);
    }

    if (!isValid) {
      throw new Error(`Slide validation failed: ${formatErrors(errors)}`);
    }

    const slides = normalizeSlides(data);

    if (!slides.length) {
      throw new Error('The selected file did not contain any slides.');
    }

    state.selectedFile = filename;
    state.deckTitle = typeof slideSet?.title === 'string'
      ? slideSet.title
      : typeof slideSet?.Title === 'string'
        ? slideSet.Title
        : typeof data?.title === 'string'
          ? data.title
          : typeof data?.Title === 'string'
            ? data.Title
            : '';
    state.slides = slides;
    state.currentSlide = 0;
    resetTimer();
    updateDeckName();
    closeModal(elements.fileSelectorModal);
    renderSlide();
    openTimerModal();
  } catch (error) {
    setFileStatus(error.message || `Unable to load ${filename}.`);
  }
}

function normalizeSlides(payload) {
  const slideSet = payload?.slideSet ?? payload?.SlideSet;
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(slideSet?.slides)
      ? slideSet.slides
      : Array.isArray(slideSet?.Slides)
        ? slideSet.Slides
        : Array.isArray(payload?.slides)
          ? payload.slides
          : Array.isArray(payload?.Slides)
            ? payload.Slides
            : [];

  if (!candidates.length) {
    throw new Error('Unexpected slide payload from API.');
  }

  return candidates.map(normalizeSlide).filter(Boolean);
}

function normalizeSlide(slide, index) {
  if (typeof slide === 'string') {
    const lines = slide.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return {
      headlines: lines.length ? lines : [`Slide ${index + 1}`],
      bullets: [],
      sections: [],
      notes: '',
    };
  }

  if (!slide || typeof slide !== 'object') {
    return null;
  }

  const contentValue = slide.content ?? slide.Content;
  const paragraphsValue = slide.paragraphs ?? slide.Paragraphs;
  const bulletsValue = slide.bullets ?? slide.Bullets;
  const sectionsValue = slide.sections ?? slide.Sections;
  const headlinesValue = slide.headlines ?? slide.Headlines;
  const titleValue = slide.title ?? slide.Title;
  const notesValue = slide.notes ?? slide.Notes;

  const content = Array.isArray(contentValue)
    ? contentValue.map((line) => String(line).trim()).filter(Boolean)
    : typeof contentValue === 'string'
      ? contentValue.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];

  const paragraphs = Array.isArray(paragraphsValue)
    ? paragraphsValue.map((line) => String(line).trim()).filter(Boolean)
    : [];

  const bullets = Array.isArray(bulletsValue)
    ? bulletsValue.map((bullet) => String(bullet).trim()).filter(Boolean)
    : [];

  const sections = Array.isArray(sectionsValue)
    ? sectionsValue
      .map((section) => {
        if (!section || typeof section !== 'object') {
          return null;
        }

        const headerValue = section.header ?? section.Header;
        const sectionBulletsValue = section.bullets ?? section.Bullets;
        const header = typeof headerValue === 'string' ? headerValue.trim() : '';
        const sectionBullets = Array.isArray(sectionBulletsValue)
          ? sectionBulletsValue.map((bullet) => String(bullet).trim()).filter(Boolean)
          : [];

        if (!header) {
          return null;
        }

        return {
          header,
          bullets: sectionBullets,
        };
      })
      .filter(Boolean)
    : [];

  const headlineCandidates = Array.isArray(headlinesValue)
    ? headlinesValue
    : typeof headlinesValue === 'string'
      ? [headlinesValue]
      : typeof titleValue === 'string'
        ? [titleValue, ...paragraphs, ...content]
        : [...paragraphs, ...content];

  const headlines = headlineCandidates.map((line) => String(line).trim()).filter(Boolean);

  return {
    headlines: headlines.length ? headlines : [`Slide ${index + 1}`],
    bullets,
    sections,
    notes: typeof notesValue === 'string' ? notesValue : '',
  };
}

function renderSlide() {
  const totalSlides = state.slides.length;
  const currentSlide = state.slides[state.currentSlide];

  elements.timerToggle.disabled = !totalSlides;
  elements.slideCard.scrollTop = 0;

  if (!currentSlide) {
    elements.slideKicker.textContent = 'Ready';
    elements.slideTitle.textContent = 'Choose a slide file to begin';
    elements.slideContent.replaceChildren(createParagraph('Open a slide deck from the startup dialog to render your notes here.'));
    elements.speakerNotes.classList.add('hidden');
    elements.speakerNotes.replaceChildren();
    updateTimerDisplay();
    return;
  }

  const headlines = Array.isArray(currentSlide.headlines)
    ? currentSlide.headlines.filter(Boolean)
    : typeof currentSlide.headlines === 'string'
      ? [currentSlide.headlines]
      : [];

  const [title, ...supportingHeadlines] = headlines.length
    ? headlines
    : [`Slide ${state.currentSlide + 1}`];

  const hasSections = Array.isArray(currentSlide.sections) && currentSlide.sections.length > 0;

  elements.slideKicker.textContent = `Slide ${state.currentSlide + 1} / ${totalSlides}`;
  elements.slideTitle.textContent = title;
  elements.slideContent.replaceChildren();

  if (!supportingHeadlines.length && !currentSlide.bullets.length && !hasSections) {
    elements.slideContent.appendChild(createParagraph('No body content was provided for this slide.'));
  } else {
    supportingHeadlines.forEach((headline) => {
      elements.slideContent.appendChild(createParagraph(headline));
    });

    if (hasSections) {
      currentSlide.sections.forEach((section) => {
        elements.slideContent.appendChild(createSection(section));
      });
    } else if (currentSlide.bullets.length) {
      elements.slideContent.appendChild(createBulletList(currentSlide.bullets));
    }
  }

  renderNotes(currentSlide.notes);
  updateTimerDisplay();
}

function renderNotes(notes) {
  elements.speakerNotes.replaceChildren();

  if (!notes) {
    elements.speakerNotes.classList.add('hidden');
    return;
  }

  const heading = document.createElement('h3');
  heading.textContent = 'Speaker notes';
  elements.speakerNotes.appendChild(heading);

  notes.split(/\r?\n/).filter(Boolean).forEach((noteLine) => {
    elements.speakerNotes.appendChild(createParagraph(noteLine));
  });

  elements.speakerNotes.classList.remove('hidden');
}

function createParagraph(text) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

function createBulletList(items, className = '') {
  const list = document.createElement('ul');
  if (className) {
    list.className = className;
  }

  items.forEach((bullet) => {
    const item = document.createElement('li');
    item.textContent = bullet;
    list.appendChild(item);
  });

  return list;
}

function createSection(section) {
  const element = document.createElement('section');
  element.className = 'section';

  const header = document.createElement('h3');
  header.className = 'section-header';
  header.textContent = section.header;
  element.appendChild(header);

  if (section.bullets.length) {
    element.appendChild(createBulletList(section.bullets, 'section-bullets'));
  }

  return element;
}

function updateDeckName() {
  const deckLabel = [state.deckTitle, state.selectedFile].filter(Boolean).join(' • ') || 'Choose a deck';
  elements.deckName.textContent = `Deck: ${deckLabel}`;
  elements.deckName.title = deckLabel;
}

function goToSlide(index) {
  if (!state.slides.length) {
    return;
  }

  const boundedIndex = Math.max(0, Math.min(index, state.slides.length - 1));

  if (boundedIndex === state.currentSlide) {
    return;
  }

  state.currentSlide = boundedIndex;
  renderSlide();
}

function onDeckNameKeyDown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void loadSlideFiles();
  }
}

function onKeyDown(event) {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT') {
    return;
  }

  if (event.key.toLowerCase() === 'f' || event.key.toLowerCase() === 'o') {
    event.preventDefault();
    void loadSlideFiles();
    return;
  }

  if (isModalOpen(elements.fileSelectorModal) || isModalOpen(elements.timerModal)) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    goToSlide(state.currentSlide - 1);
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    goToSlide(state.currentSlide + 1);
  }
}

function onTouchStart(event) {
  const touch = event.changedTouches[0];
  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
  state.touchStartAt = Date.now();
}

function onTouchEnd(event) {
  if (isModalOpen(elements.fileSelectorModal) || isModalOpen(elements.timerModal)) {
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - state.touchStartX;
  const deltaY = touch.clientY - state.touchStartY;
  const elapsed = Date.now() - state.touchStartAt;

  if (elapsed > 700 || Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  if (deltaX < 0) {
    goToSlide(state.currentSlide + 1);
  } else {
    goToSlide(state.currentSlide - 1);
  }
}

function openTimerModal() {
  if (state.currentSlide !== 0) {
    return;
  }

  openModal(elements.timerModal);
  elements.sessionLength.focus();
  elements.sessionLength.select();
}

function closeTimerModal() {
  closeModal(elements.timerModal);
}

function onTimerSubmit(event) {
  event.preventDefault();
  const minutes = Number(elements.sessionLength.value);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    elements.sessionLength.focus();
    return;
  }

  startTimer(minutes);
  closeTimerModal();
}

function onTimerToggle() {
  if (!state.slides.length) {
    return;
  }

  if (!state.sessionLength) {
    openTimerModal();
    return;
  }

  if (state.timerRunning) {
    pauseTimer();
  } else {
    resumeTimer();
  }
}

function startTimer(minutes) {
  state.sessionLength = minutes * 60;
  state.elapsedTime = 0;
  state.timerStartedAt = Date.now();
  state.timerRunning = true;
  startTimerInterval();
  updateTimerDisplay();
}

function resumeTimer() {
  state.timerStartedAt = Date.now() - state.elapsedTime * 1000;
  state.timerRunning = true;
  startTimerInterval();
  updateTimerDisplay();
}

function pauseTimer() {
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = null;
  state.elapsedTime = Math.floor((Date.now() - state.timerStartedAt) / 1000);
  state.timerStartedAt = null;
  state.timerRunning = false;
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = null;
  state.timerRunning = false;
  state.sessionLength = 0;
  state.elapsedTime = 0;
  state.timerStartedAt = null;
  elements.timerToggle.textContent = 'Start';
  updateTimerDisplay();
}

function startTimerInterval() {
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = window.setInterval(() => {
    state.elapsedTime = Math.floor((Date.now() - state.timerStartedAt) / 1000);
    updateTimerDisplay();
  }, 1000);
  elements.timerToggle.textContent = 'Pause';
}

function updateTimerDisplay() {
  if (state.timerRunning && state.timerStartedAt) {
    state.elapsedTime = Math.floor((Date.now() - state.timerStartedAt) / 1000);
  }

  const remainingSeconds = state.sessionLength ? state.sessionLength - state.elapsedTime : null;
  const slidesRemaining = state.slides.length ? state.slides.length - state.currentSlide : 0;
  const meanSeconds = remainingSeconds === null || slidesRemaining <= 0
    ? null
    : Math.max(0, Math.floor(remainingSeconds / slidesRemaining));

  elements.elapsedTime.textContent = formatDuration(Math.max(0, state.elapsedTime));
  elements.remainingTime.textContent = remainingSeconds === null
    ? '--:--'
    : remainingSeconds >= 0
      ? formatDuration(remainingSeconds)
      : `-${formatDuration(Math.abs(remainingSeconds))}`;
  elements.meanTime.textContent = meanSeconds === null ? '--:--' : formatDuration(meanSeconds);

  if (!state.sessionLength) {
    elements.timerToggle.textContent = 'Start';
  } else if (state.timerRunning) {
    elements.timerToggle.textContent = 'Pause';
  } else {
    elements.timerToggle.textContent = 'Resume';
  }
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function fetchResponse(url) {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: {
      Accept: 'application/json',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, payload };
}

async function fetchJson(url) {
  const { response, payload } = await fetchResponse(url);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.statusText) || `Request failed with ${response.status}`);
  }

  return payload;
}

function formatErrors(errors) {
  if (Array.isArray(errors) && errors.length) {
    return errors.join('; ');
  }

  if (typeof errors === 'string' && errors.trim()) {
    return errors.trim();
  }

  return 'Unknown error';
}

function extractErrorMessage(payload, fallback) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return formatErrors(payload.errors);
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    const details = typeof payload?.details === 'string' && payload.details.trim()
      ? ` ${payload.details.trim()}`
      : '';
    return `${payload.error.trim()}${details}`.trim();
  }

  return fallback;
}

function setFileStatus(message) {
  elements.fileStatus.textContent = message;
}

function openModal(element) {
  element.classList.add('is-open');
  element.setAttribute('aria-hidden', 'false');
}

function closeModal(element) {
  element.classList.remove('is-open');
  element.setAttribute('aria-hidden', 'true');
}

function isModalOpen(element) {
  return element.classList.contains('is-open');
}

window.addEventListener('beforeunload', () => clearInterval(state.timerIntervalId));
document.addEventListener('DOMContentLoaded', init);
