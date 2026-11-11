/**
 * Sunny Coast AC — site behavior
 * Visit requests go to the Worker, which saves them before notifying the team.
 * Phone set: 7868226861 / (786) 822-6861
 * Optional override:
 *   window.SUNNYCOAST = {
 *     phone: "7868226861",
 *     makeWebhook: "https://hook...",
 *     visitWebhook: "https://quotes.sunnycoastac.com/api/visit",
 *     vslSrc: "/assets/vsl.mp4"
 *   }
 */
(function () {
  "use strict";

  var cfg = Object.assign(
    {
      phone: "7868226861",
      makeWebhook: "https://hook.us2.make.com/63uin847wuepry4ayvilwkxf6wh9ok6s",
      visitWebhook: "https://quotes.sunnycoastac.com/api/visit",
      vslSrc: "/assets/vsl.mp4",
    },
    window.SUNNYCOAST || {}
  );

  function phoneReady(p) {
    return p && p.indexOf("{{") === -1 && /\d{7,}/.test(p);
  }

  function digits(p) {
    return String(p).replace(/[^\d+]/g, "");
  }

  function applyPhoneLinks() {
    if (!phoneReady(cfg.phone)) return;
    var tel = "tel:" + digits(cfg.phone);
    var sms = "sms:" + digits(cfg.phone);
    document.querySelectorAll("[data-tel]").forEach(function (el) {
      el.setAttribute("href", tel);
      if (el.textContent.indexOf("{{PHONE}}") !== -1) {
        el.textContent = el.textContent.replace(/\{\{PHONE\}\}/g, cfg.phone);
      }
    });
    document.querySelectorAll("[data-sms]").forEach(function (el) {
      el.setAttribute("href", sms);
    });
    document.body.querySelectorAll("*").forEach(function (el) {
      if (el.children.length === 0 && el.textContent.indexOf("{{PHONE}}") !== -1) {
        el.textContent = el.textContent.replace(/\{\{PHONE\}\}/g, cfg.phone);
      }
    });
  }

  function revealOnScroll() {
    var nodes = document.querySelectorAll(".reveal");
    if (!nodes.length || !("IntersectionObserver" in window)) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach(function (n) {
        n.classList.add("is-in");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    // Measure before changing classes to avoid repeated layout work.
    var belowFold = Array.from(nodes).filter(function (n) {
      return !n.closest(".hero, .vsl-hero") && n.getBoundingClientRect().top >= window.innerHeight;
    });
    belowFold.forEach(function (n) {
      n.classList.add("reveal-pending");
      io.observe(n);
    });
  }

  function heroLoad() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("is-ready");
      return;
    }
    requestAnimationFrame(function () {
      document.body.classList.add("is-ready");
    });
  }

  function webhookAction(form, preferredUrl) {
    var action = form.getAttribute("action") || "";
    var selectedUrl = preferredUrl || cfg.makeWebhook;
    if (selectedUrl && selectedUrl.indexOf("{{") === -1) {
      form.setAttribute("action", selectedUrl);
      return selectedUrl;
    }
    return action;
  }

  function initFormAntiSpam() {
    document.querySelectorAll("form").forEach(function (form) {
      if (!form.querySelector('[name="form_loaded_at"]')) {
        var loadedAt = document.createElement("input");
        loadedAt.type = "hidden";
        loadedAt.name = "form_loaded_at";
        loadedAt.value = String(Date.now());
        form.appendChild(loadedAt);
      }

      if (!form.querySelector('[name="company_website"]')) {
        var wrap = document.createElement("div");
        wrap.className = "hp-field";
        wrap.setAttribute("aria-hidden", "true");
        wrap.setAttribute("tabindex", "-1");

        var hpId =
          "company_website_" + (form.id || "form_" + Math.random().toString(36).slice(2, 8));
        var label = document.createElement("label");
        label.setAttribute("for", hpId);
        label.textContent = "Company website";

        var input = document.createElement("input");
        input.type = "text";
        input.name = "company_website";
        input.id = hpId;
        input.tabIndex = -1;
        input.autocomplete = "off";

        wrap.appendChild(label);
        wrap.appendChild(input);
        form.appendChild(wrap);
      }
    });
  }

  function spamPayload(form) {
    var honeypot = form.querySelector('[name="company_website"]');
    var loadedAt = form.querySelector('[name="form_loaded_at"]');
    return {
      company_website: honeypot ? honeypot.value : "",
      form_loaded_at: loadedAt ? loadedAt.value : "",
    };
  }

  function guideForm() {
    var form = document.getElementById("guide-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var action = webhookAction(form);

    form.addEventListener("submit", function (ev) {
      if (!action || action.indexOf("{{") !== -1) {
        ev.preventDefault();
        showStatus(
          status,
          "Guide delivery isn't wired yet. Call us and ask for the Survival Guide.",
          false
        );
        return;
      }

      if (!window.fetch) return;
      ev.preventDefault();
      postJSON(
        action,
        Object.assign(
          {
            name: (form.name.value || "").trim(),
            email: (form.email.value || "").trim(),
            source: "sunnycoastac.com/guide",
            intent: "guide_download",
          },
          spamPayload(form)
        ),
        form,
        status,
        "Got it. Check your email for the guide.",
        "Something went wrong. Call us and we will send the guide."
      );
    });
  }

  function bookForm() {
    var form = document.getElementById("appointment-form");
    if (!form) return;

    var status = document.getElementById("book-status");
    var action = webhookAction(form, cfg.visitWebhook);
    var serviceChoices = form.querySelectorAll('[name="service_type"]');
    var serviceDetail = form.querySelector(".service-choice-detail");
    var requestedService = new URLSearchParams(window.location.search).get("service");
    if (requestedService === "new_unit" || requestedService === "repair") {
      var preset = form.querySelector('[name="service_type"][value="' + requestedService + '"]');
      if (preset) preset.checked = true;
    }

    function updateServiceChoice() {
      var selected = form.querySelector('[name="service_type"]:checked');
      if (serviceDetail) {
        serviceDetail.hidden = !selected;
        if (selected) {
          serviceDetail.textContent = selected.value === "repair"
            ? "Repair diagnostics are $99, credited toward your repair."
            : "New unit quotes start with a free in-home visit.";
        }
      }
    }

    serviceChoices.forEach(function (choice) {
      choice.addEventListener("change", updateServiceChoice);
    });
    form.addEventListener("reset", function () {
      window.setTimeout(updateServiceChoice, 0);
    });
    updateServiceChoice();

    form.addEventListener("submit", function (ev) {
      var serviceType = form.querySelector('[name="service_type"]:checked');
      if (!serviceType) {
        ev.preventDefault();
        showStatus(status, "Please choose new unit or repair to continue.", true);
        serviceChoices[0].focus();
        return;
      }

      var consent = form.querySelector('[name="consent_contact"]');
      if (!consent || !consent.checked) {
        ev.preventDefault();
        showStatus(status, "Please check the contact agreement box to continue.", true);
        return;
      }

      var phone = (form.phone.value || "").trim();
      var first = (form.first_name.value || "").trim();
      var last = (form.last_name.value || "").trim();
      var email = (form.email && form.email.value ? form.email.value : "").trim();
      var projectInfo = (form.project_info && form.project_info.value ? form.project_info.value : "").trim();
      if (!phone || !first || !last || !email) {
        ev.preventDefault();
        showStatus(status, "Phone, first name, last name, and email are required.", true);
        return;
      }

      var sms = form.querySelector('[name="consent_sms"]');
      var payload = Object.assign(
        {
          phone: phone,
          first_name: first,
          last_name: last,
          email: email,
          project_info: projectInfo,
          service_type: serviceType.value,
          consent_sms: !!(sms && sms.checked),
          consent_contact: true,
          source:
            form.getAttribute("data-source") ||
            (window.location.pathname.indexOf("reviews") !== -1
              ? "sunnycoastac.com/reviews"
              : "sunnycoastac.com/book"),
          intent: "schedule_appointment",
        },
        spamPayload(form)
      );

      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        ev.preventDefault();
        showStatus(status, "Local preview only. Nothing was sent.", false);
        return;
      }

      if (!action || action.indexOf("{{") !== -1) {
        ev.preventDefault();
        showStatus(
          status,
          "Thank you. Your request was saved locally. We will call once the form connection is live. Call us if you need help sooner.",
          false
        );
        try {
          var leads = JSON.parse(localStorage.getItem("sunnycoast_leads") || "[]");
          leads.push(Object.assign({ at: new Date().toISOString() }, payload));
          localStorage.setItem("sunnycoast_leads", JSON.stringify(leads));
        } catch (e) {}
        form.reset();
        return;
      }

      if (!window.fetch) return;
      ev.preventDefault();
      postJSON(
        action,
        payload,
        form,
        status,
        "Thank you. We received your request and will call to discuss the next step.",
        "Something went wrong. Please call us so we can help with your request."
      );
    });
  }

  function postJSON(url, payload, form, status, okMsg, errMsg) {
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    var loadedAt = form.querySelector('[name="form_loaded_at"]');
    var elapsed = loadedAt ? Date.now() - Number(loadedAt.value) : 2100;
    var waitMs = form.classList.contains('book-form') ? Math.max(0, 2100 - elapsed) : 0;
    showStatus(status, "Sending your request…", false);
    setTimeout(function () {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad status");
          showStatus(status, okMsg, false);
          try { if (window.scLead) window.scLead(form, payload); } catch (e) {}
          if (form.id === "appointment-form" && window.SunnyCoastAds) {
            window.SunnyCoastAds.leadCreated();
          }
          form.reset();
        })
        .catch(function () {
          showStatus(status, errMsg, true);
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    }, waitMs);
  }

  function showStatus(status, msg, isErr) {
    if (!status) return;
    status.hidden = false;
    status.textContent = msg;
    status.classList.toggle("is-error", !!isErr);
  }

  /**
   * VSL behavior (Hormozi-style):
   * - Autoplay muted on load
   * - Click/tap: restart from 0 WITH sound
   */
  function vslPlayer() {
    var video = document.getElementById("vsl-video");
    var tap = document.getElementById("vsl-tap");
    var player = document.getElementById("vsl-player");
    var sub = document.getElementById("vsl-sub");
    if (!video || !player) return;

    if (cfg.vslSrc) {
      var source = video.querySelector("source");
      if (source) source.setAttribute("src", cfg.vslSrc);
      video.load();
    }

    var hasSoundUnlocked = false;

    function tryMuteAutoplay() {
      video.muted = true;
      video.loop = true;
      var playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          if (tap) tap.classList.add("is-visible");
        });
      }
    }

    // Player stays hidden until the video file actually loads, so a missing
    // vsl.mp4 never shows an empty player with a dead "Tap for sound" button.
    function onVideoError() {
      player.hidden = true;
    }
    video.addEventListener("loadedmetadata", function () {
      player.hidden = false;
    });
    video.addEventListener("error", onVideoError, true);
    var srcEl = video.querySelector("source");
    if (srcEl) srcEl.addEventListener("error", onVideoError);

    // Video loaded: enable the tap button and switch the subhead to the watch-this copy
    video.addEventListener("loadeddata", function () {
      if (tap) tap.hidden = false;
      if (sub && sub.getAttribute("data-video-copy")) {
        sub.textContent = sub.getAttribute("data-video-copy");
      }
      tryMuteAutoplay();
    });

    function unlockWithSound(ev) {
      if (ev) ev.preventDefault();
      hasSoundUnlocked = true;
      video.currentTime = 0;
      video.muted = false;
      video.loop = false;
      player.classList.add("is-playing-sound");
      if (tap) tap.classList.remove("is-visible");
      video.play().catch(function () {});
    }

    if (tap) {
      tap.addEventListener("click", unlockWithSound);
    }
    video.addEventListener("click", function (ev) {
      unlockWithSound(ev);
    });

    // Initial attempt
    tryMuteAutoplay();

    // Prefer-reduced-motion: don't autoplay
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      if (tap) {
        tap.classList.add("is-visible");
        tap.querySelector(".vsl-tap-label").textContent = "Play video";
      }
    }

    // Expose for debugging
    window.__sunnyVsl = { video: video, unlock: unlockWithSound };
  }

  function navMenu() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".nav-toggle");
    var drawer = document.getElementById("nav-drawer");
    if (!header || !toggle || !drawer) return;

    function setOpen(open) {
      header.classList.toggle("is-nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) {
        drawer.removeAttribute("hidden");
      } else {
        drawer.setAttribute("hidden", "");
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("is-nav-open"));
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 900px)").matches) setOpen(false);
    });
  }

  /**
   * Install photo album: focused center slide, dimmed side peeks,
   * arrows + dots + swipe, auto-rotate (respects reduced motion).
   */
  function installAlbum() {
    var roots = document.querySelectorAll("[data-album]:not([data-album-ready])");
    if (!roots.length) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var AUTO_MS = 4500;

    roots.forEach(function (root) {
      var track = root.querySelector("[data-album-track]");
      var slides = Array.prototype.slice.call(root.querySelectorAll("[data-album-slide]"));
      var prevBtn = root.querySelector("[data-album-prev]");
      var nextBtn = root.querySelector("[data-album-next]");
      var caption = root.querySelector("[data-album-caption]");
      var dotsWrap = root.querySelector("[data-album-dots]");
      if (!track || slides.length < 2) return;
      root.setAttribute("data-album-ready", "");

      var index = Math.max(
        0,
        slides.findIndex(function (s) {
          return s.classList.contains("is-active");
        })
      );
      if (index < 0) index = 0;

      var timer = null;
      var touchX = null;
      var dots = [];

      if (dotsWrap) {
        dotsWrap.innerHTML = "";
        slides.forEach(function (_, i) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "album-dot";
          dot.setAttribute("role", "tab");
          dot.setAttribute("aria-label", "Photo " + (i + 1));
          dot.addEventListener("click", function () {
            goTo(i, true);
          });
          dotsWrap.appendChild(dot);
          dots.push(dot);
        });
      }

      function slideStride() {
        // Use layout width (offsetWidth), not getBoundingClientRect —
        // inactive slides are CSS-scaled and would shrink the stride.
        var style = window.getComputedStyle(track);
        var gap = parseFloat(style.columnGap || style.gap) || 0;
        return slides[0].offsetWidth + gap;
      }

      function centerOffset() {
        var viewport = root.querySelector(".album-viewport");
        if (!viewport) return 0;
        return (viewport.clientWidth - slides[0].offsetWidth) / 2;
      }

      function render() {
        var x = -index * slideStride() + centerOffset();
        track.style.transform = "translate3d(" + x + "px, 0, 0)";

        slides.forEach(function (slide, i) {
          var on = i === index;
          slide.classList.toggle("is-active", on);
          slide.setAttribute("aria-hidden", on ? "false" : "true");
        });

        dots.forEach(function (dot, i) {
          dot.setAttribute("aria-selected", i === index ? "true" : "false");
        });

        if (caption) {
          var text = slides[index].getAttribute("data-caption") || "";
          caption.textContent = text;
        }
      }

      function goTo(next, userDriven) {
        var n = slides.length;
        index = ((next % n) + n) % n;
        render();
        if (userDriven) restartAuto();
      }

      function next(userDriven) {
        goTo(index + 1, userDriven);
      }

      function prev(userDriven) {
        goTo(index - 1, userDriven);
      }

      function stopAuto() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      function startAuto() {
        stopAuto();
        if (reduceMotion) return;
        timer = setInterval(function () {
          next(false);
        }, AUTO_MS);
      }

      function restartAuto() {
        stopAuto();
        startAuto();
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          prev(true);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          next(true);
        });
      }

      slides.forEach(function (slide, i) {
        slide.addEventListener("click", function () {
          if (i !== index) goTo(i, true);
        });
      });

      root.addEventListener(
        "keydown",
        function (ev) {
          if (ev.key === "ArrowLeft") {
            ev.preventDefault();
            prev(true);
          } else if (ev.key === "ArrowRight") {
            ev.preventDefault();
            next(true);
          }
        },
        true
      );

      root.addEventListener(
        "touchstart",
        function (ev) {
          if (!ev.changedTouches || !ev.changedTouches.length) return;
          touchX = ev.changedTouches[0].clientX;
          stopAuto();
        },
        { passive: true }
      );

      root.addEventListener(
        "touchend",
        function (ev) {
          if (touchX == null || !ev.changedTouches || !ev.changedTouches.length) return;
          var dx = ev.changedTouches[0].clientX - touchX;
          touchX = null;
          if (Math.abs(dx) < 40) {
            startAuto();
            return;
          }
          if (dx < 0) next(true);
          else prev(true);
        },
        { passive: true }
      );

      root.addEventListener("mouseenter", stopAuto);
      root.addEventListener("mouseleave", startAuto);
      root.addEventListener("focusin", stopAuto);
      root.addEventListener("focusout", function (ev) {
        if (!root.contains(ev.relatedTarget)) startAuto();
      });

      window.addEventListener("resize", function () {
        render();
      });

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) startAuto();
              else stopAuto();
            });
          },
          { threshold: 0.35 }
        );
        io.observe(root);
      } else {
        startAuto();
      }

      render();
    });
  }

  function backToTop() {
    document.querySelectorAll('a[href="#top"]').forEach(function (link) {
      link.addEventListener("click", function (ev) {
        ev.preventDefault();
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        if (history.replaceState) {
          history.replaceState(null, "", "#top");
        }
      });
    });
  }

  function reviewCarousel() {
    var roots = document.querySelectorAll("[data-reviews]:not([data-reviews-ready])");
    if (!roots.length) return;

    roots.forEach(function (root) {
      var track = root.querySelector("[data-review-track]");
      var slides = Array.prototype.slice.call(root.querySelectorAll("[data-review-slide]"));
      var prevBtn = root.querySelector("[data-review-prev]");
      var nextBtn = root.querySelector("[data-review-next]");
      if (!track || slides.length < 2) return;
      root.setAttribute("data-reviews-ready", "");

      var index = 0;
      var viewport = track.parentElement;

      function gapPx() {
        var style = window.getComputedStyle(track);
        return parseFloat(style.columnGap || style.gap) || 0;
      }

      function stride() {
        return slides[0].offsetWidth + gapPx();
      }

      // Last index that still fills the view, so the track never slides into empty space.
      function maxIndex() {
        var visible = Math.max(1, Math.floor((viewport.clientWidth + gapPx() + 1) / stride()));
        return Math.max(0, slides.length - visible);
      }

      function render() {
        if (index > maxIndex()) index = maxIndex();
        track.style.transform = "translate3d(" + -index * stride() + "px, 0, 0)";
      }

      function go(delta) {
        var max = maxIndex();
        index += delta;
        if (index > max) index = 0;
        if (index < 0) index = max;
        render();
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });
      window.addEventListener("resize", render);
      render();
    });
  }

  function pickBankItems(bank, place, limit) {
    var tagged = place
      ? bank.filter(function (item) {
          return item && item.place === place;
        })
      : [];
    var featured = bank.filter(function (item) {
      return item && item.featured;
    });
    var items = tagged.length ? tagged.concat(
      featured.filter(function (item) {
        return tagged.indexOf(item) === -1;
      })
    ) : featured;
    if (limit > 0) items = items.slice(0, limit);
    return items;
  }

  function photoBank() {
    var slots = document.querySelectorAll("[data-photo-bank]");
    if (!slots.length) return;

    fetch("/assets/installs/bank.json")
      .then(function (res) {
        return res.ok ? res.json() : [];
      })
      .then(function (bank) {
        if (!Array.isArray(bank) || !bank.length) return;
        slots.forEach(function (slot) {
          var place = slot.getAttribute("data-photo-place") || "";
          var limit = parseInt(slot.getAttribute("data-photo-limit") || "5", 10);
          var items = pickBankItems(bank, place, isNaN(limit) ? 5 : limit);
          if (!items.length) return;

          var slides = items
            .map(function (item, i) {
              var src = item.src || "";
              var srcset = item.srcset ? ' srcset="' + item.srcset + '"' : "";
              var alt = (item.alt || "Install photo").replace(/"/g, "&quot;");
              var caption = (item.caption || "").replace(/"/g, "&quot;");
              var w = item.width || 1200;
              var h = item.height || 800;
              var active = i === 0 ? " is-active" : "";
              var lazy = i === 0 ? "" : ' loading="lazy"';
              return (
                '<figure class="album-slide' +
                active +
                '" data-album-slide data-caption="' +
                caption +
                '">' +
                '<img src="' +
                src +
                '"' +
                srcset +
                ' sizes="(max-width: 800px) 100vw, 480px" alt="' +
                alt +
                '" width="' +
                w +
                '" height="' +
                h +
                '"' +
                lazy +
                ' decoding="async" />' +
                "</figure>"
              );
            })
            .join("");

          slot.innerHTML =
            '<section class="section" aria-labelledby="photo-bank-heading">' +
            '<div class="container">' +
            '<h2 id="photo-bank-heading" class="display">Recent installs</h2>' +
            '<div class="album album--compact" data-album tabindex="0" aria-roledescription="carousel" aria-label="Recent install photos">' +
            '<button type="button" class="album-arrow album-prev" data-album-prev aria-label="Previous photo"></button>' +
            '<div class="album-viewport"><div class="album-track" data-album-track>' +
            slides +
            "</div></div>" +
            '<button type="button" class="album-arrow album-next" data-album-next aria-label="Next photo"></button>' +
            '<p class="album-caption" data-album-caption></p>' +
            '<div class="album-dots" data-album-dots role="tablist" aria-label="Choose a photo"></div>' +
            "</div></div></section>";
          slot.removeAttribute("hidden");
        });
        installAlbum();
      })
      .catch(function () {});
  }

  function reviewBank() {
    var slots = document.querySelectorAll("[data-review-bank]");
    if (!slots.length) return;

    fetch("/assets/reviews/bank.json")
      .then(function (res) {
        return res.ok ? res.json() : [];
      })
      .then(function (bank) {
        if (!Array.isArray(bank) || !bank.length) return;
        slots.forEach(function (slot) {
          var place = slot.getAttribute("data-review-place") || "";
          var limit = parseInt(slot.getAttribute("data-review-limit") || "3", 10);
          var items = pickBankItems(bank, place, isNaN(limit) ? 3 : limit);
          if (!items.length) return;

          var cards = items
            .map(function (item) {
              var quote = item.quote || "";
              var name = item.name || "";
              var loc = item.place_label || item.place || "";
              return (
                '<blockquote class="review-card" data-review-slide>' +
                "<p>" +
                quote.replace(/</g, "&lt;") +
                "</p>" +
                '<p class="review-name">' +
                name.replace(/</g, "&lt;") +
                (loc ? " · " + String(loc).replace(/</g, "&lt;") : "") +
                "</p></blockquote>"
              );
            })
            .join("");

          slot.innerHTML =
            '<section class="section" aria-labelledby="review-bank-heading">' +
            '<div class="container narrow">' +
            '<h2 id="review-bank-heading" class="display">Reviews</h2>' +
            '<div data-reviews><div data-review-track>' +
            cards +
            "</div></div></div></section>";
          slot.removeAttribute("hidden");
        });
        reviewCarousel();
      })
      .catch(function () {});
  }

  applyPhoneLinks();
  initFormAntiSpam();
  heroLoad();
  revealOnScroll();
  guideForm();
  bookForm();
  vslPlayer();
  navMenu();
  installAlbum();
  reviewCarousel();
  photoBank();
  reviewBank();
  backToTop();
})();

/* Online booking: [data-book-online] links open the Housecall Pro booking pop-up.
   We build the pop-up ourselves instead of loading Housecall Pro's widget script:
   their script loads a hidden copy of the booking window at page load, and that copy
   can measure the wrong screen size (seen 10/27: shrunken page with a white edge).
   Here a fresh window is created on each click, at the real screen size.
   Messages from the booking window (same protocol as their widget):
     "hcp:iframe-loaded" -> we reply "hcp:open"; "hcp:close" -> close;
     {type:"hcp:redirect", url} -> go to the thank-you page (/booked/) after a booking.
   If anything fails, the link itself opens the hosted booking page. */
(function () {
  "use strict";
  var BOOK_ORIGIN = "https://book.housecallpro.com";
  var BOOK_URL = BOOK_ORIGIN + "/book/Sunny-Coast-AC/7ded0123547b443a8700ed0e6487db37?v2=true";
  if (!document.querySelector("[data-book-online]")) return;

  var overlay = null;
  var frame = null;
  var lastFocus = null;

  function warm() {
    var l = document.createElement("link");
    l.rel = "preconnect";
    l.href = BOOK_ORIGIN;
    document.head.appendChild(l);
  }
  if (document.readyState === "complete") warm();
  else window.addEventListener("load", warm);

  function send() {
    try { frame && frame.contentWindow && frame.contentWindow.postMessage("hcp:open", BOOK_ORIGIN); } catch (e) {}
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    frame = null;
    document.documentElement.classList.remove("book-modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onMessage(e) {
    if (e.origin !== BOOK_ORIGIN || !overlay) return;
    var d = e.data;
    if (d === "hcp:iframe-loaded") send();
    else if (d === "hcp:close") close();
    else if (d && d.type === "hcp:redirect" && typeof d.url === "string") {
      try {
        var u = new URL(d.url, location.href);
        if (u.protocol === "https:" && (u.hostname === "sunnycoastac.com" || u.hostname === location.hostname)) {
          location.href = u.href;
        }
      } catch (err) {}
    }
  }
  window.addEventListener("message", onMessage);

  function open() {
    if (overlay) return;
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "book-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Book online");
    frame = document.createElement("iframe");
    frame.src = BOOK_URL;
    frame.title = "Book online with Sunny Coast AC";
    frame.addEventListener("load", send);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("book-modal-open");
    frame.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay) close();
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-book-online]") : null;
    if (!a) return;
    if (typeof window.gtag === "function") {
      window.gtag("event", "book_online_click", { link_text: a.textContent.trim() });
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // new tab/window: let the link work
    e.preventDefault();
    var drawerToggle = document.querySelector('.nav-toggle[aria-expanded="true"]');
    if (drawerToggle) drawerToggle.click();
    open();
  });

  if (/[?&]booking(=|&|$)/.test(location.search)) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", open);
    else open();
  }
})();
/* ba-slider */
document.addEventListener('input',function(e){var t=e.target;if(t&&t.classList&&t.classList.contains('ba-range')){var f=t.closest('.ba-slider');if(f)f.style.setProperty('--pos',t.value+'%');}});
/* sc-track */
(function () {
  function ga(name, params) {
    try { if (window.gtag) window.gtag("event", name, params || {}); } catch (e) {}
  }
  var path = location.pathname;
  // Taps on call / text links, with the page they happened on.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"],a[href^="sms:"]') : null;
    if (!a) return;
    ga(a.getAttribute("href").indexOf("sms:") === 0 ? "click_to_text" : "click_to_call", { page_path: path });
  }, true);
  // A form lead went through (called from postJSON after the server said OK).
  window.scLead = function (form, payload) {
    var kind = (payload && (payload.service_type || payload.intent)) || "unknown";
    ga("generate_lead", { form_id: (form && form.id) || "form", lead_type: String(kind).slice(0, 40), page_path: path });
  };
})();
