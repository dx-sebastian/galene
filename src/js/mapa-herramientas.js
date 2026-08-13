const map = document.getElementById('mapa-herramientas');

if (map) {
  const frame = map.querySelector('[data-herramientas-marco]');
  const back = map.querySelector('[data-herramientas-volver]');
  const scenes = [...map.querySelectorAll('[data-herramienta]')];
  const title = document.getElementById('mapa-herramientas-titulo');

  const sceneById = (id) => scenes.find((scene) => scene.dataset.herramienta === id);
  const contentOf = (scene) => scene.querySelector(':scope > .bloque');
  const findTarget = (selector) => {
    if (!selector || selector === '#') return null;
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  };

  function setOverviewState() {
    for (const scene of scenes) {
      scene.classList.remove('mapa-herramientas__escena--activa');
      scene.removeAttribute('aria-hidden');
      contentOf(scene).inert = true;
    }
  }

  function openScene(id, options = {}) {
    const scene = sceneById(id);
    if (!scene) return false;

    map.classList.add('mapa-herramientas--activa');
    for (const item of scenes) {
      const active = item === scene;
      item.classList.toggle('mapa-herramientas__escena--activa', active);
      item.toggleAttribute('aria-hidden', !active);
      contentOf(item).inert = !active;
    }

    back.hidden = false;
    frame.scrollTo({ top: 0, behavior: 'auto' });

    if (options.updateHash !== false) {
      history.pushState(null, '', `#${id}`);
    }

    if (options.focus !== false) {
      const heading = scene.querySelector('h3');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
    return true;
  }

  function showOverview(options = {}) {
    map.classList.remove('mapa-herramientas--activa');
    setOverviewState();
    back.hidden = true;
    frame.scrollTo({ top: 0, behavior: 'auto' });

    if (options.updateHash !== false) {
      history.pushState(null, '', '#mapa-herramientas');
    }
    if (options.focus !== false) title?.focus({ preventScroll: true });
  }

  map.classList.add('mapa-herramientas--viva');
  title?.setAttribute('tabindex', '-1');
  setOverviewState();

  for (const button of map.querySelectorAll('[data-herramientas-abrir]')) {
    button.addEventListener('click', () => {
      openScene(button.closest('[data-herramienta]').dataset.herramienta);
    });
  }

  back.addEventListener('click', () => showOverview());

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    const target = findTarget(href);
    const scene = target?.closest('[data-herramienta]');
    if (!scene) {
      if (map.classList.contains('mapa-herramientas--activa')) {
        showOverview({ updateHash: false, focus: false });
      }
      return;
    }

    event.preventDefault();
    openScene(scene.dataset.herramienta, {
      updateHash: false,
      focus: !href.startsWith('#t-'),
    });
    history.pushState(null, '', href);
  });

  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && map.classList.contains('mapa-herramientas--activa')) {
      showOverview();
    }
  });

  const syncWithHash = () => {
    const target = findTarget(location.hash);
    const scene = target?.closest('[data-herramienta]');
    if (scene) {
      openScene(scene.dataset.herramienta, { updateHash: false, focus: false });
    } else {
      showOverview({ updateHash: false, focus: false });
    }
  };

  addEventListener('hashchange', syncWithHash);
  addEventListener('popstate', syncWithHash);

  const initialTarget = findTarget(location.hash);
  const initialScene = initialTarget?.closest('[data-herramienta]');
  if (initialScene) {
    openScene(initialScene.dataset.herramienta, { updateHash: false, focus: false });
  }
}
