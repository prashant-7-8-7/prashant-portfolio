import { setupPortfolioWindow, setupVerifier } from './portfolio-views.js';

const layout = document.querySelector('.showcase-layout');
const home = document.querySelector('#top');
const pages = Array.from(layout.querySelectorAll('.showcase-section'));
const sidebar = layout.querySelector('nav');
const verifier = document.querySelector('#verifier');
const embedded = new URLSearchParams(location.search).get('inside') === 'desktop';
setupPortfolioWindow(document.querySelector('#portfolio-window'));
setupVerifier(verifier);

function showPage(resetScroll = false) {
  const id = location.hash.slice(1);
  const target = document.getElementById(id);
  const page = target?.closest('.showcase-section');
  home.hidden = Boolean(page);
  layout.hidden = !page;
  for (const section of pages) section.hidden = section !== page;
  for (const link of sidebar.querySelectorAll('a')) {
    if (link.hash === '#' + (page?.id ?? 'top')) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (page && target !== page) target.scrollIntoView();
  else if (resetScroll) window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (embedded && link?.origin !== location.origin && link?.protocol === 'https:') {
    link.target = '_blank';
    link.rel = 'noopener';
  }
});
window.addEventListener('hashchange', () => showPage(true));
showPage();

