// ===== 8bit HeadFlicker Coin Flip Arena =====
// Physics-based coin flip with realistic 3D animation, predictions, and effects.

(function () {
  'use strict';

  // ===== STATE =====
  const state = {
    heads: 0, tails: 0, total: 0,
    history: [],
    streak: 0, streakType: null,
    isFlipping: false,
    prediction: null,
    soundEnabled: true,
    correctPredictions: 0, totalPredictions: 0,
    mode: 'single',
    bo3Heads: 0, bo3Tails: 0
  };

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const coin = $('#coin');
  const coinWrapper = $('#coinWrapper');
  const flipBtn = $('#flipBtn');
  const headsCountEl = $('#headsCount');
  const tailsCountEl = $('#tailsCount');
  const totalFlipsEl = $('#totalFlips');
  const resultText = $('#resultText');
  const resultSubtitle = $('#resultSubtitle');
  const predictionResult = $('#predictionResult');
  const historyTrack = $('#historyTrack');
  const streakBadge = $('#streakBadge');
  const streakText = $('#streakText');
  const probBarHeads = $('#probBarHeads');
  const probBarTails = $('#probBarTails');
  const probLabelHeads = $('#probLabelHeads');
  const probLabelTails = $('#probLabelTails');
  const screenFlash = $('#screenFlash');
  const confettiContainer = $('#confettiContainer');
  const coinShadow = $('#coinShadow');
  const soundToggle = $('#soundToggle');
  const soundWave1 = $('#soundWave1');
  const soundWave2 = $('#soundWave2');
  const resetBtn = $('#resetBtn');
  const pickHeads = $('#pickHeads');
  const pickTails = $('#pickTails');
  const modeSingle = $('#modeSingle');
  const modeBo3 = $('#modeBo3');
  const bo3Scoreboard = $('#bo3Scoreboard');
  const bo3DotsHeads = $('#bo3DotsHeads');
  const bo3DotsTails = $('#bo3DotsTails');

  // ===== AUDIO (Web Audio API) =====
  let audioCtx;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playFlipSound() {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    // Whoosh up
    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whoosh.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(200, ctx.currentTime);
    whoosh.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    whooshGain.gain.setValueAtTime(0.04, ctx.currentTime);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    whoosh.start(ctx.currentTime);
    whoosh.stop(ctx.currentTime + 0.5);

    // Metallic spinning ticks
    for (let i = 0; i < 12; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      // Ticks slow down over time
      const t = ctx.currentTime + 0.1 + i * (0.06 + i * 0.008);
      osc.frequency.value = 3000 + Math.random() * 2000;
      gain.gain.setValueAtTime(0.02 + (0.01 * (1 - i / 12)), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  function playLandSound() {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    // Thud impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    // Metallic ring
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.connect(ringGain);
    ringGain.connect(ctx.destination);
    ring.type = 'sine';
    ring.frequency.value = 2400;
    ringGain.gain.setValueAtTime(0.05, ctx.currentTime);
    ringGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    ring.start(ctx.currentTime);
    ring.stop(ctx.currentTime + 0.7);
  }

  function playResultSound(isHeads) {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    const freqs = isHeads ? [523.25, 659.25, 783.99] : [440, 554.37, 659.25];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.35 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(ctx.currentTime + 0.3 + i * 0.05);
      osc.stop(ctx.currentTime + 1.5);
    });
  }

  function playWinSound() {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime + 0.4 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.1 + 0.4);
      osc.start(ctx.currentTime + 0.4 + i * 0.1);
      osc.stop(ctx.currentTime + 0.4 + i * 0.1 + 0.5);
    });
  }

  // ===== PARTICLES =====
  function createParticles() {
    const container = $('#particles-container');
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      const color = Math.random() > 0.5 ? 'rgba(83, 252, 24, 0.3)' : 'rgba(255, 215, 0, 0.2)';
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${color};box-shadow:0 0 ${size*3}px ${color};animation-delay:${Math.random()*20}s;animation-duration:${Math.random()*15+15}s;`;
      container.appendChild(p);
    }
  }

  // ===== CONFETTI =====
  function spawnConfetti(c1, c2) {
    const colors = [c1, c2, '#FFD700', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      const size = Math.random() * 8 + 4;
      const shapes = ['50%', '0%', '30% 70% 70% 30% / 30% 30% 70% 70%'];
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${shapes[Math.floor(Math.random()*shapes.length)]};transform:rotate(${Math.random()*360}deg);animation-delay:${Math.random()*0.8}s;animation-duration:${2+Math.random()*2}s;`;
      confettiContainer.appendChild(p);
    }
    setTimeout(() => { confettiContainer.innerHTML = ''; }, 4000);
  }

  // ===== SCREEN FLASH =====
  function triggerFlash(type) {
    screenFlash.className = 'screen-flash';
    void screenFlash.offsetWidth;
    screenFlash.classList.add(type === 'H' ? 'flash-heads' : 'flash-tails');
    setTimeout(() => { screenFlash.className = 'screen-flash'; }, 600);
  }

  // ===== STAT COUNTER ANIMATION =====
  function animateValue(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const diff = target - current;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      el.textContent = Math.round(current + diff * (step / 12));
      if (step >= 12) { el.textContent = target; clearInterval(timer); }
    }, 25);
  }

  function updateStats() {
    animateValue(headsCountEl, state.heads);
    animateValue(tailsCountEl, state.tails);
    animateValue(totalFlipsEl, state.total);
  }

  function updateProbability() {
    if (state.total === 0) {
      probBarHeads.style.width = '50%';
      probBarTails.style.width = '50%';
      probLabelHeads.textContent = '50%';
      probLabelTails.textContent = '50%';
      return;
    }
    const hp = Math.round((state.heads / state.total) * 100);
    probBarHeads.style.width = hp + '%';
    probBarTails.style.width = (100 - hp) + '%';
    probLabelHeads.textContent = hp + '%';
    probLabelTails.textContent = (100 - hp) + '%';
  }

  function updateStreak(result) {
    if (state.streakType === result) state.streak++;
    else { state.streak = 1; state.streakType = result; }

    if (state.streak >= 2) {
      streakText.textContent = `${state.streak}× ${result === 'H' ? 'Heads' : 'Tails'} Streak!`;
      streakBadge.classList.add('show');
    } else {
      streakBadge.classList.remove('show');
    }
  }

  function addHistoryPip(result) {
    const pip = document.createElement('div');
    pip.className = `history-pip history-pip--${result === 'H' ? 'heads' : 'tails'}`;
    pip.textContent = result;
    historyTrack.prepend(pip);
    while (historyTrack.children.length > 15) historyTrack.removeChild(historyTrack.lastChild);
  }

  function showResult(result) {
    const isHeads = result === 'H';
    resultText.textContent = isHeads ? 'HEADS!' : 'TAILS!';
    resultText.className = `result-text ${isHeads ? 'heads' : 'tails'}`;

    const headsQuips = ['Crown side up! 👑', 'The king has spoken!', 'Heads takes it!', 'Big brain move! 🧠', 'Chess master energy ♟️'];
    const tailsQuips = ['Tails never fails! ⚡', 'Lightning strikes! ⚡', 'The flip has spoken!', 'Tails in the building! 🔥', 'Against the odds! 🎯'];
    resultSubtitle.textContent = (isHeads ? headsQuips : tailsQuips)[Math.floor(Math.random() * 5)];

    requestAnimationFrame(() => {
      resultText.classList.add('show');
      resultSubtitle.classList.add('show');
    });

    if (state.prediction) {
      state.totalPredictions++;
      const won = state.prediction === result;
      if (won) {
        state.correctPredictions++;
        predictionResult.textContent = '✓ CORRECT!';
        predictionResult.className = 'prediction-result win';
        playWinSound();
      } else {
        predictionResult.textContent = '✗ WRONG';
        predictionResult.className = 'prediction-result lose';
      }
      requestAnimationFrame(() => predictionResult.classList.add('show'));
    } else {
      predictionResult.className = 'prediction-result';
    }
  }

  function clearResult() {
    resultText.classList.remove('show');
    resultSubtitle.classList.remove('show');
    predictionResult.classList.remove('show');
  }

  // ===== PREDICTION =====
  function setPrediction(type) {
    if (state.isFlipping) return;
    state.prediction = type;
    pickHeads.classList.toggle('active', type === 'H');
    pickTails.classList.toggle('active', type === 'T');
  }
  pickHeads.addEventListener('click', () => setPrediction('H'));
  pickTails.addEventListener('click', () => setPrediction('T'));

  // ===== BO3 MODE =====
  function updateBo3UI() {
    if (state.mode === 'single') {
      bo3Scoreboard.style.display = 'none';
      return;
    }
    bo3Scoreboard.style.display = 'flex';
    
    Array.from(bo3DotsHeads.children).forEach((dot, i) => {
      dot.className = `bo3-dot ${i < state.bo3Heads ? 'filled heads' : ''}`;
    });
    Array.from(bo3DotsTails.children).forEach((dot, i) => {
      dot.className = `bo3-dot ${i < state.bo3Tails ? 'filled tails' : ''}`;
    });
  }

  function setMode(newMode) {
    if (state.isFlipping) return;
    state.mode = newMode;
    state.bo3Heads = 0;
    state.bo3Tails = 0;
    modeSingle.classList.toggle('active', newMode === 'single');
    modeBo3.classList.toggle('active', newMode === 'bo3');
    updateBo3UI();
    clearResult();
  }

  modeSingle.addEventListener('click', () => setMode('single'));
  modeBo3.addEventListener('click', () => setMode('bo3'));

  // ===========================================================
  //  ✨ PHYSICS-BASED COIN FLIP ANIMATION
  //  Uses requestAnimationFrame with real physics simulation:
  //  - Vertical trajectory with gravity + bounce
  //  - X-axis spin (fast → decelerating)
  //  - Y-axis wobble for realism
  //  - Z-axis tumble
  //  - Dynamic shadow that scales with height
  //  - Coin glow intensifies at peak
  // ===========================================================

  function flipCoin() {
    if (state.isFlipping) return;
    state.isFlipping = true;
    flipBtn.disabled = true;
    clearResult();

    const result = Math.random() < 0.5 ? 'H' : 'T';

    playFlipSound();

    // Animation parameters
    const DURATION = 2200;             // Total animation time (ms)
    const GRAVITY = 2800;              // px/s²
    const INITIAL_VELOCITY = -1100;    // px/s (upward)
    const SPIN_SPEED = 2400;           // deg/s on X axis
    const WOBBLE_SPEED = 180;          // deg/s on Y axis
    const WOBBLE_AMPLITUDE = 25;       // max wobble degrees
    const TUMBLE_SPEED = 90;           // deg/s on Z axis

    // We need the coin to land on the correct face.
    // Heads = rotateX is multiple of 360 (front face showing)
    // Tails = rotateX is 180 + multiple of 360
    // We'll calculate total spin and snap to the right face at the end.

    let lastTime = null;
    let elapsed = 0;
    let landed = false;
    let bounceCount = 0;
    const MAX_BOUNCES = 2;
    let velocity = INITIAL_VELOCITY;
    let posY = 0;
    let spinX = 0;
    let currentSpinSpeed = SPIN_SPEED;
    let landedSoundPlayed = false;

    // Position the shadow
    const coinRect = coinWrapper.getBoundingClientRect();
    const coinCenterX = coinRect.left + coinRect.width / 2;
    const coinBottomY = coinRect.bottom;
    coinShadow.style.display = 'block';
    coinShadow.style.left = (coinCenterX - 60) + 'px';
    coinShadow.style.top = (coinBottomY + 8) + 'px';

    function animate(now) {
      if (!lastTime) lastTime = now;
      let dtMs = now - lastTime;
      lastTime = now;
      
      // Cap delta time to prevent huge jumps if tab was backgrounded
      if (dtMs > 50) dtMs = 50;
      
      elapsed += dtMs;
      const t = elapsed / 1000; // seconds

      if (elapsed >= DURATION) {
        // Snap to final position
        const finalX = result === 'H' ? 0 : 180;
        coin.style.transform = `translateY(0px) rotateX(${finalX}deg) rotateY(0deg) rotateZ(0deg)`;
        coinShadow.style.opacity = '0.7';
        coinShadow.style.transform = 'scaleX(1) scaleY(1)';
        coinShadow.style.display = 'none';

        // Settle — show results
        if (!landedSoundPlayed) { playLandSound(); landedSoundPlayed = true; }

        state.total++;
        if (result === 'H') state.heads++; else state.tails++;
        state.history.unshift(result);

        updateStats();
        updateProbability();
        updateStreak(result);
        addHistoryPip(result);
        showResult(result);
        triggerFlash(result);
        playResultSound(result === 'H');

        if (state.streak >= 3) {
          spawnConfetti(
            result === 'H' ? '#D4F1F4' : '#E52730',
            result === 'H' ? '#00e5ff' : '#b31d24'
          );
        }

        // BO3 Logic
        if (state.mode === 'bo3') {
          if (result === 'H') state.bo3Heads++; else state.bo3Tails++;
          updateBo3UI();
          
          if (state.bo3Heads === 2 || state.bo3Tails === 2) {
            const winner = state.bo3Heads === 2 ? 'HEADS' : 'TAILS';
            const winnerClass = state.bo3Heads === 2 ? 'heads' : 'tails';
            
            setTimeout(() => {
              resultText.textContent = `${winner} WINS SERIES!`;
              resultText.className = `result-text ${winnerClass} show`;
              resultSubtitle.textContent = 'Best of 3 Complete';
              
              spawnConfetti(
                state.bo3Heads === 2 ? '#D4F1F4' : '#E52730',
                state.bo3Heads === 2 ? '#00e5ff' : '#b31d24'
              );
              playWinSound();
              
              // Auto reset BO3 after 4 seconds
              setTimeout(() => {
                if (state.mode === 'bo3' && (state.bo3Heads === 2 || state.bo3Tails === 2)) {
                  state.bo3Heads = 0; state.bo3Tails = 0;
                  updateBo3UI();
                  clearResult();
                }
              }, 4000);
            }, 1000); // 1s delay before showing series win
          }
        }

        state.isFlipping = false;
        flipBtn.disabled = false;
        return;
      }

      // === Phase 1: Free flight (0 → ~1.2s) ===
      // === Phase 2: Bounces + settling ===

      // Simple physics: position & velocity with bouncing
      const dt = 1 / 60; // approximate frame dt
      velocity += GRAVITY * dt;
      posY += velocity * dt;

      // Ground collision
      if (posY > 0) {
        posY = 0;
        bounceCount++;
        if (bounceCount <= MAX_BOUNCES) {
          velocity = -velocity * (0.3 / bounceCount); // decreasing bounce
          if (!landedSoundPlayed) { playLandSound(); landedSoundPlayed = true; }
        } else {
          velocity = 0;
          posY = 0;
        }
      }

      // Spin deceleration (fast spin → slow → stop)
      const progress = elapsed / DURATION;
      const spinDecay = Math.max(0, 1 - Math.pow(progress, 1.5));
      spinX += currentSpinSpeed * spinDecay * dt;

      // At the end, snap toward the target rotation
      const targetX = result === 'H' ? 0 : 180;
      if (progress > 0.75) {
        const snapProgress = (progress - 0.75) / 0.25;
        const eased = snapProgress * snapProgress * (3 - 2 * snapProgress); // smoothstep
        const nearestTarget = Math.round(spinX / 360) * 360 + targetX;
        spinX = spinX + (nearestTarget - spinX) * eased * 0.15;
      }

      // Wobble (diminishes over time)
      const wobble = Math.sin(t * WOBBLE_SPEED * Math.PI / 180) * WOBBLE_AMPLITUDE * spinDecay;

      // Tumble on Z
      const tumble = Math.sin(t * TUMBLE_SPEED * Math.PI / 180) * 8 * spinDecay;

      // Apply transform
      coin.style.transform = `translateY(${posY}px) rotateX(${spinX}deg) rotateY(${wobble}deg) rotateZ(${tumble}deg)`;

      // Dynamic shadow: grows smaller/lighter when coin is high, larger/darker when low
      const height = Math.abs(posY);
      const shadowScale = Math.max(0.3, 1 - height / 500);
      const shadowOpacity = Math.max(0.15, 0.7 - height / 600);
      coinShadow.style.opacity = shadowOpacity;
      coinShadow.style.transform = `scaleX(${shadowScale}) scaleY(${shadowScale * 0.5})`;

      // Glow ring intensity based on height
      const glowIntensity = Math.min(1, height / 200);
      coinWrapper.style.filter = `drop-shadow(0 0 ${10 + glowIntensity * 30}px rgba(255, 215, 0, ${0.2 + glowIntensity * 0.3}))`;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  // ===== EVENT LISTENERS =====
  flipBtn.addEventListener('click', flipCoin);
  coinWrapper.addEventListener('click', flipCoin);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space' || e.key === 'f' || e.key === 'F') { e.preventDefault(); flipCoin(); }
    if (e.key === 'h' || e.key === 'H') setPrediction('H');
    if (e.key === 't' || e.key === 'T') setPrediction('T');
  });

  soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundWave1.style.opacity = state.soundEnabled ? '1' : '0.2';
    soundWave2.style.opacity = state.soundEnabled ? '1' : '0.2';
  });

  resetBtn.addEventListener('click', () => {
    state.heads = 0; state.tails = 0; state.total = 0;
    state.history = []; state.streak = 0; state.streakType = null;
    state.prediction = null; state.correctPredictions = 0; state.totalPredictions = 0;
    state.bo3Heads = 0; state.bo3Tails = 0; updateBo3UI();
    headsCountEl.textContent = '0'; tailsCountEl.textContent = '0'; totalFlipsEl.textContent = '0';
    historyTrack.innerHTML = '';
    streakBadge.classList.remove('show');
    clearResult(); updateProbability();
    pickHeads.classList.remove('active'); pickTails.classList.remove('active');
    coin.style.transform = 'rotateX(0deg)';
    coinWrapper.style.filter = '';
  });

  // ===== CHAT RESIZER LOGIC =====
  const chatResizer = $('#chatResizer');
  const rightPanel = document.querySelector('.panel--right');
  let isResizing = false;

  if (chatResizer && rightPanel) {
    chatResizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      chatResizer.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      rightPanel.style.pointerEvents = 'none'; // prevents iframe from eating mouse events
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      // Calculate width from the right edge
      const newWidth = window.innerWidth - e.clientX - 20; // 20 is right padding
      rightPanel.style.width = `${Math.max(250, Math.min(newWidth, 800))}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        chatResizer.classList.remove('dragging');
        document.body.style.cursor = '';
        rightPanel.style.pointerEvents = '';
      }
    });
  }

  // ===== INIT =====
  createParticles();
  streakBadge.classList.remove('show');
})();
