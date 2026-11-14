export function initSelects(root = document) {
  root.querySelectorAll('.select[data-select]').forEach((wrapper) => {
    if (wrapper.dataset.enhanced === 'true') return;
    const select = wrapper.querySelector('select');
    if (!select) return;

    wrapper.dataset.enhanced = 'true';

    const label = findLabel(select);
    const labelId = label ? ensureId(label, `${select.id}-label`) : null;
    const describedBy = select.getAttribute('aria-describedby');
    const isRequired = select.required || select.getAttribute('aria-required') === 'true';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'select-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    if (labelId) button.setAttribute('aria-labelledby', labelId);
    if (describedBy) button.setAttribute('aria-describedby', describedBy);
    if (isRequired) button.setAttribute('aria-required', 'true');

    const valueSpan = document.createElement('span');
    valueSpan.className = 'select-value';

    const caret = document.createElement('span');
    caret.className = 'select-caret';
    caret.setAttribute('aria-hidden', 'true');

    button.append(valueSpan, caret);

    const list = document.createElement('ul');
    list.className = 'select-list';
    list.id = `${select.id}-listbox`;
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    if (labelId) list.setAttribute('aria-labelledby', labelId);

    button.setAttribute('aria-controls', list.id);

    const options = Array.from(select.options).map((option, index) => {
      const item = document.createElement('li');
      item.className = 'select-option';
      item.id = `${select.id}-option-${index}`;
      item.setAttribute('role', 'option');
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.setAttribute('aria-selected', String(option.selected && option.value !== ''));
      list.appendChild(item);
      return item;
    });

    wrapper.appendChild(button);
    wrapper.appendChild(list);
    select.hidden = true;

    if (label) {
      label.addEventListener('click', (event) => {
        event.preventDefault();
        button.focus();
      });
    }

    let activeIndex = Math.max(
      0,
      Array.from(select.options).findIndex((option) => option.selected)
    );

    const syncValue = () => {
      const selected = select.options[select.selectedIndex];
      const hasValue = selected && selected.value !== '';
      valueSpan.textContent = selected ? selected.textContent : '';
      valueSpan.classList.toggle('is-placeholder', !hasValue);
      options.forEach((item, index) => {
        item.setAttribute(
          'aria-selected',
          String(index === select.selectedIndex && hasValue)
        );
      });
      button.classList.toggle('is-empty', !hasValue);
    };

    const setActive = (index) => {
      if (!options.length) return;
      activeIndex = Math.min(Math.max(index, 0), options.length - 1);
      options.forEach((item, i) => item.classList.toggle('is-active', i === activeIndex));
      button.setAttribute('aria-activedescendant', options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      closeAllSelects(wrapper);
      list.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, select.selectedIndex));
    };

    const close = () => {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
    };

    const choose = (index) => {
      if (index < 0 || index >= options.length) return;
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncValue();
      close();
      button.focus();
    };

    button.addEventListener('click', () => {
      if (button.disabled) return;
      if (list.hidden) open();
      else close();
    });

    button.addEventListener('keydown', (event) => {
      const key = event.key;
      const isOpen = !list.hidden;

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        setActive(activeIndex + (key === 'ArrowDown' ? 1 : -1));
        return;
      }

      if (key === 'Home' || key === 'End') {
        if (!isOpen) return;
        event.preventDefault();
        setActive(key === 'Home' ? 0 : options.length - 1);
        return;
      }

      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        choose(activeIndex);
        return;
      }

      if (key === 'Escape' && isOpen) {
        event.preventDefault();
        close();
        return;
      }

      if (key === 'Tab') close();
    });

    list.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    list.addEventListener('click', (event) => {
      const item = event.target.closest('.select-option');
      if (!item) return;
      choose(options.indexOf(item));
    });

    list.addEventListener('mousemove', (event) => {
      const item = event.target.closest('.select-option');
      if (!item) return;
      setActive(options.indexOf(item));
    });

    select.addEventListener('change', syncValue);

    if (select.disabled) button.disabled = true;

    syncValue();
  });

  if (!document.documentElement.dataset.selectOutsideBound) {
    document.documentElement.dataset.selectOutsideBound = 'true';
    document.addEventListener('click', (event) => {
      document.querySelectorAll('.select[data-enhanced="true"]').forEach((wrapper) => {
        if (wrapper.contains(event.target)) return;
        const button = wrapper.querySelector('.select-button');
        const list = wrapper.querySelector('.select-list');
        if (button && list && !list.hidden) {
          list.hidden = true;
          button.setAttribute('aria-expanded', 'false');
          button.removeAttribute('aria-activedescendant');
        }
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.select[data-enhanced="true"]').forEach((wrapper) => {
        const button = wrapper.querySelector('.select-button');
        const list = wrapper.querySelector('.select-list');
        if (button && list && !list.hidden) {
          list.hidden = true;
          button.setAttribute('aria-expanded', 'false');
          button.removeAttribute('aria-activedescendant');
          button.focus();
        }
      });
    });
  }
}

function findLabel(select) {
  if (select.id) {
    const explicit = document.querySelector(`label[for="${select.id}"]`);
    if (explicit) return explicit;
  }
  return select.closest('.field')?.querySelector('.field-label') || null;
}

function ensureId(element, fallback) {
  if (!element.id) element.id = fallback;
  return element.id;
}

function closeAllSelects(except) {
  document.querySelectorAll('.select[data-enhanced="true"]').forEach((wrapper) => {
    if (wrapper === except) return;
    const button = wrapper.querySelector('.select-button');
    const list = wrapper.querySelector('.select-list');
    if (button && list && !list.hidden) {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
    }
  });
}

export function setStatus(state, text) {
  const region = document.getElementById('request-status');
  if (!region) return;
  region.dataset.state = state;
  const target = region.querySelector('[data-status-text]');
  if (target) target.textContent = text;
}

/** @param {HTMLElement} fieldWrap */
export function setFieldError(fieldWrap, message) {
  if (!fieldWrap) return;
  fieldWrap.classList.add('has-error');
  const error = fieldWrap.querySelector('.field-error');
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  fieldWrap.querySelectorAll('input, textarea, select').forEach((control) => {
    control.setAttribute('aria-invalid', 'true');
  });
  const button = fieldWrap.querySelector('.select-button');
  if (button) button.setAttribute('aria-invalid', 'true');
}

/** @param {HTMLElement} fieldWrap */
export function clearFieldError(fieldWrap) {
  if (!fieldWrap) return;
  fieldWrap.classList.remove('has-error');
  const error = fieldWrap.querySelector('.field-error');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
  fieldWrap.querySelectorAll('input, textarea, select').forEach((control) => {
    control.removeAttribute('aria-invalid');
  });
  const button = fieldWrap.querySelector('.select-button');
  if (button) button.removeAttribute('aria-invalid');
}

export function showToast(message, tone = 'info') {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = document.createElement('p');
  toast.className = 'toast';
  toast.dataset.tone = tone;
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 5000);
}

export function renderPlainParagraphs(container, text) {
  container.textContent = '';
  String(text || '')
    .split(/\n{2,}/)
    .forEach((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      container.appendChild(p);
    });
}
