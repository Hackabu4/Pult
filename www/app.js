(function () {
  const { TV_BRANDS, BUTTON_LABELS, prontoToPattern } = window.IR;

  const statusLed = document.getElementById('statusLed');
  const statusText = document.getElementById('statusText');
  const irWarning = document.getElementById('irWarning');
  const tvHint = document.getElementById('tvHint');

  let currentBrand = 'samsung';
  let hasIr = null;

  function getIrPlugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IrBlaster;
  }

  function setStatus(text, isError) {
    statusText.textContent = text;
    statusText.style.color = isError ? '#e0a894' : '';
  }

  function flashLed() {
    statusLed.classList.add('is-lit');
    setTimeout(() => statusLed.classList.remove('is-lit'), 220);
  }

  async function checkIrEmitter() {
    const plugin = getIrPlugin();
    if (!plugin) {
      hasIr = false;
      irWarning.classList.remove('hidden');
      setStatus('IR плагині табылмады (браузерде тексеру режимі)');
      return;
    }
    try {
      const res = await plugin.hasIrEmitter();
      hasIr = !!res.value;
      irWarning.classList.toggle('hidden', hasIr);
      setStatus(hasIr ? 'Дайын' : 'IR таратқыш табылмады');
    } catch (e) {
      hasIr = false;
      irWarning.classList.remove('hidden');
      setStatus('IR тексеру қатесі', true);
    }
  }

  async function sendPattern(frequency, pattern, label) {
    const plugin = getIrPlugin();
    if (!plugin) {
      setStatus('IR плагині қолжетімсіз (тек нативті қосымшада жұмыс істейді)', true);
      return;
    }
    if (hasIr === false) {
      setStatus('IR таратқыш жоқ, сигнал жіберілмеді', true);
      return;
    }
    try {
      setStatus(`Жіберілуде: ${label} (${frequency} Гц)`);
      await plugin.transmit({ frequency, pattern });
      flashLed();
      setStatus(`Жіберілді: ${label}`);
    } catch (e) {
      const msg = (e && e.message) || 'белгісіз қате';
      setStatus(`Қате: ${msg}`, true);
    }
  }

  document.querySelectorAll('.screen-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.screen-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.screen;
      document.getElementById('screen-tv').classList.toggle('hidden', target !== 'tv');
      document.getElementById('screen-custom').classList.toggle('hidden', target !== 'custom');
    });
  });

  function updateTvHint() {
    const brand = TV_BRANDS[currentBrand];
    const available = Object.keys(brand.buttons);
    const missing = Object.keys(BUTTON_LABELS).filter((b) => !available.includes(b));
    tvHint.textContent =
      missing.length > 0
        ? `${brand.name}: ${missing.map((b) => BUTTON_LABELS[b]).join(', ')} батырмалары бұл маркада қосылмаған.`
        : `${brand.name} кодтары жүктелді.`;
  }

  document.querySelectorAll('.brand-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.brand-pill').forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      currentBrand = pill.dataset.brand;
      updateTvHint();
    });
  });

  document.querySelectorAll('[data-button]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.button;
      const brand = TV_BRANDS[currentBrand];
      const generator = brand.buttons[key];
      if (!generator) {
        setStatus(`${brand.name}: ${BUTTON_LABELS[key] || key} қолжетімсіз`, true);
        return;
      }
      const { frequency, pattern } = generator();
      sendPattern(frequency, pattern, `${brand.name} ${BUTTON_LABELS[key] || key}`);
    });
  });

  const STORAGE_KEY = 'ir-remote-custom-codes';

  function loadCustomCodes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomCodes(codes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }

  function renderCustomList() {
    const list = document.getElementById('customList');
    const codes = loadCustomCodes();
    list.innerHTML = '';
    if (codes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'custom-empty';
      empty.textContent = 'Әзірге сақталған код жоқ.';
      list.appendChild(empty);
      return;
    }
    codes.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'custom-item';

      const name = document.createElement('span');
      name.className = 'custom-item-name';
      name.textContent = item.name;

      const sendBtn = document.createElement('button');
      sendBtn.className = 'custom-send';
      sendBtn.textContent = 'Жіберу';
      sendBtn.addEventListener('click', () => {
        try {
          const { frequency, pattern } = prontoToPattern(item.code);
          sendPattern(frequency, pattern, item.name);
        } catch (e) {
          setStatus(`Код қатесі: ${e.message}`, true);
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'custom-delete';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => {
        const updated = loadCustomCodes().filter((_, i) => i !== index);
        saveCustomCodes(updated);
        renderCustomList();
      });

      row.appendChild(name);
      row.appendChild(sendBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  document.getElementById('customForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('customName');
    const codeInput = document.getElementById('customCode');
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    if (!name || !code) return;
    try {
      prontoToPattern(code);
    } catch (err) {
      setStatus(`Код қатесі: ${err.message}`, true);
      return;
    }
    const codes = loadCustomCodes();
    codes.push({ name, code });
    saveCustomCodes(codes);
    nameInput.value = '';
    codeInput.value = '';
    renderCustomList();
  });

  updateTvHint();
  renderCustomList();

  if (window.Capacitor) {
    document.addEventListener('deviceready', checkIrEmitter);
    setTimeout(checkIrEmitter, 300);
  } else {
    checkIrEmitter();
  }
})();
