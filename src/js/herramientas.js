const $ = (selector, root = document) => root.querySelector(selector);

function mountMemoryForm() {
  const form = $('#recuerdo');
  if (!form) return;

  const getText = () => [...form.querySelectorAll('label')]
    .map((label) => {
      const field = label.querySelector('textarea, input');
      return field && field.value.trim()
        ? `${label.querySelector('span').textContent}\n${field.value.trim()}`
        : null;
    })
    .filter(Boolean)
    .join('\n\n');

  $('#recuerdo-guardar')?.addEventListener('click', () => {
    const content = getText();
    if (!content) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = 'notas.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $('#recuerdo-compartir')?.addEventListener('click', async () => {
    const content = getText();
    if (!content) return;

    if (navigator.share) {
      try {
        await navigator.share({ text: content });
      } catch {}
      return;
    }

    await navigator.clipboard?.writeText(content);
  });
}

mountMemoryForm();

import('./mapa.js')
  .then((module) => module.montarMapa($('#mapa-host')))
  .catch((error) => console.warn('[mapa] unavailable:', error.message));
