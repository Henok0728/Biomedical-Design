// PPH Simulator Control Panel JavaScript
(function () {
  let ws = null;
  let activeSource = "SIMULATOR";

  // DOM Elements
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const backendUrlInput = document.getElementById("backendUrl");
  const connectBtn = document.getElementById("connectBtn");
  const clientCount = document.getElementById("clientCount");

  const sourceSimBtn = document.getElementById("sourceSimBtn");
  const sourceEspBtn = document.getElementById("sourceEspBtn");

  const tareBtn = document.getElementById("tareBtn");
  const calibBtn = document.getElementById("calibBtn");
  const knownWeightInput = document.getElementById("knownWeightInput");

  // Sliders & Values
  const massSlider = document.getElementById("massSlider");
  const massVal = document.getElementById("massVal");

  const rateSlider = document.getElementById("rateSlider");
  const rateVal = document.getElementById("rateVal");

  const hrSlider = document.getElementById("hrSlider");
  const hrVal = document.getElementById("hrVal");

  const spo2Slider = document.getElementById("spo2Slider");
  const spo2Val = document.getElementById("spo2Val");

  const bfSlider = document.getElementById("bfSlider");
  const bfVal = document.getElementById("bfVal");

  const motionSlider = document.getElementById("motionSlider");
  const motionVal = document.getElementById("motionVal");
  const qualityVal = document.getElementById("qualityVal");

  // Optical RGB elements
  const colorSwatch = document.getElementById("colorSwatch");
  const rVal = document.getElementById("rVal");
  const gVal = document.getElementById("gVal");
  const bVal = document.getElementById("bVal");
  const cVal = document.getElementById("cVal");

  // Health badges
  const maxHealth = document.getElementById("maxHealth");

  function connectWebSocket() {
    const url = backendUrlInput.value.trim();
    if (!url) return;

    if (ws) {
      ws.close();
    }

    updateStatus("CONNECTING...", "disconnected");

    try {
      ws = new WebSocket(url);
    } catch (err) {
      updateStatus("INVALID URL", "disconnected");
      return;
    }

    ws.onopen = function () {
      updateStatus("CONNECTED", "connected");
    };

    ws.onclose = function () {
      updateStatus("DISCONNECTED", "disconnected");
      // Auto reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = function () {
      updateStatus("ERROR", "disconnected");
    };

    ws.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "system_status") {
          activeSource = msg.source;
          updateSourceButtons(activeSource);
          if (msg.connectedClients !== undefined) {
            clientCount.textContent = msg.connectedClients;
          }
        } else if (msg.type === "sensor_data") {
          updateUIFromSensorData(msg.data, msg.source);
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };
  }

  function updateStatus(text, className) {
    statusText.textContent = text;
    statusPill.className = "status-pill " + className;
  }

  function updateSourceButtons(source) {
    activeSource = source;
    if (source === "SIMULATOR") {
      sourceSimBtn.classList.add("active");
      sourceEspBtn.classList.remove("active");
    } else {
      sourceEspBtn.classList.add("active");
      sourceSimBtn.classList.remove("active");
    }
  }

  function updateUIFromSensorData(data, source) {
    if (source) updateSourceButtons(source);

    // Load Cell
    massVal.textContent = Number(data.mass_g).toFixed(1);
    massSlider.value = data.mass_g;

    rateVal.textContent = Number(data.fluid_rate_g_min).toFixed(1);
    rateSlider.value = data.fluid_rate_g_min;

    // MAX30102
    if (data.heart_rate !== null) {
      hrVal.textContent = data.heart_rate;
      hrSlider.value = data.heart_rate;
      maxHealth.textContent = "OK";
      maxHealth.className = "sensor-badge";
    } else {
      hrVal.textContent = "ERR";
      maxHealth.textContent = "ERROR";
      maxHealth.className = "sensor-badge error";
    }

    if (data.spo2 !== null) {
      spo2Val.textContent = data.spo2;
      spo2Slider.value = data.spo2;
    } else {
      spo2Val.textContent = "ERR";
    }

    // Optical RGB
    if (data.red !== undefined) rVal.textContent = data.red;
    if (data.green !== undefined) gVal.textContent = data.green;
    if (data.blue !== undefined) bVal.textContent = data.blue;
    if (data.clear !== undefined) cVal.textContent = data.clear;

    const r = Math.min(255, data.red || 140);
    const g = Math.min(255, data.green || 160);
    const b = Math.min(255, data.blue || 142);
    colorSwatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    if (data.blood_fraction !== undefined) {
      bfVal.textContent = Number(data.blood_fraction).toFixed(2);
      bfSlider.value = data.blood_fraction;
    }

    // MPU6050 Motion
    motionVal.textContent = Number(data.motion_level).toFixed(2);
    motionSlider.value = data.motion_level;

    if (data.measurement_quality === "UNRELIABLE") {
      qualityVal.textContent = "UNRELIABLE";
      qualityVal.className = "quality-unreliable";
    } else {
      qualityVal.textContent = "GOOD";
      qualityVal.className = "quality-good";
    }
  }

  function sendMessage(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function sendSliderUpdate() {
    sendMessage({
      type: "simulation_update",
      data: {
        mass_g: parseFloat(massSlider.value),
        fluid_rate_g_min: parseFloat(rateSlider.value),
        heart_rate: parseInt(hrSlider.value, 10),
        spo2: parseInt(spo2Slider.value, 10),
        blood_fraction: parseFloat(bfSlider.value),
        motion_level: parseFloat(motionSlider.value)
      }
    });
  }

  // Event Listeners
  connectBtn.addEventListener("click", connectWebSocket);

  sourceSimBtn.addEventListener("click", () => {
    sendMessage({ type: "set_source", source: "SIMULATOR" });
  });

  sourceEspBtn.addEventListener("click", () => {
    sendMessage({ type: "set_source", source: "ESP32" });
  });

  // Scenario Buttons
  document.querySelectorAll(".scenario-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const scenario = btn.getAttribute("data-scenario");
      if (scenario) {
        sendMessage({ type: "simulation_command", command: scenario });
      }
    });
  });

  // Sliders
  [massSlider, rateSlider, hrSlider, spo2Slider, bfSlider, motionSlider].forEach((slider) => {
    slider.addEventListener("input", () => {
      // Update local text labels immediately
      if (slider === massSlider) massVal.textContent = Number(slider.value).toFixed(1);
      if (slider === rateSlider) rateVal.textContent = Number(slider.value).toFixed(1);
      if (slider === hrSlider) hrVal.textContent = slider.value;
      if (slider === spo2Slider) spo2Val.textContent = slider.value;
      if (slider === bfSlider) bfVal.textContent = Number(slider.value).toFixed(2);
      if (slider === motionSlider) motionVal.textContent = Number(slider.value).toFixed(2);

      sendSliderUpdate();
    });
  });

  tareBtn.addEventListener("click", () => {
    sendMessage({ type: "tare_load_cell" });
  });

  calibBtn.addEventListener("click", () => {
    const w = parseFloat(knownWeightInput.value);
    if (w > 0) {
      sendMessage({ type: "calibrate_load_cell", known_weight_g: w });
    }
  });

  // Auto connect on page load
  connectWebSocket();
})();
