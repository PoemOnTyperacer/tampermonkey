// ==UserScript==
// @name         Monkeytype: Hotlist
// @namespace    http://tampermonkey.net/
// @version      0.5.0
// @description  Highlight keywords in monkeytype tests
// @author       poem#3305
// @match        https://monkeytype.com/*
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const MAIN_COLOR = 'var(--main-color)';
    const RED_COLOR = '#EE4B2B';
    const SEPARATOR = ';';
    const LISTS_SEPARATOR = '|';
    const STORAGE_KEY = 'HotlistDataItemV3';
    const ENABLED_KEY = 'HotlistEnabled';
    const COMMAND_ID = 'hotlistToggle';
    const COMMAND_ID_ON = 'hotlistSetOn';
    const COMMAND_ID_OFF = 'hotlistSetOff';

    let mainSet = new Set();
    let redSet = new Set();
    let mainList = [];
    let redList = [];
    let mainExact = [];
    let redExact = [];
    let settingsVersion = 0;
    let menuCreated = false;
    let enabled = true;

    const pending = new Set();
    let flushScheduled = false;
    const lettersCache = new WeakMap();

    GM_addStyle(`
    .word letter[data-hotlist="main"] {
      filter: drop-shadow(0 0 1px ${MAIN_COLOR}) drop-shadow(0 0 3px ${MAIN_COLOR}) !important;
      -webkit-text-stroke: 0.35px rgba(255,255,255,0.55) !important;
      text-shadow: 0 0 2px ${MAIN_COLOR}, 0 0 4px ${MAIN_COLOR} !important;
    }
    .word letter[data-hotlist="red"] {
      filter: drop-shadow(0 0 1px ${RED_COLOR}) drop-shadow(0 0 3px ${RED_COLOR}) !important;
      -webkit-text-stroke: 0.35px rgba(255,255,255,0.55) !important;
      text-shadow: 0 0 2px ${RED_COLOR}, 0 0 4px ${RED_COLOR} !important;
    }
    .word.nocursor letter[data-hotlist="main"] {
      filter: drop-shadow(0 0 2px ${MAIN_COLOR}) !important;
      -webkit-text-stroke: 0.3px rgba(255,255,255,0.45) !important;
      text-shadow: 0 0 3px ${MAIN_COLOR} !important;
    }
    .word.nocursor letter[data-hotlist="red"] {
      filter: drop-shadow(0 0 2px ${RED_COLOR}) !important;
      -webkit-text-stroke: 0.3px rgba(255,255,255,0.45) !important;
      text-shadow: 0 0 3px ${RED_COLOR} !important;
    }

    .section.hotlist.fullWidth {
      width: 100% !important;
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-template-rows: auto 1fr;
      grid-template-areas: "title title" "text buttons" "content content";
      column-gap: 2rem;
      row-gap: 0.5rem;
      align-items: start;
    }
    .section.hotlist.fullWidth .inputs,
    .section.hotlist.fullWidth .buttons { width: 100% !important; }
    .section.hotlist .groupTitle { grid-area: title; }
    .section.hotlist .text {
      grid-area: text;
      margin-bottom: 0;
    }
    .section.hotlist .buttons {
      grid-area: buttons;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .section.hotlist .hotlistContent {
      grid-area: content;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .section.hotlist .hotlistColumns {
      padding-left: 3px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    .section.hotlist .hotlistColumn {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .section.hotlist .hotlistMetaRow {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--sub-color);
    }
    .section.hotlist .hotlistMetaRow .left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section.hotlist .hotlistMetaRow .right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .section.hotlist .hotlistMetaRow .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 0.2rem;
      background: var(--main-color);
    }
    .section.hotlist .hotlistMetaRow .swatch.red { background: ${RED_COLOR}; }
    .section.hotlist .hotlistMetaRow .count { opacity: 0.7; }
    .section.hotlist .hotlistMetaRow .clearBtn {
      opacity: 0.5;
      cursor: pointer;
      font-size: 0.85rem;
      transition: opacity 0.125s;
    }
    .section.hotlist .hotlistMetaRow .clearBtn:hover { opacity: 1; }
    .section.hotlist .hotlistAddRow {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }
    .section.hotlist .hotlistAddRow input.input {
      flex: 1;
      min-width: 0;
      height: 2.5rem;
      padding: 0 0.75rem;
      border-radius: var(--roundness);
      background: var(--sub-alt-color);
      border: none;
      color: var(--text-color);
      font-size: 1rem;
      font-family: var(--font);
    }
    .section.hotlist .hotlistAddRow input.input::placeholder {
      color: var(--sub-color);
      opacity: 0.5;
    }
    .section.hotlist .hotlistAddRow button {
      height: 2.5rem;
      width: 2.5rem;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .section.hotlist .hotlistAddRow button i { line-height: 1; }
    .section.hotlist .hotlistAddRow .exactToggle {
      width: auto;
      padding: 0 0.75rem;
      font-size: 0.8rem;
      opacity: 0.5;
    }
    .section.hotlist .hotlistAddRow .exactToggle.active {
      opacity: 1;
      background: var(--main-color);
      color: var(--bg-color);
    }
    .section.hotlist .hotlistChips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-height: 3rem;
      max-height: 16rem;
      overflow-y: auto;
      padding: 0.25rem 0;
      align-content: flex-start;
    }
    .section.hotlist .hotlistChips:empty::after {
      content: 'No items yet';
      color: var(--sub-color);
      opacity: 0.4;
      font-style: italic;
    }
    .section.hotlist .hotlistChip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      height: 2rem;
      padding: 0 0.75rem;
      border-radius: var(--roundness);
      background: var(--sub-alt-color);
      color: var(--text-color);
      font-size: 0.875rem;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: background 0.125s, color 0.125s;
    }
    .section.hotlist .hotlistChip:hover {
      color: var(--bg-color);
      background: var(--text-color);
    }
    .section.hotlist .hotlistChip i {
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .section.hotlist .hotlistChip:hover i { opacity: 1; }
    .section.hotlist .hotlistChip .exactBadge {
      font-size: 0.625rem;
      opacity: 0.6;
      margin-left: 0.1rem;
    }
    @media (max-width: 700px) {
      .section.hotlist .hotlistColumns { grid-template-columns: 1fr; }
    }

    .suggestions.hotlist-managed .command:not(.hotlist-hover) {
      color: var(--sub-color) !important;
      background: transparent !important;
    }
    .suggestions.hotlist-managed .command.hotlist-hover {
      color: var(--bg-color) !important;
      background: var(--text-color) !important;
    }
  `);

    function saveData() {
        const main = [...mainSet].join(SEPARATOR + ' ');
        const red = [...redSet].join(SEPARATOR + ' ');
        localStorage.setItem(STORAGE_KEY, `${main}${LISTS_SEPARATOR}${red}`);
    }

    function saveEnabled() {
        localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    }

    function isExact(val) {
        return val.startsWith('"') && val.endsWith('"') && val.length > 2;
    }

    function unwrap(val) {
        return isExact(val) ? val.slice(1, -1) : val;
    }

    function wrap(val) {
        return `"${val}"`;
    }

    function rebuildLists() {
        mainList = [];
        mainExact = [];
        redList = [];
        redExact = [];

        for (const val of mainSet) {
            (isExact(val) ? mainExact : mainList).push(unwrap(val));
        }

        for (const val of redSet) {
            (isExact(val) ? redExact : redList).push(unwrap(val));
        }

        mainList.sort((a, b) => b.length - a.length);
        redList.sort((a, b) => b.length - a.length);
        settingsVersion++;
    }

    function parseStorage(data) {
        if (!data || data === LISTS_SEPARATOR) {
            mainSet = new Set();
            redSet = new Set();
        } else {
            const [main = '', red = ''] = data.split(LISTS_SEPARATOR);
            const parse = s => s.split(SEPARATOR).map(x => x.trim()).filter(Boolean);
            mainSet = new Set(parse(main));
            redSet = new Set(parse(red));
        }
        rebuildLists();
    }

    function load() {
        const data = localStorage.getItem(STORAGE_KEY);
        const enabledData = localStorage.getItem(ENABLED_KEY);

        enabled = enabledData !== '0';

        if (data === null) {
            saveData();
            alert('Welcome to poem#3305\'s Hotlist mod\n===========================\n\nCustomize your highlighted words list in the "behavior" settings.\n\n(This message won\'t show again.)');
            parseStorage('');
        } else {
            parseStorage(data);
        }
    }

    function commit() {
        saveData();
        rebuildLists();
        reapplyAll();
    }

    function findSubstringRanges(text, needles) {
        const ranges = [];
        for (const needle of needles) {
            if (!needle) continue;
            let idx = text.indexOf(needle);
            while (idx !== -1) {
                ranges.push([idx, idx + needle.length]);
                idx = text.indexOf(needle, idx + 1);
            }
        }
        return ranges;
    }

    function findExactRanges(text, words) {
        for (const word of words) {
            if (text === word) return [[0, text.length]];
        }
        return [];
    }

    function mergeRanges(ranges) {
        if (ranges.length <= 1) return ranges;
        ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const merged = [ranges[0]];
        for (let i = 1; i < ranges.length; i++) {
            const last = merged[merged.length - 1];
            const cur = ranges[i];
            if (cur[0] <= last[1]) {
                last[1] = Math.max(last[1], cur[1]);
            } else {
                merged.push(cur);
            }
        }
        return merged;
    }

    function getLetters(wordEl) {
        let cached = lettersCache.get(wordEl);
        if (cached) return cached;
        const arr = Array.from(wordEl.getElementsByTagName('letter'));
        lettersCache.set(wordEl, arr);
        return arr;
    }

    function applyHighlights(letters, ranges, mark) {
        const len = letters.length;
        for (const [start, end] of ranges) {
            for (let i = Math.max(0, start); i < Math.min(end, len); i++) {
                letters[i].dataset.hotlist = mark;
            }
        }
    }

    function processWord(el) {
        const version = String(settingsVersion);

        if (el.dataset.hotlistDirty === '1') {
            delete el.dataset.hotlistDirty;
        } else {
            const word = el.textContent || '';
            if (el.dataset.hotlistV === version && el.dataset.hotlistW === word) return;
        }

        const word = el.textContent || '';
        const letters = getLetters(el);

        if (!letters.length) {
            el.dataset.hotlistV = version;
            el.dataset.hotlistW = word;
            return;
        }

        for (const letter of letters) {
            delete letter.dataset.hotlist;
        }

        if (!enabled) {
            el.dataset.hotlistV = version;
            el.dataset.hotlistW = word;
            return;
        }

        const mainRanges = [
            ...findExactRanges(word, mainExact),
            ...findSubstringRanges(word, mainList)
        ];

        if (mainRanges.length) {
            applyHighlights(letters, mergeRanges(mainRanges), 'main');
            el.dataset.hotlistV = version;
            el.dataset.hotlistW = word;
            return;
        }

        const redRanges = [
            ...findExactRanges(word, redExact),
            ...findSubstringRanges(word, redList)
        ];

        if (redRanges.length) {
            applyHighlights(letters, mergeRanges(redRanges), 'red');
        }

        el.dataset.hotlistV = version;
        el.dataset.hotlistW = word;
    }

    function flush() {
        flushScheduled = false;
        for (const el of pending) processWord(el);
        pending.clear();
    }

    function scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        requestAnimationFrame(flush);
    }

    function markDirty(wordEl) {
        wordEl.dataset.hotlistDirty = '1';
        pending.add(wordEl);
    }

    function reapplyAll() {
        const words = document.getElementsByClassName('word');
        for (const word of words) markDirty(word);
        if (pending.size) scheduleFlush();
    }

    function renderChips(container, set, countEl) {
        container.textContent = '';
        countEl.textContent = String(set.size);
        for (const val of set) {
            const chip = document.createElement('div');
            chip.className = 'hotlistChip';
            const display = unwrap(val);
            const badge = isExact(val) ? '<span class="exactBadge">[exact]</span>' : '';
            chip.innerHTML = `<i class="fas fa-times fa-fw"></i><span>${display}</span>${badge}`;
            chip.title = 'Click to remove';
            chip.onclick = () => {
                set.delete(val);
                commit();
                renderAll();
            };
            container.appendChild(chip);
        }
    }

    function renderAll() {
        renderChips(
            document.getElementById('hotlistChips'),
            mainSet,
            document.getElementById('hotlistCount')
        );
        renderChips(
            document.getElementById('redHotlistChips'),
            redSet,
            document.getElementById('redHotlistCount')
        );
    }

    function updateToggleButtons() {
        const offBtn = document.getElementById('hotlistOffBtn');
        const onBtn = document.getElementById('hotlistOnBtn');
        if (!offBtn || !onBtn) return;

        offBtn.classList.toggle('active', !enabled);
        onBtn.classList.toggle('active', enabled);
    }

    function setEnabled(val) {
        enabled = val;
        saveEnabled();
        settingsVersion++;
        updateToggleButtons();
        reapplyAll();
    }

    function addItem(input, set, exactToggle) {
        let val = input.value.trim();
        if (!val) return;
        if (exactToggle.classList.contains('active')) val = wrap(val);
        set.add(val);
        input.value = '';
        commit();
        renderAll();
    }

    function clearList(set) {
        if (!set.size) return;
        set.clear();
        commit();
        renderAll();
    }

    function createMenu() {
        if (menuCreated) return;

        const sections = document.getElementsByClassName('behavior');
        if (!sections.length) return;

        const container = document.createElement('div');
        container.className = 'section hotlist fullWidth';
        container.innerHTML = `
      <div class="groupTitle">
        <i class="fas fa-highlighter"></i> <span>hotlist</span>
      </div>
      <div class="text">
        Add substrings to highlight during tests. Click a chip to remove it.<br>
        <span style="opacity: 0.7">Use <b>exact</b> to match whole words only (e.g. "a [exact]" won't match inside "that").</span>
      </div>
      <div class="buttons">
        <button id="hotlistOffBtn">off</button>
        <button id="hotlistOnBtn">on</button>
      </div>
      <div class="hotlistContent">
        <div class="hotlistColumns">
          <div class="hotlistColumn">
            <div class="hotlistMetaRow">
              <div class="left"><span class="swatch"></span><span>main list</span></div>
              <div class="right">
                <span class="count"><span id="hotlistCount">0</span> items</span>
                <span id="hotlistClear" class="clearBtn" title="Clear all">clear</span>
              </div>
            </div>
            <div class="hotlistAddRow">
              <input id="hotlistAddInput" class="input" type="text" spellcheck="false" placeholder="Add item… (Enter)" autocomplete="off">
              <button id="hotlistExactToggle" class="exactToggle" tabindex="0">exact</button>
              <button id="hotlistAddButton" tabindex="0"><i class="fas fa-plus"></i></button>
            </div>
            <div id="hotlistChips" class="hotlistChips"></div>
          </div>
          <div class="hotlistColumn">
            <div class="hotlistMetaRow">
              <div class="left"><span class="swatch red"></span><span>red list</span></div>
              <div class="right">
                <span class="count"><span id="redHotlistCount">0</span> items</span>
                <span id="redHotlistClear" class="clearBtn" title="Clear all">clear</span>
              </div>
            </div>
            <div class="hotlistAddRow">
              <input id="redHotlistAddInput" class="input" type="text" spellcheck="false" placeholder="Add item… (Enter)" autocomplete="off">
              <button id="redHotlistExactToggle" class="exactToggle" tabindex="0">exact</button>
              <button id="redHotlistAddButton" tabindex="0"><i class="fas fa-plus"></i></button>
            </div>
            <div id="redHotlistChips" class="hotlistChips"></div>
          </div>
        </div>
      </div>
    `;

        sections[0].insertBefore(container, sections[0].firstChild);

        const mainInput = document.getElementById('hotlistAddInput');
        const redInput = document.getElementById('redHotlistAddInput');
        const mainExactToggle = document.getElementById('hotlistExactToggle');
        const redExactToggle = document.getElementById('redHotlistExactToggle');

        mainExactToggle.onclick = () => mainExactToggle.classList.toggle('active');
        redExactToggle.onclick = () => redExactToggle.classList.toggle('active');

        document.getElementById('hotlistAddButton').onclick = () => addItem(mainInput, mainSet, mainExactToggle);
        document.getElementById('redHotlistAddButton').onclick = () => addItem(redInput, redSet, redExactToggle);

        document.getElementById('hotlistClear').onclick = () => clearList(mainSet);
        document.getElementById('redHotlistClear').onclick = () => clearList(redSet);

        document.getElementById('hotlistOffBtn').onclick = () => setEnabled(false);
        document.getElementById('hotlistOnBtn').onclick = () => setEnabled(true);

        mainInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addItem(mainInput, mainSet, mainExactToggle);
            }
        });

        redInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addItem(redInput, redSet, redExactToggle);
            }
        });

        updateToggleButtons();
        renderAll();
        menuCreated = true;
    }

    let inSubmenu = false;

    function createCommandItem(id, icon, label) {
        const div = document.createElement('div');
        div.className = 'command';
        div.dataset.commandId = id;
        div.innerHTML = `<div class="icon"><i class="fas fa-fw ${icon}"></i></div><div>${label}</div>`;
        return div;
    }

    function setupHoverManagement(suggestions) {
        if (suggestions.dataset.hotlistBound) return;
        suggestions.dataset.hotlistBound = '1';
        suggestions.classList.add('hotlist-managed');

        suggestions.addEventListener('mouseover', e => {
            const cmd = e.target.closest('.command');
            if (!cmd) return;
            suggestions.querySelectorAll('.command').forEach(c => c.classList.remove('active', 'hotlist-hover'));
            cmd.classList.add('hotlist-hover');
        });

        suggestions.addEventListener('mouseleave', () => {
            suggestions.querySelectorAll('.command').forEach(c => c.classList.remove('active', 'hotlist-hover'));
        });
    }

    function clearNativeActive(suggestions) {
        suggestions.querySelectorAll('.command').forEach(c => c.classList.remove('active'));
    }

    function injectCommandlineItem(suggestions) {
        const existing = suggestions.querySelector(`[data-command-id="${COMMAND_ID}"]`);
        if (existing) return;

        const commands = Array.from(suggestions.querySelectorAll('.command'));
        if (commands.length < 7) return;

        const item = createCommandItem(COMMAND_ID, 'fa-highlighter', 'Hotlist...');
        item.dataset.index = '7';
        item.addEventListener('click', e => {
            e.stopPropagation();
            showHotlistSubmenu(suggestions);
        });

        const refNode = commands[7] || null;
        suggestions.insertBefore(item, refNode);

        commands.slice(7).forEach((cmd, i) => {
            cmd.dataset.index = String(i + 8);
        });

        setupHoverManagement(suggestions);
        clearNativeActive(suggestions);
    }

    function updateSubmenuState(suggestions) {
        const offItem = suggestions.querySelector(`[data-command-id="${COMMAND_ID_OFF}"]`);
        const onItem = suggestions.querySelector(`[data-command-id="${COMMAND_ID_ON}"]`);
        if (offItem) offItem.querySelector('.icon i').className = `fas fa-fw ${enabled ? '' : 'fa-check'}`;
        if (onItem) onItem.querySelector('.icon i').className = `fas fa-fw ${enabled ? 'fa-check' : ''}`;
    }

    function showHotlistSubmenu(suggestions) {
        const modal = suggestions.closest('.modal');
        if (!modal) return;

        inSubmenu = true;

        const input = modal.querySelector('input.input');
        if (input) {
            input.placeholder = 'Hotlist...';
            input.value = '';
        }

        suggestions.textContent = '';
        delete suggestions.dataset.hotlistBound;
        setupHoverManagement(suggestions);

        const offItem = createCommandItem(COMMAND_ID_OFF, enabled ? '' : 'fa-check', 'off');
        const onItem = createCommandItem(COMMAND_ID_ON, enabled ? 'fa-check' : '', 'on');

        offItem.dataset.index = '0';
        onItem.dataset.index = '1';

        offItem.addEventListener('click', e => {
            e.stopPropagation();
            setEnabled(false);
            updateSubmenuState(suggestions);
        });

        onItem.addEventListener('click', e => {
            e.stopPropagation();
            setEnabled(true);
            updateSubmenuState(suggestions);
        });

        suggestions.appendChild(offItem);
        suggestions.appendChild(onItem);
    }

    function exitSubmenu() {
        inSubmenu = false;
        setTimeout(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true,
                cancelable: true
            }));
        }, 0);
    }

    function handleCommandlineSearch() {
        const input = document.querySelector('#commandLine .input');
        const suggestions = document.querySelector('#commandLine .suggestions');
        if (!input || !suggestions) return;

        const query = input.value.toLowerCase().trim();

        if (!query) {
            injectCommandlineItem(suggestions);
            return;
        }

        if ('hotlist'.startsWith(query)) {
            let hotlistCmd = suggestions.querySelector(`[data-command-id="${COMMAND_ID}"]`);
            if (!hotlistCmd) {
                hotlistCmd = createCommandItem(COMMAND_ID, 'fa-highlighter', 'Hotlist...');
                hotlistCmd.addEventListener('click', e => {
                    e.stopPropagation();
                    showHotlistSubmenu(suggestions);
                });
            }
            suggestions.insertBefore(hotlistCmd, suggestions.firstChild);
            setupHoverManagement(suggestions);
            clearNativeActive(suggestions);
        }
    }

    function handleMutation(m) {
        if (m.type === 'childList') {
            const target = m.target;

            if (target && target.nodeType === 1) {
                const wordEl = target.classList?.contains('word')
                ? target
                : target.closest?.('.word');

                if (wordEl) {
                    lettersCache.delete(wordEl);
                    markDirty(wordEl);
                    return;
                }
            }

            for (const node of m.addedNodes) {
                if (!node || node.nodeType !== 1) continue;

                if (node.classList?.contains('word')) {
                    markDirty(node);
                    continue;
                }

                if (node.classList?.contains('pageSettings')) {
                    createMenu();
                    continue;
                }

                if (node.classList?.contains('modal')) {
                    const suggestions = node.querySelector('.suggestions');
                    if (suggestions) {
                        setTimeout(() => injectCommandlineItem(suggestions), 0);
                    }
                    continue;
                }

                if (node.classList?.contains('suggestions')) {
                    setTimeout(() => injectCommandlineItem(node), 0);
                    continue;
                }

                const words = node.querySelectorAll?.('.word');
                if (words) {
                    for (const word of words) markDirty(word);
                }

                const modal = node.querySelector?.('.modal');
                if (modal) {
                    const suggestions = modal.querySelector('.suggestions');
                    if (suggestions) {
                        setTimeout(() => injectCommandlineItem(suggestions), 0);
                    }
                }
            }
        }

        if (m.type === 'attributes' && m.attributeName === 'class') {
            const target = m.target;
            if (!target || target.nodeType !== 1) return;

            if (target.classList?.contains('word')) {
                markDirty(target);
            } else if (target.tagName === 'LETTER') {
                const word = target.closest?.('.word');
                if (word) markDirty(word);
            }
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) handleMutation(m);
        if (pending.size) scheduleFlush();
    });

    document.addEventListener('input', e => {
        if (e.target.matches('#commandLine .input')) {
            if (inSubmenu) return;
            setTimeout(handleCommandlineSearch, 50);
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && inSubmenu) {
            e.stopImmediatePropagation();
            e.preventDefault();
            exitSubmenu();
        }
    }, true);

    load();
    reapplyAll();

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    window.addEventListener('beforeunload', () => observer.disconnect());
})();
