(function () {
  'use strict';

  // 1. Extract widget ID from script src URL query parameter
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && (scripts[i].src.indexOf('widget.js') !== -1 || scripts[i].src.indexOf('widget.v1.js') !== -1)) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!currentScript) {
    console.warn('[FlyRank Widget] Unable to locate script element.');
    return;
  }

  const scriptUrl = new URL(currentScript.src, window.location.href);
  const widgetId = scriptUrl.searchParams.get('id');
  const origin = scriptUrl.origin;

  if (!widgetId) {
    console.error('[FlyRank Widget] Missing required "id" parameter in widget script src.');
    return;
  }

  // 2. Fetch Widget Configuration
  const configUrl = `${origin}/widgets/${widgetId}/config`;

  fetch(configUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load widget configuration`);
      return res.json();
    })
    .then((response) => {
      const config = response.data || response;
      initWidget(config, widgetId, origin);
    })
    .catch((err) => {
      console.error('[FlyRank Widget] Initialization error:', err);
    });

  function initWidget(config, id, apiOrigin) {
    const display = config.display_options || config.displayOptions || {};
    const position = display.position || 'bottom-right';
    const primaryColor = display.primary_color || display.primaryColor || '#2563eb';
    const isDark = display.theme === 'dark';

    // Create wrapper container
    const container = document.createElement('div');
    container.id = `flyrank-widget-${id}`;
    container.setAttribute('data-flyrank-widget', id);

    // Styling
    const positionStyles = getPositionStyles(position);
    container.style.cssText = `
      position: fixed;
      ${positionStyles}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
      width: 320px;
      max-width: 90vw;
      background: ${isDark ? '#0f172a' : '#ffffff'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      border: 1px solid ${isDark ? '#1e293b' : '#e2e8f0'};
      transition: all 0.3s ease;
    `;

    // Header & Content
    const headerHtml = `
      <div style="padding: 14px 16px; background: ${primaryColor}; color: #ffffff;">
        <h4 style="margin: 0; font-size: 15px; font-weight: 600;">${escapeHtml(config.title || 'Get in Touch')}</h4>
        ${config.description ? `<p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">${escapeHtml(config.description)}</p>` : ''}
      </div>
    `;

    // Form fields
    const fields = config.fields || [];
    let fieldsHtml = '';
    fields.forEach((field) => {
      fieldsHtml += `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">
            ${escapeHtml(field.label)} ${field.required ? '<span style="color: #ef4444;">*</span>' : ''}
          </label>
          ${renderFieldInput(field, isDark)}
        </div>
      `;
    });

    const submitButtonHtml = `
      <button type="submit" style="
        width: 100%;
        padding: 10px 14px;
        background: ${primaryColor};
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      ">${escapeHtml(config.button_text || config.buttonText || 'Submit')}</button>
    `;

    const bodyHtml = `
      <form id="flyrank-form-${id}" style="padding: 16px;">
        <div id="flyrank-fields-${id}">${fieldsHtml}</div>
        <div id="flyrank-feedback-${id}" style="display: none; margin-bottom: 10px; font-size: 12px; padding: 8px; border-radius: 4px;"></div>
        ${submitButtonHtml}
      </form>
    `;

    container.innerHTML = headerHtml + bodyHtml;
    document.body.appendChild(container);

    // Form submission handler
    const form = container.querySelector(`#flyrank-form-${id}`);
    const feedback = container.querySelector(`#flyrank-feedback-${id}`);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = {};
      formData.forEach((value, key) => {
        payload[key] = value;
      });

      const submitUrl = `${apiOrigin}/api/public/widgets/${id}/submit`;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting...';

      fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          referrer: window.location.href
        })
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            feedback.style.display = 'block';
            feedback.style.background = '#dcfce7';
            feedback.style.color = '#15803d';
            feedback.innerText = 'Thank you! Your submission has been received.';
            form.querySelector(`#flyrank-fields-${id}`).style.display = 'none';
            submitBtn.style.display = 'none';
          } else {
            throw new Error(resData.error?.message || 'Submission failed');
          }
        })
        .catch((err) => {
          feedback.style.display = 'block';
          feedback.style.background = '#fee2e2';
          feedback.style.color = '#b91c1c';
          feedback.innerText = err.message || 'Error submitting form. Please try again.';
          submitBtn.disabled = false;
          submitBtn.innerText = config.button_text || 'Submit';
        });
    });
  }

  function renderFieldInput(field, isDark) {
    const bg = isDark ? '#1e293b' : '#f8fafc';
    const border = isDark ? '#334155' : '#cbd5e1';
    const color = isDark ? '#ffffff' : '#0f172a';
    const style = `width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid ${border}; background: ${bg}; color: ${color}; font-size: 13px; box-sizing: border-box;`;

    if (field.type === 'textarea') {
      return `<textarea name="${escapeHtml(field.id)}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '')}" rows="3" style="${style}"></textarea>`;
    }
    if (field.type === 'select' && field.options) {
      const optionsHtml = field.options.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      return `<select name="${escapeHtml(field.id)}" ${field.required ? 'required' : ''} style="${style}"><option value="">Select option...</option>${optionsHtml}</select>`;
    }
    return `<input type="${escapeHtml(field.type || 'text')}" name="${escapeHtml(field.id)}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '')}" style="${style}" />`;
  }

  function getPositionStyles(pos) {
    switch (pos) {
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'bottom-right':
      default:
        return 'bottom: 20px; right: 20px;';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
