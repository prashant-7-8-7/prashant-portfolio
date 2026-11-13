import { claimExamples, projects } from './projects.js';
import verifierPanel from './verifier-panel.html?raw';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sectionTitles = {
  projects: 'Projects',
  verifier: 'Claim verifier',
  about: 'About Prashant',
  contact: 'Contact',
};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function action(label, href, className = 'text-link') {
  const anchor = node('a', label, className);
  anchor.href = href;
  const arrow = node('span', '', 'out-arrow');
  arrow.setAttribute('aria-hidden', 'true');
  anchor.append(' ', arrow);
  return anchor;
}

export function setupVerifier(panel) {
  const choices = panel.querySelector('#claim-options');
  const verify = panel.querySelector('#verify-button');
  const claim = panel.querySelector('#claim-text');
  const evidence = panel.querySelector('#evidence-text');
  const result = panel.querySelector('#verdict');
  let selected = 'dispatch';

  choices.hidden = false;
  verify.hidden = false;
  choices.addEventListener('change', event => {
    selected = event.target.value;
    claim.textContent = claimExamples[selected].claim;
    evidence.textContent = claimExamples[selected].evidence;
    result.replaceChildren();
    delete result.dataset.kind;
  });

  verify.addEventListener('click', () => {
    const example = claimExamples[selected];
    result.dataset.kind = example.kind;
    result.replaceChildren(node('strong', example.verdict), node('p', example.reason));
    if (!reducedMotion.matches) {
      result.animate(
        [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }],
        { duration: 250, easing: 'ease-out' },
      );
    }
  });
}

function renderProject(container, project, desktop) {
  container.replaceChildren(
    node('p', project.category, 'eyebrow'),
    node('p', project.summary, 'project-lead'),
  );

  for (const [label, copy] of project.details) {
    const detail = node('section', '', 'detail-section');
    detail.append(node('h3', label), node('p', copy));
    container.append(detail);
  }

  const tags = node('ul', '', 'tags');
  tags.setAttribute('aria-label', 'Technologies');
  for (const technology of project.tags) tags.append(node('li', technology));

  const links = node('div', '', 'project-dialog-links');
  links.append(action('View source code', project.source, 'button button-primary'));
  if (project.link) {
    const demo = project.link.href === '#verifier';
    const secondary = action(project.link.label, project.link.href);
    if (demo && desktop) secondary.dataset.view = 'verifier';
    else if (demo) secondary.dataset.dismissWindow = '';
    links.append(secondary);
  }
  if (desktop) {
    const back = node('button', 'All projects', 'text-link');
    back.type = 'button';
    back.dataset.view = 'projects';
    links.append(back);
  }

  container.append(tags, links);
}

function renderProjects(container) {
  const list = node('div', '', 'window-projects');
  for (const [id, project] of Object.entries(projects)) {
    const item = node('button', '', 'window-project');
    item.type = 'button';
    item.dataset.view = id;
    item.append(node('strong', project.title), node('span', project.category));
    list.append(item);
  }
  container.replaceChildren(list);
}

export function renderPortfolioView(container, view, { desktop = false } = {}) {
  if (Object.hasOwn(projects, view)) {
    renderProject(container, projects[view], desktop);
  } else if (view === 'projects') {
    renderProjects(container);
  } else if (view === 'verifier') {
    const introduction = node('p',
      'Compare a claim with the evidence. The three fixed examples use GridPulse’s documented dispatch rules.',
      'project-lead');
    container.innerHTML = verifierPanel;
    container.querySelector('.panel-bar').remove();
    container.prepend(introduction);
    setupVerifier(container);
  } else if (view === 'about') {
    container.replaceChildren(
      node('p', 'AI & ML undergraduate · MITS Gwalior', 'eyebrow'),
      node('p', 'I’m Prashant Sharma. I’m interested in how models retrieve information, how we check their outputs, and how they fit into useful software.', 'project-lead'),
      node('p', 'My projects take those questions into a research report, a study session, a microgrid dashboard, and a railway field app.'),
    );
  } else if (view === 'contact') {
    const links = node('div', '', 'project-dialog-links');
    links.append(
      action('Email me', 'mailto:prashantsh787@gmail.com', 'button button-primary'),
      action('GitHub', 'https://github.com/prashant-7-8-7'),
      action('LinkedIn', 'https://in.linkedin.com/in/prashant-sharma-040ab0388'),
      action('DEV', 'https://dev.to/prashant_97e6d2c6314b6895'),
    );
    container.replaceChildren(node('p', 'Let’s talk about AI, machine learning, and what you’re building.', 'project-lead'), links);
  }
}

export function portfolioViewTitle(view) {
  if (Object.hasOwn(projects, view)) return projects[view].title;
  return Object.hasOwn(sectionTitles, view) ? sectionTitles[view] : null;
}

export function setupPortfolioWindow(dialog) {
  const title = dialog.querySelector('#window-title');
  const content = dialog.querySelector('[data-window-content]');
  let origin;
  let focusOnClose = true;

  function openView(view, trigger) {
    const heading = portfolioViewTitle(view);
    if (!heading) return;

    title.textContent = heading;
    renderPortfolioView(content, view);

    if (!dialog.open) {
      origin = trigger;
      focusOnClose = true;
      dialog.showModal();
    }
    dialog.scrollTop = 0;
    title.focus({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest('[data-view]');
    if (!trigger) return;
    event.preventDefault();
    openView(trigger.dataset.view, trigger);
  });

  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-dismiss-window]')) {
      focusOnClose = false;
      dialog.close();
    } else if (event.target.closest('[data-close-window]')) {
      dialog.close();
    } else if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    if (focusOnClose) origin?.focus({ preventScroll: true });
    origin = null;
  });

  for (const button of document.querySelectorAll('button[data-view][hidden]')) {
    button.hidden = false;
  }
  return openView;
}
