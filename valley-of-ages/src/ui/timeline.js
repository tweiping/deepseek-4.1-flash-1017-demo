import { ERA_YEARS } from '../world/palettes.js';

const TOTAL = ERA_YEARS.reduce((a, b) => a + b, 0);
const CUM = [0];
for (let i = 0; i < ERA_YEARS.length; i++) CUM.push(CUM[i] + ERA_YEARS[i] / TOTAL);

function formatYear(v) {
  const y = Math.round(v / 5) * 5;
  if (y < 0) return `${Math.abs(y).toLocaleString('en-US')} BCE`;
  return `${y.toLocaleString('en-US')} CE`;
}

export function createUI({ eras, onSeek, onPlay, onRecentre }) {
  const root = document.documentElement;
  const range = document.getElementById('t');
  const yearEl = document.querySelector('[data-year]');
  const eraEl = document.querySelector('[data-era]');
  const blurbEl = document.querySelector('[data-blurb]');
  const marker = document.querySelector('[data-marker]');
  const live = document.querySelector('[data-live]');
  const playBtn = document.querySelector('[data-play]');
  const playLabel = document.querySelector('[data-play-label]');
  const ticks = [...document.querySelectorAll('[data-step]')];

  let lastIndex = -1;
  let playing = false;

  function render(t) {
    const i = Math.max(0, Math.min(3, Math.floor(t)));
    const f = t - i;
    const a = eras[i].year;
    const b = eras[i + 1].year;
    const year = i >= eras.length - 1 ? eras[eras.length - 1].year : a + (b - a) * f;

    yearEl.textContent = formatYear(year);
    marker.style.top = `${(CUM[i] + f * (CUM[i + 1] - CUM[i])) * 100}%`;
    range.style.setProperty('--p', `${(t / 4) * 100}%`);

    const active = Math.round(t);
    if (active !== lastIndex) {
      lastIndex = active;
      const era = eras[active];
      eraEl.textContent = era.name;
      blurbEl.textContent = era.blurb;
      live.textContent = `${era.name}, ${era.yearLabel}`;
      for (let k = 0; k < ticks.length; k++) {
        ticks[k].setAttribute('aria-current', String(k === active));
      }
      range.setAttribute('aria-valuetext', `${era.name}, ${era.yearLabel}`);
      root.dataset.eraId = era.id;
    }
    if (document.activeElement !== range && Number(range.value) !== t) {
      range.value = String(t);
    }
  }

  function setPlaying(v) {
    playing = v;
    playBtn.setAttribute('aria-pressed', String(v));
    playLabel.textContent = v ? 'pause' : 'play';
  }

  range.addEventListener('input', () => {
    onSeek(Number(range.value), false);
  });

  for (const btn of ticks) {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.step);
      onSeek(i, true);
      range.focus({ preventScroll: true });
    });
  }

  playBtn.addEventListener('click', () => {
    setPlaying(!playing);
    onPlay(playing);
  });

  const reco = document.querySelector('[data-recentre]');
  if (reco) reco.addEventListener('click', () => onRecentre());

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === ' ' && (!inField || e.target === range)) {
      e.preventDefault();
      setPlaying(!playing);
      onPlay(playing);
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      onRecentre();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const base = Math.round(Number(range.value));
      onSeek(Math.max(0, Math.min(4, base + dir)), true);
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onSeek(e.key === 'Home' ? 0 : 4, true);
      return;
    }
    if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      onSeek(Number(e.key) - 1, true);
    }
  });

  return { render, setPlaying, isPlaying: () => playing };
}
