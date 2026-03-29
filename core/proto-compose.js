/* ========================================================================
   Nib Compose Runtime (proto-compose.js)

   Reads window.COMPOSE and transforms it into a valid PAGE_BLUEPRINT
   that proto-gen.js renders unchanged. Registers new block types for
   compose-specific UI patterns (component-card, wizard-hero, etc.).

   Load order: project-data.js → proto-nav.js → compose-data.js → proto-compose.js → proto-gen.js
   ======================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     Utility: DOM Element Factory (local copy for block renderers)
     ====================================================================== */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = attrs[key];
        if (val === null || val === undefined) continue;
        if (key === 'className') node.className = val;
        else if (key === 'innerHTML') node.innerHTML = val;
        else if (key === 'textContent') node.textContent = val;
        else if (key === 'style' && typeof val === 'object') {
          var sk = Object.keys(val);
          for (var s = 0; s < sk.length; s++) node.style[sk[s]] = val[sk[s]];
        } else node.setAttribute(key, val);
      }
    }
    if (children !== undefined && children !== null) {
      if (typeof children === 'string') {
        node.textContent = children;
      } else if (Array.isArray(children)) {
        for (var c = 0; c < children.length; c++) {
          if (children[c] == null) continue;
          if (typeof children[c] === 'string') node.appendChild(document.createTextNode(children[c]));
          else node.appendChild(children[c]);
        }
      } else if (children instanceof HTMLElement) {
        node.appendChild(children);
      }
    }
    return node;
  }

  /* Layout mapping reference (used by composeInit dispatch):
     'page-layouts > record_page' → record-3col
     'page-layouts > list_view'   → list
     'wizard > wizard_page_shell' → canvas
  */

  /* ======================================================================
     Body Shorthand Parser
     Formats: "_buttons: [A, B]", "_text: lorem", "_file: doc.pdf (2MB)"
     ====================================================================== */

  function parseBodyShorthand(str) {
    if (typeof str !== 'string') return null;
    var s = str.trim();
    if (s.indexOf('_buttons:') === 0) {
      var raw = s.substring(9).trim().replace(/^\[/, '').replace(/\]$/, '');
      var btns = raw.split(',');
      for (var i = 0; i < btns.length; i++) btns[i] = btns[i].trim();
      return { shorthand: 'buttons', buttons: btns };
    }
    if (s.indexOf('_text:') === 0) return { shorthand: 'text', text: s.substring(6).trim() };
    if (s.indexOf('_file:') === 0) return { shorthand: 'file', file: s.substring(6).trim() };
    return null;
  }

  /* ======================================================================
     Body Processor — resolve template + repeat into inner block data
     ====================================================================== */

  function processBody(body) {
    if (!body) return null;
    if (typeof body === 'string') return parseBodyShorthand(body);

    var tmpl = body.template || '';
    var repeat = body.repeat || [];

    if (tmpl.indexOf('detail-grid') !== -1) {
      var fields = [];
      for (var i = 0; i < repeat.length; i++) {
        fields.push({ label: repeat[i].$LABEL || '', value: repeat[i].$VALUE || '' });
      }
      return { innerType: 'detail-grid', fields: fields };
    }
    if (tmpl.indexOf('related-list') !== -1) {
      var items = [];
      for (var r = 0; r < repeat.length; r++) {
        items.push({
          initials: repeat[r].$INITIALS || '', title: repeat[r].$TITLE || '',
          subtitle: repeat[r].$SUBTITLE || '', meta: repeat[r].$META || ''
        });
      }
      return { innerType: 'related-items', items: items };
    }
    if (tmpl.indexOf('feed-item') !== -1) {
      var fi = [];
      for (var f = 0; f < repeat.length; f++) {
        fi.push({ initials: repeat[f].$INITIALS || '', text: repeat[f].$TEXT || '', time: repeat[f].$TIME || '' });
      }
      return { innerType: 'feed-list', items: fi };
    }
    if (tmpl.indexOf('data-table') !== -1) {
      return { innerType: 'table', tableData: body.data || {} };
    }
    return null;
  }

  /* ======================================================================
     Section Processors — transform compose sections to blueprint data
     ====================================================================== */

  /** Process record-header > base into bp.header + bp.highlights */
  function processRecordHeader(section) {
    var d = section.data || {};
    var result = {
      header: {
        icon: d.$ICON || '', type: d.$RECORD_TYPE || '',
        name: d.$RECORD_NAME || '', actions: ['Edit', 'Clone', 'Delete']
      }
    };
    if (d.$highlights && d.$highlights.length) {
      result.highlights = [];
      for (var i = 0; i < d.$highlights.length; i++) {
        result.highlights.push({ label: d.$highlights[i].$LABEL || '', value: d.$highlights[i].$VALUE || '' });
      }
    }
    return result;
  }

  /** Process path-bar > base into bp.path */
  function processPath(section) {
    var stages = (section.data || {}).$stages || [];
    var steps = [], complete = [], current = '';
    for (var i = 0; i < stages.length; i++) {
      var name = stages[i].$STAGE_NAME || '';
      steps.push(name);
      if (stages[i].state === 'complete') complete.push(name);
      if (stages[i].state === 'current') current = name;
    }
    return { steps: steps, current: current, complete: complete };
  }

  /** Process an array of component-card sections into blueprint blocks */
  function processColumn(sections) {
    if (!sections || !Array.isArray(sections)) return [];
    var blocks = [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var tmpl = sec.template || '';
      var d = sec.data || {};

      if (tmpl.indexOf('component-card') !== -1) {
        var isCompact = tmpl.indexOf('compact') !== -1;
        var isEmpty = tmpl.indexOf('empty_state') !== -1;

        if (isEmpty) {
          blocks.push({
            type: 'empty-state', icon: '\ud83d\udccb',
            heading: d.$EMPTY_TITLE || '', body: d.$EMPTY_MESSAGE || '',
            action: (sec.actions && sec.actions[0]) ? (sec.actions[0].data || {}).$LABEL : ''
          });
          continue;
        }

        var block = {
          type: 'component-card', variant: isCompact ? 'compact' : 'base',
          title: d.$COMPONENT_TITLE || '', icon: d.$ICON || '',
          iconBg: d.$ICON_BG || '', count: d.$COUNT || '',
          action: d.$ACTION !== undefined ? d.$ACTION : (isCompact ? '' : 'View All')
        };
        var bodyResult = processBody(sec.body);
        if (bodyResult) {
          if (bodyResult.shorthand) block.bodyShorthand = bodyResult;
          else { block.innerType = bodyResult.innerType; block.innerData = bodyResult; }
        }
        blocks.push(block);
      }
    }
    return blocks;
  }

  /* ======================================================================
     Form Section Processor — wizard form arrays
     ====================================================================== */

  function processFormSections(formArray) {
    if (!formArray || !Array.isArray(formArray)) return [];
    var sections = [];

    for (var i = 0; i < formArray.length; i++) {
      var fs = formArray[i];

      /* Review accordion */
      if (fs.template && fs.template.indexOf('review_accordion') !== -1) {
        var ad = fs.data || {};
        sections.push({
          type: 'review-accordion', sectionTitle: ad.$SECTION_TITLE || '',
          stepNumber: ad.$N || '', rows: ad.$rows || []
        });
        continue;
      }

      /* Section with dual listbox as sole field */
      if (fs.fields && fs.fields.length === 1 && fs.fields[0].template &&
          fs.fields[0].template.indexOf('dual_listbox') !== -1) {
        var dlData = fs.fields[0].data || {};
        sections.push({
          type: 'dual-listbox-section', sectionTitle: fs.section_title || '',
          regionPills: fs.region_pills || null,
          available: dlData.$available || [], selected: dlData.$selected || []
        });
        continue;
      }

      /* Regular form section */
      var fields = [];
      var sFields = fs.fields || [];
      for (var f = 0; f < sFields.length; f++) {
        var fld = sFields[f];
        /* Non-template field (file upload, etc.) */
        if (!fld.template && fld.label) {
          fields.push({ type: 'file-upload', label: fld.label || '', hint: fld.hint || '' });
          continue;
        }
        /* Dual listbox inside a multi-field section */
        if (fld.template && fld.template.indexOf('dual_listbox') !== -1) {
          var dlD = fld.data || {};
          fields.push({ type: 'dual-listbox', available: dlD.$available || [], selected: dlD.$selected || [] });
          continue;
        }
        var ft = fld.template || '';
        var fd = fld.data || {};
        var fieldType = 'text';
        if (ft.indexOf('textarea') !== -1) fieldType = 'textarea';
        else if (ft.indexOf('select') !== -1) fieldType = 'select';
        else if (ft.indexOf('checkbox') !== -1) fieldType = 'checkbox';
        fields.push({
          type: fieldType, label: fd.$LABEL || '', value: fd.$VALUE || '',
          placeholder: fd.$PLACEHOLDER || '', halfWidth: fld.half_width || false,
          options: fld._options || [], note: fld._note || ''
        });
      }
      sections.push({
        type: 'form-section', sectionTitle: fs.section_title || '',
        note: fs._note || '', prefillCheckbox: fs.prefill_checkbox || null, fields: fields
      });
    }
    return sections;
  }

  /* ======================================================================
     Layout Assemblers
     ====================================================================== */

  /** Assemble a 3-column SFDC record page */
  function assembleRecordPage(screen) {
    var sec = screen.sections || {};
    var bp = { surface: 'sfdc', layout: 'record-3col' };
    if (sec.header) {
      var hr = processRecordHeader(sec.header);
      bp.header = hr.header;
      if (hr.highlights) bp.highlights = hr.highlights;
    }
    if (sec.path) bp.path = processPath(sec.path);
    bp.columns = {
      left: processColumn(sec.left),
      center: processColumn(sec.main),
      right: processColumn(sec.right)
    };
    return bp;
  }

  /** Assemble a list / table page */
  function assembleListView(screen) {
    var sec = screen.sections || {};
    var bp = { surface: 'sfdc', layout: 'list' };

    /* Header — use icon + type to produce a clean page header via SFDC surface */
    if (sec.header) {
      var hd = sec.header.data || {};
      var actions = [];
      if (hd.$actions) {
        for (var a = 0; a < hd.$actions.length; a++) {
          actions.push((hd.$actions[a].data || {}).$LABEL || '');
        }
      }
      bp.header = { icon: '\ud83d\udccb', name: hd.$PAGE_TITLE || '', actions: actions };
    }

    var blocks = [];

    /* KPIs */
    if (sec.kpis) {
      var kr = sec.kpis.repeat || [];
      var ki = [];
      for (var k = 0; k < kr.length; k++) {
        ki.push({ label: kr[k].$LABEL || '', value: kr[k].$VALUE || '', trend: kr[k].$DETAIL || '' });
      }
      blocks.push({ type: 'kpi-row', items: ki });
    }

    /* Filters */
    if (sec.filters) {
      blocks.push({
        type: 'filter-bar', search: sec.filters.search || {},
        dropdowns: sec.filters.dropdowns || [], dateRange: sec.filters.date_range || null
      });
    }

    /* Table */
    if (sec.table) {
      var td = sec.table.data || {};
      var cols = [], colNames = td.$columns || [];
      for (var c = 0; c < colNames.length; c++) cols.push({ label: colNames[c], field: 'col' + c });
      var rows = [], tRows = td.$rows || [];
      for (var r = 0; r < tRows.length; r++) {
        var row = {};
        for (var cc = 0; cc < colNames.length; cc++) row['col' + cc] = tRows[r][cc] || '';
        rows.push(row);
      }
      blocks.push({ type: 'table', sortable: true, columns: cols, rows: rows });
    }

    /* Body: empty state, alert, or skeleton */
    if (sec.body) {
      var bt = sec.body.template || '';
      var bd = sec.body.data || {};
      if (bt.indexOf('empty_state') !== -1) {
        blocks.push({
          type: 'empty-state', icon: '\ud83d\udccb', heading: bd.$EMPTY_TITLE || '',
          body: bd.$EMPTY_MESSAGE || '',
          action: (sec.body.actions && sec.body.actions[0]) ? (sec.body.actions[0].data || {}).$LABEL : ''
        });
      } else if (bt.indexOf('alert') !== -1) {
        var alertActions = [];
        if (bd.$actions) {
          for (var aa = 0; aa < bd.$actions.length; aa++) {
            alertActions.push((bd.$actions[aa].data || {}).$LABEL || '');
          }
        }
        var variant = 'error';
        if (bt.indexOf('warning') !== -1) variant = 'warning';
        else if (bt.indexOf('success') !== -1) variant = 'success';
        else if (bt.indexOf('info') !== -1) variant = 'info';
        blocks.push({
          type: 'alert', variant: variant, title: bd.$TITLE || '',
          message: bd.$MESSAGE || '', actions: alertActions
        });
      } else if (sec.body.skeleton_rows) {
        blocks.push({
          type: 'skeleton', kpiCount: sec.body.skeleton_kpis || 0,
          rowCount: sec.body.skeleton_rows || 5, columns: sec.body.skeleton_columns || []
        });
      }
    }

    bp.columns = { center: blocks };
    return bp;
  }

  /** Assemble a wizard step page */
  function assembleWizardPage(screen) {
    var sec = screen.sections || {};
    var bp = { surface: 'sfdc', layout: 'canvas', header: { name: screen.name || 'Wizard' } };
    var blocks = [];

    /* Hero bar */
    if (sec.hero) {
      var hd = sec.hero.data || {};
      blocks.push({
        type: 'wizard-hero', title: screen.name ? screen.name.split(' \u2014 ')[0] : 'Wizard',
        subtitle: hd.$SUBTITLE || '', regType: hd.$REG_TYPE || '', prospectName: hd.$PROSPECT_NAME || ''
      });
    }

    /* Stepper — uses existing proto-gen.js stepper block */
    if (sec.stepper) {
      var stData = (sec.stepper.data || {}).$STEPS || [];
      var stepItems = [], currentIdx = 0;
      for (var i = 0; i < stData.length; i++) {
        var state = 'upcoming';
        if (stData[i].state === 'complete') state = 'complete';
        else if (stData[i].state === 'current') { state = 'current'; currentIdx = i; }
        stepItems.push({ label: stData[i].label || '', status: state });
      }
      blocks.push({ type: 'stepper', steps: stepItems, current: currentIdx });
    }

    /* Wizard body: 2-column form + guidance */
    var formSections = processFormSections(sec.form);
    var guidance = null;
    if (sec.guidance) {
      var gd = sec.guidance.data || {};
      guidance = {
        title: gd.$SIDEBAR_TITLE || 'Guidance', stepLabel: gd.$STEP_LABEL || '',
        description: gd.$DESCRIPTION || '', checklist: gd.$checklist || []
      };
    }
    blocks.push({ type: 'wizard-body', formSections: formSections, guidance: guidance });

    /* Action bar */
    if (sec.action_bar) {
      var abd = sec.action_bar.data || {};
      blocks.push({
        type: 'action-bar', backVisible: abd.$back_visible !== false,
        backLabel: abd.$back_label || 'Back', nextLabel: abd.$next_label || 'Next',
        nextVariant: abd.$next_variant || 'brand'
      });
    }

    bp.columns = { center: blocks };
    return bp;
  }

  /* ======================================================================
     Block Renderers — registered via wfRegisterBlock after proto-gen.js loads
     ====================================================================== */

  /* ---- Component Card ------------------------------------------------- */

  function renderComponentCard(block) {
    var isCompact = block.variant === 'compact';
    var card = el('div', { className: 'sfdc-card', style: { marginBottom: '0' } });

    /* Header */
    var header = el('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--wf-tint)'
      }
    });

    if (isCompact) {
      header.appendChild(el('span', {
        style: { fontSize: '12px', fontWeight: '700', color: 'var(--wf-ink)', textTransform: 'uppercase', letterSpacing: '0.3px' }
      }, block.title));
      if (block.action) {
        header.appendChild(el('span', {
          style: { fontSize: '11px', fontWeight: '600', color: 'var(--wf-accent)', cursor: 'pointer' }
        }, block.action));
      }
    } else {
      var tg = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } });
      if (block.icon) {
        tg.appendChild(el('div', {
          style: {
            width: '24px', height: '24px', borderRadius: '4px',
            background: block.iconBg || 'var(--wf-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '700', color: '#fff'
          }
        }, block.icon));
      }
      tg.appendChild(el('span', {
        style: { fontSize: '12px', fontWeight: '700', color: 'var(--wf-ink)' }
      }, block.title));
      if (block.count) {
        tg.appendChild(el('span', {
          style: { fontSize: '10px', fontWeight: '600', color: 'var(--wf-muted)', background: 'var(--wf-surface)', padding: '1px 6px', borderRadius: '8px' }
        }, block.count));
      }
      header.appendChild(tg);
      if (block.action) {
        header.appendChild(el('span', {
          style: { fontSize: '11px', fontWeight: '600', color: 'var(--wf-accent)', cursor: 'pointer' }
        }, block.action));
      }
    }
    card.appendChild(header);

    /* Body */
    var body = el('div', { style: { padding: '8px 12px 12px' } });

    if (block.bodyShorthand) {
      var sh = block.bodyShorthand;
      if (sh.shorthand === 'buttons') {
        var btnRow = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } });
        for (var b = 0; b < sh.buttons.length; b++) btnRow.appendChild(el('button', { className: 'btn' }, sh.buttons[b]));
        body.appendChild(btnRow);
      } else if (sh.shorthand === 'text') {
        body.appendChild(el('p', { style: { fontSize: '13px', color: 'var(--wf-text)', lineHeight: '1.6', margin: '0' } }, sh.text));
      } else if (sh.shorthand === 'file') {
        var fr = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' } });
        fr.appendChild(el('span', { style: { fontSize: '16px' } }, '\ud83d\udcce'));
        fr.appendChild(el('span', { style: { fontSize: '12px', color: 'var(--wf-accent)', fontWeight: '500' } }, sh.file));
        body.appendChild(fr);
      }
    } else if (block.innerType === 'detail-grid' && block.innerData) {
      var grid = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' } });
      var flds = block.innerData.fields || [];
      for (var f = 0; f < flds.length; f++) {
        var fieldEl = el('div');
        fieldEl.appendChild(el('div', {
          style: { fontSize: '11px', color: 'var(--wf-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }
        }, flds[f].label));
        fieldEl.appendChild(el('div', { style: { fontSize: '13px', color: 'var(--wf-ink)', fontWeight: '500' } }, flds[f].value));
        grid.appendChild(fieldEl);
      }
      body.appendChild(grid);
    } else if (block.innerType === 'related-items' && block.innerData) {
      var items = block.innerData.items || [];
      for (var ri = 0; ri < items.length; ri++) {
        var row = el('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
            borderBottom: ri < items.length - 1 ? '1px solid var(--wf-tint)' : 'none'
          }
        });
        row.appendChild(el('div', {
          style: {
            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--wf-accent)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: '700', flexShrink: '0'
          }
        }, items[ri].initials));
        var info = el('div', { style: { flex: '1', minWidth: '0' } });
        info.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--wf-ink)' } }, items[ri].title));
        info.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--wf-muted)' } }, items[ri].subtitle));
        row.appendChild(info);
        if (items[ri].meta) row.appendChild(el('span', { className: 'wf-badge', style: { fontSize: '10px', flexShrink: '0' } }, items[ri].meta));
        body.appendChild(row);
      }
    } else if (block.innerType === 'feed-list' && block.innerData) {
      var feedItems = block.innerData.items || [];
      for (var fi = 0; fi < feedItems.length; fi++) {
        var fRow = el('div', {
          style: {
            display: 'flex', gap: '10px', padding: '8px 0',
            borderBottom: fi < feedItems.length - 1 ? '1px solid var(--wf-tint)' : 'none'
          }
        });
        fRow.appendChild(el('div', {
          style: {
            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--wf-surface)',
            color: 'var(--wf-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: '700', flexShrink: '0'
          }
        }, feedItems[fi].initials));
        var fb = el('div', { style: { flex: '1' } });
        fb.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--wf-text)', lineHeight: '1.4' } }, feedItems[fi].text));
        fb.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--wf-muted)', marginTop: '2px' } }, feedItems[fi].time));
        fRow.appendChild(fb);
        body.appendChild(fRow);
      }
    } else if (block.innerType === 'table' && block.innerData) {
      /* Table inside component card */
      var td = block.innerData.tableData || {};
      var tCols = td.$columns || [];
      var tRows = td.$rows || [];
      if (tCols.length) {
        var tbl = el('table', { className: 'wf-table', style: { fontSize: '12px' } });
        var tHead = el('thead');
        var tHr = el('tr');
        for (var tc = 0; tc < tCols.length; tc++) tHr.appendChild(el('th', null, tCols[tc]));
        tHead.appendChild(tHr);
        tbl.appendChild(tHead);
        var tBody = el('tbody');
        for (var tr = 0; tr < tRows.length; tr++) {
          var tTr = el('tr');
          for (var tcc = 0; tcc < tCols.length; tcc++) {
            var tTd = el('td');
            tTd.innerHTML = tRows[tr][tcc] || '';
            tTr.appendChild(tTd);
          }
          tBody.appendChild(tTr);
        }
        tbl.appendChild(tBody);
        body.appendChild(tbl);
      }
    }

    card.appendChild(body);
    return card;
  }

  /* ---- Wizard Hero Bar ------------------------------------------------ */

  function renderWizardHero(block) {
    var hero = el('div', {
      style: {
        background: 'var(--wf-canvas)', padding: '20px 24px',
        borderBottom: '1px solid var(--wf-tint)'
      }
    });
    hero.appendChild(el('div', {
      style: { fontSize: '22px', fontWeight: '700', color: 'var(--wf-ink)', marginBottom: '4px' }
    }, block.title || 'Wizard'));
    if (block.subtitle) {
      hero.appendChild(el('div', {
        style: { fontSize: '13px', color: 'var(--wf-muted)' }
      }, block.subtitle));
    }
    /* Context chips */
    if (block.regType || block.prospectName) {
      var chips = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' } });
      if (block.regType) {
        chips.appendChild(el('span', {
          style: {
            fontSize: '12px', fontWeight: '600', color: 'var(--wf-accent)',
            background: 'rgba(61,109,170,0.1)', padding: '2px 10px', borderRadius: '12px'
          }
        }, block.regType));
      }
      if (block.prospectName) {
        chips.appendChild(el('span', { style: { fontSize: '12px', color: 'var(--wf-muted)' } }, 'Prospect:'));
        chips.appendChild(el('span', { style: { fontSize: '12px', fontWeight: '600', color: 'var(--wf-ink)' } }, block.prospectName));
      }
      hero.appendChild(chips);
    }
    return hero;
  }

  /* ---- Wizard Body (2-col form + guidance) ----------------------------- */

  /** Render a single form field */
  function renderField(field) {
    /* Dual listbox field within a form section */
    if (field.type === 'dual-listbox') {
      return renderDualListboxWidget(field.available || [], field.selected || []);
    }
    /* File upload zone */
    if (field.type === 'file-upload') {
      var zone = el('div', { className: 'wf-form-group' });
      zone.appendChild(el('label', { className: 'wf-label' }, field.label));
      zone.appendChild(el('div', {
        style: {
          border: '2px dashed var(--wf-line)', borderRadius: '6px', padding: '20px',
          textAlign: 'center', color: 'var(--wf-muted)', fontSize: '12px'
        }
      }, field.hint || 'Drop files here'));
      return zone;
    }
    var group = el('div', { className: 'wf-form-group' });
    if (field.halfWidth) group.style.flex = '1';

    if (field.type === 'checkbox' && field.options && field.options.length) {
      group.appendChild(el('label', { className: 'wf-label' }, field.label));
      var cbWrap = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 16px' } });
      for (var c = 0; c < field.options.length; c++) {
        var cbRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });
        cbRow.appendChild(el('input', { type: 'checkbox' }));
        cbRow.appendChild(el('span', { style: { fontSize: '13px', color: 'var(--wf-text)' } }, field.options[c]));
        cbWrap.appendChild(cbRow);
      }
      group.appendChild(cbWrap);
    } else {
      group.appendChild(el('label', { className: 'wf-label' }, field.label));
      var input;
      if (field.type === 'textarea') {
        input = el('textarea', { className: 'wf-textarea', placeholder: field.placeholder || '', rows: '3' });
        if (field.value) input.textContent = field.value;
      } else if (field.type === 'select') {
        input = el('select', { className: 'wf-select' });
        input.appendChild(el('option', null, field.value || field.placeholder || '-- Select --'));
        for (var o = 0; o < (field.options || []).length; o++) input.appendChild(el('option', null, field.options[o]));
      } else {
        input = el('input', { className: 'wf-input', type: 'text', value: field.value || '', placeholder: field.placeholder || '' });
      }
      group.appendChild(input);
    }
    if (field.note) {
      group.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--wf-muted)', marginTop: '4px', fontStyle: 'italic' } }, field.note));
    }
    return group;
  }

  /** Render a dual listbox transfer widget */
  function renderDualListboxWidget(available, selected) {
    var wrap = el('div', {
      style: {
        display: 'grid', gridTemplateColumns: '1fr 36px 1fr', border: '1px solid var(--wf-line)',
        borderRadius: '4px', overflow: 'hidden'
      }
    });
    /* Available pane */
    var avPane = el('div');
    avPane.appendChild(el('div', {
      style: {
        padding: '8px 10px', background: 'var(--wf-canvas)', borderBottom: '1px solid var(--wf-tint)',
        fontSize: '11px', fontWeight: '700', color: 'var(--wf-muted)', textTransform: 'uppercase', letterSpacing: '0.3px'
      }
    }, 'Available'));
    var avList = el('div', { style: { maxHeight: '140px', overflowY: 'auto', padding: '4px 0' } });
    for (var a = 0; a < available.length; a++) {
      avList.appendChild(el('div', {
        style: { padding: '3px 10px', fontSize: '13px', color: 'var(--wf-text)', cursor: 'pointer' }
      }, available[a]));
    }
    avPane.appendChild(avList);
    wrap.appendChild(avPane);

    /* Transfer buttons */
    var btns = el('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '6px', background: 'var(--wf-canvas)',
        borderLeft: '1px solid var(--wf-tint)', borderRight: '1px solid var(--wf-tint)'
      }
    });
    btns.appendChild(el('button', {
      style: {
        width: '26px', height: '26px', borderRadius: '4px', border: '1px solid var(--wf-line)',
        background: '#fff', cursor: 'pointer', fontSize: '12px', color: 'var(--wf-muted)'
      }
    }, '\u2192'));
    btns.appendChild(el('button', {
      style: {
        width: '26px', height: '26px', borderRadius: '4px', border: '1px solid var(--wf-line)',
        background: '#fff', cursor: 'pointer', fontSize: '12px', color: 'var(--wf-muted)'
      }
    }, '\u2190'));
    wrap.appendChild(btns);

    /* Selected pane */
    var selPane = el('div');
    selPane.appendChild(el('div', {
      style: {
        padding: '8px 10px', background: 'var(--wf-canvas)', borderBottom: '1px solid var(--wf-tint)',
        fontSize: '11px', fontWeight: '700', color: 'var(--wf-muted)', textTransform: 'uppercase', letterSpacing: '0.3px'
      }
    }, 'Selected'));
    var selList = el('div', { style: { maxHeight: '140px', overflowY: 'auto', padding: '4px 0' } });
    for (var s = 0; s < selected.length; s++) {
      selList.appendChild(el('div', {
        style: { padding: '3px 10px', fontSize: '13px', color: 'var(--wf-text)' }
      }, selected[s]));
    }
    if (!selected.length) {
      selList.appendChild(el('div', {
        style: { padding: '10px', fontSize: '12px', color: 'var(--wf-muted)', textAlign: 'center', fontStyle: 'italic' }
      }, 'None selected'));
    }
    selPane.appendChild(selList);
    wrap.appendChild(selPane);

    return wrap;
  }

  /** Render a guidance sidebar card */
  function renderGuidanceCard(guidance) {
    if (!guidance) return el('div');
    var card = el('div', {
      style: { border: '1px solid var(--wf-tint)', borderRadius: '8px', overflow: 'hidden' }
    });
    /* Header */
    card.appendChild(el('div', {
      style: {
        padding: '14px 16px', background: '#fff', borderBottom: '1px solid var(--wf-tint)',
        fontSize: '13px', fontWeight: '600', color: 'var(--wf-ink)'
      }
    }, guidance.title));
    /* Illustration placeholder */
    card.appendChild(el('div', {
      style: {
        height: '80px', background: '#fff', borderBottom: '1px solid var(--wf-tint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', color: 'var(--wf-muted)', fontStyle: 'italic'
      }
    }, '\u2139\ufe0f Illustration'));
    /* Content */
    var content = el('div', {
      style: { padding: '18px 16px', background: 'var(--wf-canvas)' }
    });
    if (guidance.stepLabel) {
      content.appendChild(el('div', {
        style: {
          fontSize: '11px', fontWeight: '700', color: 'var(--wf-accent)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px'
        }
      }, guidance.stepLabel));
    }
    if (guidance.description) {
      content.appendChild(el('div', {
        style: { fontSize: '12px', color: 'var(--wf-muted)', lineHeight: '18px', marginBottom: '14px' }
      }, guidance.description));
    }
    /* Checklist */
    var cl = guidance.checklist || [];
    for (var c = 0; c < cl.length; c++) {
      var item = el('div', {
        style: {
          display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px',
          borderBottom: '1px solid var(--wf-tint)', marginBottom: '8px'
        }
      });
      item.appendChild(el('div', {
        style: {
          width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid var(--wf-accent)',
          flexShrink: '0', marginTop: '1px'
        }
      }));
      item.appendChild(el('span', {
        style: { fontSize: '12px', color: 'var(--wf-text)', lineHeight: '18px' }
      }, cl[c]));
      content.appendChild(item);
    }
    card.appendChild(content);
    return card;
  }

  function renderWizardBody(block) {
    var container = el('div', {
      style: {
        display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px',
        padding: '28px 24px 48px', alignItems: 'start'
      }
    });

    /* Left: form sections */
    var formCol = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0' } });
    var sections = block.formSections || [];

    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];

      /* Review accordion section */
      if (sec.type === 'review-accordion') {
        var acc = el('div', {
          style: {
            border: '1px solid var(--wf-tint)', borderRadius: '6px',
            overflow: 'hidden', marginBottom: '12px'
          }
        });
        var accHeader = el('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'var(--wf-canvas)'
          }
        });
        var accTitle = el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } });
        accTitle.appendChild(el('span', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--wf-ink)' } }, sec.sectionTitle));
        if (sec.stepNumber) {
          accTitle.appendChild(el('span', {
            style: {
              fontSize: '11px', fontWeight: '600', color: 'var(--wf-accent)',
              background: 'rgba(61,109,170,0.12)', padding: '2px 8px', borderRadius: '10px'
            }
          }, 'Step ' + sec.stepNumber));
        }
        accHeader.appendChild(accTitle);
        accHeader.appendChild(el('span', {
          style: { fontSize: '12px', fontWeight: '500', color: 'var(--wf-accent)', cursor: 'pointer' }
        }, 'Edit'));
        acc.appendChild(accHeader);
        /* Review rows */
        var accBody = el('div', { style: { padding: '16px 20px', background: '#fff' } });
        var rows = sec.rows || [];
        for (var rr = 0; rr < rows.length; rr++) {
          var rRow = el('div', {
            style: {
              display: 'flex', padding: '9px 0',
              borderBottom: rr < rows.length - 1 ? '1px solid var(--wf-tint)' : 'none'
            }
          });
          rRow.appendChild(el('div', {
            style: { width: '180px', fontSize: '13px', fontWeight: '500', color: 'var(--wf-muted)' }
          }, rows[rr].$LABEL || ''));
          rRow.appendChild(el('div', {
            style: { flex: '1', fontSize: '13px', fontWeight: '500', color: 'var(--wf-ink)' }
          }, rows[rr].$VALUE || ''));
          accBody.appendChild(rRow);
        }
        acc.appendChild(accBody);
        formCol.appendChild(acc);
        continue;
      }

      /* Dual listbox section */
      if (sec.type === 'dual-listbox-section') {
        if (sec.sectionTitle) {
          formCol.appendChild(el('h3', {
            style: { fontSize: '15px', fontWeight: '700', color: 'var(--wf-ink)', margin: '24px 0 12px' }
          }, sec.sectionTitle));
        }
        if (sec.regionPills) {
          var pills = el('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } });
          for (var p = 0; p < sec.regionPills.length; p++) {
            pills.appendChild(el('button', {
              className: 'btn', style: { fontSize: '12px', padding: '4px 12px' }
            }, sec.regionPills[p]));
          }
          formCol.appendChild(pills);
        }
        formCol.appendChild(renderDualListboxWidget(sec.available, sec.selected));
        continue;
      }

      /* Regular form section */
      if (sec.sectionTitle) {
        formCol.appendChild(el('h3', {
          style: { fontSize: '15px', fontWeight: '700', color: 'var(--wf-ink)', margin: '24px 0 12px' }
        }, sec.sectionTitle));
      }
      if (sec.note) {
        formCol.appendChild(el('div', {
          style: { fontSize: '12px', color: 'var(--wf-muted)', marginBottom: '12px', fontStyle: 'italic' }
        }, sec.note));
      }
      /* Prefill checkbox */
      if (sec.prefillCheckbox) {
        var pfRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } });
        var pfCb = el('input', { type: 'checkbox' });
        if (sec.prefillCheckbox.$checked) pfCb.setAttribute('checked', '');
        pfRow.appendChild(pfCb);
        pfRow.appendChild(el('span', {
          style: { fontSize: '13px', color: 'var(--wf-text)' }
        }, sec.prefillCheckbox.$LABEL || ''));
        formCol.appendChild(pfRow);
      }
      /* Fields — group half-width fields into rows */
      var fields = sec.fields || [];
      var halfRow = null;
      for (var fi = 0; fi < fields.length; fi++) {
        var fld = fields[fi];
        if (fld.halfWidth) {
          if (!halfRow) {
            halfRow = el('div', { style: { display: 'flex', gap: '16px' } });
          }
          halfRow.appendChild(renderField(fld));
          /* Close row after 2 half-width fields or at end */
          if (halfRow.children.length === 2 || fi === fields.length - 1) {
            formCol.appendChild(halfRow);
            halfRow = null;
          }
        } else {
          if (halfRow) { formCol.appendChild(halfRow); halfRow = null; }
          formCol.appendChild(renderField(fld));
        }
      }
      if (halfRow) formCol.appendChild(halfRow);
    }

    container.appendChild(formCol);

    /* Right: guidance sidebar */
    container.appendChild(renderGuidanceCard(block.guidance));

    return container;
  }

  /* ---- Action Bar ----------------------------------------------------- */

  function renderActionBar(block) {
    var bar = el('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 24px 0', borderTop: '1px solid var(--wf-tint)'
      }
    });
    var saveExit = el('span', {
      style: { fontSize: '14px', fontWeight: '600', color: 'var(--wf-muted)', cursor: 'pointer' }
    }, 'Save & Exit');
    if (block.exitUrl) {
      saveExit.addEventListener('click', function () {
        if (window.wfNavigate) window.wfNavigate(block.exitUrl);
        else location.href = block.exitUrl;
      });
    }
    bar.appendChild(saveExit);
    var navBtns = el('div', { style: { display: 'flex', gap: '12px' } });
    if (block.backVisible && block.backLabel) {
      var backBtn = el('button', { className: 'btn' }, block.backLabel);
      if (block.backUrl) {
        backBtn.addEventListener('click', function () {
          if (window.wfNavigate) window.wfNavigate(block.backUrl);
          else location.href = block.backUrl;
        });
      }
      navBtns.appendChild(backBtn);
    }
    var nextAttrs = { className: 'btn btn-primary' };
    if (block.nextVariant === 'success') {
      nextAttrs.style = { background: 'var(--wf-green)', borderColor: 'var(--wf-green)', color: '#fff' };
    }
    var nextBtn = el('button', nextAttrs, block.nextLabel || 'Next');
    if (block.nextUrl) {
      nextBtn.addEventListener('click', function () {
        if (window.wfNavigate) window.wfNavigate(block.nextUrl);
        else location.href = block.nextUrl;
      });
    }
    navBtns.appendChild(nextBtn);
    bar.appendChild(navBtns);
    return bar;
  }

  /* ---- Alert Banner --------------------------------------------------- */

  function renderAlert(block) {
    var colorMap = {
      error: { bg: 'rgba(139,69,83,0.08)', border: 'var(--wf-red)', icon: '\u26a0\ufe0f' },
      warning: { bg: 'rgba(107,90,47,0.08)', border: 'var(--wf-amber)', icon: '\u26a0\ufe0f' },
      success: { bg: 'rgba(69,120,90,0.08)', border: 'var(--wf-green)', icon: '\u2705' },
      info: { bg: 'rgba(61,109,170,0.08)', border: 'var(--wf-accent)', icon: '\u2139\ufe0f' }
    };
    var colors = colorMap[block.variant] || colorMap.error;
    var alert = el('div', {
      style: {
        background: colors.bg, border: '1px solid ' + colors.border, borderRadius: '6px',
        padding: '20px 24px'
      }
    });
    var top = el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' } });
    top.appendChild(el('span', { style: { fontSize: '18px' } }, colors.icon));
    var text = el('div');
    if (block.title) text.appendChild(el('div', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--wf-ink)', marginBottom: '4px' } }, block.title));
    if (block.message) text.appendChild(el('div', { style: { fontSize: '13px', color: 'var(--wf-text)', lineHeight: '1.5' } }, block.message));
    top.appendChild(text);
    alert.appendChild(top);
    if (block.actions && block.actions.length) {
      var actRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', paddingLeft: '30px' } });
      for (var a = 0; a < block.actions.length; a++) actRow.appendChild(el('button', { className: 'btn' }, block.actions[a]));
      alert.appendChild(actRow);
    }
    return alert;
  }

  /* ---- Filter Bar ----------------------------------------------------- */

  function renderFilterBar(block) {
    var bar = el('div', {
      style: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px 0' }
    });
    if (block.search) {
      var searchGroup = el('div', { style: { flex: '1', minWidth: '200px' } });
      searchGroup.appendChild(el('input', {
        className: 'wf-input', type: 'search',
        placeholder: block.search.$PLACEHOLDER || 'Search...',
        style: { width: '100%' }
      }));
      bar.appendChild(searchGroup);
    }
    var dds = block.dropdowns || [];
    for (var d = 0; d < dds.length; d++) {
      var ddGroup = el('div', { style: { minWidth: '120px' } });
      ddGroup.appendChild(el('label', {
        style: { display: 'block', fontSize: '11px', color: 'var(--wf-muted)', marginBottom: '4px', fontWeight: '600' }
      }, dds[d].$LABEL || ''));
      var sel = el('select', { className: 'wf-select', style: { width: '100%' } });
      var opts = dds[d].$OPTIONS || [];
      for (var o = 0; o < opts.length; o++) sel.appendChild(el('option', null, opts[o]));
      ddGroup.appendChild(sel);
      bar.appendChild(ddGroup);
    }
    /* Date range inputs */
    if (block.dateRange) {
      var drGroup = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-end' } });
      drGroup.appendChild(el('input', {
        className: 'wf-input', type: 'date',
        placeholder: block.dateRange.$FROM || 'From',
        style: { width: '130px' }
      }));
      drGroup.appendChild(el('span', { style: { fontSize: '12px', color: 'var(--wf-muted)', paddingBottom: '8px' } }, 'to'));
      drGroup.appendChild(el('input', {
        className: 'wf-input', type: 'date',
        placeholder: block.dateRange.$TO || 'To',
        style: { width: '130px' }
      }));
      bar.appendChild(drGroup);
    }
    return bar;
  }

  /* ---- Skeleton Loading ----------------------------------------------- */

  function renderSkeleton(block) {
    var wrap = el('div');
    /* KPI placeholders — static shimmer background via gradient */
    if (block.kpiCount) {
      var kpiRow = el('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } });
      for (var k = 0; k < block.kpiCount; k++) {
        kpiRow.appendChild(el('div', {
          style: {
            flex: '1', height: '72px', borderRadius: '6px',
            background: 'linear-gradient(90deg, var(--wf-surface) 25%, var(--wf-tint) 50%, var(--wf-surface) 75%)',
            backgroundSize: '200% 100%'
          }
        }));
      }
      wrap.appendChild(kpiRow);
    }
    /* Table skeleton */
    var cols = block.columns || [];
    if (cols.length) {
      var table = el('table', { className: 'wf-table' });
      var thead = el('thead');
      var headRow = el('tr');
      for (var c = 0; c < cols.length; c++) headRow.appendChild(el('th', null, cols[c]));
      thead.appendChild(headRow);
      table.appendChild(thead);
      var tbody = el('tbody');
      for (var r = 0; r < (block.rowCount || 5); r++) {
        var tr = el('tr');
        for (var cc = 0; cc < cols.length; cc++) {
          var td = el('td');
          td.appendChild(el('div', {
            style: {
              height: '14px', borderRadius: '4px',
              width: (60 + Math.random() * 30) + '%',
              background: 'linear-gradient(90deg, var(--wf-surface) 25%, var(--wf-tint) 50%, var(--wf-surface) 75%)',
              backgroundSize: '200% 100%'
            }
          }));
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
    }
    return wrap;
  }

  /* ======================================================================
     Entry Point
     ====================================================================== */

  function composeInit() {
    var compose = window.COMPOSE;
    if (!compose) return;

    var layout = compose.layout || '';
    var bp;

    if (layout.indexOf('record_page') !== -1) {
      bp = assembleRecordPage(compose);
    } else if (layout.indexOf('list_view') !== -1) {
      bp = assembleListView(compose);
    } else if (layout.indexOf('wizard') !== -1) {
      bp = assembleWizardPage(compose);
    } else {
      /* Fallback: try to detect from sections */
      if (compose.sections && compose.sections.form) bp = assembleWizardPage(compose);
      else if (compose.sections && compose.sections.table) bp = assembleListView(compose);
      else bp = assembleRecordPage(compose);
    }

    /* Generate design notes from screen metadata */
    bp.notes = bp.notes || {
      summary: compose.name || 'Compose-generated page',
      jtbd: [],
      designSpec: 'Generated from compose format. Layout: ' + layout,
      technical: 'Data-driven page generated by proto-compose.js from COMPOSE object.',
      acceptance: []
    };
    bp.confidence = compose.confidence || 'partial';

    window.PAGE_BLUEPRINT = bp;
  }

  /* Transform COMPOSE → PAGE_BLUEPRINT synchronously during script load */
  composeInit();

  /* Register block types after proto-gen.js has loaded.
     Standard load order (scripts at bottom of body, no defer) means readyState
     is 'loading' and DOMContentLoaded fires after all scripts have executed.
     Fallback: if DOM is already ready but wfRegisterBlock isn't available yet
     (dynamic loading), retry after a tick so proto-gen.js can finish. */
  function registerComposeBlocks() {
    var reg = window.wfRegisterBlock;
    if (!reg) return;
    reg('component-card', renderComponentCard);
    reg('wizard-hero', renderWizardHero);
    reg('wizard-body', renderWizardBody);
    reg('action-bar', renderActionBar);
    reg('alert', renderAlert);
    reg('filter-bar', renderFilterBar);
    reg('skeleton', renderSkeleton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerComposeBlocks);
  } else if (window.wfRegisterBlock) {
    registerComposeBlocks();
  } else {
    setTimeout(registerComposeBlocks, 0);
  }

})();
