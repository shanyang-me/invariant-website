// Efference — main.js

(function () {
  'use strict';

  // --- Mobile nav toggle ---
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // nav height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Helpers ---
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  // --- Demo ---
  const API_URL = 'https://efference-api.fly.dev';
  const demoBtn = document.getElementById('demo-btn');
  const demoInput = document.getElementById('demo-input');
  const demoOutput = document.getElementById('demo-output');

  // Pre-computed fallback example
  const FALLBACK = {
    objects: [
      { name: "glass_cup", material: "glass", mass_kg: 0.3, bbox: { x: 200, y: 130, w: 36, h: 78 }, state: "resting" },
      { name: "table", material: "wood", mass_kg: 20.0, bbox: { x: 50, y: 210, w: 400, h: 200 }, state: "static" },
      { name: "floor", material: "concrete", mass_kg: null, bbox: { x: 0, y: 400, w: 512, h: 112 }, state: "static" }
    ],
    forces: [
      { type: "gravity", source: "earth", target: "glass_cup", magnitude: 2.94, direction: { x: 0, y: -1, z: 0 } },
      { type: "normal", source: "table", target: "glass_cup", magnitude: 2.94, direction: { x: 0, y: 1, z: 0 } },
      { type: "gravity", source: "earth", target: "table", magnitude: 196.2, direction: { x: 0, y: -1, z: 0 } },
      { type: "normal", source: "floor", target: "table", magnitude: 198.14, direction: { x: 0, y: 1, z: 0 } }
    ],
    trajectories: [
      {
        object_name: "glass_cup",
        points: [
          { t: 0.0, position: { x: 0.2, y: 0.8, z: 0 } },
          { t: 0.2, position: { x: 0.25, y: 0.65, z: 0 } },
          { t: 0.4, position: { x: 0.3, y: 0.3, z: 0 } },
          { t: 0.5, position: { x: 0.32, y: 0.0, z: 0 } }
        ]
      }
    ],
    constraints: [
      { type: "energy_decreasing", description: "Kinetic energy lost to fracture on impact.", confidence: 0.9 },
      { type: "parabolic_trajectory", description: "Glass follows a parabolic path as it falls.", confidence: 0.85 }
    ],
    will_happen: [
      "The glass will tip over the table edge and fall.",
      "The glass will shatter on impact with the floor."
    ],
    wont_happen: [
      "The glass will not remain balanced indefinitely.",
      "The glass will not float."
    ],
    reasoning: "With ~50% overhang, the glass's center of mass is near the tipping point. Any slight perturbation will cause it to rotate off the edge. Glass is brittle and will shatter on floor impact.",
    confidence: 0.88
  };

  demoBtn.addEventListener('click', async () => {
    const scene = demoInput.value.trim();
    if (!scene) {
      demoInput.focus();
      return;
    }

    demoOutput.innerHTML = '<div class="demo-loading">Analyzing scene...</div>';
    demoBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene }),
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      renderResult(data);
    } catch (err) {
      console.warn('API unavailable, using fallback:', err.message);
      renderResult(FALLBACK, true);
    } finally {
      demoBtn.disabled = false;
    }
  });

  function renderResult(data, isFallback = false) {
    let html = '<div class="demo-result">';

    if (isFallback) {
      html += '<p style="color:var(--text-muted);margin-bottom:16px;font-family:var(--font-body);font-size:0.85rem;">Server offline \u2014 showing pre-computed example.</p>';
    }

    // Objects
    html += '<h4>Objects</h4><div>';
    (data.objects || []).forEach(o => {
      html += `<span class="obj-tag">${esc(o.name)} \u00b7 ${esc(o.material)} \u00b7 ${o.mass_kg ? esc(o.mass_kg) + ' kg' : 'static'} \u00b7 ${esc(o.state)}</span>`;
    });
    html += '</div>';

    // Forces
    html += '<h4>Forces</h4>';
    (data.forces || []).forEach(f => {
      const dir = f.direction;
      html += `<div class="force-row">${esc(f.type)} &nbsp; ${esc(f.source)} \u2192 ${esc(f.target)} &nbsp; ${esc(f.magnitude)} N &nbsp; (${esc(dir.x)}, ${esc(dir.y)}, ${esc(dir.z)})</div>`;
    });

    // Trajectories
    if (data.trajectories && data.trajectories.length > 0) {
      html += '<h4>Trajectories</h4>';
      data.trajectories.forEach(t => {
        html += `<div style="margin-bottom:8px"><strong style="color:var(--text-primary)">${esc(t.object_name)}</strong>: `;
        html += t.points.map(p => `t=${esc(p.t)}s (${esc(p.position.x)}, ${esc(p.position.y)}, ${esc(p.position.z)})`).join(' \u2192 ');
        html += '</div>';
      });
    }

    // Will / Won't happen
    if (data.will_happen && data.will_happen.length > 0) {
      html += '<h4>Will Happen</h4><ul class="prediction-list">';
      data.will_happen.forEach(s => { html += `<li>${esc(s)}</li>`; });
      html += '</ul>';
    }
    if (data.wont_happen && data.wont_happen.length > 0) {
      html += '<h4>Won\'t Happen</h4><ul class="prediction-list wont-list">';
      data.wont_happen.forEach(s => { html += `<li>${esc(s)}</li>`; });
      html += '</ul>';
    }

    // Reasoning
    if (data.reasoning) {
      html += `<h4>Reasoning</h4><p class="reasoning-text">${esc(data.reasoning)}</p>`;
    }

    // Confidence
    if (typeof data.confidence === 'number') {
      const pct = Math.round(data.confidence * 100);
      html += `<h4>Confidence: ${pct}%</h4>`;
      html += `<div class="confidence-bar"><div class="confidence-fill" style="width:${pct}%"></div></div>`;
    }

    html += '</div>';
    demoOutput.innerHTML = html;
  }
})();
