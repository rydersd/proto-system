/* ========================================================================
   Nib Declarative Page Blueprint Renderer (proto-gen.js)

   Reads window.PAGE_BLUEPRINT and generates a compliant wireframe page.
   Transforms structured data into framework-standard HTML using the
   existing CSS classes and design tokens from proto-core.css, surface
   CSS files, and proto-components.css.

   Load order: project-data.js -> proto-nav.js -> blueprint-data.js -> proto-gen.js
   ======================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     Utility: DOM Element Factory
     ====================================================================== */

  /**
   * Create a DOM element with optional attributes and children.
   * @param {string} tag - HTML tag name
   * @param {Object} [attrs] - Attribute key/value pairs (class, id, style, data-*, etc.)
   * @param {Array|string} [children] - Child elements or text content
   * @returns {HTMLElement}
   */
  function wfGenEl(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = attrs[key];
        if (val === null || val === undefined) continue;
        if (key === 'className') {
          el.className = val;
        } else if (key === 'innerHTML') {
          el.innerHTML = val;
        } else if (key === 'textContent') {
          el.textContent = val;
        } else if (key === 'style' && typeof val === 'object') {
          var styleKeys = Object.keys(val);
          for (var s = 0; s < styleKeys.length; s++) {
            el.style[styleKeys[s]] = val[styleKeys[s]];
          }
        } else if (key === 'onclick' && typeof val === 'function') {
          el.addEventListener('click', val);
        } else {
          el.setAttribute(key, val);
        }
      }
    }
    if (children !== undefined && children !== null) {
      if (typeof children === 'string') {
        el.textContent = children;
      } else if (Array.isArray(children)) {
        for (var c = 0; c < children.length; c++) {
          if (children[c] === null || children[c] === undefined) continue;
          if (typeof children[c] === 'string') {
            el.appendChild(document.createTextNode(children[c]));
          } else {
            el.appendChild(children[c]);
          }
        }
      } else if (children instanceof HTMLElement) {
        el.appendChild(children);
      }
    }
    return el;
  }

  /* ======================================================================
     Utility: Badge Generator
     ====================================================================== */

  /**
   * Create a badge span using framework classes.
   * @param {string} label - Badge text
   * @param {string} [color] - 'green' | 'amber' | 'red' | 'purple' | null for neutral
   * @returns {HTMLElement}
   */
  function wfGenBadge(label, color) {
    var cls = 'wf-badge';
    if (color === 'green') cls += ' wf-badge-green';
    else if (color === 'amber') cls += ' wf-badge-amber';
    else if (color === 'red') cls += ' wf-badge-red';
    else if (color === 'purple') cls += ' wf-badge-purple';
    return wfGenEl('span', { className: cls }, label);
  }

  /* ======================================================================
     Utility: Action Button Row
     ====================================================================== */

  /**
   * Create a row of buttons from an array of action strings.
   * First action is primary, rest are secondary.
   * @param {Array<string>} actions - Button labels
   * @param {string} [surface] - Surface prefix for button classes
   * @returns {HTMLElement}
   */
  function wfGenActions(actions, surface) {
    var container = wfGenEl('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
    for (var i = 0; i < actions.length; i++) {
      var label = actions[i];
      var btnClass;
      if (surface === 'sfdc') {
        btnClass = i === 0 ? 'sfdc-btn sfdc-btn-primary' : 'sfdc-btn';
      } else {
        btnClass = i === 0 ? 'btn btn-primary' : 'btn';
      }
      container.appendChild(wfGenEl('button', { className: btnClass }, label));
    }
    return container;
  }

  /* ======================================================================
     Detection & Validation
     ====================================================================== */

  /**
   * Check if PAGE_BLUEPRINT exists on window.
   * @returns {Object|null} The blueprint object or null
   */
  function wfBlueprintDetect() {
    return window.PAGE_BLUEPRINT || null;
  }

  /**
   * Validate the blueprint has required fields.
   * @param {Object} bp - The blueprint object
   * @returns {boolean}
   */
  function wfBlueprintValidate(bp) {
    if (!bp) return false;
    if (!bp.layout) {
      console.warn('[proto-gen] PAGE_BLUEPRINT missing required field: layout');
      return false;
    }
    return true;
  }

  /* ======================================================================
     Section Renderers — Individual content block types
     ====================================================================== */

  /**
   * Render a 2-column label/value detail grid.
   * @param {Object} block - { fields: [{label, value, span?}] }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenDetailGrid(block, surface) {
    var fields = block.fields || [];
    if (surface === 'sfdc') {
      var grid = wfGenEl('div', { className: 'sfdc-detail-grid' });
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var fieldEl = wfGenEl('div', { className: 'sfdc-detail-field' + (f.span === 2 ? ' full' : '') });
        fieldEl.appendChild(wfGenEl('label', null, f.label));
        var valueEl = wfGenEl('div', { className: 'sfdc-field-value' });
        valueEl.innerHTML = f.value || '';
        fieldEl.appendChild(valueEl);
        grid.appendChild(fieldEl);
      }
      return grid;
    }
    /* Generic / Internal surface */
    var gridEl = wfGenEl('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }
    });
    for (var j = 0; j < fields.length; j++) {
      var field = fields[j];
      var wrap = wfGenEl('div', field.span === 2 ? { style: { gridColumn: 'span 2' } } : null);
      wrap.appendChild(wfGenEl('div', {
        className: 'overline',
        style: { marginBottom: '2px' }
      }, field.label));
      var valEl = wfGenEl('div', { style: { fontSize: '13px', color: 'var(--wf-ink)', fontWeight: '500' } });
      valEl.innerHTML = field.value || '';
      wrap.appendChild(valEl);
      gridEl.appendChild(wrap);
    }
    return gridEl;
  }

  /**
   * Render a titled table with records (related list).
   * @param {Object} block - { title, columns: [{label,field}], rows: [{}] }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenRelatedList(block, surface) {
    var columns = block.columns || [];
    var rows = block.rows || [];
    var cardClass = surface === 'sfdc' ? 'sfdc-card' : 'wf-card';
    var headerClass = surface === 'sfdc' ? 'sfdc-card-header' : 'wf-card-header';
    var bodyClass = surface === 'sfdc' ? 'sfdc-card-body' : 'wf-card-body';

    var card = wfGenEl('div', { className: cardClass });
    var header = wfGenEl('div', { className: headerClass });
    header.appendChild(wfGenEl('h3', null, (block.title || 'Related') + ' (' + rows.length + ')'));
    card.appendChild(header);

    var body = wfGenEl('div', { className: bodyClass, style: { padding: '0', overflowX: 'auto' } });
    var table = wfGenEl('table', { className: 'wf-table', style: { margin: '0' } });

    /* thead */
    var thead = wfGenEl('thead');
    var headRow = wfGenEl('tr');
    for (var c = 0; c < columns.length; c++) {
      headRow.appendChild(wfGenEl('th', null, columns[c].label));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    /* tbody */
    var tbody = wfGenEl('tbody');
    for (var r = 0; r < rows.length; r++) {
      var tr = wfGenEl('tr');
      for (var cc = 0; cc < columns.length; cc++) {
        var td = wfGenEl('td');
        var cellVal = rows[r][columns[cc].field];
        if (cellVal !== undefined && cellVal !== null) {
          td.innerHTML = String(cellVal);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    body.appendChild(table);
    card.appendChild(body);
    return card;
  }

  /**
   * Render a content card.
   * @param {Object} block - { title, content, variant? }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenCard(block, surface) {
    var cardClass = surface === 'sfdc' ? 'sfdc-card' : 'wf-card';
    if (block.variant) {
      if (surface === 'sfdc') {
        cardClass += ' sfdc-card-' + block.variant;
      }
    }
    var card = wfGenEl('div', { className: cardClass });
    if (block.title) {
      var headerClass = surface === 'sfdc' ? 'sfdc-card-header' : 'wf-card-header';
      var header = wfGenEl('div', { className: headerClass });
      header.appendChild(wfGenEl('h3', null, block.title));
      card.appendChild(header);
    }
    var bodyClass = surface === 'sfdc' ? 'sfdc-card-body' : 'wf-card-body';
    var body = wfGenEl('div', { className: bodyClass });
    if (block.content) {
      body.innerHTML = block.content;
    }
    card.appendChild(body);
    return card;
  }

  /**
   * Render a horizontal row of KPI cards.
   * @param {Object} block - { items: [{label, value, trend?, color?}] }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenKpiRow(block, surface) {
    var items = block.items || [];
    var grid = wfGenEl('div', { className: 'ds-kpi-grid' });
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var kpiCard = wfGenEl('div', { className: 'ds-kpi-card' });
      kpiCard.appendChild(wfGenEl('div', { className: 'ds-kpi-value' }, item.value));
      kpiCard.appendChild(wfGenEl('div', { className: 'ds-kpi-label' }, item.label));
      if (item.trend) {
        var deltaClass = 'ds-kpi-delta';
        if (item.color === 'green') deltaClass += ' up';
        else if (item.color === 'red') deltaClass += ' down';
        kpiCard.appendChild(wfGenEl('div', { className: deltaClass }, item.trend));
      }
      grid.appendChild(kpiCard);
    }
    return grid;
  }

  /**
   * Render an activity timeline.
   * @param {Object} block - { items: [{date, actor, action, detail}] }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenTimeline(block, surface) {
    var items = block.items || [];
    var container = wfGenEl('div');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var feedClass = surface === 'sfdc' ? 'sfdc-feed-item' : 'sfdc-feed-item';
      var row = wfGenEl('div', { className: feedClass });

      /* Avatar with actor initials */
      var initials = '';
      if (item.actor) {
        var parts = item.actor.split(' ');
        for (var p = 0; p < parts.length && p < 2; p++) {
          initials += parts[p].charAt(0).toUpperCase();
        }
      }
      row.appendChild(wfGenEl('div', { className: 'sfdc-feed-avatar' }, initials));

      var body = wfGenEl('div', { className: 'sfdc-feed-body' });
      var textEl = wfGenEl('div', { className: 'sfdc-feed-text' });
      textEl.innerHTML = '<strong>' + (item.actor || '') + '</strong> ' + (item.action || '');
      if (item.detail) {
        textEl.innerHTML += ' &mdash; ' + item.detail;
      }
      body.appendChild(textEl);
      if (item.date) {
        body.appendChild(wfGenEl('div', { className: 'sfdc-feed-time' }, item.date));
      }
      row.appendChild(body);
      container.appendChild(row);
    }
    return container;
  }

  /**
   * Render a form with field groups.
   * @param {Object} block - { title, fields: [{type, label, value?, options?, required?}] }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenForm(block, surface) {
    var fields = block.fields || [];
    var container = wfGenEl('div');

    if (block.title) {
      container.appendChild(wfGenEl('h3', { style: { marginBottom: '16px' } }, block.title));
    }

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var group = wfGenEl('div', { className: 'wf-form-group' });
      var label = wfGenEl('label', { className: 'wf-label' }, f.label + (f.required ? ' *' : ''));
      group.appendChild(label);

      var input;
      switch (f.type) {
        case 'textarea':
          input = wfGenEl('textarea', {
            className: 'wf-textarea',
            placeholder: f.placeholder || '',
            rows: '3'
          });
          if (f.value) input.textContent = f.value;
          break;

        case 'select':
          input = wfGenEl('select', { className: 'wf-select' });
          var options = f.options || [];
          if (!f.required) {
            input.appendChild(wfGenEl('option', { value: '' }, '-- Select --'));
          }
          for (var o = 0; o < options.length; o++) {
            var opt = wfGenEl('option', null, options[o]);
            if (f.value && f.value === options[o]) opt.selected = true;
            input.appendChild(opt);
          }
          break;

        case 'checkbox':
          input = wfGenEl('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } });
          var cb = wfGenEl('input', { type: 'checkbox' });
          if (f.value) cb.checked = true;
          input.appendChild(cb);
          input.appendChild(wfGenEl('span', { style: { fontSize: '12px', color: 'var(--wf-text)' } }, f.label));
          /* Remove the separate label since it is inline */
          group.removeChild(label);
          break;

        case 'date':
          input = wfGenEl('input', {
            className: 'wf-input',
            type: 'date',
            value: f.value || ''
          });
          break;

        case 'number':
          input = wfGenEl('input', {
            className: 'wf-input',
            type: 'number',
            value: f.value || '',
            placeholder: f.placeholder || ''
          });
          break;

        default: /* text, email, etc. */
          input = wfGenEl('input', {
            className: 'wf-input',
            type: f.type || 'text',
            value: f.value || '',
            placeholder: f.placeholder || ''
          });
      }

      group.appendChild(input);
      if (f.hint) {
        group.appendChild(wfGenEl('div', { className: 'wf-form-hint' }, f.hint));
      }
      container.appendChild(group);
    }
    return container;
  }

  /**
   * Render a data table.
   * @param {Object} block - { title, columns: [{label, field}], rows: [{}], sortable? }
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenTable(block, surface) {
    var columns = block.columns || [];
    var rows = block.rows || [];

    var container = wfGenEl('div');
    if (block.title) {
      container.appendChild(wfGenEl('div', { className: 'wf-section-title' }, block.title));
    }

    var table = wfGenEl('table', { className: 'wf-table' });

    /* thead */
    var thead = wfGenEl('thead');
    var headRow = wfGenEl('tr');
    for (var c = 0; c < columns.length; c++) {
      var thAttrs = {};
      if (block.sortable) {
        thAttrs.style = { cursor: 'pointer' };
      }
      var th = wfGenEl('th', thAttrs, columns[c].label + (block.sortable ? ' \u2195' : ''));
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    /* tbody */
    var tbody = wfGenEl('tbody');
    for (var r = 0; r < rows.length; r++) {
      var tr = wfGenEl('tr');
      for (var cc = 0; cc < columns.length; cc++) {
        var td = wfGenEl('td');
        var val = rows[r][columns[cc].field];
        if (val !== undefined && val !== null) {
          td.innerHTML = String(val);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
    return container;
  }

  /**
   * Render a chart placeholder.
   * @param {Object} block - { title, chartType, height? }
   * @returns {HTMLElement}
   */
  function wfGenChartPlaceholder(block) {
    var height = block.height || '180px';
    var card = wfGenEl('div', { className: 'wf-card' });
    if (block.title) {
      var header = wfGenEl('div', { className: 'wf-card-header' });
      header.appendChild(wfGenEl('h3', null, block.title));
      card.appendChild(header);
    }
    var body = wfGenEl('div', { className: 'wf-card-body' });
    var placeholder = wfGenEl('div', {
      style: {
        width: '100%',
        height: height,
        background: 'var(--wf-surface)',
        border: '1px dashed var(--wf-line)',
        borderRadius: 'var(--wf-radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        color: 'var(--wf-muted)',
        fontStyle: 'italic'
      }
    }, (block.chartType || 'Chart') + ' placeholder');
    body.appendChild(placeholder);
    card.appendChild(body);
    return card;
  }

  /**
   * Render an empty state.
   * @param {Object} block - { icon, heading, body, action? }
   * @returns {HTMLElement}
   */
  function wfGenEmptyState(block) {
    var container = wfGenEl('div', {
      style: {
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--wf-muted)'
      }
    });
    if (block.icon) {
      container.appendChild(wfGenEl('div', {
        style: { fontSize: '36px', marginBottom: '12px' }
      }, block.icon));
    }
    if (block.heading) {
      container.appendChild(wfGenEl('h3', {
        style: { color: 'var(--wf-ink)', marginBottom: '8px' }
      }, block.heading));
    }
    if (block.body) {
      container.appendChild(wfGenEl('p', {
        style: { fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }
      }, block.body));
    }
    if (block.action) {
      container.appendChild(wfGenEl('button', { className: 'btn btn-primary' }, block.action));
    }
    return container;
  }

  /* ======================================================================
     Section Block Dispatcher
     ====================================================================== */

  /**
   * Dispatch a section block to the appropriate renderer.
   * @param {Object} block - Block definition with type property
   * @param {string} surface
   * @returns {HTMLElement|null}
   */
  function wfGenBlock(block, surface) {
    if (!block || !block.type) return null;
    switch (block.type) {
      case 'detail-grid':       return wfGenDetailGrid(block, surface);
      case 'related-list':      return wfGenRelatedList(block, surface);
      case 'card':              return wfGenCard(block, surface);
      case 'kpi-row':           return wfGenKpiRow(block, surface);
      case 'timeline':          return wfGenTimeline(block, surface);
      case 'form':              return wfGenForm(block, surface);
      case 'table':             return wfGenTable(block, surface);
      case 'chart-placeholder': return wfGenChartPlaceholder(block);
      case 'empty-state':       return wfGenEmptyState(block);
      default:
        console.warn('[proto-gen] Unknown block type: ' + block.type);
        return null;
    }
  }

  /**
   * Render an array of blocks into a container element.
   * @param {Array} blocks
   * @param {string} surface
   * @returns {HTMLElement}
   */
  function wfGenBlockList(blocks, surface) {
    var container = wfGenEl('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
    if (!blocks) return container;
    for (var i = 0; i < blocks.length; i++) {
      var el = wfGenBlock(blocks[i], surface);
      if (el) container.appendChild(el);
    }
    return container;
  }

  /* ======================================================================
     Surface Headers
     ====================================================================== */

  /**
   * Generate a Salesforce record header with highlights panel and path bar.
   * @param {Object} bp - The full blueprint object
   * @returns {HTMLElement}
   */
  function wfGenSfdcHeader(bp) {
    var header = bp.header || {};
    var wrapper = wfGenEl('div', { className: 'sfdc-record-header' });

    /* Top row: icon + type + name + status + actions */
    var top = wfGenEl('div', { className: 'sfdc-record-header-top' });
    if (header.icon) {
      top.appendChild(wfGenEl('div', { className: 'sfdc-record-icon' }, header.icon));
    }
    var info = wfGenEl('div', { className: 'sfdc-record-info' });
    if (header.type) {
      info.appendChild(wfGenEl('div', { className: 'sfdc-record-type' }, header.type));
    }
    var nameEl = wfGenEl('h1', { className: 'sfdc-record-name' });
    nameEl.textContent = header.name || 'Untitled Record';
    if (header.status) {
      nameEl.appendChild(document.createTextNode(' '));
      nameEl.appendChild(wfGenBadge(header.status.label, header.status.color));
    }
    info.appendChild(nameEl);
    top.appendChild(info);

    if (header.actions && header.actions.length) {
      var actionsWrap = wfGenEl('div', { className: 'sfdc-record-actions' });
      actionsWrap.appendChild(wfGenActions(header.actions, 'sfdc'));
      top.appendChild(actionsWrap);
    }
    wrapper.appendChild(top);

    /* Highlights bar */
    if (bp.highlights && bp.highlights.length) {
      var bar = wfGenEl('div', { className: 'sfdc-highlights-bar' });
      for (var h = 0; h < bp.highlights.length; h++) {
        var hl = bp.highlights[h];
        var hlEl = wfGenEl('div', { className: 'sfdc-highlight' });
        hlEl.appendChild(wfGenEl('div', { className: 'sfdc-highlight-label' }, hl.label));
        var valEl = wfGenEl('div', { className: 'sfdc-highlight-value' });
        valEl.innerHTML = hl.value || '';
        hlEl.appendChild(valEl);
        bar.appendChild(hlEl);
      }
      wrapper.appendChild(bar);
    }

    /* Path bar */
    if (bp.path && bp.path.steps && bp.path.steps.length) {
      var pathBar = wfGenEl('div', { className: 'sfdc-path-bar' });
      var complete = bp.path.complete || [];
      for (var s = 0; s < bp.path.steps.length; s++) {
        var stepLabel = bp.path.steps[s];
        var cls = 'sfdc-path-step';
        if (stepLabel === bp.path.current) {
          cls += ' current';
        } else if (complete.indexOf(stepLabel) !== -1) {
          cls += ' complete';
        }
        pathBar.appendChild(wfGenEl('span', { className: cls }, stepLabel));
      }
      pathBar.appendChild(wfGenEl('button', {
        className: 'sfdc-path-complete-btn'
      }, 'Mark Stage as Complete'));
      wrapper.appendChild(pathBar);
    }

    return wrapper;
  }

  /**
   * Generate a Slack channel header.
   * @param {Object} bp - The full blueprint object
   * @returns {HTMLElement}
   */
  function wfGenSlackHeader(bp) {
    var header = bp.header || {};
    var wrapper = wfGenEl('div', {
      style: {
        padding: '12px 20px',
        borderBottom: '1px solid var(--wf-line)',
        background: 'var(--wf-white)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    });
    wrapper.appendChild(wfGenEl('span', {
      style: { fontSize: '18px', fontWeight: '800', color: 'var(--wf-ink)' }
    }, '#'));
    var info = wfGenEl('div', { style: { flex: '1' } });
    info.appendChild(wfGenEl('span', {
      style: { fontSize: '15px', fontWeight: '700', color: 'var(--wf-ink)' }
    }, header.name || 'channel'));
    if (header.type) {
      info.appendChild(wfGenEl('span', {
        style: { fontSize: '12px', color: 'var(--wf-muted)', marginLeft: '8px' }
      }, header.type));
    }
    wrapper.appendChild(info);
    if (header.status) {
      wrapper.appendChild(wfGenBadge(header.status.label, header.status.color));
    }
    if (header.actions && header.actions.length) {
      wrapper.appendChild(wfGenActions(header.actions));
    }
    return wrapper;
  }

  /**
   * Generate an Internal DS header.
   * @param {Object} bp - The full blueprint object
   * @returns {HTMLElement}
   */
  function wfGenInternalHeader(bp) {
    var header = bp.header || {};
    var wrapper = wfGenEl('div', { className: 'ds-page-header' });
    var left = wfGenEl('div');
    var titleRow = wfGenEl('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } });
    if (header.icon) {
      titleRow.appendChild(wfGenEl('span', { style: { fontSize: '24px' } }, header.icon));
    }
    var titleEl = wfGenEl('h1', { className: 'ds-page-title' });
    titleEl.textContent = header.name || 'Page Title';
    titleRow.appendChild(titleEl);
    if (header.status) {
      titleRow.appendChild(wfGenBadge(header.status.label, header.status.color));
    }
    left.appendChild(titleRow);
    if (header.type) {
      left.appendChild(wfGenEl('div', { className: 'ds-page-subtitle' }, header.type));
    }
    wrapper.appendChild(left);
    if (header.actions && header.actions.length) {
      wrapper.appendChild(wfGenActions(header.actions));
    }
    return wrapper;
  }

  /**
   * Generate a generic header (no surface-specific styling).
   * @param {Object} bp - The full blueprint object
   * @returns {HTMLElement}
   */
  function wfGenGenericHeader(bp) {
    var header = bp.header || {};
    var wrapper = wfGenEl('div', {
      className: 'wf-header',
      style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }
    });
    var left = wfGenEl('div');
    var titleRow = wfGenEl('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } });
    if (header.icon) {
      titleRow.appendChild(wfGenEl('span', { style: { fontSize: '24px' } }, header.icon));
    }
    titleRow.appendChild(wfGenEl('h1', null, header.name || 'Page Title'));
    if (header.status) {
      titleRow.appendChild(wfGenBadge(header.status.label, header.status.color));
    }
    left.appendChild(titleRow);
    if (header.type) {
      left.appendChild(wfGenEl('p', { className: 'caption' }, header.type));
    }
    wrapper.appendChild(left);
    if (header.actions && header.actions.length) {
      wrapper.appendChild(wfGenActions(header.actions));
    }
    return wrapper;
  }

  /**
   * Dispatch to the correct surface header generator.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenHeader(bp) {
    if (!bp.header) return wfGenEl('div');
    var surface = bp.surface || 'generic';
    switch (surface) {
      case 'sfdc':     return wfGenSfdcHeader(bp);
      case 'slack':    return wfGenSlackHeader(bp);
      case 'internal': return wfGenInternalHeader(bp);
      default:         return wfGenGenericHeader(bp);
    }
  }

  /* ======================================================================
     Design Notes Generator
     ====================================================================== */

  /**
   * Generate the hidden design notes div that proto-nav.js reads.
   * Populates Context / Design / Technical tabs.
   * @param {Object} notes - { summary, jtbd, designSpec, technical, acceptance }
   * @param {string} pageName
   * @returns {HTMLElement}
   */
  function wfGenDesignNotes(notes, pageName) {
    if (!notes) return null;

    var container = wfGenEl('div', { className: 'wf-design-notes' });
    var panel = wfGenEl('div', { className: 'wf-spec-panel' });

    /* Header */
    panel.appendChild(wfGenEl('div', { className: 'wf-spec-header' }, pageName || 'Page'));

    /* Summary section (maps to Context tab) */
    if (notes.summary) {
      var summarySection = wfGenEl('div', { className: 'wf-spec-section' });
      summarySection.appendChild(wfGenEl('div', { className: 'wf-spec-section-title' }, 'Summary'));
      summarySection.appendChild(wfGenEl('div', { className: 'wf-spec-body' }, notes.summary));
      panel.appendChild(summarySection);
    }

    /* JTBD section (maps to Context tab) */
    if (notes.jtbd && notes.jtbd.length) {
      var jtbdSection = wfGenEl('div', { className: 'wf-spec-section' });
      jtbdSection.appendChild(wfGenEl('div', { className: 'wf-spec-section-title' }, 'JTBD'));
      var jtbdBody = wfGenEl('div', { className: 'wf-spec-body' });
      var ul = wfGenEl('ul');
      for (var j = 0; j < notes.jtbd.length; j++) {
        ul.appendChild(wfGenEl('li', null, notes.jtbd[j]));
      }
      jtbdBody.appendChild(ul);
      jtbdSection.appendChild(jtbdBody);
      panel.appendChild(jtbdSection);
    }

    /* Design Spec section (maps to Design tab) */
    if (notes.designSpec) {
      var designSection = wfGenEl('div', { className: 'wf-spec-section' });
      designSection.appendChild(wfGenEl('div', { className: 'wf-spec-section-title' }, 'Design Spec'));
      var designBody = wfGenEl('div', { className: 'wf-spec-body' });
      designBody.innerHTML = notes.designSpec;
      designSection.appendChild(designBody);
      panel.appendChild(designSection);
    }

    /* Technical section (maps to Technical tab) */
    if (notes.technical) {
      var techSection = wfGenEl('div', { className: 'wf-spec-section' });
      techSection.appendChild(wfGenEl('div', { className: 'wf-spec-section-title' }, 'Technical Details'));
      var techBody = wfGenEl('div', { className: 'wf-spec-body' });
      techBody.innerHTML = notes.technical;
      techSection.appendChild(techBody);
      panel.appendChild(techSection);
    }

    /* Acceptance criteria */
    if (notes.acceptance && notes.acceptance.length) {
      var acSection = wfGenEl('div', { className: 'wf-spec-section' });
      acSection.appendChild(wfGenEl('div', { className: 'wf-spec-section-title' }, 'Acceptance Criteria'));
      var acBody = wfGenEl('div', { className: 'wf-spec-body' });
      var acUl = wfGenEl('ul');
      for (var a = 0; a < notes.acceptance.length; a++) {
        acUl.appendChild(wfGenEl('li', null, notes.acceptance[a]));
      }
      acBody.appendChild(acUl);
      acSection.appendChild(acBody);
      panel.appendChild(acSection);
    }

    container.appendChild(panel);
    return container;
  }

  /* ======================================================================
     Layout Generators
     ====================================================================== */

  /**
   * Generate a 3-column record page (SFDC-style).
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenRecordPage(bp) {
    var surface = bp.surface || 'sfdc';
    var page = wfGenEl('div', { className: surface === 'sfdc' ? 'sfdc-record-page' : '' });

    /* Surface header */
    page.appendChild(wfGenHeader(bp));

    /* 3-column layout */
    var columns = bp.columns || {};
    var layout = wfGenEl('div', {
      className: surface === 'sfdc' ? 'sfdc-record-layout' : '',
      style: surface !== 'sfdc' ? {
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
        gap: '16px',
        padding: '16px 24px 32px',
        alignItems: 'start'
      } : null
    });

    /* Left column */
    var leftCol = wfGenEl('div', {
      className: surface === 'sfdc' ? 'sfdc-col-related' : '',
      style: surface !== 'sfdc' ? { display: 'flex', flexDirection: 'column', gap: '12px' } : null
    });
    leftCol.appendChild(wfGenBlockList(columns.left, surface));
    layout.appendChild(leftCol);

    /* Center column */
    var centerCol = wfGenEl('div', {
      className: surface === 'sfdc' ? 'sfdc-col-record' : '',
      style: surface !== 'sfdc' ? { display: 'flex', flexDirection: 'column', gap: '12px' } : null
    });
    centerCol.appendChild(wfGenBlockList(columns.center, surface));
    layout.appendChild(centerCol);

    /* Right column */
    var rightCol = wfGenEl('div', {
      className: surface === 'sfdc' ? 'sfdc-col-activity' : '',
      style: surface !== 'sfdc' ? { display: 'flex', flexDirection: 'column', gap: '12px' } : null
    });
    rightCol.appendChild(wfGenBlockList(columns.right, surface));
    layout.appendChild(rightCol);

    page.appendChild(layout);
    return page;
  }

  /**
   * Generate a dashboard layout with KPI row + grid of content blocks.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenDashboard(bp) {
    var surface = bp.surface || 'internal';
    var isInternal = surface === 'internal';
    var page = wfGenEl('div', {
      className: isInternal ? 'ds-page-container' : '',
      style: !isInternal ? { maxWidth: '1200px', margin: '0 auto', padding: '24px' } : null
    });

    /* Header */
    page.appendChild(wfGenHeader(bp));

    /* Columns: treat as a 2-column grid of left + right blocks */
    var columns = bp.columns || {};
    if (columns.left || columns.right) {
      var grid = wfGenEl('div', {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }
      });
      if (columns.left) {
        grid.appendChild(wfGenBlockList(columns.left, surface));
      }
      if (columns.right) {
        grid.appendChild(wfGenBlockList(columns.right, surface));
      }
      page.appendChild(grid);
    }

    /* If using 'center' for full-width blocks */
    if (columns.center) {
      page.appendChild(wfGenBlockList(columns.center, surface));
    }

    return page;
  }

  /**
   * Generate a list/table page with optional filters.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenListPage(bp) {
    var surface = bp.surface || 'internal';
    var isInternal = surface === 'internal';
    var page = wfGenEl('div', {
      className: isInternal ? 'ds-page-container' : '',
      style: !isInternal ? { maxWidth: '1200px', margin: '0 auto', padding: '24px' } : null
    });

    /* Header */
    page.appendChild(wfGenHeader(bp));

    /* Render all blocks from columns.center (primary content area) */
    var columns = bp.columns || {};
    if (columns.center) {
      page.appendChild(wfGenBlockList(columns.center, surface));
    }

    return page;
  }

  /**
   * Generate a single-entity detail page.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenDetailPage(bp) {
    var surface = bp.surface || 'internal';
    var isInternal = surface === 'internal';
    var page = wfGenEl('div', {
      className: isInternal ? 'ds-page-container' : '',
      style: !isInternal ? { maxWidth: '1000px', margin: '0 auto', padding: '24px' } : null
    });

    /* Header */
    page.appendChild(wfGenHeader(bp));

    /* 2-column layout: main + sidebar */
    var columns = bp.columns || {};
    if (columns.left || columns.right || columns.center) {
      var layout = wfGenEl('div', {
        className: isInternal ? 'ds-record-layout' : '',
        style: !isInternal ? {
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '24px',
          alignItems: 'start'
        } : null
      });
      /* Main content: center or left */
      var mainBlocks = columns.center || columns.left || [];
      layout.appendChild(wfGenBlockList(mainBlocks, surface));
      /* Sidebar: right */
      if (columns.right) {
        layout.appendChild(wfGenBlockList(columns.right, surface));
      }
      page.appendChild(layout);
    }

    return page;
  }

  /**
   * Generate a form-centric page.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenFormPage(bp) {
    var surface = bp.surface || 'internal';
    var page = wfGenEl('div', {
      style: { maxWidth: '720px', margin: '0 auto', padding: '24px' }
    });

    /* Header */
    page.appendChild(wfGenHeader(bp));

    /* Form card wrapping center blocks */
    var columns = bp.columns || {};
    var mainBlocks = columns.center || [];
    var card = wfGenEl('div', { className: 'wf-card' });
    var cardBody = wfGenEl('div', { className: 'wf-card-body' });
    cardBody.appendChild(wfGenBlockList(mainBlocks, surface));
    card.appendChild(cardBody);

    /* Action footer */
    if (bp.header && bp.header.actions && bp.header.actions.length) {
      var footer = wfGenEl('div', {
        style: {
          padding: '14px 16px',
          borderTop: '1px solid var(--wf-tint)',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          background: 'var(--wf-surface)',
          borderRadius: '0 0 var(--wf-radius) var(--wf-radius)'
        }
      });
      footer.appendChild(wfGenActions(bp.header.actions, surface));
      card.appendChild(footer);
    }

    page.appendChild(card);
    return page;
  }

  /**
   * Generate a freeform canvas page.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenCanvasPage(bp) {
    var surface = bp.surface || 'generic';
    var page = wfGenEl('div', {
      style: { maxWidth: '1400px', margin: '0 auto', padding: '24px' }
    });

    /* Header */
    page.appendChild(wfGenHeader(bp));

    /* Render all columns content in order: left, center, right */
    var columns = bp.columns || {};
    var allBlocks = [].concat(columns.left || [], columns.center || [], columns.right || []);
    page.appendChild(wfGenBlockList(allBlocks, surface));

    return page;
  }

  /* ======================================================================
     Layout Dispatcher
     ====================================================================== */

  /**
   * Dispatch to the correct layout generator based on blueprint.layout.
   * @param {Object} bp
   * @returns {HTMLElement}
   */
  function wfGenLayout(bp) {
    switch (bp.layout) {
      case 'record-3col': return wfGenRecordPage(bp);
      case 'dashboard':   return wfGenDashboard(bp);
      case 'list':        return wfGenListPage(bp);
      case 'detail':      return wfGenDetailPage(bp);
      case 'form':        return wfGenFormPage(bp);
      case 'canvas':      return wfGenCanvasPage(bp);
      default:
        console.warn('[proto-gen] Unknown layout: ' + bp.layout + ', falling back to canvas');
        return wfGenCanvasPage(bp);
    }
  }

  /* ======================================================================
     Init — Entry Point
     ====================================================================== */

  /**
   * Main initialization. Detects PAGE_BLUEPRINT, validates, generates page.
   * Runs on DOMContentLoaded to ensure proto-nav.js has already executed.
   */
  function wfBlueprintInit() {
    var bp = wfBlueprintDetect();
    if (!bp) return; /* No blueprint on this page — silently skip */
    if (!wfBlueprintValidate(bp)) return;

    var surface = bp.surface || 'generic';
    var headerName = (bp.header && bp.header.name) ? bp.header.name : 'Blueprint Page';

    /* Find or create a <main> insertion point */
    var target = document.querySelector('main') || document.querySelector('[data-wf-blueprint-target]');
    if (!target) {
      target = wfGenEl('main');
      /* Insert before existing design notes or scripts, after any context bar */
      var existingNotes = document.querySelector('.wf-design-notes');
      if (existingNotes) {
        document.body.insertBefore(target, existingNotes);
      } else {
        document.body.appendChild(target);
      }
    }

    /* Apply confidence attribute to the page wrapper */
    if (bp.confidence) {
      target.setAttribute('data-wf-confidence', bp.confidence);
    }

    /* Generate the page layout and content */
    var pageContent = wfGenLayout(bp);
    target.appendChild(pageContent);

    /* Generate design notes if provided and none already exist */
    if (bp.notes && !document.querySelector('.wf-design-notes')) {
      var notesEl = wfGenDesignNotes(bp.notes, headerName);
      if (notesEl) {
        document.body.appendChild(notesEl);
      }
    }

    /* Update page title if not already set meaningfully */
    if (document.title.indexOf('Blueprint') !== -1 || !document.title) {
      var headerType = (bp.header && bp.header.type) ? bp.header.type : '';
      document.title = headerName + (headerType ? ' \u2014 ' + headerType : '');
    }
  }

  /* ======================================================================
     Bootstrap — Listen for DOMContentLoaded
     ====================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wfBlueprintInit);
  } else {
    /* DOM already ready (script loaded with defer or at bottom) */
    wfBlueprintInit();
  }

})();
