const state = {
    attended: new Set(),
    working: new Set(),
    calendar: {
      year: new Date().getFullYear(),
      month: new Date().getMonth()
    },
    mode: 'calendar'
  };
  
  // Calendar Utilities
  const calendarUtils = {
    toggle(type) {
      const popup = document.getElementById(`${type}Popup`);
      const other = type === 'attended' ? 'workingPopup' : 'attendedPopup';
      document.getElementById(other).style.display = 'none';
      if (popup.innerHTML === '') this.render(type);
      popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    },
  
    render(type) {
      const popup = document.getElementById(`${type}Popup`);
      popup.innerHTML = '';
      const { year, month } = state.calendar;
      const date = new Date(year, month, 1);
      const firstDay = date.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
  
      const nav = document.createElement("div");
      nav.className = "nav";
      nav.innerHTML = `
        <button onclick="calendarUtils.changeMonth(-1, '${type}')"><</button>
        <span>${date.toLocaleString('default', { month: 'long' })} ${year}</span>
        <button onclick="calendarUtils.changeMonth(1, '${type}')">></button>
        <button onclick="calendarUtils.clear('${type}')">Clear</button>
      `;
      popup.appendChild(nav);
  
      const days = document.createElement("div");
      days.className = "calendar-days";
      days.innerHTML = "Sun Mon Tue Wed Thu Fri Sat".split(" ").map(d => `<div>${d}</div>`).join("");
      popup.appendChild(days);
  
      const calendar = document.createElement("div");
      calendar.className = "calendar";
      for (let i = 0; i < firstDay; i++) calendar.appendChild(document.createElement("div"));
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cell.innerText = d;
        if (state[type].has(dateStr)) cell.classList.add("selected");
        cell.onclick = () => {
          const today = new Date();
          const cellDate = new Date(year, month, d);
          if (cellDate < today.setHours(0, 0, 0, 0)) return; // Disable past dates
          state[type].has(dateStr) ? state[type].delete(dateStr) : state[type].add(dateStr);
          cell.classList.toggle("selected");
          calendarUtils.updateDisplay(type);
        };
        calendar.appendChild(cell);
      }
      popup.appendChild(calendar);
    },
  
    changeMonth(offset, type) {
      let { year, month } = state.calendar;
      month += offset;
      if (month < 0) { month = 11; year--; }
      if (month > 11) { month = 0; year++; }
      state.calendar = { year, month };
      this.render(type);
    },
  
    clear(type) {
      state[type].clear();
      this.updateDisplay(type);
      this.render(type);
    },
  
    updateDisplay(type) {
      const div = document.getElementById(`${type}Dates`);
      const sorted = [...state[type]].sort();
      div.innerHTML = `<strong>${type.charAt(0).toUpperCase() + type.slice(1)} Days:</strong> (${sorted.length})<br>${sorted.join(', ')}`;
      saveState();
    }
  };
  
  // Load state from localStorage
  window.onload = () => {
    try {
      const savedState = localStorage.getItem("bunkCalculatorState");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        state.attended = new Set(parsed.attended || []);
        state.working = new Set(parsed.working || []);
        document.getElementById("required").value = parsed.required || "";
        document.getElementById("attendedManual").value = parsed.attendedManual || "";
        document.getElementById("workingManual").value = parsed.workingManual || "";
        calendarUtils.updateDisplay("attended");
        calendarUtils.updateDisplay("working");
      }
    } catch (e) {
      console.error("Failed to load state:", e);
    }
  };
  
  function switchMode(mode) {
    state.mode = mode;
    document.getElementById('calendarInputs').classList.toggle('hidden', mode !== 'calendar');
    document.getElementById('manualInputs').classList.toggle('hidden', mode !== 'manual');
    saveState();
  }
  
  function calculateBunk() {
    const required = parseFloat(document.getElementById("required").value);
    const result = document.getElementById("result");
    if (!required || required < 0 || required > 100) {
      result.innerHTML = "<span style='color:red'>Please enter a valid percentage (0-100).</span>";
      return;
    }
  
    let attended = state.mode === 'calendar' ? state.attended.size : parseInt(document.getElementById("attendedManual").value) || 0;
    let working = state.mode === 'calendar' ? state.working.size : parseInt(document.getElementById("workingManual").value) || 0;
  
    if (attended < 0 || working < 0) {
      result.innerHTML = "<span style='color:red'>Days cannot be negative.</span>";
      return;
    }
    if (attended > working) {
      result.innerHTML = "<span style='color:red'>Attended days cannot exceed working days.</span>";
      return;
    }
    if (working === 0) {
      result.innerHTML = "<span style='color:red'>Working days must be greater than 0.</span>";
      return;
    }
  
    let bunks = 0;
    while (((attended / (working + bunks)) * 100) >= required) bunks++;
    bunks--;
    const percent = ((attended / working) * 100).toFixed(2);
    result.innerHTML = bunks < 0
      ? `<span style="color:red;">No more bunks allowed. Current: ${percent}%</span>`
      : `<span style="color:green;">You can bunk <b>${bunks}</b> more days. Current: ${percent}%</span>`;
  }
  
  function calculateReverse() {
    const desired = parseInt(document.getElementById("desiredBunks").value) || 0;
    const required = parseFloat(document.getElementById("required").value);
    const totalDays = state.mode === 'calendar' ? state.working.size : parseInt(document.getElementById("workingManual").value) || 0;
    const reverseResult = document.getElementById("reverseResult");
  
    if (!required || required < 0 || required > 100) {
      reverseResult.innerHTML = "<span style='color:red'>Provide a valid required % (0-100).</span>";
      return;
    }
    if (desired < 0) {
      reverseResult.innerHTML = "<span style='color:red'>Desired bunks cannot be negative.</span>";
      return;
    }
    if (totalDays <= desired) {
      reverseResult.innerHTML = "<span style='color:red'>Total days must exceed desired bunk days.</span>";
      return;
    }
  
    const mustAttend = Math.ceil((required / 100) * totalDays);
    reverseResult.innerHTML = `To have ${totalDays} total days and bunk ${desired} days, you must attend at least <b>${mustAttend}</b> days.`;
  }
  
  function suggestBunkDays() {
    const required = parseFloat(document.getElementById("required").value);
    const attended = state.mode === 'calendar' ? state.attended.size : parseInt(document.getElementById("attendedManual").value) || 0;
    const working = state.mode === 'calendar' ? state.working.size : parseInt(document.getElementById("workingManual").value) || 0;
    const planner = document.getElementById("planner");
  
    if (!required || required < 0 || required > 100) {
      planner.innerHTML = "<span style='color:red'>Provide a valid required % (0-100).</span>";
      return;
    }
    if (working === 0) {
      planner.innerHTML = "<span style='color:red'>Working days must be greater than 0.</span>";
      return;
    }
  
    let bunks = 0;
    while (((attended / (working + bunks)) * 100) >= required) bunks++;
    bunks--;
    if (bunks <= 0) {
      planner.innerHTML = "No more bunking possible without dropping attendance.";
      return;
    }
  
    const suggestions = [];
    const today = new Date();
    let daysAdded = 0;
    let offset = 1;
    while (daysAdded < bunks) {
      const next = new Date(today);
      next.setDate(today.getDate() + offset);
      if (next.getDay() !== 0 && next.getDay() !== 6) {
        suggestions.push(next.toDateString());
        daysAdded++;
      }
      offset++;
    }
    planner.innerHTML = `<b>Suggested bunk days (avoiding weekends):</b><br>${suggestions.join('<br>')}`;
  }
  
  function toggleDarkMode() {
    document.body.classList.toggle('dark');
  }
  
  function resetAll() {
    state.attended.clear();
    state.working.clear();
    document.getElementById("required").value = "";
    document.getElementById("attendedManual").value = "";
    document.getElementById("workingManual").value = "";
    document.getElementById("desiredBunks").value = "";
    document.getElementById("result").innerHTML = "";
    document.getElementById("reverseResult").innerHTML = "";
    document.getElementById("planner").innerHTML = "";
    calendarUtils.updateDisplay("attended");
    calendarUtils.updateDisplay("working");
    saveState();
  }
  
  function saveState() {
    try {
      const toSave = {
        attended: [...state.attended],
        working: [...state.working],
        required: document.getElementById("required").value,
        attendedManual: document.getElementById("attendedManual").value,
        workingManual: document.getElementById("workingManual").value
      };
      localStorage.setItem("bunkCalculatorState", JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  }
  
  // Debounced saveState
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }
  const debouncedSave = debounce(saveState, 300);
  
  // Event Listeners
  document.getElementById("required").addEventListener("input", debouncedSave);
  document.getElementById("attendedManual").addEventListener("input", debouncedSave);
  document.getElementById("workingManual").addEventListener("input", debouncedSave);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.calendar-popup') && !e.target.matches('button')) {
      document.getElementById('attendedPopup').style.display = 'none';
      document.getElementById('workingPopup').style.display = 'none';
    }
  });