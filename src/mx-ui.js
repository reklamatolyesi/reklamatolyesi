
(function () {
  "use strict";

  var VENDOR = {
    gsap: { js: "/src/vendor/gsap.min.js", globalName: "gsap" },
    scrolltrigger: { js: "/src/vendor/gsap-scrolltrigger.min.js", globalName: "ScrollTrigger", requires: ["gsap"] },
    lenis: { js: "/src/vendor/lenis.min.js", globalName: "Lenis" },
    toastify: { js: "/src/vendor/toastify.min.js", css: "/src/vendor/toastify.min.css", globalName: "Toastify" },
    sweetalert2: { js: "/src/vendor/sweetalert2.all.min.js", globalName: "Swal" },
    dayjs: { js: "/src/vendor/dayjs.min.js", globalName: "dayjs" },
    justvalidate: { js: "/src/vendor/just-validate.min.js", globalName: "JustValidate" },
    embla: { js: "/src/vendor/embla-carousel.min.js", globalName: "EmblaCarousel" },
    
    mxfiltre: { js: "/src/mx-filtre.js", globalName: "MxFiltre" },
    mxlightbox: { js: "/src/mx-lightbox.js", globalName: "MxLightbox" }
  };

  var mxLoadPromises = {};

  function mxReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function mxInjectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("mx-ui: yuklenemedi " + src)); };
      document.head.appendChild(s);
    });
  }

  function mxInjectCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) {
      return;
    }
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  
  window.mxLoad = function (name) {
    var def = VENDOR[name];
    if (!def) {
      return Promise.reject(new Error("mx-ui: bilinmeyen kutuphane " + name));
    }
    if (window[def.globalName]) {
      return Promise.resolve(window[def.globalName]);
    }
    if (mxLoadPromises[name]) {
      return mxLoadPromises[name];
    }
    var pre = Promise.resolve();
    if (def.requires) {
      pre = Promise.all(def.requires.map(function (r) { return window.mxLoad(r); }));
    }
    mxLoadPromises[name] = pre.then(function () {
      if (def.css) {
        mxInjectCss(def.css);
      }
      return mxInjectScript(def.js).then(function () {
        return window[def.globalName];
      });
    });
    return mxLoadPromises[name];
  };

  

  var mxFallbackToastTimer = null;

  function mxFallbackToast(msg, isError) {
    var el = document.querySelector(".mx-ui-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "mx-ui-toast";
      document.body.appendChild(el);
    }
    el.textContent = String(msg);
    el.classList.toggle("mx-ui-toast-error", !!isError);
    el.classList.add("mx-ui-toast-show");
    if (mxFallbackToastTimer) {
      clearTimeout(mxFallbackToastTimer);
    }
    mxFallbackToastTimer = setTimeout(function () {
      el.classList.remove("mx-ui-toast-show");
    }, 2400);
  }

  
  window.mxToast = function (msg, isError) {
    window.mxLoad("toastify").then(function (Toastify) {
      Toastify({
        text: String(msg),
        duration: 2400,
        gravity: "bottom",
        position: "center",
        stopOnFocus: true,
        style: {
          background: isError ? "#b91c1c" : "#1e293b",
          borderRadius: "10px",
          fontWeight: "600",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)"
        }
      }).showToast();
    }).catch(function () {
      mxFallbackToast(msg, isError);
    });
  };

  

  function mxFallbackConfirm(opts) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "mx-ui-confirm-overlay";
      var box = document.createElement("div");
      box.className = "mx-ui-confirm-box";
      var title = document.createElement("p");
      title.className = "mx-ui-confirm-title";
      title.textContent = opts.title || "";
      var text = document.createElement("p");
      text.className = "mx-ui-confirm-text";
      text.textContent = opts.text || "";
      var buttons = document.createElement("div");
      buttons.className = "mx-ui-confirm-buttons";
      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "mx-ui-confirm-cancel";
      cancelBtn.textContent = opts.cancelText || "Vazgec";
      var okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "mx-ui-confirm-ok";
      okBtn.textContent = opts.confirmText || "Evet";
      function close(result) {
        overlay.remove();
        resolve(result);
      }
      cancelBtn.onclick = function () { close(false); };
      okBtn.onclick = function () { close(true); };
      overlay.onclick = function (ev) {
        if (ev.target === overlay) {
          close(false);
        }
      };
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      box.appendChild(title);
      box.appendChild(text);
      box.appendChild(buttons);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  
  window.mxConfirm = function (opts) {
    opts = opts || {};
    return window.mxLoad("sweetalert2").then(function (Swal) {
      return Swal.fire({
        title: opts.title || "",
        text: opts.text || "",
        icon: opts.icon || "warning",
        showCancelButton: true,
        confirmButtonText: opts.confirmText || "Evet",
        cancelButtonText: opts.cancelText || "Vazgec",
        confirmButtonColor: "#e53935",
        reverseButtons: true
      }).then(function (result) {
        return !!result.isConfirmed;
      });
    }).catch(function () {
      return mxFallbackConfirm(opts);
    });
  };

  

  function mxPad(n) {
    return ("0" + n).slice(-2);
  }

  function mxBasicDate(value, format) {
    var d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) {
      return "";
    }
    var map = {
      "DD": mxPad(d.getDate()),
      "MM": mxPad(d.getMonth() + 1),
      "YYYY": String(d.getFullYear()),
      "HH": mxPad(d.getHours()),
      "mm": mxPad(d.getMinutes())
    };
    var out = format || "DD.MM.YYYY HH:mm";
    for (var key in map) {
      out = out.split(key).join(map[key]);
    }
    return out;
  }

  
  window.mxDate = function (value, format) {
    if (window.dayjs) {
      try {
        return window.dayjs(value).format(format || "DD.MM.YYYY HH:mm");
      } catch (e) {
        return mxBasicDate(value, format);
      }
    }
    window.mxLoad("dayjs").catch(function () {});
    return mxBasicDate(value, format);
  };

  

  
  window.mxValidateForm = function (form, fields, onSuccess) {
    window.mxLoad("justvalidate").then(function (JustValidate) {
      var validator = new JustValidate(form, {
        errorFieldCssClass: "mx-ui-field-error",
        errorLabelStyle: { color: "#b91c1c", fontSize: "12px" }
      });
      for (var i = 0; i < fields.length; i++) {
        validator.addField(fields[i].selector, fields[i].rules);
      }
      validator.onSuccess(function () {
        onSuccess(form);
      });
    }).catch(function () {
      form.onsubmit = function (ev) {
        ev.preventDefault();
        if (form.checkValidity()) {
          onSuccess(form);
        } else {
          form.reportValidity();
        }
        return false;
      };
    });
  };

  

  
  window.mxGsap = function () {
    return window.mxLoad("gsap").then(function (gsap) {
      return window.mxLoad("scrolltrigger").then(function (ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        return gsap;
      });
    });
  };

  

  
  window.mxEmbla = function (root, options) {
    if (!root) {
      return Promise.reject(new Error("mx-ui: mxEmbla icin gecerli kok eleman gerekli"));
    }
    return window.mxLoad("embla").then(function (EmblaCarousel) {
      var factory = EmblaCarousel && EmblaCarousel.default ? EmblaCarousel.default : EmblaCarousel;
      return factory(root, options || {});
    });
  };

  

  function mxInitReveal() {
    if (mxReducedMotion() || !("IntersectionObserver" in window)) {
      return;
    }
    var content = document.getElementById("content");
    if (!content) {
      return;
    }
    var targets = [];
    for (var i = 0; i < content.children.length; i++) {
      var child = content.children[i];
      if (child.hasAttribute("data-mx-noanim")) {
        continue;
      }
      
      var pos = "";
      try {
        pos = window.getComputedStyle(child).position;
      } catch (e) {
        pos = "";
      }
      if (pos === "fixed" || pos === "sticky") {
        continue;
      }
      
      var rect = child.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        continue;
      }
      child.classList.add("mx-reveal");
      targets.push(child);
    }
    if (targets.length === 0) {
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        if (entries[e].isIntersecting) {
          var el = entries[e].target;
          el.classList.add("mx-reveal-in");
          observer.unobserve(el);
          
          (function (node) {
            setTimeout(function () {
              node.classList.remove("mx-reveal");
              node.classList.remove("mx-reveal-in");
            }, 700);
          })(el);
        }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    for (var t = 0; t < targets.length; t++) {
      observer.observe(targets[t]);
    }
  }

  

  function mxInitSmoothScroll() {
    if (mxReducedMotion()) {
      return;
    }
    if (!document.body || !document.body.hasAttribute("data-mx-smooth")) {
      return;
    }
    window.mxLoad("lenis").then(function (Lenis) {
      var lenis = new Lenis({ autoRaf: true });
      window.mxLenis = lenis;
    }).catch(function () {});
  }

  
  var MX_LANG_ROW_MAX = 4;
  var mxLangSec = "ul";

  function mxLangLinks(ul) {
    var out = [];
    var lis = ul.children;
    for (var i = 0; i < lis.length; i++) {
      var a = lis[i].tagName === "LI" ? lis[i].querySelector("a[hreflang]") : null;
      if (a) out.push(a);
    }
    return out;
  }

  function mxLangActiveLink(links) {
    var htmlLang = (document.documentElement.getAttribute("lang") || "").toLowerCase().split("-")[0];
    var i;
    for (i = 0; i < links.length; i++) {
      var a = links[i];
      var li = a.closest("li");
      if (a.getAttribute("aria-current") === "true" || a.getAttribute("aria-current") === "page" ||
        /(^|\s|-)(aktif|active|wm-lang-active|current|secili)(\s|$)/.test((a.className || "") + " " + (li ? li.className : ""))) {
        return a;
      }
    }
    for (i = 0; i < links.length; i++) {
      if ((links[i].getAttribute("hreflang") || "").toLowerCase() === htmlLang) return links[i];
    }
    return links[0];
  }

  function mxLangBind(wrap) {
    if (!wrap || wrap.getAttribute("data-wm-lang-js") === "1") return;
    var btn = wrap.querySelector(".wm-lang-toggle");
    var menu = wrap.querySelector(".wm-lang-menu");
    if (!btn || !menu) return;
    wrap.setAttribute("data-wm-lang-js", "1");
    wrap.classList.add("wm-lang-js");
    if (!menu.id) menu.id = "wm-lang-menu-" + Math.random().toString(36).slice(2, 8);
    btn.setAttribute("aria-controls", menu.id);
    function items() { return Array.prototype.slice.call(menu.querySelectorAll("a[hreflang]")); }
    function place() {
      menu.classList.remove("wm-lang-up", "wm-lang-start");
      var r = menu.getBoundingClientRect();
      var br = btn.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 4 && br.top - r.height - 6 > 4) menu.classList.add("wm-lang-up");
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var tasma = function (x) { return Math.max(0, -x.left) + Math.max(0, x.right - vw); };
      if (tasma(r) > 0) {
        menu.classList.add("wm-lang-start");
        if (tasma(menu.getBoundingClientRect()) >= tasma(r)) menu.classList.remove("wm-lang-start");
      }
    }
    function open(focusFirst) {
      btn.setAttribute("aria-expanded", "true");
      place();
      if (focusFirst) {
        var list = items();
        var cur = menu.querySelector('a[aria-current="true"], a[aria-current="page"]') || list[0];
        if (cur) cur.focus();
      }
    }
    function close(returnFocus) {
      if (btn.getAttribute("aria-expanded") !== "true") return;
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus) btn.focus();
    }
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.getAttribute("aria-expanded") === "true") close(false); else open(false);
    });
    btn.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); open(true); }
      else if (ev.key === "Escape") close(true);
    });
    menu.addEventListener("keydown", function (ev) {
      var list = items();
      var i = list.indexOf(document.activeElement);
      if (ev.key === "Escape") { ev.preventDefault(); close(true); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (ev.key === "Home") { ev.preventDefault(); list[0].focus(); }
      else if (ev.key === "End") { ev.preventDefault(); list[list.length - 1].focus(); }
    });
    wrap.addEventListener("focusout", function (ev) {
      if (ev.relatedTarget && !wrap.contains(ev.relatedTarget)) close(false);
    });
    document.addEventListener("click", function (ev) {
      if (!wrap.contains(ev.target)) close(false);
    });
  }

  
  function mxLangNeedsDd(ul, links) {
    var r = ul.getBoundingClientRect();
    if (!r.width || !r.height || links.length < 2) return false;
    var tops = {}, lefts = {}, nTop = 0, nLeft = 0;
    for (var i = 0; i < links.length; i++) {
      var lr = links[i].closest("li").getBoundingClientRect();
      if (!lr.width) continue;
      var t = Math.round(lr.top / 3), l = Math.round(lr.left / 3);
      if (!tops[t]) { tops[t] = 1; nTop++; }
      if (!lefts[l]) { lefts[l] = 1; nLeft++; }
    }
    if (nTop > 1 && nLeft === 1) return false; 
    if (nTop > 1) return true; 
    if (links.length > MX_LANG_ROW_MAX) return true;
    if (ul.scrollWidth > ul.clientWidth + 1) return true;
    if (getComputedStyle(ul).visibility === "hidden") return false;
    
    var p = ul.parentElement;
    if (p) {
      var pr = p.getBoundingClientRect();
      if (pr.width > 0 && (r.right > pr.right + 1 || r.left < pr.left - 1)) return true;
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var kapEkranda = pr.left >= -1 && pr.right <= vw + 1;
      if (kapEkranda && (r.right > vw + 1 || r.left < -1)) return true;
    }
    return false;
  }

  
  function mxLangLabel(a) {
    if (!a || a.querySelector(".wm-lang-name")) return;
    var kod = (a.getAttribute("hreflang") || "").trim();
    if (!kod) return;
    var metin = (a.textContent || "").trim();
    if (metin && metin.toLowerCase() !== kod.toLowerCase()) return;
    var ad = "";
    try { ad = new Intl.DisplayNames([kod], { type: "language" }).of(kod) || ""; } catch (e) { ad = ""; }
    if (!ad || ad.toLowerCase() === kod.toLowerCase()) return;
    ad = ad.charAt(0).toLocaleUpperCase(kod) + ad.slice(1);
    if (metin && !a.querySelector("img")) {
      a.textContent = "";
      var c = document.createElement("span");
      c.className = "wm-lang-code";
      c.textContent = kod.toUpperCase();
      a.appendChild(c);
    }
    var n = document.createElement("span");
    n.className = "wm-lang-name";
    n.textContent = ad;
    a.appendChild(n);
  }

  function mxLangConvert(ul, links) {
    var act = mxLangActiveLink(links);
    var li = document.createElement("li");
    li.className = "wm-lang-dd";
    li.setAttribute("data-wm-lang-dd", "1");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wm-lang-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    var navLabel = ul.getAttribute("aria-label") || (ul.closest("nav") && ul.closest("nav").getAttribute("aria-label")) || "Language";
    btn.setAttribute("aria-label", navLabel + ": " + (act.getAttribute("hreflang") || "").toUpperCase());
    var img = act.querySelector("img");
    if (img) {
      btn.appendChild(img.cloneNode(false));
    } else {
      var code = document.createElement("span");
      code.className = "wm-lang-code";
      code.textContent = (act.getAttribute("hreflang") || act.textContent || "").trim().toUpperCase();
      btn.appendChild(code);
    }
    btn.insertAdjacentHTML("beforeend", '<svg class="wm-lang-chev" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    var menu = document.createElement("ul");
    menu.className = "wm-lang-menu";
    var olds = Array.prototype.slice.call(ul.children);
    for (var i = 0; i < olds.length; i++) menu.appendChild(olds[i]);
    for (var j = 0; j < links.length; j++) mxLangLabel(links[j]);
    li.appendChild(btn);
    li.appendChild(menu);
    ul.appendChild(li);
    ul.classList.add("wm-lang-dd-host");
    var bar = ul.closest(".wm-langbar");
    if (bar) bar.classList.add("wm-langbar--auto-dd");
    mxLangBind(li);
  }

  var mxLangRO = null;
  function mxLangScan() {
    var bars = document.querySelectorAll(".wm-langbar--dd");
    for (var b = 0; b < bars.length; b++) mxLangBind(bars[b]);
    var uls = document.querySelectorAll(mxLangSec);
    for (var i = 0; i < uls.length; i++) {
      var ul = uls[i];
      if (ul.classList.contains("wm-lang-menu") || ul.classList.contains("wm-lang-dd-host") || ul.closest(".wm-lang-dd, .wm-langbar--dd")) continue;
      var links = mxLangLinks(ul);
      if (links.length < 2) continue;
      if (mxLangNeedsDd(ul, links)) { mxLangConvert(ul, links); continue; }
      if (mxLangRO && !ul.__wmLangObs) { ul.__wmLangObs = true; mxLangRO.observe(ul); }
    }
  }

  var mxLangTimer = null;
  function mxLangScanSoon() {
    clearTimeout(mxLangTimer);
    mxLangTimer = setTimeout(mxLangScan, 120);
  }
  window.mxLangDd = mxLangScan;

  function mxInitLangDd() {
    if (typeof ResizeObserver === "function") mxLangRO = new ResizeObserver(mxLangScanSoon);
    mxLangScan();
    window.addEventListener("resize", mxLangScanSoon, { passive: true });
    window.addEventListener("load", mxLangScanSoon);
  }

  setTimeout(function () {
    mxInitReveal();
    mxInitSmoothScroll();
  }, 60);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mxInitLangDd);
  else mxInitLangDd();
})();
