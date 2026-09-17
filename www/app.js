(function () {
  const { TV_BRANDS, BUTTON_LABELS, prontoToPattern, necStandard, SCAN_POWER_COMMANDS } = window.IR;

  const statusLed = document.getElementById('statusLed');
  const statusText = document.getElementById('statusText');
  const irWarning = document.getElementById('irWarning');
  const tvHint = document.getElementById('tvHint');
  const scanProgress = document.getElementById('scanProgress');
  const scanStopBtn = document.getElementById('scanStopBtn');
  const scanBrandsBtn = document.getElementById('scanBrandsBtn');
  const scanCommandsBtn = document.getElementById('scanCommandsBtn');
  const scanAddressInput = document.getElementById('scanAddress');

  let currentBrand = 'samsung';
  let hasIr = null;
  let scanRunning = false;

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

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      await plugin.transmit({ frequency, pattern });
      flashLed();
    } catch (e) {
      const msg = (e && e.message) || 'белгісіз қате';
      setStatus(`Қате: ${msg}`, true);
    }
  }

  // --- Screen switching ---

  document.querySelectorAll('.screen-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (scanRunning) return;
      document.querySelectorAll('.screen-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.screen;
      document.getElementById('screen-tv').classList.toggle('hidden', target !== 'tv');
      document.getElementById('screen-scan').classList.toggle('hidden', target !== 'scan');
      document.getElementById('screen-custom').classList.toggle('hidden', target !== 'custom');
    });
  });

  // --- TV brand selector ---

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

  // --- TV buttons ---

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
      setStatus(`Жіберілді: ${brand.name} ${BUTTON_LABELS[key] || key}`);
    });
  });

  // --- Auto-scan ---

  function setScanUiRunning(running) {
    scanRunning = running;
    scanBrandsBtn.disabled = running;
    scanCommandsBtn.disabled = running;
    scanAddressInput.disabled = running;
    scanStopBtn.classList.toggle('hidden', !running);
  }

  function stopScan() {
    scanRunning = false;
  }

  scanStopBtn.addEventListener('click', () => {
    stopScan();
    setScanUiRunning(false);
    setStatus('Скан тоқтатылды');
  });

  scanBrandsBtn.addEventListener('click', async () => {
    setScanUiRunning(true);
    const brandKeys = Object.keys(TV_BRANDS);
    for (let i = 0; i < brandKeys.length; i++) {
      if (!scanRunning) break;
      const brand = TV_BRANDS[brandKeys[i]];
      scanProgress.textContent = `${i + 1}/${brandKeys.length}: ${brand.name} Power`;
      const { frequency, pattern } = brand.buttons.power();
      await sendPattern(frequency, pattern, `${brand.name} Power`);
      await delay(900);
    }
    setScanUiRunning(false);
    scanProgress.textContent = 'Скан аяқталды.';
  });

  scanCommandsBtn.addEventListener('click', async () => {
    const addr = parseInt(scanAddressInput.value || '00', 16);
    if (isNaN(addr)) {
      setStatus('Мекенжай hex форматында болу керек (мыс. 00)', true);
      return;
    }
    setScanUiRunning(true);
    for (let i = 0; i < SCAN_POWER_COMMANDS.length; i++) {
      if (!scanRunning) break;
      const cmd = SCAN_POWER_COMMANDS[i];
      scanProgress.textContent = `${i + 1}/${SCAN_POWER_COMMANDS.length}: code 0x${cmd.toString(16)}`;
      const { frequency, pattern } = necStandard(addr, cmd);
      await sendPattern(frequency, pattern, `Скан 0x${cmd.toString(16)}`);
      await delay(900);
    }
    setScanUiRunning(false);
    scanProgress.textContent = 'Скан аяқталды.';
  });

  // --- Custom codes (AC / other devices), stored in localStorage ---

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
          setStatus(`Жіберілді: ${item.name}`);
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

  // --- Init ---

  updateTvHint();
  renderCustomList();

  if (window.Capacitor) {
    document.addEventListener('deviceready', checkIrEmitter);
    setTimeout(checkIrEmitter, 300);
  } else {
    checkIrEmitter();
  }
})();
