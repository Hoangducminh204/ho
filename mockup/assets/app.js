// Mockup tĩnh — shell (menu cấp 2 + tab kiểu trình duyệt) + EDIT MODE (kéo-thả tự chỉnh).
// Không dùng framework/CDN (chạy offline). Kỹ thuật: HTML5 drag-and-drop + localStorage.

/* ============================== 1) SHELL: TAB + MENU CẤP 2 ============================== */
(function () {
  var tabbar = document.getElementById('tabbar');
  var content = document.querySelector('.content');
  if (!tabbar || !content) return;

  var open = [], active = null;
  var homeSec = document.querySelector('section[data-home]');
  var homeKey = homeSec ? homeSec.getAttribute('data-screen') : null;

  function title(key) {
    var s = document.querySelector('section[data-screen="' + key + '"]');
    return (s && s.getAttribute('data-title')) || key;
  }
  function render() {
    tabbar.innerHTML = '';
    open.forEach(function (key) {
      var t = document.createElement('div');
      t.className = 'tab-item' + (key === active ? ' active' : '') + (key === homeKey ? ' tab-home' : '');
      t.setAttribute('data-key', key);
      t.innerHTML = '<span class="tt">' + title(key) + '</span><span class="x" data-close="' + key + '">✕</span>';
      tabbar.appendChild(t);
    });
    document.querySelectorAll('section[data-screen]').forEach(function (s) {
      s.style.display = (s.getAttribute('data-screen') === active) ? '' : 'none';
    });
    document.querySelectorAll('.nav-item[data-screen], .nav-child[data-screen]').forEach(function (n) {
      n.classList.toggle('active', n.getAttribute('data-screen') === active);
    });
    if (document.body.classList.contains('edit-on') && window.__vjuEnableDrag) window.__vjuEnableDrag();
  }
  function openTab(key) {
    if (!document.querySelector('section[data-screen="' + key + '"]')) return;
    if (open.indexOf(key) < 0) open.push(key);
    active = key; render(); content.scrollTop = 0;
  }
  function closeTab(key) {
    var i = open.indexOf(key); if (i < 0) return;
    open.splice(i, 1);
    if (active === key) active = open[i] || open[i - 1] || open[open.length - 1] || null;
    if (!active && homeKey) { open = [homeKey]; active = homeKey; }
    render();
  }
  window.__vjuOpenTab = openTab;
  window.__vjuCloseTab = closeTab;   // dùng khi xoá 1 mục menu đang mở tab (edit mode)
  window.__vjuRender = render;       // dùng để đồng bộ lại tiêu đề tab/breadcrumb sau khi sửa menu (edit mode)

  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-close]');
    if (x) { e.preventDefault(); e.stopPropagation(); closeTab(x.getAttribute('data-close')); return; }
    var tab = e.target.closest('.tab-item');
    if (tab && tabbar.contains(tab)) { e.preventDefault(); active = tab.getAttribute('data-key'); render(); content.scrollTop = 0; return; }
    if (document.body.classList.contains('edit-on')) {
      // bấm nút sửa/xoá/thêm (item-ctrls, nav-add-row) → để phần "thêm/sửa/xoá menu" tự xử lý riêng
      if (e.target.closest('.item-ctrls, .nav-add-row')) return;
      // trong edit mode: bấm nhóm vẫn cho bung/thu; bấm mục KHÔNG mở tab (để kéo-thả)
      var p0 = e.target.closest('.nav-parent');
      if (p0) { e.preventDefault(); accordion(p0); return; }
      if (e.target.closest('.nav-item[data-screen], .nav-child[data-screen]')) { e.preventDefault(); return; }
    }
    var nav = e.target.closest('[data-screen]');
    if (nav && nav.tagName !== 'SECTION') { e.preventDefault(); openTab(nav.getAttribute('data-screen')); return; }
    var parent = e.target.closest('.nav-parent');
    if (parent) { e.preventDefault(); accordion(parent); return; }
    var st = e.target.closest('.tab[data-tab]');
    if (st) {
      e.preventDefault();
      var group = st.closest('.tabs');
      group.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === st); });
      var host = group.parentElement, name = st.getAttribute('data-tab');
      host.querySelectorAll('[data-panel]').forEach(function (p) { p.style.display = (p.getAttribute('data-panel') === name) ? '' : 'none'; });
    }
  });
  function accordion(parent) {
    var willOpen = !parent.classList.contains('open');
    document.querySelectorAll('.nav-parent.open').forEach(function (p) { p.classList.remove('open'); });
    if (willOpen) parent.classList.add('open');
  }

  var first = homeSec || document.querySelector('section[data-screen]');
  if (first) { if (!homeKey) homeKey = first.getAttribute('data-screen'); openTab(first.getAttribute('data-screen')); }
})();

/* ============================== 2) EDIT MODE (kéo-thả tự chỉnh) ============================== */
(function () {
  var sidebar = document.querySelector('.sidebar');
  var topbar = document.querySelector('.topbar');
  var workarea = document.querySelector('.workarea');
  var content = document.querySelector('.content');
  if (!sidebar || !topbar || !workarea) return;

  var site = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
  var KEY_MENU = 'vju.edit.menu2.' + site;   // v2: lưu cả cây menu (label/icon/thêm/xoá), không chỉ thứ tự
  var KEY_BLK = 'vju.edit.blocks.' + site + '.';

  /* ---- helpers dùng chung: escape, đọc nhãn/icon "sạch" của 1 mục menu ---- */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function itemLabel(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('.ic,.caret,.badge-mini,.item-ctrls').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function itemIcon(el) { var ic = el.querySelector('.ic'); return ic ? ic.textContent.trim() : ''; }
  function itemBadge(el) { var b = el.querySelector('.badge-mini'); return b ? b.textContent.trim() : ''; }
  function ctrlHtml() {
    return '<span class="item-ctrls" draggable="false">' +
      '<button type="button" class="ic-edit" data-mact="edit" title="Sửa">✎</button>' +
      '<button type="button" class="ic-del" data-mact="del" title="Xoá">✕</button>' +
      '</span>';
  }
  function innerHtmlFor(kind, node) {
    var icon = node.icon ? '<span class="ic">' + escapeHtml(node.icon) + '</span>' : '';
    var lbl = '<span class="lbl">' + escapeHtml(node.label) + '</span>';
    var badge = node.badge ? '<span class="badge-mini">' + escapeHtml(node.badge) + '</span>' : '';
    if (kind === 'divider') return lbl + ctrlHtml();
    if (kind === 'parent') return icon + lbl + '<span class="caret">▸</span>' + ctrlHtml();
    return icon + lbl + badge + ctrlHtml();
  }

  /* ---- trang "rỗng" tự tạo cho 1 mục menu mới thêm — chưa có nội dung thật ---- */
  function ensureSection(screen, label) {
    if (document.querySelector('section[data-screen="' + screen + '"]')) return;
    var sec = document.createElement('section');
    sec.setAttribute('data-screen', screen);
    sec.setAttribute('data-title', label);
    sec.setAttribute('data-stub', '1');
    sec.style.display = 'none';
    sec.innerHTML =
      '<div class="page-head"><div><div class="crumbs">' + escapeHtml(label) + '</div><h1>' + escapeHtml(label) + '</h1></div></div>' +
      '<div class="card"><div class="card-b"><p class="muted">Đây là mục menu bạn vừa tự thêm ở <b>chế độ chỉnh sửa</b> — trang minh hoạ, chưa có nội dung thật. Khi triển khai thật, đội phát triển sẽ dựng màn hình tương ứng.</p></div></div>';
    if (content) content.appendChild(sec);
  }

  /* ---- đọc cây menu hiện tại từ DOM (dùng để lưu, và để lấy trạng thái mặc định lần đầu) ----
     Đệ quy tối đa 3 cấp: cấp 1 (con trực tiếp của sidebar: nhãn phân cách / mục đơn / nhóm),
     cấp 2 (con trong 1 nhóm cấp 1: mục đơn hoặc nhóm con), cấp 3 (con trong 1 nhóm cấp 2: chỉ mục đơn). */
  function serializeContainer(container) {
    var out = [];
    Array.prototype.forEach.call(container.children, function (n) {
      if (n.classList.contains('nav-add-row')) return;
      if (n.classList.contains('nav-item') || n.classList.contains('nav-child')) {
        out.push({ type: 'item', screen: n.getAttribute('data-screen'), label: itemLabel(n), icon: itemIcon(n), badge: itemBadge(n) });
      } else if (n.classList.contains('nav-parent')) {
        var next = n.nextElementSibling;
        var kids = (next && next.classList.contains('nav-children')) ? serializeContainer(next) : [];
        out.push({ type: 'parent', label: itemLabel(n), icon: itemIcon(n), open: n.classList.contains('open'), children: kids });
      } else if (n.classList.contains('nav-group')) {
        out.push({ type: 'divider', label: itemLabel(n) });
      }
    });
    return out;
  }
  function serializeSidebar() { return serializeContainer(sidebar); }
  function saveMenu() { try { localStorage.setItem(KEY_MENU, JSON.stringify(serializeSidebar())); } catch (e) {} }

  /* ---- dựng DOM cho từng loại node ---- */
  function buildItemEl(node, isChild) {
    var a = document.createElement('a');
    a.className = isChild ? 'nav-child' : 'nav-item';
    a.setAttribute('data-screen', node.screen);
    a.innerHTML = innerHtmlFor(isChild ? 'child' : 'item', node);
    ensureSection(node.screen, node.label);
    return a;
  }
  function buildDividerEl(node) {
    var d = document.createElement('div');
    d.className = 'nav-group';
    d.innerHTML = innerHtmlFor('divider', node);
    return d;
  }

  /* ---- tìm nút "+ ..." đầu tiên trong 1 container (để chèn mục mới ngay trước nó) ---- */
  function firstAddRow(container) {
    for (var i = 0; i < container.children.length; i++) {
      if (container.children[i].classList.contains('nav-add-row')) return container.children[i];
    }
    return null;
  }

  /* ---- các nút "+ Thêm..." cuối 1 container, tuỳ cấp (level) của chính container đó -----
     cấp 1 = sidebar (mục đơn / nhóm / nhãn phân cách)
     cấp 2 = trong 1 nhóm cấp 1 (mục đơn / nhóm con — tối đa lồng 1 cấp)
     cấp 3 = trong 1 nhóm cấp 2 (chỉ mục đơn — không cho lồng thêm nhóm) */
  function buildAddRows(level) {
    var rows = [];
    var itemBtn = document.createElement('button');
    itemBtn.type = 'button'; itemBtn.className = 'nav-add-row'; itemBtn.setAttribute('data-madd', 'item');
    itemBtn.textContent = level === 1 ? '+ Thêm mục (ngoài nhóm)' : '+ Thêm mục';
    rows.push(itemBtn);
    if (level < 3) {
      var groupBtn = document.createElement('button');
      groupBtn.type = 'button'; groupBtn.className = 'nav-add-row'; groupBtn.setAttribute('data-madd', 'group');
      groupBtn.textContent = level === 1 ? '+ Thêm nhóm mới' : '+ Thêm nhóm con';
      rows.push(groupBtn);
    }
    if (level === 1) {
      var divBtn = document.createElement('button');
      divBtn.type = 'button'; divBtn.className = 'nav-add-row'; divBtn.setAttribute('data-madd', 'divider');
      divBtn.textContent = '+ Thêm nhãn phân cách';
      rows.push(divBtn);
    }
    return rows;
  }

  /* ---- dựng đệ quy 1 cây node vào 1 container (sidebar cấp 1, hoặc 1 div.nav-children cấp 2/3) ---- */
  function appendNodesTo(container, nodes, level) {
    container.setAttribute('data-level', String(level));
    (nodes || []).forEach(function (node) {
      if (node.type === 'item') {
        container.appendChild(buildItemEl(node, level > 1));
      } else if (node.type === 'parent') {
        var p = document.createElement('button');
        p.type = 'button';
        p.className = 'nav-parent' + (node.open ? ' open' : '');
        p.innerHTML = innerHtmlFor('parent', node);
        var c = document.createElement('div');
        c.className = 'nav-children';
        container.appendChild(p);
        container.appendChild(c);
        appendNodesTo(c, node.children || [], level + 1);
      } else if (node.type === 'divider') {
        container.appendChild(buildDividerEl(node));
      }
    });
    buildAddRows(level).forEach(function (btn) { container.appendChild(btn); });
  }

  /* ---- dựng lại toàn bộ sidebar từ 1 cây menu (đã lưu hoặc lấy từ DOM mặc định) ---- */
  function rebuildSidebar(tree) {
    sidebar.innerHTML = '';
    appendNodesTo(sidebar, tree, 1);
  }

  /* ---- serialize / khôi phục BỐ CỤC KHỐI từng màn hình ---- */
  function blocksOf(sec) { return Array.prototype.filter.call(sec.children, function (ch) { return !ch.classList.contains('page-head'); }); }
  function tagBlocks(sec) { var i = 0; blocksOf(sec).forEach(function (b) { if (!b.hasAttribute('data-blk')) b.setAttribute('data-blk', 'b' + (i)); i++; }); }
  function saveBlocks(sec) { try { localStorage.setItem(KEY_BLK + sec.getAttribute('data-screen'), JSON.stringify(blocksOf(sec).map(function (b) { return b.getAttribute('data-blk'); }))); } catch (e) {} }
  function applyBlocks() {
    document.querySelectorAll('section[data-screen]').forEach(function (sec) {
      tagBlocks(sec);
      var raw; try { raw = localStorage.getItem(KEY_BLK + sec.getAttribute('data-screen')); } catch (e) {}
      if (!raw) return;
      var order = JSON.parse(raw);
      order.forEach(function (id) { var el = sec.querySelector('[data-blk="' + id + '"]'); if (el) sec.appendChild(el); });
    });
  }

  /* ---- bật/tắt draggable ---- */
  function enableDrag() {
    sidebar.querySelectorAll('.nav-item[data-screen], .nav-child[data-screen]').forEach(function (el) { el.setAttribute('draggable', 'true'); });
    document.querySelectorAll('section[data-screen]').forEach(function (sec) { tagBlocks(sec); blocksOf(sec).forEach(function (b) { b.setAttribute('draggable', 'true'); }); });
  }
  function disableDrag() {
    sidebar.querySelectorAll('[draggable]').forEach(function (el) { el.removeAttribute('draggable'); });
    if (content) content.querySelectorAll('[draggable]').forEach(function (el) { el.removeAttribute('draggable'); });
  }
  window.__vjuEnableDrag = enableDrag;

  /* ---- drag handlers ---- */
  var dragEl = null;
  function isMenu(el) { return el && (el.classList.contains('nav-item') || el.classList.contains('nav-child')); }
  function isBlock(el) { return el && el.hasAttribute('data-blk'); }
  document.addEventListener('dragstart', function (e) {
    if (!document.body.classList.contains('edit-on')) return;
    var el = e.target.closest('[draggable="true"]'); if (!el) return;
    dragEl = el; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'x'); } catch (x) {}
  });
  document.addEventListener('dragend', function () { if (dragEl) dragEl.classList.remove('dragging'); dragEl = null; });
  document.addEventListener('dragover', function (e) {
    if (!dragEl) return;
    if (isMenu(dragEl)) {
      var grp = e.target.closest('.nav-children');
      var over = e.target.closest('.nav-child[data-screen], .nav-item[data-screen]');
      if (over && over !== dragEl) {
        e.preventDefault();
        var r = over.getBoundingClientRect();
        over.parentNode.insertBefore(dragEl, (e.clientY - r.top) > r.height / 2 ? over.nextSibling : over);
      } else if (grp && dragEl.classList.contains('nav-child') && !grp.contains(dragEl)) {
        e.preventDefault(); grp.appendChild(dragEl);
      }
    } else if (isBlock(dragEl)) {
      var ob = e.target.closest('[data-blk]');
      if (ob && ob !== dragEl && ob.parentNode === dragEl.parentNode) {
        e.preventDefault();
        var rb = ob.getBoundingClientRect();
        ob.parentNode.insertBefore(dragEl, (e.clientY - rb.top) > rb.height / 2 ? ob.nextSibling : ob);
      }
    }
  });
  document.addEventListener('drop', function (e) {
    if (!dragEl) return; e.preventDefault();
    if (isMenu(dragEl)) saveMenu();
    else if (isBlock(dragEl)) { var sec = dragEl.closest('section[data-screen]'); if (sec) saveBlocks(sec); }
  });

  /* ---- thêm / sửa / xoá 1 mục menu (chỉ hoạt động khi edit-on) ---- */
  var mpPop = null;
  function closeMenuForm() { if (mpPop) { mpPop.remove(); mpPop = null; } document.removeEventListener('mousedown', outsideMenuForm, true); }
  function outsideMenuForm(e) { if (mpPop && !mpPop.contains(e.target)) closeMenuForm(); }
  function showMenuForm(opts) {
    closeMenuForm();
    var pop = document.createElement('div'); pop.className = 'menu-pop';
    pop.innerHTML = '<div class="mp-h">' + escapeHtml(opts.title) + '</div>' +
      '<div class="mp-row"><label>Nhãn hiển thị</label><input class="input" data-f="label" type="text" placeholder="VD: Đổi lịch thi"></div>' +
      (opts.showIcon ? '<div class="mp-row"><label>Icon (không bắt buộc)</label><input class="input" data-f="icon" type="text" style="width:70px" placeholder="📌"></div>' : '') +
      '<div class="mp-actions"><button type="button" class="btn sm" data-mp="cancel">Hủy</button><button type="button" class="btn sm primary" data-mp="save">Lưu</button></div>';
    document.body.appendChild(pop);
    var w = 260;
    pop.style.left = Math.max(8, Math.min(opts.x - w, window.innerWidth - w - 8)) + 'px';
    pop.style.top = Math.max(8, Math.min(opts.y, window.innerHeight - 180)) + 'px';
    var li = pop.querySelector('[data-f="label"]'); li.value = opts.label || '';
    var ii = pop.querySelector('[data-f="icon"]'); if (ii) ii.value = opts.icon || '';
    mpPop = pop;
    function doSave() {
      var nl = li.value.trim();
      if (!nl) { li.focus(); return; }
      opts.onSave(nl, ii ? ii.value.trim() : '');
      closeMenuForm();
    }
    pop.addEventListener('click', function (e) {
      if (e.target.closest('[data-mp="cancel"]')) closeMenuForm();
      else if (e.target.closest('[data-mp="save"]')) doSave();
    });
    pop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      else if (e.key === 'Escape') closeMenuForm();
    });
    setTimeout(function () { li.focus(); document.addEventListener('mousedown', outsideMenuForm, true); }, 0);
  }

  function removeItemNode(el) {
    var screen = el.getAttribute('data-screen');
    if (window.__vjuCloseTab) window.__vjuCloseTab(screen);
    var sec = document.querySelector('section[data-screen="' + screen + '"]');
    if (sec) sec.remove();   // xoá mục menu thì xoá luôn nội dung (section) gắn với nó — kể cả nội dung thật, không chỉ trang stub tự thêm
    el.remove();
  }

  function handleEditNode(btn) {
    var host = btn.closest('.nav-item, .nav-parent, .nav-child, .nav-group');
    if (!host) return;
    var kind = host.classList.contains('nav-item') ? 'item'
      : host.classList.contains('nav-child') ? 'child'
        : host.classList.contains('nav-parent') ? 'parent' : 'divider';
    var r = host.getBoundingClientRect();
    showMenuForm({
      title: 'Sửa mục menu', label: itemLabel(host), icon: itemIcon(host), showIcon: kind !== 'divider',
      x: r.right, y: r.top,
      onSave: function (nl, ni) {
        host.innerHTML = innerHtmlFor(kind, { label: nl, icon: ni });
        if (kind === 'item' || kind === 'child') {
          var screen = host.getAttribute('data-screen');
          var sec = document.querySelector('section[data-screen="' + screen + '"]');
          if (sec) {
            sec.setAttribute('data-title', nl);
            if (sec.getAttribute('data-stub') === '1') {
              var h1 = sec.querySelector('.page-head h1'), cr = sec.querySelector('.page-head .crumbs');
              if (h1) h1.textContent = nl;
              if (cr) cr.textContent = nl;
            }
          }
        }
        saveMenu();
        if (window.__vjuRender) window.__vjuRender();
      }
    });
  }

  function handleDeleteNode(btn) {
    var host = btn.closest('.nav-item, .nav-parent, .nav-child, .nav-group');
    if (!host) return;
    if (host.classList.contains('nav-parent')) {
      var childrenDiv = host.nextElementSibling;
      var kids = childrenDiv && childrenDiv.classList.contains('nav-children') ? Array.prototype.slice.call(childrenDiv.querySelectorAll('.nav-child[data-screen]')) : [];
      if (!confirm('Xoá nhóm "' + itemLabel(host) + '" và ' + kids.length + ' mục con? Nội dung (trang) của các mục con cũng sẽ bị xoá.')) return;
      kids.forEach(removeItemNode);
      if (childrenDiv) childrenDiv.remove();
      host.remove();
    } else if (host.classList.contains('nav-group')) {
      if (!confirm('Xoá dòng phân cách "' + itemLabel(host) + '"?')) return;
      host.remove();
    } else {
      if (!confirm('Xoá mục "' + itemLabel(host) + '"? Nội dung (trang) gắn với mục này cũng sẽ bị xoá.')) return;
      removeItemNode(host);
    }
    saveMenu();
    if (window.__vjuRender) window.__vjuRender();
  }

  function handleAddNode(btn) {
    var kind = btn.getAttribute('data-madd');
    var container = btn.parentElement;
    var level = parseInt(container.getAttribute('data-level'), 10) || 1;
    var addRow = firstAddRow(container);
    var r = btn.getBoundingClientRect();
    if (kind === 'divider') {
      showMenuForm({
        title: 'Thêm nhãn phân cách (cấp 1)', label: '', showIcon: false, x: r.right, y: r.top,
        onSave: function (nl) {
          container.insertBefore(buildDividerEl({ label: nl }), addRow);
          saveMenu();
        }
      });
    } else if (kind === 'group') {
      showMenuForm({
        title: level === 1 ? 'Thêm nhóm menu (cấp 1)' : 'Thêm nhóm con (cấp 2)', label: '', icon: '📁', showIcon: true, x: r.right, y: r.top,
        onSave: function (nl, ni) {
          var p = document.createElement('button');
          p.type = 'button'; p.className = 'nav-parent open';
          p.innerHTML = innerHtmlFor('parent', { label: nl, icon: ni });
          var c = document.createElement('div'); c.className = 'nav-children';
          container.insertBefore(p, addRow);
          container.insertBefore(c, addRow);
          appendNodesTo(c, [], level + 1);
          saveMenu();
        }
      });
    } else {
      var isChild = level > 1;
      showMenuForm({
        title: 'Thêm mục menu (cấp ' + level + ')', label: '', icon: isChild ? '' : '📌', showIcon: true, x: r.right, y: r.top,
        onSave: function (nl, ni) {
          var id = 'sv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          var el = buildItemEl({ screen: id, label: nl, icon: ni }, isChild);
          container.insertBefore(el, addRow);
          saveMenu();
        }
      });
    }
  }

  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('edit-on')) return;
    var editBtn = e.target.closest('.item-ctrls .ic-edit');
    if (editBtn) { e.preventDefault(); e.stopPropagation(); handleEditNode(editBtn); return; }
    var delBtn = e.target.closest('.item-ctrls .ic-del');
    if (delBtn) { e.preventDefault(); e.stopPropagation(); handleDeleteNode(delBtn); return; }
    var addBtn = e.target.closest('.nav-add-row');
    if (addBtn) { e.preventDefault(); e.stopPropagation(); handleAddNode(addBtn); return; }
  });

  /* ---- toolbar + toggle ---- */
  var toggle = document.createElement('button');
  toggle.className = 'iconbtn'; toggle.title = 'Chế độ chỉnh sửa giao diện'; toggle.textContent = '✏️';
  topbar.insertBefore(toggle, topbar.querySelector('.user') || null);

  var bar = document.createElement('div');
  bar.className = 'edit-toolbar';
  bar.innerHTML = '<b>✎ Chế độ chỉnh sửa</b>' +
    '<span class="et-hint">Kéo-thả để sắp xếp menu/khối nội dung · trỏ vào 1 mục để hiện nút ✎ sửa · ✕ xoá · bấm "+ Thêm..." ở cuối mỗi nhóm/sidebar để thêm mục mới · thay đổi lưu trên máy bạn</span>' +
    '<span class="et-sp"></span>' +
    '<button class="btn sm" data-edit="reset">↺ Đặt lại</button>' +
    '<button class="btn sm" data-edit="export">⬇ Xuất bố cục (JSON)</button>' +
    '<button class="btn sm primary" data-edit="done">✓ Xong</button>';
  workarea.insertBefore(bar, workarea.firstChild);

  function setEdit(on) {
    document.body.classList.toggle('edit-on', on);
    if (on) enableDrag(); else disableDrag();
  }
  toggle.addEventListener('click', function () { setEdit(!document.body.classList.contains('edit-on')); });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-edit]'); if (!b) return;
    var a = b.getAttribute('data-edit');
    if (a === 'done') setEdit(false);
    else if (a === 'reset') {
      try { localStorage.removeItem(KEY_MENU); Object.keys(localStorage).forEach(function (k) { if (k.indexOf(KEY_BLK) === 0) localStorage.removeItem(k); }); } catch (x) {}
      location.reload();
    } else if (a === 'export') {
      var data = { site: site, menu: serializeSidebar(), blocks: {} };
      document.querySelectorAll('section[data-screen]').forEach(function (sec) { data.blocks[sec.getAttribute('data-screen')] = blocksOf(sec).map(function (x) { return x.getAttribute('data-blk'); }); });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = 'vju-layout-' + site + '.json'; a2.click();
    }
  });

  /* ---- dựng sidebar: dùng cây đã lưu (nếu có) hoặc lấy nguyên trạng HTML gốc ---- */
  (function initSidebar() {
    var saved = null;
    try { var raw = localStorage.getItem(KEY_MENU); if (raw) saved = JSON.parse(raw); } catch (e) {}
    rebuildSidebar(saved || serializeSidebar());
    if (window.__vjuRender) window.__vjuRender();
  })();
  applyBlocks();
})();

/* ============================== 3) RESPONSIVE: hamburger / drawer / thu gọn ============================== */
(function () {
  var topbar = document.querySelector('.topbar');
  var sidebar = document.querySelector('.sidebar');
  if (!topbar || !sidebar) return;

  var hb = document.createElement('button');
  hb.className = 'iconbtn hamb'; hb.title = 'Thu gọn / mở thanh điều hướng'; hb.textContent = '☰';
  topbar.insertBefore(hb, topbar.firstChild);

  var ov = document.createElement('div'); ov.className = 'nav-overlay'; document.body.appendChild(ov);
  function mobile() { return window.matchMedia('(max-width: 1024px)').matches; }
  function setTitles() {
    var on = document.body.classList.contains('nav-collapsed');
    sidebar.querySelectorAll('.nav-item, .nav-parent').forEach(function (n) {
      if (on) { var c = n.cloneNode(true); c.querySelectorAll('.ic,.caret,.badge-mini').forEach(function (x) { x.remove(); }); n.title = c.textContent.trim(); }
      else n.removeAttribute('title');
    });
  }
  hb.addEventListener('click', function () {
    if (mobile()) document.body.classList.toggle('nav-open');
    else { document.body.classList.toggle('nav-collapsed'); setTitles(); }
  });
  ov.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  sidebar.addEventListener('click', function (e) {
    if (mobile() && e.target.closest('.nav-item[data-screen], .nav-child[data-screen]')) document.body.classList.remove('nav-open');
  });
  window.addEventListener('resize', function () {
    if (mobile()) document.body.classList.remove('nav-collapsed');
    else document.body.classList.remove('nav-open');
  });
})();

/* ============================== 3a) RESPONSIVE: gom bộ chuyển site thành menu "Site ▾" ==============================
   Ở màn ≤1024px, dải .site-switch (7 liên kết, ~536px) bị CSS ẩn đi và thay bằng 1 nút gọn.
   Nút + menu do JS dựng nên KHÔNG phải sửa HTML từng trang; menu là position:fixed nên không
   làm trang tràn ngang. Mọi site vẫn tới được. Trang nào không có .site-switch thì thoát êm. */
(function () {
  var sw = document.querySelector('.site-switch');
  if (!sw) return;
  var links = sw.querySelectorAll('a');
  if (!links.length) return;

  var cur = sw.querySelector('a.active');
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn site-menu-btn';
  btn.title = 'Chuyển site';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  var txt = document.createElement('span');
  txt.className = 'smb-txt';
  txt.textContent = cur ? cur.textContent.trim() : 'Site';
  var shortTxt = document.createElement('span');       /* nhãn rút gọn cho điện thoại dọc */
  shortTxt.className = 'smb-short';
  shortTxt.textContent = 'Site';
  var caret = document.createElement('span');
  caret.className = 'smb-caret';
  caret.textContent = '▾';
  btn.appendChild(txt); btn.appendChild(shortTxt); btn.appendChild(caret);
  sw.parentNode.insertBefore(btn, sw);

  var pop = document.createElement('div');
  pop.className = 'site-pop';
  pop.hidden = true;
  Array.prototype.forEach.call(links, function (a) {
    var it = document.createElement('a');
    it.setAttribute('href', a.getAttribute('href') || '#');
    it.textContent = a.textContent.trim();
    if (a.classList.contains('active')) it.className = 'active';
    pop.appendChild(it);
  });
  document.body.appendChild(pop);

  function place() {
    var r = btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    pop.style.top = Math.round(r.bottom + 4) + 'px';
    pop.style.left = '0px';                       /* đo bề rộng thật trước khi neo */
    var w = pop.offsetWidth || 180;
    var left = Math.min(r.left, vw - w - 8);
    pop.style.left = Math.max(8, Math.round(left)) + 'px';
  }
  function openPop() { pop.hidden = false; place(); btn.setAttribute('aria-expanded', 'true'); }
  function closePop() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (pop.hidden) openPop(); else closePop();
  });
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) closePop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) closePop();
  });
  window.addEventListener('resize', function () { if (!pop.hidden) place(); });
  window.addEventListener('scroll', function () { if (!pop.hidden) closePop(); }, true);
})();

/* ============================== 3b) BỘ LỌC TRA CỨU (filter-gate): phải chọn đủ bộ lọc bắt buộc rồi bấm mới hiện
   danh sách bên dưới — dùng cho các màn tra cứu 1 lớp/1 đối tượng trong rất nhiều lựa chọn (Nhập điểm TP/CK của
   giảng viên, Xem điểm của chuyên viên...). Markup: .filter-gate chứa các .fg-row (mỗi ô lọc bắt buộc đặt
   [data-fg-field] + required) và 1 nút [data-fg-submit]; theo sau .filter-gate là [data-fg-empty] (trạng thái
   rỗng) rồi tới [data-fg-result] (nội dung danh sách thật, mặc định ẩn). Áp dụng cho mọi section có markup này,
   không cần sửa gì thêm ở app.js khi thêm màn mới. ============================== */
(function () {
  var gates = document.querySelectorAll('.filter-gate[data-fg]');
  gates.forEach(function (gate) {
    var empty = gate.nextElementSibling;
    if (!empty || !empty.hasAttribute('data-fg-empty')) return;
    var result = empty.nextElementSibling;
    if (!result || !result.hasAttribute('data-fg-result')) return;
    var submitBtn = gate.querySelector('[data-fg-submit]');
    var fields = Array.prototype.slice.call(gate.querySelectorAll('[data-fg-field]'));
    if (!submitBtn || !fields.length) return;

    function clearInvalid(field) {
      var row = field.closest('.fg-row');
      if (row) row.classList.remove('fg-invalid');
    }
    fields.forEach(function (f) { f.addEventListener('change', function () { clearInvalid(f); }); });

    submitBtn.addEventListener('click', function () {
      var ok = true;
      fields.forEach(function (f) {
        var row = f.closest('.fg-row');
        var valid = f.value !== '';
        if (row) row.classList.toggle('fg-invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        var firstBad = gate.querySelector('.fg-row.fg-invalid [data-fg-field]');
        if (firstBad) firstBad.focus();
        return;
      }
      empty.style.display = 'none';
      result.style.display = '';
    });
  });
})();

/* ============================== 4) GIAO DIỆN: phông/cỡ/kiểu/màu + đổi màu từng phần tử ============================== */
(function () {
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;
  var site = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
  var KEY_APPR = 'vju.appearance';            // toàn hệ thống (chung mọi site)
  var KEY_ELEM = 'vju.elem.' + site;          // màu theo phần tử (theo từng site)
  var root = document.documentElement.style;
  var DEF_FONT = '"Segoe UI", system-ui, -apple-system, "Noto Sans", Arial, sans-serif';

  /* ----- tiện ích màu ----- */
  function h2hsl(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join(''); var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2, s = 0, hh = 0; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4); hh *= 60; } return [hh, s * 100, l * 100]; }
  function hsl2h(hh, s, l) { s /= 100; l /= 100; var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0; if (hh < 60) { r = c; g = x; } else if (hh < 120) { r = x; g = c; } else if (hh < 180) { g = c; b = x; } else if (hh < 240) { g = x; b = c; } else if (hh < 300) { r = x; b = c; } else { r = c; b = x; } function f(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); } return '#' + f(r) + f(g) + f(b); }
  function shade(hex, dl) { var a = h2hsl(hex); return hsl2h(a[0], a[1], Math.max(0, Math.min(100, a[2] + dl))); }
  function tint(hex, l) { var a = h2hsl(hex); return hsl2h(a[0], Math.min(a[1], 70), l); }

  function applyAppr(a) {
    root.setProperty('--font-sans', a.font || DEF_FONT);
    var s = a.size || 13; root.setProperty('--fz', s + 'px'); root.setProperty('--fz-sm', (s - 1) + 'px'); root.setProperty('--fz-xs', (s - 2) + 'px');
    if (a.kieu === 'gon') { document.body.style.letterSpacing = '-.2px'; document.body.style.lineHeight = '1.32'; }
    else if (a.kieu === 'thoang') { document.body.style.letterSpacing = '.2px'; document.body.style.lineHeight = '1.55'; }
    else { document.body.style.letterSpacing = ''; document.body.style.lineHeight = ''; }
    document.body.style.fontWeight = a.weight || '';
    var p = a.primary || '#ab2523';
    root.setProperty('--primary', p); root.setProperty('--primary-600', shade(p, -8)); root.setProperty('--primary-700', shade(p, -15)); root.setProperty('--primary-50', tint(p, 96)); root.setProperty('--primary-100', tint(p, 90));
    root.setProperty('--ink', a.ink || '#1f2328');
    root.setProperty('--bg', a.bg || '#f0f1f3');
    if (a.thbg) root.setProperty('--th-bg', a.thbg);
    if (a.thfg) root.setProperty('--th-fg', a.thfg);
    if (a.sidebar) root.setProperty('--sidebar-bg', a.sidebar);
    if (a.topbar) root.setProperty('--topbar-bg', a.topbar);
    if (a.radius != null) root.setProperty('--radius', a.radius + 'px');
    if (a.gridw) root.setProperty('--grid-w', a.gridw + 'px');
    if (a.density === 'gon') { root.setProperty('--row-h', '26px'); root.setProperty('--cell-py', '3px'); }
    else if (a.density === 'thoang') { root.setProperty('--row-h', '36px'); root.setProperty('--cell-py', '8px'); }
    else if (a.density === 'vua') { root.setProperty('--row-h', '30px'); root.setProperty('--cell-py', '5px'); }
  }
  var appr = {}; try { appr = JSON.parse(localStorage.getItem(KEY_APPR) || '{}'); } catch (e) {}
  applyAppr(appr);

  /* ----- nút mở + panel ----- */
  var openBtn = document.createElement('button');
  openBtn.className = 'iconbtn'; openBtn.title = 'Giao diện hệ thống (phông, cỡ, màu)'; openBtn.textContent = '🎨';
  topbar.insertBefore(openBtn, topbar.querySelector('.user') || null);

  var panel = document.createElement('div'); panel.className = 'appr-panel';
  panel.innerHTML =
    '<div class="appr-h">🎨 Giao diện hệ thống <button class="close" title="Đóng">✕</button></div>' +
    '<div class="appr-b">' +
    `<div class="appr-row"><label>Phông chữ</label><select class="input" data-a="font">
        <optgroup label="Sans-serif">
          <option value='"Segoe UI", system-ui, -apple-system, "Noto Sans", Arial, sans-serif'>Hệ thống (Segoe UI)</option>
          <option value='system-ui, "Segoe UI", Roboto, Arial, sans-serif'>Sans hiện đại (system-ui)</option>
          <option value='Arial, Helvetica, sans-serif'>Arial / Helvetica</option>
          <option value='Tahoma, Geneva, sans-serif'>Tahoma</option>
          <option value='Verdana, Geneva, sans-serif'>Verdana</option>
          <option value='"Trebuchet MS", Tahoma, sans-serif'>Trebuchet MS</option>
          <option value='Calibri, Candara, Segoe, sans-serif'>Calibri</option>
          <option value='"Noto Sans", "Segoe UI", sans-serif'>Noto Sans</option>
        </optgroup>
        <optgroup label="Serif">
          <option value='Georgia, "Times New Roman", serif'>Georgia</option>
          <option value='"Times New Roman", Times, serif'>Times New Roman</option>
          <option value='Cambria, Georgia, serif'>Cambria</option>
          <option value='"Palatino Linotype", "Book Antiqua", Palatino, serif'>Palatino</option>
          <option value='Garamond, Baskerville, serif'>Garamond</option>
        </optgroup>
        <optgroup label="Đơn cách (mono)">
          <option value='Consolas, "SF Mono", Menlo, monospace'>Consolas</option>
          <option value='"Courier New", Courier, monospace'>Courier New</option>
        </optgroup>
      </select></div>` +
    '<div class="appr-row"><label>Cỡ chữ gốc</label><select class="input" data-a="size"><option value="10">10 (rất nhỏ)</option><option value="11">11</option><option value="12">12 (nhỏ)</option><option value="13">13 (vừa)</option><option value="14">14 (lớn)</option><option value="15">15</option><option value="16">16 (rất lớn)</option><option value="17">17</option><option value="18">18</option><option value="20">20</option></select></div>' +
    '<div class="appr-row"><label>Kiểu chữ</label><select class="input" data-a="kieu"><option value="thuong">Thường</option><option value="gon">Gọn (sát)</option><option value="thoang">Thoáng (giãn)</option></select></div>' +
    '<div class="appr-row"><label>Độ đậm chữ</label><select class="input" data-a="weight"><option value="400">Thường (400)</option><option value="500">Vừa (500)</option></select></div>' +
    '<div class="appr-row"><label>Màu nhấn (chủ đạo)</label><div class="swatch-pick"><input type="color" data-a="primary"><span class="appr-note">Đỏ VJU mặc định</span></div></div>' +
    '<div class="appr-row"><label>Màu chữ</label><div class="swatch-pick"><input type="color" data-a="ink"></div></div>' +
    '<div class="appr-row"><label>Màu nền</label><div class="swatch-pick"><input type="color" data-a="bg"></div></div>' +
    '<hr style="border:0;border-top:1px solid var(--line);margin:2px 0">' +
    '<div class="appr-row"><label>Màu nền header bảng</label><div class="swatch-pick"><input type="color" data-a="thbg"></div></div>' +
    '<div class="appr-row"><label>Màu chữ header bảng</label><div class="swatch-pick"><input type="color" data-a="thfg"></div></div>' +
    '<div class="appr-row"><label>Màu nền sidebar</label><div class="swatch-pick"><input type="color" data-a="sidebar"></div></div>' +
    '<div class="appr-row"><label>Màu nền thanh trên</label><div class="swatch-pick"><input type="color" data-a="topbar"></div></div>' +
    '<div class="appr-row"><label>Bo góc</label><select class="input" data-a="radius"><option value="0">Vuông (0)</option><option value="2">2px</option><option value="4">4px</option><option value="5">5px</option><option value="6">6px</option><option value="8">8px</option><option value="10">10px</option><option value="12">12px</option></select></div>' +
    '<div class="appr-row"><label>Độ dày kẻ bảng</label><select class="input" data-a="gridw"><option value="1">Mảnh (1px)</option><option value="1.5">Vừa (1.5px)</option><option value="2">Dày (2px)</option></select></div>' +
    '<div class="appr-row"><label>Mật độ dòng bảng</label><select class="input" data-a="density"><option value="gon">Gọn</option><option value="vua">Vừa</option><option value="thoang">Thoáng</option></select></div>' +
    '<hr style="border:0;border-top:1px solid var(--line);margin:2px 0">' +
    '<div class="appr-row"><label>Tùy biến theo phần tử</label><button class="btn sm" data-elem-toggle>🎯 Bật/tắt sửa màu từng phần tử</button><span class="appr-note">Bật rồi bấm vào một phần tử bất kỳ trong trang để đổi màu chữ/nền của riêng nó.</span></div>' +
    '<div class="appr-actions"><button class="btn sm" data-appr="reset">↺ Đặt lại</button><button class="btn sm" data-appr="export">⬇ Xuất theme (JSON)</button></div>' +
    '</div>';
  document.body.appendChild(panel);

  function fillCtl() {
    panel.querySelector('[data-a="font"]').value = appr.font || DEF_FONT;
    panel.querySelector('[data-a="size"]').value = appr.size || 13;
    panel.querySelector('[data-a="kieu"]').value = appr.kieu || 'thuong';
    panel.querySelector('[data-a="weight"]').value = appr.weight || '400';
    panel.querySelector('[data-a="primary"]').value = appr.primary || '#ab2523';
    panel.querySelector('[data-a="ink"]').value = appr.ink || '#1f2328';
    panel.querySelector('[data-a="bg"]').value = appr.bg || '#f0f1f3';
    panel.querySelector('[data-a="thbg"]').value = appr.thbg || '#f4f5f6';
    panel.querySelector('[data-a="thfg"]').value = appr.thfg || '#761817';
    panel.querySelector('[data-a="sidebar"]').value = appr.sidebar || '#ffffff';
    panel.querySelector('[data-a="topbar"]').value = appr.topbar || '#ffffff';
    panel.querySelector('[data-a="radius"]').value = (appr.radius != null ? appr.radius : 5);
    panel.querySelector('[data-a="gridw"]').value = appr.gridw || '1';
    panel.querySelector('[data-a="density"]').value = appr.density || 'vua';
  }
  fillCtl();
  openBtn.addEventListener('click', function () { panel.classList.toggle('open'); });
  panel.addEventListener('input', function (e) {
    var c = e.target.closest('[data-a]'); if (!c) return;
    var k = c.getAttribute('data-a'), v = c.value; if (k === 'size' || k === 'radius') v = parseInt(v, 10);
    appr[k] = v; applyAppr(appr);
    try { localStorage.setItem(KEY_APPR, JSON.stringify(appr)); } catch (x) {}
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest('.close')) { panel.classList.remove('open'); return; }
    var ap = e.target.closest('[data-appr]');
    if (ap) {
      var a = ap.getAttribute('data-appr');
      if (a === 'reset') { try { localStorage.removeItem(KEY_APPR); } catch (x) {} location.reload(); }
      else if (a === 'export') { dl({ appearance: appr }, 'vju-theme.json'); }
      return;
    }
    if (e.target.closest('[data-elem-toggle]')) toggleElem();
  });
  function dl(obj, name) { var b = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); }

  /* ----- đổi màu từng phần tử ----- */
  var elemMap = {}; try { elemMap = JSON.parse(localStorage.getItem(KEY_ELEM) || '{}'); } catch (e) {}
  function pathOf(el) { var sec = el.closest('section[data-screen]'); if (!sec) return null; var p = [], n = el; while (n && n !== sec) { var par = n.parentNode; p.unshift(Array.prototype.indexOf.call(par.children, n)); n = par; } return sec.getAttribute('data-screen') + '|' + p.join('.'); }
  function elByKey(k) { var parts = k.split('|'); var sec = document.querySelector('section[data-screen="' + parts[0] + '"]'); if (!sec) return null; var idx = parts[1] ? parts[1].split('.').map(Number) : []; var n = sec; for (var i = 0; i < idx.length; i++) { n = n.children[idx[i]]; if (!n) return null; } return n; }
  function applyElem() { Object.keys(elemMap).forEach(function (k) { var el = elByKey(k); if (!el) return; var s = elemMap[k]; if (s.color) el.style.color = s.color; if (s.bg) el.style.backgroundColor = s.bg; }); }
  applyElem();

  var elemOn = false, sel = null, pop = null;
  function toggleElem() { elemOn = !elemOn; document.body.classList.toggle('elem-edit', elemOn); if (!elemOn) closePop(); }
  function closePop() { if (pop) { pop.remove(); pop = null; } if (sel) { sel.classList.remove('elem-sel'); sel = null; } }
  function saveElem() { try { localStorage.setItem(KEY_ELEM, JSON.stringify(elemMap)); } catch (x) {} }

  document.addEventListener('click', function (e) {
    if (!elemOn) return;
    if (e.target.closest('.elem-pop') || e.target.closest('.appr-panel') || e.target.closest('.topbar') || e.target.closest('.sidebar') || e.target.closest('.tabbar') || e.target.closest('.edit-toolbar')) return;
    var el = e.target.closest('.content section *');
    if (el) { e.preventDefault(); e.stopPropagation(); selectEl(el, e.clientX, e.clientY); }
  }, true);

  function selectEl(el, x, y) {
    closePop(); sel = el; el.classList.add('elem-sel');
    var key = pathOf(el), cur = elemMap[key] || {};
    pop = document.createElement('div'); pop.className = 'elem-pop';
    pop.innerHTML =
      '<div class="row"><span>Màu chữ</span><input type="color" data-e="color" value="' + (cur.color || '#1f2328') + '"></div>' +
      '<div class="row"><span>Màu nền</span><input type="color" data-e="bg" value="' + (cur.bg || '#ffffff') + '"></div>' +
      '<div class="row"><span class="tt">&lt;' + el.tagName.toLowerCase() + '&gt;</span><span><button class="btn sm" data-e="clear">Xoá màu</button> <button class="btn sm" data-e="ok">Đóng</button></span></div>';
    document.body.appendChild(pop);
    pop.style.left = Math.min(x, window.innerWidth - 250) + 'px';
    pop.style.top = Math.min(y, window.innerHeight - 170) + 'px';
    pop.addEventListener('input', function (ev) {
      var c = ev.target.closest('[data-e]'); if (!c) return;
      var k = c.getAttribute('data-e'); elemMap[key] = elemMap[key] || {};
      if (k === 'color') { el.style.color = c.value; elemMap[key].color = c.value; }
      if (k === 'bg') { el.style.backgroundColor = c.value; elemMap[key].bg = c.value; }
      saveElem();
    });
    pop.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-e="clear"]')) { el.style.color = ''; el.style.backgroundColor = ''; delete elemMap[key]; saveElem(); closePop(); }
      else if (ev.target.closest('[data-e="ok"]')) closePop();
    });
  }
})();

/* ============================== 5) ĐĂNG KÝ HỌC PHẦN: giỏ đăng ký tương tác (trùng lịch động + hủy ĐK + học phí theo TC chỉ áp dụng học lại/cải thiện) ============================== */
(function () {
  var sec = document.querySelector('section[data-screen="dangky"]');
  if (!sec) return;

  var DON_GIA_TC = 550000; // giá minh hoạ / TC — chỉ tính cho "Học lại" và "Học cải thiện"; "Học mới" nằm trong học phí trọn gói theo kỳ, không tính thêm

  var table = sec.querySelector('#dk-table');
  var gioList = sec.querySelector('#dk-gio-list');
  var banner = sec.querySelector('#dk-banner');
  var soThayDoi = sec.querySelector('#dk-sothaydoi');
  var scopeLabel = sec.querySelector('#dk-dangchon');
  var footHp = sec.querySelector('#dk-tong-hp');
  var footTc = sec.querySelector('#dk-tong-tc');
  var phiWrap = sec.querySelector('#dk-phi-wrap');
  var footPhi = sec.querySelector('#dk-tong-phi');
  var modalBody = document.querySelector('#m-dangky-xacnhan #dk-modal-tbody');
  var modalFoot = document.querySelector('#m-dangky-xacnhan #dk-modal-tong');
  var xemLaiBtn = sec.querySelector('#dk-btn-xemlai');
  var ghiNhanBtn = document.querySelector('#m-dangky-xacnhan [data-act="ghinhan"]');
  if (!table || !gioList) return;

  function fmt(n) { return Math.round(n).toLocaleString('vi-VN'); }
  function allRows() { return Array.prototype.slice.call(table.querySelectorAll('tbody tr')); }
  function lockedRows() { return allRows().filter(function (r) { return r.classList.contains('dk-locked'); }); }
  function huyRows() { return lockedRows().filter(function (r) { return r.classList.contains('dk-huy'); }); }
  function giuNguyenRows() { return lockedRows().filter(function (r) { return !r.classList.contains('dk-huy'); }); }
  function checkedRows() {
    return allRows().filter(function (r) {
      var cb = r.querySelector('.dk-check');
      return !r.classList.contains('dk-locked') && cb && cb.checked;
    });
  }
  var LOAI_LABEL = { landau: 'Lần đầu', tudo: 'Tự do', hoclai: 'Học lại', caithien: 'Học cải thiện' };
  var LOAI_BADGE = { landau: 'b-muted', tudo: 'b-info', hoclai: 'b-warn', caithien: 'b-warn' };
  function loaiCua(r) { return r.getAttribute('data-loai') || 'landau'; }
  function loaiLabel(code) { return LOAI_LABEL[code] || 'Lần đầu'; }
  function coTinhPhi(code) { return code === 'hoclai' || code === 'caithien'; }

  /* ---- lịch học: "T4(1-3),T6(7-10)" -> [{day,s,e}] ---- */
  function parseLich(str) {
    if (!str) return [];
    return str.split(',').map(function (seg) {
      var m = seg.trim().match(/T(\d+)\((\d+)-(\d+)\)/);
      return m ? { day: +m[1], s: +m[2], e: +m[3] } : null;
    }).filter(Boolean);
  }
  function overlap(a, b) {
    return a.some(function (sa) { return b.some(function (sb) { return sa.day === sb.day && sa.s <= sb.e && sb.s <= sa.e; }); });
  }
  function activeSchedules(excludeRow) {
    var list = [];
    giuNguyenRows().concat(checkedRows()).forEach(function (r) {
      if (r === excludeRow) return;
      list.push.apply(list, parseLich(r.getAttribute('data-lich')));
    });
    return list;
  }
  /* danh sách các môn (đang giữ/đang chọn) có lịch chồng lấn với dòng r — để hiện popup "trùng với môn nào" */
  function conflictRows(r) {
    var mine = parseLich(r.getAttribute('data-lich'));
    return giuNguyenRows().concat(checkedRows()).filter(function (o) {
      return o !== r && overlap(mine, parseLich(o.getAttribute('data-lich')));
    });
  }

  /* ---- cập nhật trạng thái Mở / Hết chỗ / Trùng lịch cho các dòng chưa khoá (gán class CSS, không set background rải rác) ---- */
  function updateAvailability() {
    allRows().forEach(function (r) {
      if (r.classList.contains('dk-locked')) return;
      var cb = r.querySelector('.dk-check');
      var statusTd = r.children[9];
      var chonTd = r.children[0];
      var sisoTd = r.children[8];
      r.classList.remove('dk-conflict', 'dk-checked');
      chonTd.classList.remove('dk-full-cell');
      sisoTd.classList.remove('dk-full-cell');

      if (r.getAttribute('data-full') === '1') {
        cb.checked = false; cb.disabled = true;
        chonTd.classList.add('dk-full-cell');
        sisoTd.classList.add('dk-full-cell');
        statusTd.innerHTML = '<span class="badge b-danger">Hết chỗ</span>';
        return;
      }
      var conflicts = !cb.checked ? conflictRows(r) : [];
      var conflict = conflicts.length > 0;
      if (conflict) {
        cb.disabled = true;
        r.classList.add('dk-conflict');
        statusTd.innerHTML = '<span class="badge b-warn dk-conflict-badge" style="cursor:pointer" title="Bấm để xem trùng lịch với môn nào" data-conflicts="' +
          conflicts.map(function (o) { return o.getAttribute('data-hp'); }).join(',') + '">Trùng lịch</span>';
      } else {
        cb.disabled = false;
        if (cb.checked) r.classList.add('dk-checked');
        statusTd.innerHTML = '<span class="badge b-ok">Mở</span>';
      }
    });
  }

  function phiCuaMon(loai, tc) { return coTinhPhi(loai) ? tc * DON_GIA_TC : 0; }

  function render() {
    updateAvailability();

    // cập nhật ô Chọn (checkbox tick sẵn) + Trạng thái cho dòng đã khoá trên bảng môn học
    lockedRows().forEach(function (r) {
      var chonTd = r.children[0], statusTd = r.children[9];
      var isHuy = r.classList.contains('dk-huy');
      r.classList.toggle('dk-huy-row', isHuy);
      chonTd.innerHTML = '<input type="checkbox" class="dk-check-locked"' + (isHuy ? '' : ' checked') + '>';
      statusTd.innerHTML = isHuy ? '<span class="badge b-danger">Sẽ hủy</span>' : '<span class="badge b-muted">Đã ĐK</span>';
    });

    var huy = huyRows(), giu = giuNguyenRows(), checked = checkedRows();

    // ----- Giỏ đăng ký (bảng full-width bên dưới) — checkbox tick = giữ lại, bỏ tick = hủy/bỏ chọn -----
    var html = '';
    var stt = 0;
    function lichHienThi(r) { return r.getAttribute('data-lich').split(',').join(', '); }
    giu.forEach(function (r) {
      var ma = r.getAttribute('data-hp'), loai = loaiCua(r), diemcu = r.getAttribute('data-diemcu');
      stt++;
      html += '<tr><td class="center"><input type="checkbox" class="dk-cart-check" data-hp="' + ma + '" checked></td><td class="center">' + stt + '</td><td class="mono">' + ma + '</td><td>' + r.getAttribute('data-ten') + (diemcu ? ' <span class="muted xs">· Điểm cũ: ' + diemcu + '</span>' : '') + '</td>' +
        '<td class="center">' + r.getAttribute('data-tc') + '</td><td class="xs">' + lichHienThi(r) + '</td><td class="xs">' + (r.getAttribute('data-phong') || '—') + '</td>' +
        '<td class="num">—</td>' +
        '<td class="center"><span class="badge b-muted">Đã ĐK</span></td></tr>';
    });
    huy.forEach(function (r) {
      var ma = r.getAttribute('data-hp'), loai = loaiCua(r);
      stt++;
      html += '<tr><td class="center"><input type="checkbox" class="dk-cart-check" data-hp="' + ma + '"></td><td class="center">' + stt + '</td><td class="mono">' + ma + '</td><td>' + r.getAttribute('data-ten') + '</td>' +
        '<td class="center">' + r.getAttribute('data-tc') + '</td><td class="xs">' + lichHienThi(r) + '</td><td class="xs">' + (r.getAttribute('data-phong') || '—') + '</td>' +
        '<td class="num">—</td>' +
        '<td class="center"><span class="badge b-danger">Sẽ hủy</span></td></tr>';
    });
    checked.forEach(function (r) {
      var ma = r.getAttribute('data-hp'), tc = r.getAttribute('data-tc'), loai = loaiCua(r);
      var phi = phiCuaMon(loai, parseFloat(tc));
      var diemcu = r.getAttribute('data-diemcu');
      stt++;
      html += '<tr><td class="center"><input type="checkbox" class="dk-cart-check" data-hp="' + ma + '" checked></td><td class="center">' + stt + '</td><td class="mono">' + ma + '</td><td>' + r.getAttribute('data-ten') + (diemcu ? ' <span class="muted xs">· Điểm cũ: ' + diemcu + '</span>' : '') + '</td>' +
        '<td class="center">' + tc + '</td><td class="xs">' + lichHienThi(r) + '</td><td class="xs">' + (r.getAttribute('data-phong') || '—') + '</td>' +
        '<td class="num">' + (phi > 0 ? fmt(phi) + 'đ' : '—') + '</td>' +
        '<td class="center"><span class="badge b-warn">Chưa ghi nhận</span></td></tr>';
    });
    gioList.innerHTML = html || '<tr><td colspan="9" class="muted center" style="padding:14px">Bạn chưa đăng ký môn học nào!</td></tr>';

    // ----- tổng hợp -----
    var finalActive = giu.concat(checked);
    var tc = finalActive.reduce(function (s, r) { return s + parseFloat(r.getAttribute('data-tc') || 0); }, 0);
    var phiPhatSinh = checked.reduce(function (s, r) {
      return s + phiCuaMon(loaiCua(r), parseFloat(r.getAttribute('data-tc') || 0));
    }, 0);

    if (scopeLabel) scopeLabel.innerHTML = 'Đang chọn: <b>' + checked.length + ' HP mới · ' + finalActive.length + ' HP sau ghi nhận</b>';
    if (footHp) footHp.textContent = finalActive.length;
    if (footTc) footTc.textContent = tc;
    if (phiWrap) phiWrap.style.display = phiPhatSinh > 0 ? '' : 'none';
    if (footPhi) footPhi.textContent = fmt(phiPhatSinh) + 'đ';

    var soDoi = huy.length + checked.length;
    if (banner) {
      if (soDoi) { banner.style.display = ''; if (soThayDoi) soThayDoi.textContent = soDoi; }
      else banner.style.display = 'none';
    }
  }

  // Bảng môn học: tick môn mới (.dk-check) hoặc bỏ tick môn đã ĐK (.dk-check-locked) đều re-render
  table.addEventListener('change', function (e) {
    if (e.target.classList.contains('dk-check')) { render(); return; }
    if (e.target.classList.contains('dk-check-locked')) {
      var r = e.target.closest('tr');
      if (r) r.classList.toggle('dk-huy', !e.target.checked);
      render();
    }
  });
  // Bảng giỏ: checkbox tick = giữ lại, bỏ tick = hủy (môn đã ĐK) hoặc bỏ chọn (môn mới) — đồng bộ ngược lại checkbox trên bảng môn học
  gioList.addEventListener('change', function (e) {
    if (!e.target.classList.contains('dk-cart-check')) return;
    var r = table.querySelector('tr[data-hp="' + e.target.getAttribute('data-hp') + '"]');
    if (!r) return;
    if (r.classList.contains('dk-locked')) {
      r.classList.toggle('dk-huy', !e.target.checked);
    } else {
      var cb = r.querySelector('.dk-check');
      if (cb) cb.checked = e.target.checked;
    }
    render();
  });

  // Bấm badge "Trùng lịch" ở cột Trạng thái -> popup liệt kê các môn đang giữ/đang chọn bị chồng lấn lịch (dùng lại modal Lịch học)
  function lichDep(str) {
    return parseLich(str).map(function (s) {
      return 'Thứ ' + s.day + ', tiết ' + s.s + ' – ' + s.e;
    }).join(' · ');
  }
  table.addEventListener('click', function (e) {
    var badge = e.target.closest('.dk-conflict-badge');
    if (!badge) return;
    var modal = document.getElementById('m-lichhoc');
    var titleEl = document.getElementById('lh-modal-title');
    var bodyEl = document.getElementById('lh-modal-body');
    if (!modal || !bodyEl) return;
    var tr = badge.closest('tr');
    if (titleEl) titleEl.textContent = 'Trùng lịch — ' + (tr ? tr.getAttribute('data-ten') : '');
    var html = '<div class="lh-card"><div class="lh-card-h">Môn này (' + (tr ? lichDep(tr.getAttribute('data-lich')) : '') + ') trùng lịch với</div><div class="lh-card-b">';
    var codes = (badge.getAttribute('data-conflicts') || '').split(',').filter(Boolean);
    if (!codes.length) {
      html += '<div class="lh-empty">Không xác định được môn trùng lịch.</div>';
    } else {
      codes.forEach(function (hp) {
        var o = table.querySelector('tr[data-hp="' + hp + '"]');
        if (!o) return;
        html += '<div class="lh-line"><span class="ic">📚</span><b>' + hp + '</b> — ' + o.getAttribute('data-ten') +
          (o.classList.contains('dk-locked') ? ' <span class="badge b-muted">Đã ĐK</span>' : ' <span class="badge b-warn">Đang chọn</span>') + '</div>';
        html += '<div class="lh-line"><span class="ic">🕐</span>' + lichDep(o.getAttribute('data-lich')) +
          (o.getAttribute('data-phong') ? ' <span class="ic">📍</span>' + o.getAttribute('data-phong') : '') + '</div>';
      });
    }
    html += '</div></div>';
    bodyEl.innerHTML = html;
    modal.classList.add('open');
  });
  function populateModal() {
    if (!modalBody) return;
    var giu = giuNguyenRows(), huy = huyRows(), checked = checkedRows();
    var rowsHtml = '';
    var tcTong = 0, phiTong = 0, soHocPhan = 0;

    giu.forEach(function (r) {
      soHocPhan++; tcTong += parseFloat(r.getAttribute('data-tc'));
      rowsHtml += '<tr><td class="mono">' + r.getAttribute('data-hp') + '</td><td>' + r.getAttribute('data-ten') + '</td><td class="center">' + r.getAttribute('data-tc') + '</td><td><span class="badge b-muted">Giữ nguyên</span></td><td class="num">—</td></tr>';
    });
    huy.forEach(function (r) {
      rowsHtml += '<tr><td class="mono">' + r.getAttribute('data-hp') + '</td><td>' + r.getAttribute('data-ten') + '</td><td class="center">' + r.getAttribute('data-tc') + '</td><td><span class="badge b-danger">Sẽ hủy ĐK</span></td><td class="num">—</td></tr>';
    });
    checked.forEach(function (r) {
      var tc = parseFloat(r.getAttribute('data-tc'));
      var loai = loaiCua(r);
      var phi = phiCuaMon(loai, tc);
      soHocPhan++; tcTong += tc; phiTong += phi;
      rowsHtml += '<tr><td class="mono">' + r.getAttribute('data-hp') + '</td><td>' + r.getAttribute('data-ten') + '</td><td class="center">' + tc + '</td><td>' + loaiLabel(loai) + '</td><td class="num">' + (phi > 0 ? fmt(phi) + 'đ' : '—') + '</td></tr>';
    });

    modalBody.innerHTML = rowsHtml || '<tr><td colspan="5" class="muted center">Không có thay đổi nào</td></tr>';
    var tongTxt = 'Sau khi ghi nhận: <b>' + soHocPhan + ' học phần · ' + tcTong + ' tín chỉ</b>';
    if (huy.length) tongTxt += ' · <span style="color:var(--danger)">hủy ' + huy.length + ' môn</span>';
    if (phiTong > 0) tongTxt += ' · Học phí phát sinh: <b>' + fmt(phiTong) + 'đ</b>';
    if (modalFoot) modalFoot.innerHTML = tongTxt;
  }
  if (xemLaiBtn) xemLaiBtn.addEventListener('click', populateModal);

  if (ghiNhanBtn) {
    ghiNhanBtn.addEventListener('click', function () {
      // môn mới tick -> khoá thành "Đã ĐK" (render() bên dưới sẽ tự vẽ lại ô Chọn thành checkbox tick sẵn)
      checkedRows().forEach(function (r) {
        r.classList.add('dk-locked');
        r.classList.remove('dk-checked', 'dk-conflict');
      });
      // môn "sẽ hủy" -> mở lại thành available, tăng sĩ số còn trống
      huyRows().forEach(function (r) {
        r.classList.remove('dk-locked', 'dk-huy', 'dk-huy-row');
        r.children[0].innerHTML = '<input type="checkbox" class="dk-check">';
        var sisoTd = r.children[8];
        var m = sisoTd.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) sisoTd.textContent = Math.max(0, parseInt(m[1], 10) - 1) + '/' + m[2];
      });
      render();
    });
  }

  /* ---- lọc theo Khối kiến thức + tìm môn, áp dụng trong phạm vi tab đang mở (không đụng logic ĐK/giỏ) ---- */
  var khoiFilter = sec.querySelector('#dk-khoi-filter');
  var searchInput = sec.querySelector('#dk-search');
  var tabsBar = sec.querySelector('.tabs');
  function applyDkVisibility() {
    var activeTab = tabsBar ? tabsBar.querySelector('.tab.active') : null;
    var tabName = activeTab ? activeTab.getAttribute('data-tab') : 'landau';
    var khoi = khoiFilter ? khoiFilter.value : '';
    var kw = searchInput ? searchInput.value.trim().toLowerCase() : '';
    allRows().forEach(function (r) {
      var matchTab = r.getAttribute('data-panel') === tabName;
      var matchKhoi = !khoi || r.getAttribute('data-khoi') === khoi;
      var matchKw = !kw || (r.getAttribute('data-hp') || '').toLowerCase().indexOf(kw) > -1 || (r.getAttribute('data-ten') || '').toLowerCase().indexOf(kw) > -1;
      r.style.display = (matchTab && matchKhoi && matchKw) ? '' : 'none';
    });
  }
  if (khoiFilter) khoiFilter.addEventListener('change', applyDkVisibility);
  if (searchInput) searchInput.addEventListener('input', applyDkVisibility);
  if (tabsBar) tabsBar.addEventListener('click', function (e) {
    if (e.target.closest('.tab[data-tab]')) setTimeout(applyDkVisibility, 0);
  });

  render();
  applyDkVisibility();
})();

/* ============================== 6) THỜI KHOÁ BIỂU: lịch tháng tương tác ==============================
   Nhận diện theo markup (#tkb-cal-body) thay vì cố định section[data-screen="tkb"] — để trang nào cũng
   dùng lại được cùng 1 bộ lịch tháng/lịch tuần này (vd Lịch giảng dạy của site Giảng viên), miễn dữ liệu
   mẫu bên dưới được trang đó ghi đè bằng script riêng (theo đúng pattern site Sinh viên đang làm). */
(function () {
  var calBody = document.getElementById('tkb-cal-body');
  if (!calBody) return;
  var sec = calBody.closest('section[data-screen]');
  if (!sec) return;
  var thangLabel = sec.querySelector('#tkb-thang');
  var detailTitle = sec.querySelector('#tkb-detail-title');
  var detailList = sec.querySelector('#tkb-detail-list');
  var btnToday = sec.querySelector('#tkb-today');
  var btnPrev = sec.querySelector('#tkb-prev');
  var btnNext = sec.querySelector('#tkb-next');

  var TODAY = { y: 2025, m: 9, d: 15 }; // minh hoạ "hôm nay" = 15/10/2025 (m: 0-based, tháng 10)
  var view = { y: TODAY.y, m: TODAY.m };
  var selected = ymd(TODAY.y, TODAY.m, TODAY.d);
  var syncWeekTo = function () {}; // sẽ được gán lại thành renderWeek thật khi khối lịch tuần khởi tạo bên dưới

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function dmy(dateStr) { var p = dateStr.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  /* ---- quy đổi Tiết -> Giờ theo đúng TKB thật VJU: tiết 1–5 buổi sáng (bắt đầu 07:00), nghỉ trưa, tiết 6–11 buổi chiều/tối (bắt đầu 13:00); mỗi tiết 60 phút (học 50 phút) ---- */
  function fmtHhMm(totalMin) { var h = Math.floor(totalMin / 60), m = totalMin % 60; return pad(h) + ':' + pad(m); }
  function tietStartMin(tiet) {
    return tiet <= 5 ? (7 * 60 + (tiet - 1) * 60) : (13 * 60 + (tiet - 6) * 60);
  }
  function tietToGio(startTiet, endTiet) {
    var startMin = tietStartMin(startTiet);
    var endMin = tietStartMin(endTiet) + 50;
    return fmtHhMm(startMin) + ' – ' + fmtHhMm(endMin);
  }

  /* ---- lịch lặp lại hàng tuần theo học phần đã đăng ký (INT2204 = Nhập môn cơ sở dữ liệu và MySQL, JPN1003 = An ninh thông tin — dữ liệu lấy theo TKB thật HK2 2025-2026, mã HP giữ nguyên để khớp các trang khác) + 1 buổi đổi lịch/học bù minh hoạ ---- */
  function eventsOfMonth(y, m) {
    var map = {};
    function add(d, ev) { var k = ymd(y, m, d); (map[k] = map[k] || []).push(ev); }
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    for (var d = 1; d <= daysInMonth; d++) {
      var wd = new Date(y, m, d).getDay(); // 0=CN..6=T7
      if (wd === 3) {
        var evCsdl = { ma: 'INT2204', ten: 'Nhập môn cơ sở dữ liệu và MySQL', buoi: 'Sáng Thứ 4', tiet: 'Tiết 2 – 5', gio: tietToGio(2, 5), diaDiem: 'MĐ-607', gv: ['TS. Tạ Quang Ngọc'] };
        if (y === 2025 && m === 9 && d === 15) {
          evCsdl.doi = { ngayCu: ymd(y, m, 15), tietCu: 'tiết 2 – 5', phongCu: 'MĐ-607', ngayMoi: ymd(y, m, 17), tietMoi: 'tiết 10 – 11', phongMoi: 'MĐ-607', lyDo: 'Giảng viên có việc đột xuất' };
        }
        add(d, evCsdl);
        add(d, { ma: 'INT2204', ten: 'Nhập môn cơ sở dữ liệu và MySQL (TH)', buoi: 'Chiều Thứ 4', tiet: 'Tiết 6 – 9', gio: tietToGio(6, 9), diaDiem: 'MĐ-508', gv: ['TS. Tạ Quang Ngọc'] });
      }
      if (wd === 5) {
        add(d, { ma: 'JPN1003', ten: 'An ninh thông tin', buoi: 'Sáng Thứ 6', tiet: 'Tiết 2 – 5', gio: tietToGio(2, 5), diaDiem: 'MĐ-402', gv: ['TS. Nguyễn Mạnh Thắng', 'TS. Mai Chí Thọ'] });
        add(d, { ma: 'JPN1003', ten: 'An ninh thông tin (TH)', buoi: 'Chiều Thứ 6', tiet: 'Tiết 6 – 9', gio: tietToGio(6, 9), diaDiem: 'MĐ-509', gv: ['TS. Nguyễn Mạnh Thắng', 'TS. Mai Chí Thọ'] });
        if (y === 2025 && m === 9 && d === 17) {
          add(d, { ma: 'JPN1003', ten: 'An ninh thông tin (Lịch học bù)', buoi: 'Sáng Thứ 6', tiet: 'Tiết 1', gio: tietToGio(1, 1), diaDiem: 'MĐ-402', gv: ['TS. Nguyễn Mạnh Thắng', 'TS. Mai Chí Thọ'], hocBu: true });
        }
      }
    }
    return map;
  }

  function renderCalendar() {
    var y = view.y, m = view.m;
    if (thangLabel) thangLabel.textContent = 'Tháng ' + (m + 1) + ', ' + y;
    var evMap = eventsOfMonth(y, m);
    var firstWd = (new Date(y, m, 1).getDay() + 6) % 7; // 0=T2..6=CN
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var prevDaysInMonth = new Date(y, m, 0).getDate();
    var cells = [];
    for (var i = 0; i < firstWd; i++) cells.push({ d: prevDaysInMonth - firstWd + 1 + i, muted: true });
    for (var d = 1; d <= daysInMonth; d++) cells.push({ d: d, muted: false, dateStr: ymd(y, m, d) });
    var nextDay = 1;
    while (cells.length % 7 !== 0) cells.push({ d: nextDay++, muted: true });

    var todayStr = ymd(TODAY.y, TODAY.m, TODAY.d);
    var html = '';
    cells.forEach(function (c, idx) {
      if (idx % 7 === 0) html += '<tr>';
      if (c.muted) {
        html += '<td class="cal-cell is-muted"><div class="cal-day">' + c.d + '</div><div class="cal-dots"></div></td>';
      } else {
        var evs = evMap[c.dateStr] || [];
        var isToday = c.dateStr === todayStr;
        var isSelected = c.dateStr === selected;
        var dots = '';
        if (evs.length) dots += '<i class="cal-dot-ok"></i>';
        if (evs.some(function (e) { return e.doi; })) dots += '<i class="cal-dot-doi"></i>';
        if (evs.some(function (e) { return e.hocBu; })) dots += '<i class="cal-dot-bu"></i>';
        html += '<td class="cal-cell' + (isToday ? ' is-today' : '') + (isSelected ? ' is-selected' : '') + '" data-date="' + c.dateStr + '">' +
          '<div class="cal-day">' + c.d + '</div><div class="cal-dots">' + dots + '</div></td>';
      }
      if (idx % 7 === 6) html += '</tr>';
    });
    calBody.innerHTML = html;
  }

  function renderDetail(dateStr) {
    selected = dateStr;
    var p = dateStr.split('-');
    if (detailTitle) detailTitle.textContent = 'Thông tin chi tiết — ' + dmy(dateStr);
    var evMap = eventsOfMonth(+p[0], +p[1] - 1);
    var evs = (evMap[dateStr] || []).slice().sort(function (a, b) { return a.gio.localeCompare(b.gio); });
    if (!detailList) return;
    if (!evs.length) {
      detailList.innerHTML = '<div class="muted xs" style="padding:14px">Không có lịch học ngày này.</div>';
      return;
    }
    detailList.innerHTML = evs.map(function (ev) {
      var gioParts = ev.gio.split(' – ');
      var gvHtml = ev.gv.map(function (n) { return '<a href="#" class="row-link">' + n + '</a>'; }).join(' • ');
      var changeHtml = ev.doi ? ('<div class="tkb-change"><b>Thay đổi địa điểm học, thời gian học</b><br>Buổi học ngày ' + dmy(ev.doi.ngayCu) + ', ' + ev.doi.tietCu + ' tại ' + ev.doi.phongCu +
        ' chuyển sang ngày ' + dmy(ev.doi.ngayMoi) + ' tại ' + ev.doi.phongMoi + ' ' + ev.doi.tietMoi + ' (Lí do: ' + ev.doi.lyDo + ')</div>') : '';
      return '<div class="tkb-event' + (ev.hocBu ? ' is-bu' : (ev.doi ? ' is-doi' : '')) + '">' +
        '<div class="time">' + gioParts[0] + '<br>—<br>' + (gioParts[1] || '') + '</div>' +
        '<div class="body"><b>' + ev.ma + ' – ' + ev.ten + '</b>' +
        '<div class="small mt4">Thời gian: ' + ev.buoi + ', ' + ev.tiet + '</div>' +
        '<div class="small">Địa điểm: ' + ev.diaDiem + '</div>' +
        '<div class="small">Giảng viên: ' + gvHtml + '</div>' +
        changeHtml +
        '</div></div>';
    }).join('');
  }

  calBody.addEventListener('click', function (e) {
    var cell = e.target.closest('.cal-cell:not(.is-muted)');
    if (!cell) return;
    var dateStr = cell.getAttribute('data-date');
    selected = dateStr;
    renderCalendar();
    renderDetail(dateStr);
    syncWeekTo(dateStr);
  });
  if (btnToday) btnToday.addEventListener('click', function () {
    view.y = TODAY.y; view.m = TODAY.m;
    selected = ymd(TODAY.y, TODAY.m, TODAY.d);
    renderCalendar();
    renderDetail(selected);
    syncWeekTo(selected);
  });
  function goToMonth() {
    selected = ymd(view.y, view.m, 1);
    renderCalendar();
    renderDetail(selected);
    syncWeekTo(selected);
  }
  if (btnPrev) btnPrev.addEventListener('click', function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } goToMonth(); });
  if (btnNext) btnNext.addEventListener('click', function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } goToMonth(); });

  renderCalendar();
  renderDetail(selected);

  /* ---- Lịch tuần: lưới giờ 06:00–18:00, đặt buổi học đúng vị trí theo giờ ---- */
  var weekHead = sec.querySelector('#tkb-week-head');
  var weekGrid = sec.querySelector('#tkb-week-grid');
  var weekLabel = sec.querySelector('#tkbw-tuan');
  var weekToday = sec.querySelector('#tkbw-today');
  var weekPrev = sec.querySelector('#tkbw-prev');
  var weekNext = sec.querySelector('#tkbw-next');
  if (weekHead && weekGrid) {
    var TEN_THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    var todayDate = new Date(TODAY.y, TODAY.m, TODAY.d);
    var weekAnchor = new Date(TODAY.y, TODAY.m, TODAY.d);
    var GIO_BD = 7, GIO_KT = 20; // khung giờ hiển thị 07:00–20:00 (đủ tiết 1..12, gồm 2 tiết tối)

    function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
    function startOfWeek(d) {
      var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      var wd = (dt.getDay() + 6) % 7; // 0 = Thứ 2
      dt.setDate(dt.getDate() - wd);
      return dt;
    }
    function eventsOnDate(dt) {
      var map = eventsOfMonth(dt.getFullYear(), dt.getMonth());
      return map[ymd(dt.getFullYear(), dt.getMonth(), dt.getDate())] || [];
    }
    function toMin(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
    function gioToRows(gioStr) {
      var parts = gioStr.split(' – ');
      var startMin = toMin(parts[0]) - GIO_BD * 60;
      var endMin = toMin(parts[1]) - GIO_BD * 60;
      var start = Math.round(startMin / 15) + 1;
      var span = Math.max(1, Math.round((endMin - startMin) / 15));
      return { start: start, span: span };
    }

    /* Đảo ngược: Cột 1 = "Thứ / Giờ", Cột 2.. = các mốc giờ (GIO_BD -> GIO_KT); mỗi ngày là 1 dòng */
    function renderWeek() {
      var monday = startOfWeek(weekAnchor);
      var days = [];
      for (var i = 0; i < 7; i++) { var dt = new Date(monday); dt.setDate(monday.getDate() + i); days.push(dt); }
      var sunday = days[6];
      if (weekLabel) weekLabel.textContent = pad(monday.getDate()) + '/' + pad(monday.getMonth() + 1) + ' – ' + pad(sunday.getDate()) + '/' + pad(sunday.getMonth() + 1) + '/' + sunday.getFullYear();

      var headHtml = '<div class="tkb-week-head-corner">Thứ / Giờ</div>';
      for (var h = GIO_BD; h < GIO_KT; h++) {
        headHtml += '<div class="tkb-week-head-hour">' + pad(h) + ':00</div>';
      }
      weekHead.innerHTML = headHtml;

      var gridHtml = '';
      days.forEach(function (dt, dayIdx) {
        var isToday = sameDate(dt, todayDate);
        var rowNum = dayIdx + 1;

        gridHtml += '<div class="tkb-week-row-bg" style="grid-row:' + rowNum + ';grid-column:2 / -1"></div>';
        gridHtml += '<div class="tkb-week-day-cell' + (isToday ? ' is-today' : '') + '" style="grid-row:' + rowNum + '">' +
          '<div class="dow">' + TEN_THU_NGAN[dt.getDay()] + '</div>' +
          '<div class="dnum">' + pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '</div>' +
        '</div>';

        eventsOnDate(dt).forEach(function (ev) {
          var pos = gioToRows(ev.gio);
          var trangThai = ev.hocBu ? ' is-bu' : (ev.doi ? ' is-doi' : ' is-ok');
          var startCol = pos.start + 1;
          gridHtml += '<div class="tkb-week-ev' + trangThai + '" style="grid-row:' + rowNum + ';grid-column:' + startCol + ' / span ' + pos.span + '" title="' + ev.ma + ' – ' + ev.ten + ' (' + ev.tiet + ', ' + ev.diaDiem + ')">' +
            '<b>' + ev.ma + '</b><span>' + ev.tiet + ' · ' + ev.diaDiem + '</span>' +
          '</div>';
        });
      });

      weekGrid.style.gridTemplateRows = 'repeat(7, minmax(46px, auto))';
      weekGrid.innerHTML = gridHtml;
    }

    // cho phép lịch tháng (bên trên) đồng bộ lịch tuần này khi người dùng chọn ngày khác
    syncWeekTo = function (dateStr) {
      var p = dateStr.split('-');
      weekAnchor = new Date(+p[0], +p[1] - 1, +p[2]);
      renderWeek();
    };

    if (weekToday) weekToday.addEventListener('click', function () { weekAnchor = new Date(TODAY.y, TODAY.m, TODAY.d); renderWeek(); });
    if (weekPrev) weekPrev.addEventListener('click', function () { weekAnchor.setDate(weekAnchor.getDate() - 7); renderWeek(); });
    if (weekNext) weekNext.addEventListener('click', function () { weekAnchor.setDate(weekAnchor.getDate() + 7); renderWeek(); });

    renderWeek();
  }
})();

/* ============================== Modal / Hộp thoại (dùng chung) ============================== */
(function () {
  document.addEventListener('click', function (e) {
    var op = e.target.closest('[data-modal]');
    if (op) { e.preventDefault(); var m = document.getElementById(op.getAttribute('data-modal')); if (m) m.classList.add('open'); return; }
    if (e.target.closest('[data-close]')) { var ov = e.target.closest('.modal-ov'); if (ov) ov.classList.remove('open'); return; }
    if (e.target.classList && e.target.classList.contains('modal-ov')) e.target.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var o = document.querySelectorAll('.modal-ov.open'); for (var i = 0; i < o.length; i++) o[i].classList.remove('open'); }
  });
})();

/* ============================== Popup "Lịch học" (bấm vào tên học phần ở Đăng ký học phần / tab Chi tiết TKB) ============================== */
(function () {
  var modal = document.getElementById('m-lichhoc');
  var titleEl = document.getElementById('lh-modal-title');
  var bodyEl = document.getElementById('lh-modal-body');
  if (!modal || !bodyEl) return;

  var THU_LABEL = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tietStartMin(t) { return t <= 5 ? (7 * 60 + (t - 1) * 60) : (13 * 60 + (t - 6) * 60); }
  function tietToGio(s, e) {
    function f(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
    return f(tietStartMin(s)) + ' – ' + f(tietStartMin(e) + 50);
  }

  /* dữ liệu chi tiết (phòng theo từng buổi + lịch thi) cho 2 học phần đã đăng ký; các học phần khác trong bảng chỉ có Thứ/Tiết nên hiển thị rút gọn hơn */
  var COURSE_EXTRA = {
    INT2204: {
      buoi: [
        { thu: 4, label: 'Sáng', tiet: [2, 5], phong: 'MĐ-607' },
        { thu: 4, label: 'Chiều (TH)', tiet: [6, 9], phong: 'MĐ-508' }
      ],
      thi: 'CL — <b>02/01/2026</b>, Ca 2, 09:30 tại <b>MĐ-610</b> (SBD 47, Trên máy)'
    },
    JPN1003: {
      buoi: [
        { thu: 6, label: 'Sáng', tiet: [2, 5], phong: 'MĐ-402' },
        { thu: 6, label: 'Chiều (TH)', tiet: [6, 9], phong: 'MĐ-509' }
      ],
      thi: 'CL — <b>03/01/2026</b>, Ca 3, 13:00 tại <b>MĐ-403</b> (SBD 22, Vấn đáp)'
    }
  };

  function parseLichGeneric(str) {
    if (!str) return [];
    return str.split(',').map(function (seg) {
      var m = seg.trim().match(/T(\d+)\((\d+)-(\d+)\)/);
      if (!m) return null;
      var s = +m[2], e = +m[3];
      return { thu: +m[1], label: s <= 5 ? 'Sáng' : 'Chiều', tiet: [s, e], phong: null };
    }).filter(Boolean);
  }

  function openModal(hp, ten, lich, info) {
    titleEl.textContent = ten ? ('Lịch học — ' + ten) : 'Lịch học';
    var extra = hp ? COURSE_EXTRA[hp] : null;
    var buoi = extra ? extra.buoi : parseLichGeneric(lich);
    // môn không có trong COURSE_EXTRA: gán phòng cho từng buổi từ data-phong ("MĐ-607, MĐ-508" — theo thứ tự buổi)
    if (!extra && info && info.phong) {
      var phongList = info.phong.split(',').map(function (p) { return p.trim(); });
      buoi.forEach(function (b, i) { b.phong = phongList[i] || phongList[phongList.length - 1] || null; });
    }
    var html = '';
    if (info && (info.gv || info.siso || info.lop)) {
      html += '<div class="lh-card"><div class="lh-card-h">Thông tin lớp học phần</div><div class="lh-card-b">';
      if (info.lop) html += '<div class="lh-line"><span class="ic">🏷️</span>Lớp HP: ' + info.lop + '</div>';
      if (info.gv) html += '<div class="lh-line"><span class="ic">👤</span>Giảng viên: ' + info.gv + '</div>';
      if (info.siso) html += '<div class="lh-line"><span class="ic">👥</span>Sĩ số: ' + info.siso + '</div>';
      html += '</div></div>';
    }
    html += '<div class="lh-card"><div class="lh-card-h">Lịch học</div><div class="lh-card-b">';
    if (!buoi.length) {
      html += '<div class="lh-empty">Chưa có dữ liệu lịch học chi tiết.</div>';
    } else {
      buoi.forEach(function (b) {
        var thu = THU_LABEL[b.thu] || ('Thứ ' + b.thu);
        html += '<div class="lh-line"><span class="ic">📅</span>' + b.label + ' ' + thu + '</div>';
        html += '<div class="lh-line"><span class="ic">🕐</span>Tiết ' + b.tiet[0] + ' – ' + b.tiet[1] + ' [' + tietToGio(b.tiet[0], b.tiet[1]) + ']' +
          (b.phong ? ' <span class="ic">📍</span>' + b.phong : '') + '</div>';
      });
    }
    if (extra && extra.thi) {
      html += '<div class="lh-thi"><b>Lịch thi:</b> ' + extra.thi + '</div>';
    }
    html += '</div></div>';
    bodyEl.innerHTML = html;
    modal.classList.add('open');
  }

  document.addEventListener('click', function (e) {
    var td = e.target.closest('#dk-table tbody td');
    if (td) {
      var tr = td.closest('tr');
      if (tr && tr.cells && tr.cells[2] === td) {
        openModal(tr.getAttribute('data-hp'), tr.getAttribute('data-ten'), tr.getAttribute('data-lich'), {
          lop: tr.cells[4] ? tr.cells[4].textContent.trim() : null,
          gv: tr.cells[5] ? tr.cells[5].innerText.replace(/\n/g, ', ').trim() : null,
          siso: tr.cells[8] ? tr.cells[8].textContent.trim() : null,
          phong: tr.getAttribute('data-phong')
        });
        return;
      }
    }
    var link = e.target.closest('.lh-open');
    if (link) {
      e.preventDefault();
      openModal(link.getAttribute('data-hp'), link.textContent.trim(), null);
    }
  });
})();

/* ============================== Kết quả học tập: tìm kiếm + lọc học kỳ + thu gọn/mở nhóm ============================== */
(function () {
  var table = document.getElementById('kq-table');
  if (!table) return;
  var search = document.getElementById('kq-search');
  var hkFilter = document.getElementById('kq-hocky-filter');
  var emptyMsg = document.getElementById('kq-empty');
  var groups = Array.prototype.slice.call(table.querySelectorAll('tr.kq-group'));
  var rows = Array.prototype.slice.call(table.querySelectorAll('tr.kq-row'));

  function norm(s) { return (s || '').toLowerCase(); }

  function apply() {
    var q = norm(search ? search.value.trim() : '');
    var hk = hkFilter ? hkFilter.value : '';
    var totalVisible = 0;
    groups.forEach(function (g) {
      var gid = g.getAttribute('data-group');
      var collapsed = g.classList.contains('kq-collapsed');
      var hkOk = !hk || hk === gid;
      var groupRows = rows.filter(function (r) { return r.getAttribute('data-group') === gid; });
      var anyMatch = false;
      groupRows.forEach(function (r) {
        var text = norm(r.getAttribute('data-ma') + ' ' + r.getAttribute('data-ten'));
        var match = hkOk && (!q || text.indexOf(q) !== -1);
        if (match) anyMatch = true;
        r.style.display = (match && !collapsed) ? '' : 'none';
        if (match) totalVisible++;
      });
      g.style.display = anyMatch ? '' : 'none';
      var caret = g.querySelector('.kq-caret');
      if (caret) caret.textContent = collapsed ? '▸' : '▾';
    });
    if (emptyMsg) emptyMsg.style.display = totalVisible === 0 ? '' : 'none';
  }

  groups.forEach(function (g) {
    g.addEventListener('click', function () {
      g.classList.toggle('kq-collapsed');
      apply();
    });
  });
  if (search) search.addEventListener('input', apply);
  if (hkFilter) hkFilter.addEventListener('change', apply);
  apply();

  var tonghopTable = document.getElementById('kq-tonghop-table');
  var tonghopFilter = document.getElementById('kq-tonghop-filter');
  if (tonghopTable && tonghopFilter) {
    var tonghopRows = Array.prototype.slice.call(tonghopTable.querySelectorAll('tbody tr'));
    tonghopFilter.addEventListener('change', function () {
      var v = tonghopFilter.value;
      tonghopRows.forEach(function (r) { r.style.display = (!v || r.getAttribute('data-hk') === v) ? '' : 'none'; });
    });
  }
})();
