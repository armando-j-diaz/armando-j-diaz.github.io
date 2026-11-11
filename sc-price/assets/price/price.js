/* Sunny Coast instant price tool (/price/): one question per screen, progress bar, fade between screens.
   All prices come from /assets/pricing.json (the one settings file). */
(function () {
  "use strict";
  var S = null;
  var st = { size: null, system: null, tier: null, addons: {}, precise: {}, preciseStep: 0, contact: null, screen: "intro", history: [] };
  var loadedAt = Date.now();
  var PREVIEW = true; // review copy: always preview, never sends
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BRANDS = ["goodman", "carrier", "trane", "rheem", "lennox"];
  var TOUCH = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  // FLOW = the order of the screens (set "flow" in pricing.json; ?flow= overrides it in preview only)
  //   "after": prices on the 3 cards first, then upgrades, then the estimate (the original)
  //   "before": upgrades first, then the 3 cards with prices that already include them
  //   "last": the 3 cards without prices, then upgrades, and the first price shows on the estimate
  var FLOWS = { after: "Prices first", before: "Upgrades first", last: "Price at the end" };
  var FLOW = "after";
  var STEPS = ["size", "system", "prices", "addons", "estimate", "contact", "done"];
  var STEP_LABEL = { size: "Home size", system: "Your system", prices: "Your prices", addons: "Upgrades", estimate: "Your estimate", contact: "Contact", special: "Contact", done: "Done" };
  function setFlow(f) {
    FLOW = FLOWS[f] ? f : "after";
    STEPS = FLOW === "before" ? ["size", "system", "addons", "prices", "estimate", "contact", "done"] : ["size", "system", "prices", "addons", "estimate", "contact", "done"];
    STEP_LABEL.prices = FLOW === "last" ? "Pick a system" : "Your prices";
  }
  function joinAnd(l) { return l.length < 2 ? l.join("") : l.slice(0, -1).join(", ") + " and " + l[l.length - 1]; }
  function chosenAddons() { return S.addons.filter(function (a) { return st.addons[a.id]; }); }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ga(n, p) { try { if (window.gtag) window.gtag("event", n, p || {}); } catch (e) {} }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function missing(t) { return PREVIEW ? '<span class="pt-missing">' + (t || "$ —") + "</span>" : ""; }

  // ---------- price math ----------
  function sizeObj() { return S.sizes.filter(function (x) { return x.id === st.size; })[0]; }
  function sysObj() { return S.systems.filter(function (x) { return x.id === st.system; })[0]; }
  function sysKey() { var s = sysObj(); return s ? (s.use || s.id) : null; }
  function tons() { var z = sizeObj(); return z ? z.tons : null; }
  function recCount() { var n = S.addons.filter(function (a) { return a.active && a.recommended; }).length; return n === 2 ? "2" : String(n); }
  function tierObj(id) { return S.tiers.filter(function (t) { return t.id === id; })[0]; }
  function add(a, b) { if (!a || !b) return null; return [a[0] + b[0], a[1] + b[1]]; }
  function adjustments() {
    var out = [0, 0], ok = true, lines = [];
    (S.adjustments || []).forEach(function (a) {
      var qx = (S.questions || []).filter(function (x) { return x.id === a.question; })[0];
      if (qx && qx.only_for && qx.only_for.indexOf(sysKey()) < 0) return;
      if (st.precise[a.question] === a.answer) {
        if (a.price) { out = add(out, a.price); lines.push([a.label, a.price]); } else { ok = false; lines.push([a.label, null]); }
      }
    });
    return { sum: ok ? out : null, lines: lines };
  }
  function preciseQuestions() {
    // a question shows if it fits this system type, and (live site) one of its answers adds cost
    return (S.questions || []).filter(function (x) {
      if (x.only_for && x.only_for.indexOf(sysKey()) < 0) return false;
      return PREVIEW || (S.adjustments || []).some(function (a) { return a.question === x.id && a.price; });
    });
  }
  function basePrice(t) { return t.prices && t.prices[sysKey()] && t.prices[sysKey()][String(tons())]; }
  function tierRange(t) { var p = basePrice(t); return p ? add(p, adjustments().sum) : null; }
  function addonRange() {
    var out = [0, 0], ok = true;
    S.addons.forEach(function (a) { if (st.addons[a.id]) { if (a.price) out = add(out, a.price); else ok = false; } });
    return ok ? out : null;
  }
  function rangeText(r) { return r ? money(r[0]) + " to " + money(r[1]) : null; }
  function monthly(low) {
    var f = S.financing || {};
    if (!f.available || !f.months || f.apr_percent == null || !low) return null;
    var n = f.months, r = f.apr_percent / 1200;
    return "or about " + money(r ? low * r / (1 - Math.pow(1 + r, -n)) : low / n) + "/month with financing";
  }
  function monthlyLine(r) {
    var m = r ? monthly(r[0]) : null;
    if (m) return '<p class="pt-monthly">' + m + "*</p>";
    if (S.financing && S.financing.available) return '<p class="pt-monthly">' + (PREVIEW ? missing("monthly payment: needs financing terms") : "Financing available on qualifying installs") + "</p>";
    return "";
  }

  // ---------- screen engine ----------
  function progress(screen) {
    var bar = $("pt-progress"); if (!bar) return;
    if (screen === "intro") { bar.hidden = true; return; }
    bar.hidden = false;
    var key = screen === "precise" ? st.history[st.history.length - 1] : screen === "special" ? "contact" : screen;
    var i = STEPS.indexOf(key); if (i < 0) return;
    var count = preciseQuestions().length;
    if (i > STEPS.indexOf("system")) i += count;
    if (screen === "precise" && key === "system") i += st.preciseStep + 1;
    var pct = Math.round(((i + 1) / (STEPS.length + count)) * 100);
    $("pt-progress-fill").style.width = pct + "%";
    bar.setAttribute("aria-valuenow", String(pct));
    $("pt-progress-label").textContent = screen === "precise"
      ? "Home details · " + (st.preciseStep + 1) + " of " + count
      : STEP_LABEL[screen] || "";
  }
  function go(screen, opts) {
    opts = opts || {};
    if (!opts.back && st.screen !== screen) st.history.push(st.screen);
    st.screen = screen;
    var stage = $("pt-stage");
    var swap = function () {
      stage.innerHTML = SCREENS[screen]();
      BIND[screen] && BIND[screen]();
      progress(screen);
      if (!opts.noScroll) {
        var h = stage.querySelector("h1, h2");
        if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) {} }
        var app = $("pt-app"), top = app.getBoundingClientRect().top;
        if (top < 0 || top > 110) app.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      }
      requestAnimationFrame(function () { stage.classList.remove("is-out"); });
      if (screen === "prices") startBrandFade();
    };
    if (REDUCED || opts.instant) { stage.classList.remove("is-out"); swap(); return; }
    stage.classList.add("is-out");
    setTimeout(swap, 260);
  }
  function back() {
    var prev = st.history.pop() || "intro";
    if (prev === "precise") st.preciseStep = preciseQuestions().length - 1;
    go(prev, { back: true });
  }
  function openPrecise() {
    if ($("pt-stage").classList.contains("is-out")) return;
    st.preciseStep = 0;
    go("precise");
  }
  function nav(backLabel, nextLabel, nextId, disabled) {
    return '<div class="pt-nav">' +
      (backLabel ? '<button type="button" class="pt-back" data-back>&larr; ' + backLabel + "</button>" : "<span></span>") +
      (nextLabel ? '<button type="button" class="btn btn-primary pt-next" id="' + nextId + '"' + (disabled ? " disabled" : "") + ">" + nextLabel + "</button>" : "") + "</div>";
  }
  function bindBack() { var b = document.querySelector("#pt-stage [data-back]"); if (b) b.addEventListener("click", back); }
  function tiles(name, items, wide, labelFn, current) {
    return '<div class="pt-tiles' + (wide ? " pt-tiles--wide" : "") + '" role="radiogroup">' + items.map(function (x) {
      return '<label class="pt-tile"><input type="radio" name="' + name + '" value="' + esc(x.id) + '"' + (current === x.id ? " checked" : "") + "><span>" + labelFn(x) + "</span></label>";
    }).join("") + "</div>";
  }
  function bindTiles(name, nextId, onPick) {
    document.querySelectorAll('#pt-stage input[name="' + name + '"]').forEach(function (i) {
      i.addEventListener("change", function () { onPick(i.value); var n = $(nextId); if (n) n.disabled = false; });
    });
  }

  // ---------- screens ----------
  var SCREENS = {
    intro: function () {
      return '<div class="pt-screen pt-intro"><p class="eyebrow">New AC prices</p><h1 class="display">New AC prices for your Miami home</h1>' +
        '<p class="lede">Answer a few quick questions to get an estimate. No phone number needed.</p>' +
        '<button type="button" class="btn btn-primary pt-start" id="pt-start">See what a new AC costs for your home</button>' +
        '<p class="pt-fine">We confirm your price at a free visit before any work starts.</p></div>';
    },
    size: function () {
      return '<div class="pt-screen"><h2 class="pt-h">How big is your home?</h2><p class="pt-help">Count the living space you cool. A good guess is fine.</p>' +
        tiles("size", S.sizes, false, function (x) { return esc(x.label); }, st.size) + nav("Back", "Continue", "pt-next", !st.size) + "</div>";
    },
    system: function () {
      return '<div class="pt-screen"><h2 class="pt-h">What kind of system do you have now?</h2>' +
        tiles("system", S.systems, true, function (x) { return esc(x.label); }, st.system) + nav("Back", "Continue", "pt-next", !st.system) + "</div>";
    },
    prices: function () {
      var t = tons(), sz = "For a " + t + "-ton system" + (st.system === "unsure" ? ", inside and outside unit" : "");
      var head, sub, teaser;
      if (FLOW === "last") {
        head = "Pick your system"; sub = sz + ". Your price comes after the next step.";
        teaser = "Pick one to see the upgrades we recommend in Miami, and your price.";
      } else if (FLOW === "before") {
        var ch = chosenAddons();
        head = "Your price ranges"; sub = sz + (ch.length ? ", with " + joinAnd(ch.map(function (a) { return esc(a.short || a.name); })) + "." : ", no upgrades.");
        teaser = "Pick the one that fits your home.";
      } else {
        head = "Your price ranges"; sub = sz + ".";
        teaser = (TOUCH ? "Tap" : "Click") + " <strong>Customize</strong> to see our recommendations.";
      }
      return '<div class="pt-screen pt-screen--wide"><h2 class="pt-h">' + head + "</h2>" +
        '<p class="pt-sub">' + sub + "</p>" +
        '<p class="pt-teaser">' + teaser + "</p>" +
        '<div class="pt-tiers">' + S.tiers.map(tierCard).join("") + "</div>" + brandStrip() +
        (preciseQuestions().length ? '<button type="button" class="pt-link" id="pt-precise-open">Change my home details</button>' : "") +
        (FLOW === "last" ? "" : '<p class="pt-help pt-foot">*Monthly payments are an estimate. They depend on approval by the lender.</p>') +
        nav(FLOW === "before" ? "Change my upgrades" : "Change my answers", null) + "</div>";
    },
    precise: function () {
      var question = preciseQuestions()[st.preciseStep];
      var answer = st.precise[question.id];
      var options = question.options.map(function (o) { return { id: o[0], label: o[1] }; });
      return '<div class="pt-screen"><h2 class="pt-h">' + esc(question.label) + '</h2>' +
        '<p class="pt-help">' + esc(question.help || "Optional. Skip if you’re not sure.") + "</p>" +
        tiles("pt-detail", options, false, function (o) { return esc(o.label); }, answer) +
        '<button type="button" class="pt-link" id="pt-skip" ' + (answer ? "" : "hidden") + '>Skip this question</button>' +
        nav("Back", answer ? "Continue" : "Skip", "pt-next", false) + "</div>";
    },
    addons: function () {
      var t = tierObj(st.tier), act = S.addons.filter(function (a) { return a.active; });
      var price = function (a) { return a.price ? "+" + rangeText(a.price) : (PREVIEW ? missing("+$ —") : "Ask us"); };
      var rec = act.filter(function (a) { return a.recommended; }).map(function (a) {
        return '<article class="pt-insight"><h3>' + esc(a.name) + '</h3>' +
          (a.problem ? '<p class="pt-insight-k">The problem</p><p>' + esc(a.problem) + "</p>" : "") +
          '<p class="pt-insight-k">What it does</p><p>' + esc(a.fix || a.why) + "</p>" +
          '<label class="pt-insight-add"><input type="checkbox" value="' + a.id + '"' + (st.addons[a.id] ? " checked" : "") + '><span>Add to my system</span><span class="pt-addon-price">' + price(a) + "</span></label></article>";
      }).join("");
      var more = act.filter(function (a) { return !a.recommended; }).map(function (a) {
        return '<li><label class="pt-addon"><input type="checkbox" value="' + a.id + '"' + (st.addons[a.id] ? " checked" : "") + '><span><span class="pt-addon-name">' + esc(a.name) + '</span><span class="pt-addon-why">' + esc(a.why) + '</span></span><span class="pt-addon-price">' + price(a) + "</span></label></li>";
      }).join("");
      var help = FLOW === "before" ? "Most homeowners only hear about these after something goes wrong. Check the ones you want and we'll add them to your prices on the next screen."
        : "Most homeowners only hear about these after something goes wrong. Nothing is added unless you check it.";
      return '<div class="pt-screen">' + (t ? '<p class="pt-chosen">Your system: <strong>' + esc(t.name) + "</strong></p>" : "") +
        '<h2 class="pt-h">' + (FLOW === "before" ? "First, " + recCount() + " upgrades we recommend in Miami" : "What we\'d add in a Miami home") + '</h2><p class="pt-help">' + help + "</p>" +
        '<div class="pt-insights">' + rec + "</div>" +
        (more ? '<details class="pt-more"><summary>More options</summary><ul class="pt-addons">' + more + "</ul></details>" : "") +
        nav("Back", FLOW === "before" ? "See my prices" : FLOW === "last" ? "See my price" : "See my estimate", "pt-next", false) + "</div>";
    },
    estimate: function () {
      var t = tierObj(st.tier), tr = tierRange(t), base = basePrice(t);
      var rows = [[t.name + " system, " + tons() + " tons", base ? rangeText(base) : null]];
      adjustments().lines.forEach(function (l) { rows.push([l[0], l[1] ? "+" + rangeText(l[1]) : null]); });
      S.addons.forEach(function (a) { if (st.addons[a.id]) rows.push([a.name, a.price ? "+" + rangeText(a.price) : null]); });
      var total = add(tr, addonRange());
      return '<div class="pt-screen"><h2 class="pt-h">Your estimate</h2><div class="pt-sum"><ul class="pt-sum-rows">' +
        rows.map(function (r) { return "<li><span>" + esc(r[0]) + "</span><span>" + (r[1] || (PREVIEW ? missing() : "At your visit")) + "</span></li>"; }).join("") +
        '</ul><div class="pt-total"><span>Estimated total</span><strong>' + (total ? rangeText(total) : (PREVIEW ? missing("$ — to $ —") : "At your free visit")) + "</strong></div>" + monthlyLine(total) +
        '<p class="pt-note">This is an estimate. We confirm your final price at a free visit to your home, before any work starts. If something at your home changes the price, we explain why and give you the new price in writing first.</p></div>' +
        (preciseQuestions().length ? '<button type="button" class="pt-link pt-link--est" id="pt-precise-est">Change my home details</button>' : "") +
        '<div class="pt-ask"><h3>Want us to call you to talk through these options?</h3><p class="pt-sub">No pressure. We answer your questions and set up your free visit if you want one.</p>' +
        '<div class="pt-ask-btns"><button type="button" class="btn btn-primary" id="pt-yes">Yes, call me</button><button type="button" class="btn btn-outline" id="pt-no">No thanks</button></div></div>' +
        nav("Back", null) + "</div>";
    },
    contact: function () { return '<div class="pt-screen">' + leadForm(st.contact) + nav("Back", null) + "</div>"; },
    special: function () {
      var z = sizeObj(), s = sysObj(), why = !s.priced ? s.note : z.note;
      return '<div class="pt-screen"><h2 class="pt-h">Let\'s get you a real price</h2><p class="pt-sub">' + esc(why) + "</p>" + leadForm("call", true) + nav("Back", null) + "</div>";
    },
    done: function () {
      var call = st.contact === "call";
      return '<div class="pt-screen pt-done"><div class="pt-check" aria-hidden="true"></div><h2 class="pt-h">' + (PREVIEW ? "Preview: nothing was sent" : "Thank you, you're all set") + "</h2>" +
        '<p class="pt-sub">' + (PREVIEW ? "On the live site this " + (call ? "sends your request to our team." : "emails the customer this estimate.") :
          (call ? "We got your request and will call you as soon as we can." : "We'll email your estimate shortly. Look it over whenever you're ready.")) + "</p>" +
        '<p>Questions now? Call or text <a href="' + S.phone_href + '">' + esc(S.phone) + "</a>.</p>" +
        '<button type="button" class="pt-link" id="pt-restart">Start over</button></div>';
    }
  };

  var BIND = {
    intro: function () { $("pt-start").addEventListener("click", function () { ga("price_tool_start"); go("size"); }); },
    size: function () { bindBack(); bindTiles("size", "pt-next", function (v) { st.size = v; }); $("pt-next").addEventListener("click", function () { go("system"); }); },
    system: function () {
      bindBack(); bindTiles("system", "pt-next", function (v) { st.system = v; });
      $("pt-next").addEventListener("click", function () {
        if ($("pt-stage").classList.contains("is-out")) return;
        st.tier = null; ga("price_tool_result", { size: st.size, system: st.system });
        var questions = preciseQuestions();
        Object.keys(st.precise).forEach(function (id) {
          if (!questions.some(function (q) { return q.id === id; })) delete st.precise[id];
        });
        if (!sysObj().priced || !tons()) go("special");
        else if (questions.length) openPrecise();
        else go(FLOW === "before" ? "addons" : "prices");
      });
    },
    prices: function () {
      bindBack();
      document.querySelectorAll(".pt-tier").forEach(function (card) {
        var b = card.querySelector(".pt-choose");
        card.addEventListener("click", function (e) { if (e.target.closest("a")) return; st.tier = b.getAttribute("data-tier"); ga("price_tool_tier", { tier: st.tier, flow: FLOW }); go(FLOW === "before" ? "estimate" : "addons"); });
      });
      var po = $("pt-precise-open"); if (po) po.addEventListener("click", openPrecise);
    },
    precise: function () {
      var stage = $("pt-stage");
      var questions = preciseQuestions();
      var question = questions[st.preciseStep];
      var next = $("pt-next");
      var skip = $("pt-skip");
      stage.querySelector("[data-back]").addEventListener("click", function () {
        if (stage.classList.contains("is-out")) return;
        if (st.preciseStep === 0) { back(); return; }
        st.preciseStep--;
        go("precise");
      });
      function advance(clearAnswer) {
        if (stage.classList.contains("is-out")) return;
        if (clearAnswer) delete st.precise[question.id];
        if (st.preciseStep === questions.length - 1) {
          if (st.history[st.history.length - 1] === "system") go(FLOW === "before" ? "addons" : "prices");
          else back();
          return;
        }
        st.preciseStep++;
        go("precise");
      }
      bindTiles("pt-detail", "pt-next", function (value) {
        st.precise[question.id] = value;
        ga("price_tool_precise", { q: question.id });
        next.textContent = "Continue";
        skip.hidden = false;
      });
      skip.addEventListener("click", function () { advance(true); });
      next.addEventListener("click", function () { advance(false); });
    },
    addons: function () {
      bindBack();
      document.querySelectorAll('#pt-stage input[type="checkbox"]').forEach(function (c) {
        c.addEventListener("change", function () { st.addons[c.value] = c.checked; ga("price_tool_addon", { addon: c.value, on: c.checked }); });
      });
      $("pt-next").addEventListener("click", function () { go(FLOW === "before" ? "prices" : "estimate"); });
    },
    estimate: function () {
      bindBack();
      var pe = $("pt-precise-est"); if (pe) pe.addEventListener("click", openPrecise);
      $("pt-yes").addEventListener("click", function () { st.contact = "call"; ga("price_tool_call_yes"); go("contact"); });
      $("pt-no").addEventListener("click", function () { st.contact = "email"; ga("price_tool_call_no"); showBar(); go("contact"); });
    },
    contact: function () { bindBack(); bindLead(); },
    special: function () { st.contact = "call"; bindBack(); bindLead(); },
    done: function () {
      $("pt-restart").addEventListener("click", function () {
        st.size = st.system = st.tier = st.contact = null; st.addons = {}; st.precise = {}; st.history = [];
        var bar = $("pt-bar"); if (bar) { bar.remove(); document.body.classList.remove("pt-has-bar"); }
        go("intro", { back: true });
      });
    }
  };

  // ---------- pieces ----------
  function brandStrip() {
    return '<div class="pt-brands"><div class="pt-brand-photos" id="pt-brand-photos">' +
      BRANDS.map(function (b, i) { return '<img src="/sc-price/assets/price/brands/' + b + '.jpg" alt="A ' + b.charAt(0).toUpperCase() + b.slice(1) + ' unit from one of our team\'s jobs" class="b-' + b + (i === 0 ? " on" : "") + '">'; }).join("") +
      '</div><p class="pt-brands-text"><strong>The truth about brands</strong>Brands aren\'t built like they used to be. Today the big names are much alike, and most give 10+ years on parts. We install them all, so if you have a favorite, just tell us.</p></div>';
  }
  function startBrandFade() {
    clearInterval(startBrandFade.t);
    var w = $("pt-brand-photos"); if (!w || REDUCED) return;
    var imgs = w.querySelectorAll("img"), i = 0;
    startBrandFade.t = setInterval(function () { if (!document.body.contains(w)) return clearInterval(startBrandFade.t); imgs[i].classList.remove("on"); i = (i + 1) % imgs.length; imgs[i].classList.add("on"); }, 2600);
  }
  function tierCard(t) {
    var r = tierRange(t), feats = [];
    feats.push(esc(t.speed) + (t.id === "standard" ? ": on or off" : ""));
    feats.push(t.seer2 ? "Efficiency: " + esc(t.seer2) + " SEER2" : (PREVIEW ? "Efficiency: " + missing("SEER2") : ""));
    feats.push(t.parts_years ? esc(t.parts_years) + "-year parts warranty" : (PREVIEW ? missing("parts warranty years") : ""));
    S.warranty_lines.forEach(function (w) { feats.push(esc(w)); });
    if (FLOW === "before") r = add(r, addonRange());
    var price = r ? rangeText(r) : (PREVIEW ? missing("$ — to $ —") : "Price at your free visit");
    var label = FLOW === "after" ? "Customize " : "Pick ";
    return '<article class="pt-tier' + (t.pick ? " is-pick" : "") + '">' + (t.pick ? '<span class="pt-tag">Our team\'s pick</span>' : "") +
      "<h3>" + esc(t.name) + '</h3><p class="pt-speed">' + esc(t.speed) + '</p><p class="pt-hook">' + esc(t.hook) + '</p><p class="pt-body">' + esc(t.body) + "</p>" +
      (FLOW === "last" ? "" : '<p class="pt-price">' + price + "</p>" + monthlyLine(r)) +
      '<ul class="pt-feat">' + feats.filter(Boolean).map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
      '<button type="button" class="btn ' + (t.pick ? "btn-primary" : "btn-outline") + ' pt-choose" data-tier="' + t.id + '">' + label + esc(t.name) + ' <span aria-hidden="true">&rarr;</span></button></article>';
  }
  function leadForm(kind, noTitle) {
    var call = kind === "call";
    return '<form class="pt-lead" id="pt-lead" data-kind="' + kind + '" novalidate>' + (noTitle ? "" : '<h2 class="pt-h">' + (call ? "We'll call you" : "Email me this quote") + "</h2>") +
      '<p class="pt-sub">' + (call ? "We call as soon as we can during business hours: Monday to Friday 7 AM to 9 PM, Saturday 7 AM to 7 PM." : "We'll email you this estimate so you can look it over. No calls unless you ask.") + "</p>" +
      '<div class="pt-fields"><label>First name<input name="first_name" autocomplete="given-name" required></label><label>Last name<input name="last_name" autocomplete="family-name" required></label>' +
      (call ? '<label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label><label>Best time to call<select name="best_time"><option>Anytime</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>'
            : '<label class="full">Email<input name="email" type="email" autocomplete="email" required></label>') +
      '<label class="full">Anything we should know? (optional)<textarea name="notes" rows="2"></textarea></label></div>' +
      '<label class="pt-consent"><input type="checkbox" name="consent_contact" required><span>I agree to be contacted about my quote. Calls may be recorded or handled by AI-assisted systems for quality and scheduling. See our <a href="https://sunnycoastac.com/legal/">Terms &amp; Privacy</a>.</span></label>' +
      '<div class="pt-hp" aria-hidden="true"><label>Company website<input name="company_website" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="btn btn-primary pt-send" type="submit">' + (call ? "Call me" : "Email me this quote") + "</button>" +
      '<p class="pt-status" role="status" hidden></p>' +
      (noTitle ? "" : '<button type="button" class="pt-link" data-swap="' + (call ? "email" : "call") + '">' + (call ? "Rather get it by email?" : "Rather we call you?") + "</button>") + "</form>";
  }
  function summaryText() {
    var z = sizeObj(), s = sysObj(), t = st.tier ? tierObj(st.tier) : null, parts = [];
    parts.push("Price tool: " + z.label + ", " + s.label + (tons() ? ", " + tons() + " tons" : ""));
    if (t) { var r = add(tierRange(t), addonRange()); parts.push("Tier: " + t.name + (r ? " (" + rangeText(r) + ")" : "")); }
    var ad = S.addons.filter(function (a) { return st.addons[a.id]; }).map(function (a) { return a.name; });
    if (ad.length) parts.push("Add-ons: " + ad.join(", "));
    Object.keys(st.precise).forEach(function (k) { parts.push(k.replace("_", " ") + ": " + st.precise[k]); });
    return parts.join(" | ");
  }
  function bindLead() {
    var f = $("pt-lead"); if (!f) return;
    var sw = f.querySelector("[data-swap]");
    if (sw) sw.addEventListener("click", function () { st.contact = sw.getAttribute("data-swap"); if (st.contact === "email") showBar(); st.history.pop(); go("contact"); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = f.getAttribute("data-kind"), out = f.querySelector(".pt-status");
      var v = function (n) { var el = f.elements[n]; return el ? (el.value || "").trim() : ""; };
      var need = kind === "call" ? ["first_name", "last_name", "phone"] : ["first_name", "last_name", "email"];
      if (need.some(function (n) { return !v(n); })) return say(out, "Please fill in your name and " + (kind === "call" ? "phone number." : "email."), true);
      if (!f.elements.consent_contact.checked) return say(out, "Please check the box to agree to be contacted.", true);
      var payload = {
        phone: v("phone"), first_name: v("first_name"), last_name: v("last_name"), email: v("email"),
        project_info: summaryText() + (v("best_time") ? " | Best time: " + v("best_time") : "") + (v("notes") ? " | Notes: " + v("notes") : ""),
        service_type: "new_unit", consent_sms: false, consent_contact: true,
        source: "sunnycoastac.com/price", flow: FLOW, intent: kind === "call" ? "price_tool_call" : "price_tool_email",
        company_website: v("company_website"), form_loaded_at: String(loadedAt)
      };
      st.contact = kind;
      if (PREVIEW) { try { console.log("[price tool preview] would send", payload); } catch (er) {} return go("done"); }
      var btn = f.querySelector('[type="submit"]'); btn.disabled = true; say(out, "Sending…", false);
      fetch(S.lead_endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error("bad"); try { if (window.scLead) window.scLead(f, payload); } catch (er) {} go("done"); })
        .catch(function () { btn.disabled = false; say(out, "Something went wrong. Please call or text us at " + S.phone + ".", true); });
    });
  }
  function say(el, msg, err) { el.hidden = false; el.textContent = msg; el.className = "pt-status " + (err ? "err" : "ok"); }
  function showBar() {
    // phones already have the site's own Call / Text bar at the bottom (under 900px)
    if ($("pt-bar") || window.innerWidth < 900) return;
    var b = document.createElement("div"); b.className = "pt-bar"; b.id = "pt-bar";
    b.innerHTML = '<span>Questions?</span><a class="btn btn-primary" href="' + S.phone_href + '">Call ' + esc(S.phone) + '</a><a href="' + S.sms_href + '">or text us</a><button type="button" class="pt-bar-x" aria-label="Close">&times;</button>';
    document.body.appendChild(b); document.body.classList.add("pt-has-bar");
    b.querySelector(".pt-bar-x").addEventListener("click", function () { b.remove(); document.body.classList.remove("pt-has-bar"); });
  }
  function previewBanner() {
    if (!PREVIEW) return;
    var need = [];
    var anyPrice = S.tiers.some(function (t) { return Object.keys(t.prices).some(function (k) { return Object.keys(t.prices[k]).some(function (n) { return t.prices[k][n]; }); }); });
    if (!anyPrice) need.push("Prices for each tier, size and system type");
    if (S.tiers.some(function (t) { return !t.seer2 || !t.parts_years; })) need.push("SEER2 and parts warranty years for each tier");
    if (!S.financing.months || S.financing.apr_percent == null) need.push("Financing APR and number of months");
    if (S.addons.some(function (a) { return a.active && !a.price; })) need.push("Add-on prices");
    if ((S.adjustments || []).some(function (a) { return !a.price; })) need.push("Extra costs for the home details questions: attic, roof, condo, older system and more (or none)");
    var c = (S.included || []).filter(function (i) { return i.confirm; }).map(function (i) { return i.text; });
    if (c.length) need.push("OK these 'what's included' lines: " + c.join("; "));
    need.push("Which tier gets the 'Our team's pick' tag (now: Comfort)");
    need.push("Square feet to size guide (in pricing.json)");
    var b = $("pt-preview-banner");
    b.innerHTML = "<summary>Preview only, nothing is sent. Still needed from Javier (" + need.length + ")</summary><ul>" + need.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    b.hidden = false;
  }
  function flowSwitch() {
    // preview only: buttons to flip between the 3 screen orders
    if (!PREVIEW) return;
    var app = $("pt-app"); if (!app || $("pt-flows")) return;
    var d = document.createElement("div"); d.className = "pt-flows"; d.id = "pt-flows";
    d.innerHTML = '<span>Version:</span>' + Object.keys(FLOWS).map(function (k, i) {
      var q = location.search.replace(/[?&]flow=\w+/, "").replace(/^&/, "?");
      q = (q && q !== "?" ? q + "&" : "?") + "flow=" + k;
      return '<a href="' + q + '"' + (k === FLOW ? ' aria-current="true"' : "") + ">" + (i + 1) + ". " + FLOWS[k] + "</a>";
    }).join("");
    app.parentNode.insertBefore(d, app);
  }
  function renderFaqIncluded() {
    var ul = $("pt-included"); if (!ul) return;
    ul.innerHTML = (S.included || []).map(function (i) { return "<li>" + esc(i.text) + (PREVIEW && i.confirm ? " " + missing("Javier to OK") : "") + "</li>"; }).join("");
  }

  fetch("/sc-price/assets/pricing.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (data) {
    S = data;
    var qf = (location.search.match(/[?&]flow=(\w+)/) || [])[1];
    setFlow(PREVIEW && qf ? qf : S.flow);
    previewBanner(); flowSwitch(); renderFaqIncluded(); go("intro", { instant: true, back: true, noScroll: true });
  }).catch(function () {
    var e = $("pt-stage"); if (e) e.insertAdjacentHTML("beforeend", '<p class="pt-err">The price tool didn\'t load. Please call or text us at (786) 822-6861.</p>');
  });
})();
