
(function () {
  "use strict";
  if (window.MxStore && window.MxStore.__mxStore === true) {
    return;
  }

  var CART_KEY = "mxCartV1";
  var ORDERS_KEY = "mxOrdersV1";
  var UYE_CACHE_KEY = "mxUyeV1";
  var SON_SIPARIS_KEY = "mxSonSiparisV1";
  var ZAMAN_ASIMI_MS = 15000;

  
  
  

  function depoOku(depo, key, varsayilan) {
    try {
      var raw = depo && depo.getItem(key);
      return raw ? JSON.parse(raw) : varsayilan;
    } catch (e) {
      return varsayilan;
    }
  }

  function depoYaz(depo, key, deger) {
    try {
      if (!depo) {
        return;
      }
      if (deger == null) {
        depo.removeItem(key);
      } else {
        depo.setItem(key, JSON.stringify(deger));
      }
    } catch (e) {}
  }

  function yerel() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function oturumDepo() {
    try {
      return window.sessionStorage;
    } catch (e) {
      return null;
    }
  }

  function olayYay(ad, detay) {
    var ev = null;
    try {
      ev = new window.CustomEvent(ad, { detail: detay });
    } catch (e) {
      try {
        ev = document.createEvent("CustomEvent");
        ev.initCustomEvent(ad, false, false, detay);
      } catch (e2) {
        ev = null;
      }
    }
    if (ev && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(ev);
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  
  function para(n, simge, dil) {
    var x = Number(n);
    if (!isFinite(x)) {
      x = 0;
    }
    var metin;
    var loc = dil || (document.documentElement && document.documentElement.getAttribute("lang")) || "tr";
    try {
      
      var kod = String(loc).toLowerCase().split(/[-_]/)[0];
      metin = new Intl.NumberFormat(kod === "tr" || kod === "ar" ? "tr-TR" : loc, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(x);
    } catch (e) {
      metin = x.toFixed(2).replace(".", ",");
    }
    return simge ? metin + " " + simge : metin;
  }

  function hataMetni(err, varsayilan) {
    if (err && typeof err.error === "string" && err.error) {
      return err.error;
    }
    return varsayilan || "";
  }

  
  
  

  var apiBilgi = apiKokCoz();
  var uyariVerildi = false;

  function apiKokCoz() {
    var raw = "";
    var meta = document.querySelector ? document.querySelector('meta[name="mx-api-base"]') : null;
    if (meta && meta.getAttribute("content") != null) {
      raw = String(meta.getAttribute("content") || "");
    }
    if (!raw && typeof window.mxApiBase === "string") {
      raw = window.mxApiBase;
    }
    raw = String(raw || "").trim();
    
    if (raw.indexOf("{") !== -1) {
      raw = "";
    }
    if (raw === "none") {
      return { kok: "", ayniOrigin: true, yok: true, ham: raw };
    }
    if (!raw) {
      return { kok: "", ayniOrigin: true, yok: false, ham: "" };
    }
    var origin = window.location && window.location.origin ? window.location.origin : "";
    var u = null;
    try {
      u = new window.URL(raw, window.location ? window.location.href : undefined);
    } catch (e) {
      u = null;
    }
    if (!u) {
      return { kok: "", ayniOrigin: true, yok: false, ham: raw };
    }
    var yol = String(u.pathname || "").replace(/\/+$/, "");
    if (u.origin === origin) {
      return { kok: yol, ayniOrigin: true, yok: false, ham: raw };
    }
    return { kok: u.origin + yol, ayniOrigin: false, yok: false, ham: raw };
  }

  function uyeKullanilabilir() {
    return !apiBilgi.yok && apiBilgi.ayniOrigin;
  }

  function caprazUyar() {
    if (uyariVerildi || apiBilgi.ayniOrigin || apiBilgi.yok) {
      return;
    }
    uyariVerildi = true;
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn(
        "MxStore: API farkli origin (" + apiBilgi.kok + ") — mx_uye cerezi SameSite=Lax oldugu icin uyelik kullanilamiyor; sepet ve misafir siparis calisir."
      );
    }
  }

  function sorguYaz(sorgu) {
    if (!sorgu || typeof sorgu !== "object") {
      return "";
    }
    var parca = [];
    for (var k in sorgu) {
      if (Object.prototype.hasOwnProperty.call(sorgu, k) && sorgu[k] != null && sorgu[k] !== "") {
        parca.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(sorgu[k])));
      }
    }
    return parca.length ? "?" + parca.join("&") : "";
  }

  function hata(status, kod, error, alan, govde) {
    return { status: status || 0, kod: kod, error: error || "", alan: alan || "", body: govde || null };
  }

  
  function api(yol, opts) {
    var o = opts || {};
    if (apiBilgi.yok) {
      return Promise.reject(hata(0, "api-yok"));
    }
    if (o.uyeGerekli && !uyeKullanilabilir()) {
      caprazUyar();
      return Promise.reject(hata(0, "uye-kullanilamiyor"));
    }
    if (typeof window.fetch !== "function") {
      return Promise.reject(hata(0, "ag"));
    }
    var method = String(o.method || "GET").toUpperCase();
    var url = apiBilgi.kok + String(yol || "") + sorguYaz(o.sorgu);
    var istek = {
      method: method,
      credentials: "include",
      headers: { Accept: "application/json" }
    };
    if (o.body !== undefined && method !== "GET") {
      istek.headers["Content-Type"] = "application/json";
      istek.body = JSON.stringify(o.body);
    }
    var kontrol = null;
    try {
      kontrol = typeof window.AbortController === "function" ? new window.AbortController() : null;
    } catch (e) {
      kontrol = null;
    }
    if (kontrol) {
      istek.signal = kontrol.signal;
    }
    var bitti = false;
    var sure = o.zamanAsimi || ZAMAN_ASIMI_MS;

    return new Promise(function (resolve, reject) {
      var zamanlayici = setTimeout(function () {
        if (bitti) {
          return;
        }
        bitti = true;
        if (kontrol) {
          try {
            kontrol.abort();
          } catch (e) {}
        }
        reject(hata(0, "zaman-asimi"));
      }, sure);

      window.fetch(url, istek).then(function (res) {
        return res.text().then(function (metin) {
          var govde = null;
          try {
            govde = metin ? JSON.parse(metin) : {};
          } catch (e) {
            govde = null;
          }
          return { res: res, govde: govde };
        });
      }).then(function (r) {
        if (bitti) {
          return;
        }
        bitti = true;
        clearTimeout(zamanlayici);
        var st = r.res.status;
        if (r.govde === null || typeof r.govde !== "object") {
          
          if (st === 404 || st === 405 || st === 501 || (st >= 200 && st < 300)) {
            apiYokIsaretle();
            reject(hata(st, "api-yok"));
            return;
          }
          reject(hata(st, "http"));
          return;
        }
        if (st === 401 && !o.sifirlamaYok) {
          uyeAyarla(null);
        }
        if (!r.res.ok || r.govde.success === false) {
          var msg = typeof r.govde.error === "string" ? r.govde.error.replace(/^\[[A-Z_]+\]\s*/, "") : "";
          reject(hata(st, "http", msg, r.govde.alan, r.govde));
          return;
        }
        resolve(r.govde);
      }).catch(function () {
        if (bitti) {
          return;
        }
        bitti = true;
        clearTimeout(zamanlayici);
        reject(hata(0, "ag"));
      });
    });
  }

  function apiYokIsaretle() {
    if (apiBilgi.yok) {
      return;
    }
    apiBilgi.yok = true;
    if (uyeDurum !== "giris") {
      uyeDurumAyarla("kullanilamiyor");
    }
  }

  
  
  

  
  var MAX_ADET = 99;

  function adetSinirla(q) {
    var n = parseInt(q, 10);
    if (!isFinite(n) || n < 1) {
      return 1;
    }
    return Math.min(MAX_ADET, n);
  }

  
  function satirAnahtar(id, varyant) {
    return String(id) + "\u0000" + (varyant != null && varyant !== "" ? String(varyant) : "");
  }

  function satirNormal(it) {
    var satir = {
      id: String(it.id),
      name: it.name != null ? String(it.name) : "",
      price: Number(it.price) || 0,
      img: it.img != null ? String(it.img) : "",
      url: it.url != null ? String(it.url) : "",
      qty: adetSinirla(it && it.qty)
    };
    if (it.varyant != null && it.varyant !== "") {
      satir.varyant = String(it.varyant);
    }
    
    var liste = Number(it && it.listePrice);
    if (isFinite(liste) && liste > satir.price) {
      satir.price = liste;
    }
    if (it && it.kademe != null) {
      var kk = kademeNormal(it.kademe);
      if (kk.length) {
        satir.kademe = kk;
      }
    }
    return satir;
  }

  function sepetHam() {
    var list = depoOku(yerel(), CART_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function sepetOku() {
    var list = sepetHam();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id != null && list[i].id !== "") {
        out.push(kademeUygula(satirNormal(list[i])));
      }
    }
    return out;
  }

  function sepetToplam(list) {
    var l = list || sepetOku();
    var t = 0;
    for (var i = 0; i < l.length; i++) {
      t += (Number(l[i].price) || 0) * (l[i].qty || 1);
    }
    return Math.round(t * 100) / 100;
  }

  function sepetSayi(list) {
    var l = list || sepetOku();
    var n = 0;
    for (var i = 0; i < l.length; i++) {
      n += l[i].qty || 1;
    }
    return n;
  }

  function sepetDegisti(kaynak) {
    var list = sepetOku();
    var detay = { liste: list, sayi: sepetSayi(list), toplam: sepetToplam(list), kaynak: kaynak || "" };
    domSepet(detay.sayi);
    olayYay("mx:sepet", detay);
    return detay;
  }

  function sepetYaz(list, kaynak) {
    depoYaz(yerel(), CART_KEY, list);
    
    if (typeof window.mxCartRefresh === "function" && window.mxCartRefresh.mxStoreYedek !== true) {
      try {
        window.mxCartRefresh();
      } catch (e) {}
    }
    return sepetDegisti(kaynak || "mxstore");
  }

  function sepetEkle(item) {
    if (!item || item.id == null || item.id === "") {
      return sepetOku();
    }
    var list = sepetHam();
    var yeni = satirNormal(item);
    var anahtar = satirAnahtar(yeni.id, yeni.varyant);
    var bulundu = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id != null && satirAnahtar(list[i].id, list[i].varyant) === anahtar) {
        list[i].qty = adetSinirla((parseInt(list[i].qty, 10) || 1) + yeni.qty);
        bulundu = true;
        break;
      }
    }
    if (!bulundu) {
      list.push(yeni);
    }
    sepetYaz(list, "ekle");
    return sepetOku();
  }

  
  function sepetAdet(id, qty, varyant) {
    var hedef = String(id);
    var varyantli = varyant !== undefined;
    var anahtar = varyantli ? satirAnahtar(hedef, varyant) : "";
    var q = parseInt(qty, 10);
    var list = sepetHam();
    var next = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === hedef && (!varyantli || satirAnahtar(list[i].id, list[i].varyant) === anahtar)) {
        if (isFinite(q) && q > 0) {
          list[i].qty = adetSinirla(q);
          next.push(list[i]);
        }
      } else {
        next.push(list[i]);
      }
    }
    sepetYaz(next, "adet");
    return sepetOku();
  }

  function sepetSil(id, varyant) {
    return sepetAdet(id, 0, varyant);
  }

  function sepetTemizle() {
    sepetYaz([], "temizle");
    return [];
  }

  
  
  

  
  var KADEME_KEY = "mxKademeV1";
  var KADEME_MAX = 6;
  
  var KADEME_KAYIT_MAX = 200;

  function yuvarla2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function kademeNormal(v) {
    var ham = v;
    if (typeof ham === "string") {
      try {
        ham = JSON.parse(ham);
      } catch (e) {
        ham = null;
      }
    }
    if (!Array.isArray(ham)) {
      return [];
    }
    var adaylar = [];
    for (var i = 0; i < ham.length; i++) {
      var x = ham[i];
      if (!x || typeof x !== "object") {
        continue;
      }
      var min = Number(x.min);
      var y = Number(x.indirimYuzde != null ? x.indirimYuzde : x.yuzde);
      if (!isFinite(min) || Math.floor(min) !== min || min < 2 || min > MAX_ADET || !isFinite(y) || y <= 0 || y > 90) {
        continue;
      }
      adaylar.push({ min: min, indirimYuzde: yuvarla2(y) });
    }
    adaylar.sort(function (a, b) {
      return a.min - b.min || b.indirimYuzde - a.indirimYuzde;
    });
    var out = [];
    for (var j = 0; j < adaylar.length && out.length < KADEME_MAX; j++) {
      var son = out.length ? out[out.length - 1] : null;
      if (son && (son.min === adaylar[j].min || adaylar[j].indirimYuzde <= son.indirimYuzde)) {
        continue;
      }
      out.push(adaylar[j]);
    }
    return out;
  }

  
  function kademeBul(liste, adet) {
    var l = kademeNormal(liste);
    var q = parseInt(adet, 10) || 0;
    var bulunan = null;
    for (var i = 0; i < l.length; i++) {
      if (q >= l[i].min) {
        bulunan = l[i];
      }
    }
    return bulunan;
  }

  
  function kademeSonraki(liste, adet) {
    var l = kademeNormal(liste);
    var q = parseInt(adet, 10) || 0;
    for (var i = 0; i < l.length; i++) {
      if (l[i].min > q) {
        return { min: l[i].min, indirimYuzde: l[i].indirimYuzde, eksik: l[i].min - q };
      }
    }
    return null;
  }

  
  function kademeBirim(fiyat, adet, liste) {
    var f = Number(fiyat) || 0;
    var k = kademeBul(liste, adet);
    return k && f > 0 ? yuvarla2(f * (1 - k.indirimYuzde / 100)) : f;
  }

  function kademeKayitlar() {
    var d = depoOku(yerel(), KADEME_KEY, {});
    return d && typeof d === "object" && !Array.isArray(d) ? d : {};
  }

  function kademeOku(id) {
    if (id == null || id === "") {
      return [];
    }
    return kademeNormal(kademeKayitlar()[String(id)]);
  }

  
  function kademeKaydet(id, liste) {
    if (id == null || id === "") {
      return false;
    }
    var anahtar = String(id);
    var yeni = kademeNormal(liste);
    var d = kademeKayitlar();
    var onceki = Object.prototype.hasOwnProperty.call(d, anahtar) ? kademeNormal(d[anahtar]) : [];
    if (JSON.stringify(yeni) === JSON.stringify(onceki)) {
      return false;
    }
    delete d[anahtar];
    if (yeni.length) {
      d[anahtar] = yeni;
      var anahtarlar = Object.keys(d);
      while (anahtarlar.length > KADEME_KAYIT_MAX) {
        delete d[anahtarlar.shift()];
      }
    }
    depoYaz(yerel(), KADEME_KEY, d);
    return true;
  }

  
  function kademeUygula(satir) {
    var liste = satir.kademe && satir.kademe.length ? satir.kademe : kademeOku(satir.id);
    if (!liste.length) {
      return satir;
    }
    satir.kademe = liste;
    var k = kademeBul(liste, satir.qty);
    if (k && satir.price > 0) {
      satir.listePrice = satir.price;
      satir.price = yuvarla2(satir.price * (1 - k.indirimYuzde / 100));
      satir.kademeMin = k.min;
      satir.kademeYuzde = k.indirimYuzde;
    }
    return satir;
  }

  
  function kademeTara(kok) {
    var els = hepsi(kok || document, "[data-mx-id][data-mx-kademe]");
    var degisen = {};
    var say = 0;
    for (var i = 0; i < els.length; i++) {
      var id = els[i].getAttribute("data-mx-id");
      if (id && kademeKaydet(id, els[i].getAttribute("data-mx-kademe"))) {
        degisen[id] = true;
        say++;
      }
    }
    if (say) {
      var sepet = sepetHam();
      for (var j = 0; j < sepet.length; j++) {
        if (sepet[j] && degisen[String(sepet[j].id)]) {
          sepetDegisti("kademe");
          break;
        }
      }
    }
    return say;
  }

  
  function sepetKademeOzet(list) {
    var l = list || sepetOku();
    var brut = 0;
    var net = 0;
    for (var i = 0; i < l.length; i++) {
      var q = l[i].qty || 1;
      var p = Number(l[i].price) || 0;
      var lp = l[i].listePrice != null ? Number(l[i].listePrice) || 0 : p;
      brut += lp * q;
      net += p * q;
    }
    brut = yuvarla2(brut);
    net = yuvarla2(net);
    return { brut: brut, indirim: yuvarla2(brut - net), net: net, sayi: sepetSayi(l) };
  }

  var kademeDepo = {
    normal: kademeNormal,
    bul: kademeBul,
    sonraki: kademeSonraki,
    birim: kademeBirim,
    oku: kademeOku,
    kaydet: function (id, liste) {
      var d = kademeKaydet(id, liste);
      if (d) {
        sepetDegisti("kademe");
      }
      return d;
    },
    tara: kademeTara
  };

  
  
  
  
  var KAMPANYA_KEY = "mxKampanyaV1";
  var KAMPANYA_MAX = 20;
  var KAMPANYA_URUN_MAX = 200;
  var KAMPANYA_TIPLERI = ["xaly", "sepet", "hediye"];

  function kampanyaMetin(v, sinir) {
    if (v == null) {
      return null;
    }
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "").slice(0, sinir);
      return s ? s : null;
    }
    if (typeof v !== "object" || Array.isArray(v)) {
      return null;
    }
    var out = {};
    var var1 = false;
    for (var k in v) {
      if (Object.prototype.hasOwnProperty.call(v, k) && /^[a-z]{2}$/.test(k) && typeof v[k] === "string") {
        var m = v[k].replace(/^\s+|\s+$/g, "").slice(0, sinir);
        if (m) {
          out[k] = m;
          var1 = true;
        }
      }
    }
    return var1 ? out : null;
  }

  
  function kampanyaDil(v, dil) {
    if (v == null) {
      return "";
    }
    if (typeof v === "string") {
      return v;
    }
    if (dil && v[dil]) {
      return v[dil];
    }
    if (v.tr) {
      return v.tr;
    }
    for (var k in v) {
      if (Object.prototype.hasOwnProperty.call(v, k) && v[k]) {
        return v[k];
      }
    }
    return "";
  }

  function kampanyaTarih(v, gunSonu) {
    if (v == null || v === "") {
      return null;
    }
    var s = String(v);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), gunSonu ? 23 : 0, gunSonu ? 59 : 0, gunSonu ? 59 : 0, gunSonu ? 999 : 0);
      return isFinite(d.getTime()) ? d.getTime() : NaN;
    }
    var t = Date.parse(s);
    return isFinite(t) ? t : NaN;
  }

  function kampanyaPozitif(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? yuvarla2(n) : 0;
  }

  
  function kampanyaNormal(v) {
    var ham = v;
    if (typeof ham === "string") {
      try {
        ham = JSON.parse(ham);
      } catch (e) {
        ham = null;
      }
    }
    if (ham && !Array.isArray(ham) && typeof ham === "object" && Array.isArray(ham.kampanyalar)) {
      ham = ham.kampanyalar;
    }
    if (!Array.isArray(ham)) {
      return [];
    }
    var out = [];
    var gorulen = {};
    for (var i = 0; i < ham.length && out.length < KAMPANYA_MAX; i++) {
      var x = ham[i];
      if (!x || typeof x !== "object") {
        continue;
      }
      var id = String(x.id == null ? "" : x.id).replace(/^\s+|\s+$/g, "").toLowerCase();
      var tip = KAMPANYA_TIPLERI.indexOf(x.tip) !== -1 ? x.tip : "";
      var ad = kampanyaMetin(x.ad, 60);
      if (!/^[a-z0-9_-]{1,40}$/.test(id) || !tip || !ad || gorulen[id] || x.aktif === false) {
        continue;
      }
      var bas = kampanyaTarih(x.baslangic, false);
      var bit = kampanyaTarih(x.bitis, true);
      if ((bas !== null && !isFinite(bas)) || (bit !== null && !isFinite(bit)) || (bas !== null && bit !== null && bit < bas)) {
        continue;
      }
      var k = { id: id, tip: tip, ad: ad };
      var ac = kampanyaMetin(x.aciklama, 160);
      if (ac) {
        k.aciklama = ac;
      }
      if (x.baslangic) {
        k.baslangic = String(x.baslangic);
      }
      if (x.bitis) {
        k.bitis = String(x.bitis);
      }
      var urunler = [];
      if (Array.isArray(x.urunler)) {
        for (var u = 0; u < x.urunler.length && urunler.length < KAMPANYA_URUN_MAX; u++) {
          var uid = String(x.urunler[u] == null ? "" : x.urunler[u]).replace(/^\s+|\s+$/g, "");
          if (uid && uid.length <= 64 && urunler.indexOf(uid) === -1) {
            urunler.push(uid);
          }
        }
      }
      k.urunler = urunler;
      if (tip === "xaly") {
        var al = Number(x.al);
        var ode = Number(x.ode);
        if (!(Math.floor(al) === al && al >= 2 && al <= 20 && Math.floor(ode) === ode && ode >= 1 && ode < al)) {
          continue;
        }
        k.al = al;
        k.ode = ode;
      } else if (tip === "sepet") {
        var esik = kampanyaPozitif(x.esik);
        var it = x.indirimTip === "tutar" ? "tutar" : (x.indirimTip === "yuzde" ? "yuzde" : "");
        var deger = kampanyaPozitif(x.deger);
        if (!esik || !it || !deger || (it === "yuzde" && deger > 90)) {
          continue;
        }
        k.esik = esik;
        k.indirimTip = it;
        k.deger = deger;
        var mx = kampanyaPozitif(x.maxIndirim);
        if (mx && it === "yuzde") {
          k.maxIndirim = mx;
        }
      } else {
        var h = x.hediye && typeof x.hediye === "object" ? x.hediye : null;
        var hid = h ? String(h.id == null ? "" : h.id).replace(/^\s+|\s+$/g, "") : "";
        var had = h ? kampanyaMetin(h.ad, 80) : null;
        var hesik = Number(x.esik);
        hesik = isFinite(hesik) && hesik > 0 ? yuvarla2(hesik) : 0;
        
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(hid) || !had || (!hesik && !urunler.length)) {
          continue;
        }
        k.esik = hesik;
        k.hediye = { id: hid, ad: had };
        var himg = h.img != null ? String(h.img) : "";
        if (himg && himg.length <= 300 && himg.indexOf("<") === -1 && himg.indexOf('"') === -1 && !/^\s*javascript:/i.test(himg)) {
          k.hediye.img = himg;
        }
        var hdeg = kampanyaPozitif(h.deger);
        if (hdeg) {
          k.hediye.deger = hdeg;
        }
      }
      gorulen[id] = true;
      out.push(k);
    }
    return out;
  }

  
  function kampanyaGecerli(k, simdi) {
    var t = simdi == null ? Date.now() : Number(simdi);
    var bas = kampanyaTarih(k.baslangic, false);
    var bit = kampanyaTarih(k.bitis, true);
    return !(bas !== null && t < bas) && !(bit !== null && t > bit);
  }

  function kampanyaKapsar(k, id) {
    return !k.urunler || !k.urunler.length || k.urunler.indexOf(String(id)) !== -1;
  }

  
  function kampanyaUrunIcin(liste, id, simdi) {
    var l = kampanyaNormal(liste);
    var out = [];
    for (var i = 0; i < l.length; i++) {
      if (kampanyaGecerli(l[i], simdi) && (l[i].urunler.length ? l[i].urunler.indexOf(String(id)) !== -1 : l[i].tip !== "hediye" || l[i].esik > 0)) {
        out.push(l[i]);
      }
    }
    return out;
  }

  
  function kampanyaHesapla(liste, satirlar, simdi) {
    var l = kampanyaNormal(liste);
    var sat = Array.isArray(satirlar) ? satirlar : [];
    var r = { ara: 0, indirim: 0, net: 0, uygulanan: [], hediyeler: [], satirIndirim: {}, satirKampanya: {}, ipuclari: [] };
    var lines = [];
    for (var i = 0; i < sat.length; i++) {
      var s = sat[i];
      if (!s || s.id == null || s.id === "") {
        continue;
      }
      var p = Number(s.price) || 0;
      var q = adetSinirla(s.qty);
      if (p <= 0) {
        continue;
      }
      lines.push({ id: String(s.id), anahtar: satirAnahtar(s.id, s.varyant), price: p, qty: q, indirim: 0, xaly: false });
      r.ara += p * q;
    }
    r.ara = yuvarla2(r.ara);
    var aktif = [];
    for (var a = 0; a < l.length; a++) {
      if (kampanyaGecerli(l[a], simdi)) {
        aktif.push(l[a]);
      }
    }
    
    for (var x = 0; x < aktif.length; x++) {
      var k = aktif[x];
      if (k.tip !== "xaly") {
        continue;
      }
      var birimler = [];
      var kapsam = [];
      for (var li = 0; li < lines.length; li++) {
        if (!lines[li].xaly && kampanyaKapsar(k, lines[li].id)) {
          kapsam.push(lines[li]);
        }
      }
      for (var ki = 0; ki < kapsam.length; ki++) {
        kapsam[ki].xaly = true;
        r.satirKampanya[kapsam[ki].anahtar] = k.id;
        for (var b = 0; b < kapsam[ki].qty; b++) {
          birimler.push(kapsam[ki]);
        }
      }
      if (!birimler.length) {
        continue;
      }
      var n = birimler.length;
      var bedava = Math.floor(n / k.al) * (k.al - k.ode);
      if (bedava > 0) {
        
        birimler.sort(function (u1, u2) {
          return u1.price - u2.price;
        });
        var tutar = 0;
        for (var bi = 0; bi < bedava; bi++) {
          birimler[bi].indirim = yuvarla2(birimler[bi].indirim + birimler[bi].price);
          tutar += birimler[bi].price;
        }
        tutar = yuvarla2(tutar);
        r.uygulanan.push({ id: k.id, tip: "xaly", ad: k.ad, indirim: tutar, bedavaAdet: bedava, al: k.al, ode: k.ode });
        r.indirim += tutar;
      }
      var kalan = n % k.al;
      if (kalan > 0) {
        r.ipuclari.push({ id: k.id, tip: "xaly", ad: k.ad, al: k.al, ode: k.ode, eksikAdet: k.al - kalan, oran: Math.round((kalan / k.al) * 100) });
      }
    }
    for (var si = 0; si < lines.length; si++) {
      if (lines[si].indirim > 0) {
        r.satirIndirim[lines[si].anahtar] = yuvarla2((r.satirIndirim[lines[si].anahtar] || 0) + lines[si].indirim);
      }
    }
    var tabanTutar = function (k2) {
      var t2 = 0;
      for (var z = 0; z < lines.length; z++) {
        if (kampanyaKapsar(k2, lines[z].id)) {
          t2 += lines[z].price * lines[z].qty - lines[z].indirim;
        }
      }
      return yuvarla2(t2);
    };
    var kapsamVar = function (k3) {
      for (var z2 = 0; z2 < lines.length; z2++) {
        if (kampanyaKapsar(k3, lines[z2].id)) {
          return true;
        }
      }
      return false;
    };
    
    var enIyi = null;
    var sepetIpucu = [];
    for (var y = 0; y < aktif.length; y++) {
      var ks = aktif[y];
      if (ks.tip !== "sepet") {
        continue;
      }
      var taban = tabanTutar(ks);
      if (taban >= ks.esik) {
        var ind = ks.indirimTip === "yuzde" ? Math.round(taban * ks.deger) / 100 : ks.deger;
        if (ks.indirimTip === "yuzde" && ks.maxIndirim && ind > ks.maxIndirim) {
          ind = ks.maxIndirim;
        }
        ind = yuvarla2(Math.min(ind, taban));
        if (ind > 0 && (!enIyi || ind > enIyi.indirim)) {
          enIyi = { id: ks.id, tip: "sepet", ad: ks.ad, indirim: ind, indirimTip: ks.indirimTip, deger: ks.deger, esik: ks.esik };
        }
      } else if (taban > 0 || !ks.urunler.length) {
        sepetIpucu.push({ k: ks, taban: taban });
      }
    }
    if (enIyi) {
      r.uygulanan.push(enIyi);
      r.indirim += enIyi.indirim;
    }
    for (var sp = 0; sp < sepetIpucu.length; sp++) {
      var kk = sepetIpucu[sp].k;
      
      var olasi = kk.indirimTip === "yuzde" ? Math.round(kk.esik * kk.deger) / 100 : kk.deger;
      if (kk.indirimTip === "yuzde" && kk.maxIndirim && olasi > kk.maxIndirim) {
        olasi = kk.maxIndirim;
      }
      if (!enIyi || olasi > enIyi.indirim) {
        r.ipuclari.push({ id: kk.id, tip: "sepet", ad: kk.ad, esik: kk.esik, indirimTip: kk.indirimTip, deger: kk.deger,
          eksikTutar: yuvarla2(kk.esik - sepetIpucu[sp].taban), oran: Math.min(99, Math.round((sepetIpucu[sp].taban / kk.esik) * 100)) });
      }
    }
    
    if (enIyi) {
      var kSepet = null;
      for (var f = 0; f < aktif.length; f++) {
        if (aktif[f].id === enIyi.id) {
          kSepet = aktif[f];
        }
      }
      var tb = tabanTutar(kSepet);
      for (var g = 0; g < lines.length && tb > 0; g++) {
        if (kampanyaKapsar(kSepet, lines[g].id)) {
          lines[g].indirim += (lines[g].price * lines[g].qty - lines[g].indirim) * (enIyi.indirim / tb);
        }
      }
    }
    
    var hediyeGorulen = {};
    for (var hz = 0; hz < aktif.length; hz++) {
      var kh = aktif[hz];
      if (kh.tip !== "hediye") {
        continue;
      }
      var th = tabanTutar(kh);
      var uygun = kh.esik > 0 ? th >= kh.esik : kapsamVar(kh);
      if (uygun && th > 0) {
        if (!hediyeGorulen[kh.hediye.id]) {
          hediyeGorulen[kh.hediye.id] = true;
          var hd = { kampanyaId: kh.id, id: kh.hediye.id, ad: kh.hediye.ad };
          if (kh.hediye.img) {
            hd.img = kh.hediye.img;
          }
          if (kh.hediye.deger) {
            hd.deger = kh.hediye.deger;
          }
          r.hediyeler.push(hd);
          r.uygulanan.push({ id: kh.id, tip: "hediye", ad: kh.ad, indirim: 0, hediye: hd });
        }
      } else if (kh.esik > 0 && (th > 0 || !kh.urunler.length)) {
        r.ipuclari.push({ id: kh.id, tip: "hediye", ad: kh.ad, esik: kh.esik, hediye: { id: kh.hediye.id, ad: kh.hediye.ad },
          eksikTutar: yuvarla2(kh.esik - th), oran: Math.min(99, Math.round((th / kh.esik) * 100)) });
      }
    }
    
    r.satirToplamIndirim = {};
    for (var st = 0; st < lines.length; st++) {
      if (lines[st].indirim > 0) {
        r.satirToplamIndirim[lines[st].anahtar] = yuvarla2((r.satirToplamIndirim[lines[st].anahtar] || 0) + lines[st].indirim);
      }
    }
    r.indirim = yuvarla2(Math.min(r.indirim, r.ara));
    r.net = yuvarla2(r.ara - r.indirim);
    return r;
  }

  function kampanyaKayit() {
    var d = depoOku(yerel(), KAMPANYA_KEY, null);
    return d && typeof d === "object" && Array.isArray(d.liste) ? d : null;
  }

  function kampanyaListe() {
    var d = kampanyaKayit();
    return d ? kampanyaNormal(d.liste) : [];
  }

  
  function kampanyaKaydet(liste) {
    var yeni = kampanyaNormal(liste);
    var d = kampanyaKayit();
    if (d && JSON.stringify(kampanyaNormal(d.liste)) === JSON.stringify(yeni)) {
      return false;
    }
    depoYaz(yerel(), KAMPANYA_KEY, { liste: yeni, at: new Date().toISOString() });
    return true;
  }

  
  function kampanyaTara(kok) {
    var els = hepsi(kok || document, "[data-mx-kampanyalar]");
    var degisti = false;
    if (els.length) {
      degisti = kampanyaKaydet(els[0].getAttribute("data-mx-kampanyalar"));
    }
    kampanyaRozetDenetle(kok);
    if (degisti) {
      olayYay("mx:kampanya", { liste: kampanyaListe(), kaynak: "sayfa" });
      if (sepetHam().length) {
        sepetDegisti("kampanya");
      }
    }
    return degisti;
  }

  
  function kampanyaRozetDenetle(kok) {
    var els = hepsi(kok || document, "[data-mx-kampanya-rozet]");
    if (!els.length) {
      return;
    }
    var l = kampanyaListe();
    var acik = {};
    for (var i = 0; i < l.length; i++) {
      if (kampanyaGecerli(l[i])) {
        acik[l[i].id] = true;
      }
    }
    var kayitVar = !!kampanyaKayit();
    for (var j = 0; j < els.length; j++) {
      var id = els[j].getAttribute("data-mx-kampanya-rozet");
      
      var gizle = kayitVar && !acik[id];
      if (gizle) {
        els[j].setAttribute("hidden", "");
      } else {
        els[j].removeAttribute("hidden");
      }
    }
  }

  
  function kampanyaDurum(list) {
    var l = list || sepetOku();
    return kampanyaHesapla(kampanyaListe(), l);
  }

  var kampanyaDepo = {
    normal: kampanyaNormal,
    hesapla: kampanyaHesapla,
    gecerli: kampanyaGecerli,
    urunIcin: function (id, simdi) { return kampanyaUrunIcin(kampanyaListe(), id, simdi); },
    dil: kampanyaDil,
    liste: kampanyaListe,
    kaydet: function (liste) {
      var d = kampanyaKaydet(liste);
      if (d) {
        olayYay("mx:kampanya", { liste: kampanyaListe(), kaynak: "kaydet" });
        sepetDegisti("kampanya");
      }
      return d;
    },
    durum: function (list) { return kampanyaDurum(list); },
    
    anahtar: satirAnahtar,
    tara: kampanyaTara,
    abone: function (fn) { return abone("mx:kampanya", fn); }
  };

  
  
  
  
  var TESLIM_KEY = "mxTeslimV1";
  var TESLIM_BOLGE_KEY = "mxTeslimBolgeV1";
  var TESLIM_BOLGE_MAX = 20;
  var TESLIM_IL_MAX = 100;
  var TESLIM_TATIL_MAX = 60;
  var TESLIM_GUN_MAX = 30;
  var TESLIM_URUN_MAX = 200;
  var GUN_MS = 86400000;

  
  function teslimTam(v, alt, ust) {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    var n = Number(v);
    return isFinite(n) && Math.floor(n) === n && n >= alt && n <= ust ? n : null;
  }

  function teslimGunListe(v, varsayilan) {
    if (!Array.isArray(v)) {
      return varsayilan.slice();
    }
    var out = [];
    for (var i = 0; i < v.length && i < 14; i++) {
      var n = teslimTam(v[i], 0, 6);
      if (n !== null && out.indexOf(n) === -1) {
        out.push(n);
      }
    }
    out.sort(function (a, b) { return a - b; });
    return out.length ? out : varsayilan.slice();
  }

  
  function teslimIlAnahtar(v) {
    return String(v == null ? "" : v)
      .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
      .replace(/[çc]/g, "c").replace(/ğ/g, "g").replace(/[ıîi]/g, "i").replace(/[öô]/g, "o").replace(/ş/g, "s")
      .replace(/[üûu]/g, "u").replace(/[âa]/g, "a")
      .replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");
  }

  function teslimNormal(v) {
    var ham = v;
    if (typeof ham === "string") {
      try {
        ham = JSON.parse(ham);
      } catch (e) {
        ham = null;
      }
    }
    if (!ham || typeof ham !== "object" || Array.isArray(ham) || !Array.isArray(ham.bolgeler)) {
      return null;
    }
    var bolgeler = [];
    var gorulen = {};
    for (var i = 0; i < ham.bolgeler.length && bolgeler.length < TESLIM_BOLGE_MAX; i++) {
      var b = ham.bolgeler[i];
      if (!b || typeof b !== "object") {
        continue;
      }
      var id = String(b.id == null ? "" : b.id).replace(/^\s+|\s+$/g, "").toLowerCase();
      var ad = kampanyaMetin(b.ad, 60);
      var min = teslimTam(b.min, 0, TESLIM_GUN_MAX);
      var max = teslimTam(b.max == null || b.max === "" ? b.min : b.max, 0, TESLIM_GUN_MAX);
      if (!/^[a-z0-9_-]{1,40}$/.test(id) || !ad || min === null || max === null || max < min || gorulen[id]) {
        continue;
      }
      var iller = [];
      var ilGorulen = {};
      if (Array.isArray(b.iller)) {
        for (var j = 0; j < b.iller.length && iller.length < TESLIM_IL_MAX; j++) {
          var il = String(b.iller[j] == null ? "" : b.iller[j]).replace(/^\s+|\s+$/g, "").slice(0, 40);
          var ia = teslimIlAnahtar(il);
          if (il && !ilGorulen[ia]) {
            ilGorulen[ia] = true;
            iller.push(il);
          }
        }
      }
      gorulen[id] = true;
      bolgeler.push({ id: id, ad: ad, min: min, max: max, iller: iller });
    }
    if (!bolgeler.length) {
      return null;
    }
    var km = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(ham.kesimSaati == null ? "" : ham.kesimSaati).replace(/^\s+|\s+$/g, ""));
    var hz = teslimTam(ham.hazirlikGun, 0, TESLIM_GUN_MAX);
    var sd = teslimTam(ham.saatDilimi, -720, 840);
    var tatiller = [];
    if (Array.isArray(ham.tatiller)) {
      for (var t = 0; t < ham.tatiller.length && tatiller.length < TESLIM_TATIL_MAX; t++) {
        var tk = String(ham.tatiller[t] == null ? "" : ham.tatiller[t]);
        var tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tk);
        if (tm && Number(tm[2]) >= 1 && Number(tm[2]) <= 12 && Number(tm[3]) >= 1 && Number(tm[3]) <= 31 && tatiller.indexOf(tk) === -1) {
          tatiller.push(tk);
        }
      }
      tatiller.sort();
    }
    var vb = String(ham.varsayilanBolge == null ? "" : ham.varsayilanBolge).replace(/^\s+|\s+$/g, "").toLowerCase();
    return {
      kesimSaati: km ? km[1] + ":" + km[2] : "14:00",
      hazirlikGun: hz === null ? 0 : hz,
      kargoGunleri: teslimGunListe(ham.kargoGunleri, [1, 2, 3, 4, 5]),
      teslimGunleri: teslimGunListe(ham.teslimGunleri, [1, 2, 3, 4, 5, 6]),
      tatiller: tatiller,
      saatDilimi: sd === null ? 180 : sd,
      varsayilanBolge: gorulen[vb] ? vb : bolgeler[0].id,
      bolgeler: bolgeler
    };
  }

  
  function teslimKod(gun) {
    return new Date(gun * GUN_MS).toISOString().slice(0, 10);
  }
  function teslimHaftaGunu(gun) {
    return (((gun + 4) % 7) + 7) % 7;
  }
  function teslimUygun(gun, gunler, tatil) {
    return gunler.indexOf(teslimHaftaGunu(gun)) !== -1 && !tatil[teslimKod(gun)];
  }
  
  function teslimIleri(gun, adet, gunler, tatil) {
    var g = gun;
    var n = 0;
    var sinir = 0;
    while (n < adet && sinir < 400) {
      g++;
      sinir++;
      if (teslimUygun(g, gunler, tatil)) {
        n++;
      }
    }
    return g;
  }

  function teslimBolgeBul(k, id) {
    var aranan = String(id == null ? "" : id).toLowerCase();
    var vars = null;
    for (var i = 0; i < k.bolgeler.length; i++) {
      if (k.bolgeler[i].id === aranan) {
        return k.bolgeler[i];
      }
      if (k.bolgeler[i].id === k.varsayilanBolge) {
        vars = k.bolgeler[i];
      }
    }
    return vars || k.bolgeler[0];
  }

  
  function teslimHesapla(kural, o) {
    var k = kural && Array.isArray(kural.bolgeler) && kural.kesimSaati ? kural : teslimNormal(kural);
    if (!k) {
      return null;
    }
    var s = o || {};
    var t = s.simdi == null ? Date.now() : Number(s.simdi);
    if (!isFinite(t)) {
      t = Date.now();
    }
    var b = teslimBolgeBul(k, s.bolge);
    var hz = teslimTam(s.hazirlik, 0, TESLIM_GUN_MAX);
    if (hz === null) {
      hz = k.hazirlikGun;
    }
    var tatil = {};
    for (var i = 0; i < k.tatiller.length; i++) {
      tatil[k.tatiller[i]] = true;
    }
    var yerel = t + k.saatDilimi * 60000;
    var bugun = Math.floor(yerel / GUN_MS);
    var dk = Math.floor((yerel - bugun * GUN_MS) / 60000);
    var kp = k.kesimSaati.split(":");
    var kesimDk = Number(kp[0]) * 60 + Number(kp[1]);
    var bugunUygun = teslimUygun(bugun, k.kargoGunleri, tatil);
    var kesimOnce = bugunUygun && dk < kesimDk;
    var kargoGun = kesimOnce ? bugun : teslimIleri(bugun, 1, k.kargoGunleri, tatil);
    if (hz > 0) {
      kargoGun = teslimIleri(kargoGun, hz, k.kargoGunleri, tatil);
    }
    var minGun = b.min > 0 ? teslimIleri(kargoGun, b.min, k.teslimGunleri, tatil) : kargoGun;
    var maxGun = b.max > 0 ? teslimIleri(kargoGun, b.max, k.teslimGunleri, tatil) : kargoGun;
    return {
      bolge: b.id,
      bolgeAd: b.ad,
      minGun: b.min,
      maxGun: b.max,
      hazirlik: hz,
      bugun: teslimKod(bugun),
      kargo: teslimKod(kargoGun),
      min: teslimKod(minGun),
      max: teslimKod(maxGun),
      bugunKargoda: kargoGun === bugun,
      yarinKargoda: kargoGun === bugun + 1,
      kesimSaati: k.kesimSaati,
      kesimKalanDk: kesimOnce ? kesimDk - dk : 0,
      fark: { kargo: kargoGun - bugun, min: minGun - bugun, max: maxGun - bugun }
    };
  }

  
  function teslimIlBolge(kural, il) {
    var k = kural && Array.isArray(kural.bolgeler) && kural.kesimSaati ? kural : teslimNormal(kural);
    var tam = teslimIlAnahtar(il);
    if (!k || !tam) {
      return "";
    }
    var parca = tam.split(/[^a-z0-9]+/);
    var parcaBulunan = "";
    for (var i = 0; i < k.bolgeler.length; i++) {
      for (var j = 0; j < k.bolgeler[i].iller.length; j++) {
        var a = teslimIlAnahtar(k.bolgeler[i].iller[j]);
        if (a === tam) {
          return k.bolgeler[i].id;
        }
        if (!parcaBulunan && a.indexOf(" ") === -1 && parca.indexOf(a) !== -1) {
          parcaBulunan = k.bolgeler[i].id;
        }
      }
    }
    return parcaBulunan;
  }

  function teslimKayit() {
    var d = depoOku(yerel(), TESLIM_KEY, null);
    return d && typeof d === "object" && !Array.isArray(d) ? d : null;
  }

  function teslimKural() {
    var d = teslimKayit();
    return d && d.kural ? teslimNormal(d.kural) : null;
  }

  
  function teslimUrun(id) {
    var d = teslimKayit();
    var u = d && d.urunler && typeof d.urunler === "object" ? d.urunler[String(id)] : undefined;
    return u === false ? false : teslimTam(u, 0, TESLIM_GUN_MAX);
  }

  
  function teslimBolgeOku(kural) {
    var k = kural || teslimKural();
    var kayitli = "";
    try {
      kayitli = String(yerel() ? yerel().getItem(TESLIM_BOLGE_KEY) || "" : "");
    } catch (e) {
      kayitli = "";
    }
    if (!k) {
      return kayitli;
    }
    return teslimBolgeBul(k, kayitli).id;
  }

  function teslimBolgeSec(id, kaynak) {
    var k = teslimKural();
    var yeni = String(id == null ? "" : id).toLowerCase();
    if (k) {
      var b = teslimBolgeBul(k, yeni);
      if (b.id !== yeni) {
        return false;
      }
    }
    if (!/^[a-z0-9_-]{1,40}$/.test(yeni)) {
      return false;
    }
    try {
      if (yerel()) {
        if (yerel().getItem(TESLIM_BOLGE_KEY) === yeni) {
          return false;
        }
        yerel().setItem(TESLIM_BOLGE_KEY, yeni);
      }
    } catch (e) {}
    olayYay("mx:teslim", { bolge: yeni, kaynak: kaynak || "sec" });
    return true;
  }

  
  function teslimTara(kok) {
    var els = hepsi(kok || document, "[data-mx-teslim]");
    var urunEls = hepsi(kok || document, "[data-mx-id][data-mx-hazirlik],[data-mx-id][data-mx-kargosuz]");
    
    var desiEls = hepsi(kok || document, "[data-mx-id][data-mx-desi]");
    if (!els.length && !urunEls.length && !desiEls.length) {
      return false;
    }
    var d = teslimKayit() || { kural: null, urunler: {} };
    var once = JSON.stringify({ k: d.kural ? teslimNormal(d.kural) : null, u: d.urunler || {}, g: d.kargo ? kargoNormal(d.kargo) : null, ds: d.desiler || {} });
    var kural = d.kural ? teslimNormal(d.kural) : null;
    
    var kargo = d.kargo ? kargoNormal(d.kargo) : null;
    if (els.length) {
      var hamBelge = els[0].getAttribute("data-mx-teslim");
      try {
        hamBelge = JSON.parse(hamBelge);
      } catch (e) {
        hamBelge = null;
      }
      kural = teslimNormal(hamBelge);
      kargo = kural ? kargoNormal(hamBelge) : null;
    }
    var urunler = {};
    var eski = d.urunler && typeof d.urunler === "object" ? d.urunler : {};
    var say = 0;
    for (var key in eski) {
      if (Object.prototype.hasOwnProperty.call(eski, key) && say < TESLIM_URUN_MAX && (eski[key] === false || teslimTam(eski[key], 0, TESLIM_GUN_MAX) !== null)) {
        urunler[key] = eski[key];
        say++;
      }
    }
    for (var i = 0; i < urunEls.length; i++) {
      var uid = String(urunEls[i].getAttribute("data-mx-id") || "");
      var uh = urunEls[i].hasAttribute("data-mx-kargosuz") ? false : teslimTam(urunEls[i].getAttribute("data-mx-hazirlik"), 0, TESLIM_GUN_MAX);
      if (uid && uid.length <= 64 && uh !== null) {
        if (!Object.prototype.hasOwnProperty.call(urunler, uid) && say >= TESLIM_URUN_MAX) {
          continue;
        }
        if (!Object.prototype.hasOwnProperty.call(urunler, uid)) {
          say++;
        }
        urunler[uid] = uh;
      }
    }
    var desiler = {};
    var eskiDesi = d.desiler && typeof d.desiler === "object" ? d.desiler : {};
    var dsay = 0;
    for (var dk in eskiDesi) {
      if (Object.prototype.hasOwnProperty.call(eskiDesi, dk) && dsay < TESLIM_URUN_MAX && kargoSayi(eskiDesi[dk], 0.01, KARGO_DESI_MAX) !== null) {
        desiler[dk] = eskiDesi[dk];
        dsay++;
      }
    }
    for (var di = 0; di < desiEls.length; di++) {
      var did = String(desiEls[di].getAttribute("data-mx-id") || "");
      var dv = kargoSayi(desiEls[di].getAttribute("data-mx-desi"), 0.01, KARGO_DESI_MAX);
      if (did && did.length <= 64 && dv !== null) {
        if (!Object.prototype.hasOwnProperty.call(desiler, did)) {
          if (dsay >= TESLIM_URUN_MAX) {
            continue;
          }
          dsay++;
        }
        desiler[did] = kargoYuvarla(dv);
      }
    }
    var sonra = JSON.stringify({ k: kural, u: urunler, g: kargo, ds: desiler });
    if (once === sonra && teslimKayit()) {
      return false;
    }
    depoYaz(yerel(), TESLIM_KEY, { kural: kural, urunler: urunler, kargo: kargo, desiler: desiler, at: new Date().toISOString() });
    if (once !== sonra) {
      olayYay("mx:teslim", { kaynak: "sayfa" });
      return true;
    }
    return false;
  }

  
  function teslimSepet(list, o) {
    var k = teslimKural();
    var l = list || sepetOku();
    if (!k || !l.length) {
      return null;
    }
    var s = o || {};
    var hz = 0;
    var kargolu = 0;
    for (var i = 0; i < l.length; i++) {
      var u = teslimUrun(l[i].id);
      if (u === false) {
        continue;
      }
      kargolu++;
      var h = u === null ? k.hazirlikGun : u;
      if (h > hz) {
        hz = h;
      }
    }
    if (!kargolu) {
      return null;
    }
    return teslimHesapla(k, { simdi: s.simdi, bolge: s.bolge || teslimBolgeOku(k), hazirlik: hz });
  }

  
  function teslimBicim(kod, dil, secenek) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(kod || ""));
    if (!m) {
      return "";
    }
    var tarih = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
    var o = { weekday: "short", day: "numeric", month: "short" };
    if (secenek && typeof secenek === "object") {
      o = {};
      for (var a in secenek) {
        if (Object.prototype.hasOwnProperty.call(secenek, a)) {
          o[a] = secenek[a];
        }
      }
    }
    o.timeZone = "UTC";
    var d = String(dil || "tr");
    try {
      return new Intl.DateTimeFormat(d === "ar" ? "ar-u-nu-latn" : d, o).format(tarih);
    } catch (e) {
      return m[3] + "." + m[2] + "." + m[1];
    }
  }

  var teslimDepo = {
    normal: teslimNormal,
    hesapla: teslimHesapla,
    kural: teslimKural,
    ilBolge: function (il, kural) { return teslimIlBolge(kural || teslimKural(), il); },
    bolge: function () { return teslimBolgeOku(); },
    bolgeSec: teslimBolgeSec,
    urun: teslimUrun,
    
    urunIcin: function (id, o) {
      var k = teslimKural();
      if (!k) {
        return null;
      }
      var s = o || {};
      var u = teslimUrun(id);
      if (u === false) {
        return null;
      }
      var h = s.hazirlik != null ? s.hazirlik : u;
      return teslimHesapla(k, { simdi: s.simdi, bolge: s.bolge || teslimBolgeOku(k), hazirlik: h === null ? undefined : h });
    },
    sepet: teslimSepet,
    bicim: teslimBicim,
    ilAnahtar: teslimIlAnahtar,
    tara: teslimTara,
    abone: function (fn) { return abone("mx:teslim", fn); }
  };

  
  
  
  
  var KARGO_BAREM_MAX = 20;
  var KARGO_DESI_MAX = 10000;
  var KARGO_TUTAR_MAX = 10000000;

  
  function kargoSayi(v, alt, ust) {
    if (v === undefined || v === null || v === "" || typeof v === "boolean") {
      return null;
    }
    var n = Number(v);
    return isFinite(n) && n >= alt && n <= ust ? n : null;
  }

  function kargoYuvarla(n) {
    return Math.round(n * 100) / 100;
  }

  
  function kargoNormal(v) {
    var ham = v;
    if (typeof ham === "string") {
      try {
        ham = JSON.parse(ham);
      } catch (e) {
        ham = null;
      }
    }
    if (!ham || typeof ham !== "object" || Array.isArray(ham)) {
      return null;
    }
    var k = ham.kargo && typeof ham.kargo === "object" && !Array.isArray(ham.kargo) ? ham.kargo : (Array.isArray(ham.baremler) ? ham : null);
    if (!k || !Array.isArray(k.baremler)) {
      return null;
    }
    var baremler = [];
    var gorulen = {};
    for (var i = 0; i < k.baremler.length && baremler.length < KARGO_BAREM_MAX; i++) {
      var b = k.baremler[i];
      if (!b || typeof b !== "object") {
        continue;
      }
      var d = kargoSayi(b.desi, 0.01, KARGO_DESI_MAX);
      var u = kargoSayi(b.ucret, 0, KARGO_TUTAR_MAX);
      if (d === null || u === null || gorulen[kargoYuvarla(d)]) {
        continue;
      }
      gorulen[kargoYuvarla(d)] = true;
      baremler.push({ desi: kargoYuvarla(d), ucret: kargoYuvarla(u) });
    }
    if (!baremler.length) {
      return null;
    }
    baremler.sort(function (a, c) { return a.desi - c.desi; });
    var bolgeler = [];
    var bg = {};
    if (Array.isArray(ham.bolgeler)) {
      for (var j = 0; j < ham.bolgeler.length && bolgeler.length < TESLIM_BOLGE_MAX; j++) {
        var x = ham.bolgeler[j];
        if (!x || typeof x !== "object") {
          continue;
        }
        var id = String(x.id == null ? "" : x.id).replace(/^\s+|\s+$/g, "").toLowerCase();
        if (!/^[a-z0-9_-]{1,40}$/.test(id) || bg[id]) {
          continue;
        }
        var ek = kargoSayi(x.kargoEk != null ? x.kargoEk : x.ek, 0, KARGO_TUTAR_MAX);
        bg[id] = true;
        bolgeler.push({ id: id, ek: ek === null ? 0 : kargoYuvarla(ek) });
      }
    }
    var bolen = kargoSayi(k.desiBolen, 1000, 10000);
    var vd = kargoSayi(k.varsayilanDesi, 0.01, KARGO_DESI_MAX);
    var esik = kargoSayi(k.ucretsizEsik, 0, KARGO_TUTAR_MAX);
    var sinir = kargoSayi(k.ucretsizDesiSiniri, 1, KARGO_DESI_MAX);
    var dek = kargoSayi(k.desiEk, 0, KARGO_TUTAR_MAX);
    var vb = String(ham.varsayilanBolge == null ? "" : ham.varsayilanBolge).replace(/^\s+|\s+$/g, "").toLowerCase();
    return {
      desiBolen: bolen === null ? 3000 : Math.round(bolen),
      varsayilanDesi: vd === null ? 1 : kargoYuvarla(vd),
      ucretsizEsik: esik === null ? null : kargoYuvarla(esik),
      ucretsizDesiSiniri: sinir === null ? null : Math.floor(sinir),
      desiEk: dek === null ? 0 : kargoYuvarla(dek),
      baremler: baremler,
      bolgeler: bolgeler,
      varsayilanBolge: bg[vb] ? vb : (bolgeler.length ? bolgeler[0].id : "")
    };
  }

  
  function kargoUrunDesi(u, kural) {
    var p = u && typeof u === "object" ? u : {};
    var bolen = kural && kural.desiBolen ? kural.desiBolen : 3000;
    var dogrudan = kargoSayi(p.desi, 0.01, KARGO_DESI_MAX);
    if (dogrudan !== null) {
      return kargoYuvarla(dogrudan);
    }
    var kg = kargoSayi(p.agirlik, 0.001, KARGO_DESI_MAX);
    var b = p.boyut && typeof p.boyut === "object" && !Array.isArray(p.boyut) ? p.boyut : null;
    var en = b ? kargoSayi(b.en, 0.1, 1000) : null;
    var boy = b ? kargoSayi(b.boy, 0.1, 1000) : null;
    var yk = b ? kargoSayi(b.yukseklik, 0.1, 1000) : null;
    var hacim = en !== null && boy !== null && yk !== null ? (en * boy * yk) / bolen : null;
    if (kg === null && hacim === null) {
      return null;
    }
    return Math.max(0.01, kargoYuvarla(Math.max(kg || 0, hacim || 0)));
  }

  function kargoBolgeBul(k, id) {
    var aranan = String(id == null ? "" : id).toLowerCase();
    var vars = null;
    for (var i = 0; i < k.bolgeler.length; i++) {
      if (k.bolgeler[i].id === aranan) {
        return k.bolgeler[i];
      }
      if (k.bolgeler[i].id === k.varsayilanBolge) {
        vars = k.bolgeler[i];
      }
    }
    return vars || k.bolgeler[0] || { id: "", ek: 0 };
  }

  
  function kargoHesapla(kural, o) {
    var k = kargoNormal(kural);
    if (!k) {
      return null;
    }
    var s = o || {};
    var desi = Number(s.desi);
    if (!isFinite(desi) || desi < 0) {
      desi = 0;
    }
    desi = kargoYuvarla(desi);
    var ucretDesi = Math.max(1, Math.ceil(desi));
    var taban = null;
    for (var i = 0; i < k.baremler.length; i++) {
      if (ucretDesi <= k.baremler[i].desi) {
        taban = k.baremler[i].ucret;
        break;
      }
    }
    if (taban === null) {
      var son = k.baremler[k.baremler.length - 1];
      taban = son.ucret + (ucretDesi - son.desi) * k.desiEk;
    }
    taban = kargoYuvarla(taban);
    var b = kargoBolgeBul(k, s.bolge);
    var tarife = kargoYuvarla(taban + b.ek);
    var ara = Number(s.ara);
    if (!isFinite(ara) || ara < 0) {
      ara = 0;
    }
    var esik = k.ucretsizEsik !== null ? k.ucretsizEsik : kargoSayi(s.esik, 0, KARGO_TUTAR_MAX);
    var esikGecti = esik !== null && esik > 0 && ara >= esik;
    var asiriDesi = esikGecti && k.ucretsizDesiSiniri !== null && ucretDesi > k.ucretsizDesiSiniri;
    var ucretsiz = esikGecti && !asiriDesi;
    return {
      bolge: b.id,
      desi: desi,
      ucretDesi: ucretDesi,
      taban: taban,
      ek: b.ek,
      tarife: tarife,
      tutar: ucretsiz ? 0 : tarife,
      ucretsiz: ucretsiz,
      esik: esik,
      kalan: esik !== null && esik > 0 && ara < esik ? kargoYuvarla(esik - ara) : 0,
      sinir: k.ucretsizDesiSiniri,
      asiriDesi: asiriDesi
    };
  }

  function kargoKural() {
    var d = teslimKayit();
    return d && d.kargo ? kargoNormal(d.kargo) : null;
  }

  
  function kargoUrun(id) {
    var d = teslimKayit();
    var u = d && d.desiler && typeof d.desiler === "object" ? d.desiler[String(id)] : undefined;
    return kargoSayi(u, 0.01, KARGO_DESI_MAX);
  }

  
  function kargoSepet(list, o) {
    var k = kargoKural();
    var l = list || sepetOku();
    if (!k || !l.length) {
      return null;
    }
    var s = o || {};
    var desi = 0;
    var kalem = 0;
    var bilinmeyen = 0;
    for (var i = 0; i < l.length; i++) {
      if (teslimUrun(l[i].id) === false) {
        continue;
      }
      kalem++;
      var ud = kargoUrun(l[i].id);
      if (ud === null) {
        ud = k.varsayilanDesi;
        bilinmeyen++;
      }
      desi += ud * adetSinirla(l[i].qty || 1);
    }
    var tk = teslimKural();
    var bolge = s.bolge || teslimBolgeOku(tk);
    var ara = s.ara == null ? sepetToplam(l) : s.ara;
    var r = kargoHesapla(k, { desi: desi, bolge: bolge, ara: ara, esik: s.esik });
    if (!kalem) {
      r.tutar = 0;
      r.tarife = 0;
      r.kargosuz = true;
    }
    r.kalem = kalem;
    r.bilinmeyen = bilinmeyen;
    r.bolgeAd = null;
    if (tk) {
      for (var j = 0; j < tk.bolgeler.length; j++) {
        if (tk.bolgeler[j].id === r.bolge) {
          r.bolgeAd = tk.bolgeler[j].ad;
        }
      }
    }
    return r;
  }

  var kargoDepo = {
    normal: kargoNormal,
    hesapla: kargoHesapla,
    urunDesi: kargoUrunDesi,
    kural: kargoKural,
    urun: kargoUrun,
    
    urunIcin: function (id, o) {
      var k = kargoKural();
      if (!k || teslimUrun(id) === false) {
        return null;
      }
      var s = o || {};
      var d = s.desi != null ? kargoSayi(s.desi, 0.01, KARGO_DESI_MAX) : kargoUrun(id);
      var adet = adetSinirla(s.adet || 1);
      return kargoHesapla(k, { desi: (d === null ? k.varsayilanDesi : d) * adet, bolge: s.bolge || teslimBolgeOku(teslimKural()), ara: s.ara, esik: s.esik });
    },
    sepet: kargoSepet,
    
    abone: function (fn) { return abone("mx:teslim", fn); }
  };

  
  
  
  
  var VERGI_KEY = "mxVergiV1";
  var KDV_TR = 20;
  var VERGI_SINIF_MAX = 20;
  var VERGI_URUN_MAX = 500;

  function kdvOranNormal(v) {
    if (v === undefined || v === null || v === "" || typeof v === "boolean") {
      return null;
    }
    var n = Number(typeof v === "string" ? v.replace(/^\s*%?\s*|\s*%?\s*$/g, "").replace(",", ".") : v);
    return isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
  }

  function kdvSinifId(v) {
    var s = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "").toLowerCase();
    return /^[a-z0-9_-]{1,40}$/.test(s) ? s : "";
  }

  function kdvNormal(v) {
    var ham = v;
    if (typeof ham === "string") {
      try {
        ham = JSON.parse(ham);
      } catch (e) {
        ham = null;
      }
    }
    if (!ham || typeof ham !== "object" || Array.isArray(ham)) {
      return null;
    }
    var vo = kdvOranNormal(ham.varsayilanOran);
    var varsayilan = vo === null ? KDV_TR : vo;
    var ko = kdvOranNormal(ham.kargoOrani);
    var siniflar = [];
    var gorulen = {};
    if (Array.isArray(ham.siniflar)) {
      for (var i = 0; i < ham.siniflar.length && siniflar.length < VERGI_SINIF_MAX; i++) {
        var s = ham.siniflar[i];
        if (!s || typeof s !== "object") {
          continue;
        }
        var sid = kdvSinifId(s.id);
        var so = kdvOranNormal(s.oran);
        if (!sid || so === null || gorulen[sid]) {
          continue;
        }
        gorulen[sid] = true;
        siniflar.push({ id: sid, ad: kampanyaMetin(s.ad, 60), oran: so });
      }
    }
    var vergisiz = [];
    if (Array.isArray(ham.vergisiz)) {
      for (var j = 0; j < ham.vergisiz.length && vergisiz.length < VERGI_URUN_MAX; j++) {
        var vid = String(ham.vergisiz[j] == null ? "" : ham.vergisiz[j]).replace(/^\s+|\s+$/g, "");
        if (vid && vid.length <= 64 && vergisiz.indexOf(vid) === -1) {
          vergisiz.push(vid);
        }
      }
    }
    var urunler = {};
    var say = 0;
    if (ham.urunler && typeof ham.urunler === "object" && !Array.isArray(ham.urunler)) {
      for (var uid in ham.urunler) {
        if (!Object.prototype.hasOwnProperty.call(ham.urunler, uid) || say >= VERGI_URUN_MAX || !uid || uid.length > 64) {
          continue;
        }
        var u = ham.urunler[uid];
        var uo = kdvOranNormal(u && typeof u === "object" ? u.oran : u);
        var us = u && typeof u === "object" ? kdvSinifId(u.sinif) : "";
        if (uo === null && !us) {
          continue;
        }
        urunler[uid] = { sinif: us || null, oran: uo };
        say++;
      }
    }
    return { varsayilanOran: varsayilan, kargoOrani: ko === null ? varsayilan : ko, siniflar: siniflar, vergisiz: vergisiz, urunler: urunler };
  }

  function kdvSinifBul(k, id) {
    if (!k || !id) {
      return null;
    }
    for (var i = 0; i < k.siniflar.length; i++) {
      if (k.siniflar[i].id === id) {
        return k.siniflar[i];
      }
    }
    return null;
  }

  
  function kdvUrun(k, u) {
    var p = u && typeof u === "object" ? u : {};
    var id = p.id == null ? "" : String(p.id);
    var sid = kdvSinifId(p.vergiSinifi);
    var s = kdvSinifBul(k, sid);
    if (k && id && k.vergisiz.indexOf(id) !== -1) {
      return { oran: 0, sinif: sid || null, vergisiz: true, kaynak: "liste" };
    }
    var o = kdvOranNormal(p.kdvOrani);
    var oran = KDV_TR;
    var kaynak = "tr";
    if (o !== null) {
      oran = o;
      kaynak = "urun";
    } else if (s) {
      oran = s.oran;
      kaynak = "sinif";
    } else if (k) {
      oran = k.varsayilanOran;
      kaynak = "varsayilan";
    }
    return { oran: oran, sinif: sid || null, vergisiz: oran === 0, kaynak: kaynak };
  }

  
  function kdvAyir(tutar, oran) {
    var d = Number(tutar);
    if (!isFinite(d) || d < 0) {
      d = 0;
    }
    d = yuvarla2(d);
    var r = kdvOranNormal(oran);
    if (r === null) {
      r = KDV_TR;
    }
    var haric = yuvarla2(d / (1 + r / 100));
    return { dahil: d, haric: haric, kdv: yuvarla2(d - haric), oran: r };
  }

  
  function kdvHesapla(k, satirlar, o) {
    var s = o || {};
    var sat = Array.isArray(satirlar) ? satirlar : [];
    var ind = s.satirIndirim && typeof s.satirIndirim === "object" ? s.satirIndirim : {};
    var defter = s.urunler && typeof s.urunler === "object" ? s.urunler : {};
    var lines = [];
    var net = 0;
    var bilinmeyen = 0;
    for (var i = 0; i < sat.length; i++) {
      var x = sat[i];
      if (!x || x.id == null || x.id === "") {
        continue;
      }
      var id = String(x.id);
      var tutar = (Number(x.price) || 0) * adetSinirla(x.qty) - (Number(ind[satirAnahtar(x.id, x.varyant)]) || 0);
      if (!(tutar > 0)) {
        continue;
      }
      var dk = kdvOranNormal(defter[id]);
      var bu = k && k.urunler[id] ? k.urunler[id] : null;
      var r = dk !== null ? kdvUrun(k, { id: id, kdvOrani: dk })
        : (bu ? kdvUrun(k, { id: id, kdvOrani: bu.oran, vergiSinifi: bu.sinif }) : kdvUrun(k, { id: id }));
      if (r.kaynak === "varsayilan" || r.kaynak === "tr") {
        bilinmeyen++;
      }
      lines.push({ oran: r.oran, tutar: tutar });
      net += tutar;
    }
    var kupon = Number(s.kupon);
    kupon = isFinite(kupon) && kupon > 0 ? Math.min(kupon, net) : 0;
    var kargo = Number(s.kargo);
    kargo = isFinite(kargo) && kargo > 0 ? kargo : 0;
    var grup = {};
    var sira = [];
    var ekle = function (oran, tutar) {
      var a = String(oran);
      if (!Object.prototype.hasOwnProperty.call(grup, a)) {
        grup[a] = { oran: oran, ham: 0 };
        sira.push(a);
      }
      grup[a].ham += tutar;
    };
    for (var j = 0; j < lines.length; j++) {
      ekle(lines[j].oran, lines[j].tutar - (net > 0 ? kupon * (lines[j].tutar / net) : 0));
    }
    if (kargo > 0) {
      ekle(k ? k.kargoOrani : KDV_TR, kargo);
    }
    
    var hedef = yuvarla2(net - kupon + kargo);
    var toplamD = 0;
    var enBuyuk = null;
    for (var g = 0; g < sira.length; g++) {
      grup[sira[g]].dahil = yuvarla2(grup[sira[g]].ham);
      toplamD += grup[sira[g]].dahil;
      if (!enBuyuk || grup[sira[g]].dahil > enBuyuk.dahil) {
        enBuyuk = grup[sira[g]];
      }
    }
    if (enBuyuk) {
      enBuyuk.dahil = yuvarla2(enBuyuk.dahil + (hedef - yuvarla2(toplamD)));
    }
    var out = { oranlar: [], dahil: 0, matrah: 0, kdv: 0, vergisiz: 0, bilinmeyen: bilinmeyen, kalem: lines.length };
    for (var h = 0; h < sira.length; h++) {
      var gr = grup[sira[h]];
      if (gr.oran === 0) {
        out.vergisiz = yuvarla2(out.vergisiz + gr.dahil);
        out.dahil += gr.dahil;
        out.matrah += gr.dahil;
        continue;
      }
      var ay = kdvAyir(gr.dahil, gr.oran);
      out.oranlar.push({ oran: gr.oran, dahil: ay.dahil, matrah: ay.haric, kdv: ay.kdv });
      out.dahil += ay.dahil;
      out.matrah += ay.haric;
      out.kdv += ay.kdv;
    }
    out.oranlar.sort(function (a, b) { return b.oran - a.oran; });
    out.dahil = yuvarla2(out.dahil);
    out.matrah = yuvarla2(out.matrah);
    out.kdv = yuvarla2(out.kdv);
    return out;
  }

  
  function kdvYuzde(oran, dil) {
    var x = Math.round((Number(oran) || 0) * 100) / 100;
    var kod = String(dil || "tr").toLowerCase().split(/[-_]/)[0];
    return kod === "tr" ? "%" + String(x).replace(".", ",") : String(x) + "%";
  }

  function kdvKayit() {
    var d = depoOku(yerel(), VERGI_KEY, null);
    return d && typeof d === "object" && !Array.isArray(d) ? d : null;
  }

  function kdvKural() {
    var d = kdvKayit();
    return d && d.kural ? kdvNormal(d.kural) : null;
  }

  
  function kdvDefter(id) {
    var d = kdvKayit();
    return d && d.urunler && typeof d.urunler === "object" ? kdvOranNormal(d.urunler[String(id)]) : null;
  }

  
  function kdvTara(kok) {
    var els = hepsi(kok || document, "[data-mx-vergi]");
    var urunEls = hepsi(kok || document, "[data-mx-id][data-mx-kdv]");
    if (!els.length && !urunEls.length) {
      return false;
    }
    var d = kdvKayit() || { kural: null, urunler: {} };
    var kural = d.kural ? kdvNormal(d.kural) : null;
    var once = JSON.stringify({ k: kural, u: d.urunler || {} });
    if (els.length) {
      kural = kdvNormal(els[0].getAttribute("data-mx-vergi"));
    }
    var urunler = {};
    var eski = d.urunler && typeof d.urunler === "object" ? d.urunler : {};
    var say = 0;
    for (var key in eski) {
      if (Object.prototype.hasOwnProperty.call(eski, key) && say < VERGI_URUN_MAX && kdvOranNormal(eski[key]) !== null) {
        urunler[key] = kdvOranNormal(eski[key]);
        say++;
      }
    }
    for (var i = 0; i < urunEls.length; i++) {
      var uid = String(urunEls[i].getAttribute("data-mx-id") || "");
      var uo = kdvOranNormal(urunEls[i].getAttribute("data-mx-kdv"));
      if (!uid || uid.length > 64 || uo === null) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(urunler, uid)) {
        if (say >= VERGI_URUN_MAX) {
          continue;
        }
        say++;
      }
      urunler[uid] = uo;
    }
    var sonra = JSON.stringify({ k: kural, u: urunler });
    if (once === sonra && kdvKayit()) {
      return false;
    }
    depoYaz(yerel(), VERGI_KEY, { kural: kural, urunler: urunler, at: new Date().toISOString() });
    if (once !== sonra) {
      olayYay("mx:vergi", { kaynak: "sayfa" });
      return true;
    }
    return false;
  }

  
  function kdvSepet(list, o) {
    var k = kdvKural();
    var l = list || sepetOku();
    if (!k || !l.length) {
      return null;
    }
    var s = o || {};
    var kh = s.kampanya && typeof s.kampanya === "object" ? s.kampanya : kampanyaDurum(l);
    var kupon = s.kupon;
    if (kupon == null) {
      var kd = kuponDurum(kh.net);
      kupon = kd.gecerli ? kd.indirim : 0;
    }
    var d = kdvKayit();
    return kdvHesapla(k, l, { satirIndirim: kh.satirToplamIndirim || kh.satirIndirim || {}, kupon: kupon, kargo: s.kargo, urunler: d && d.urunler ? d.urunler : {} });
  }

  var kdvDepo = {
    normal: kdvNormal,
    oranNormal: kdvOranNormal,
    
    urun: function (u, kural) { return kdvUrun(arguments.length > 1 ? kdvNormal(kural) : kdvKural(), u); },
    ayir: kdvAyir,
    hesapla: function (kural, satirlar, o) { return kdvHesapla(kdvNormal(kural), satirlar, o); },
    kural: kdvKural,
    defter: kdvDefter,
    sepet: kdvSepet,
    yuzde: kdvYuzde,
    tara: kdvTara,
    abone: function (fn) { return abone("mx:vergi", fn); }
  };

  function abone(olayAdi, fn) {
    if (typeof fn !== "function" || typeof window.addEventListener !== "function") {
      return function () {};
    }
    var dinle = function (ev) {
      fn(ev && ev.detail ? ev.detail : {});
    };
    window.addEventListener(olayAdi, dinle);
    return function () {
      window.removeEventListener(olayAdi, dinle);
    };
  }

  
  function widgetSar() {
    var adlar = ["mxCartAdd", "mxCartSetQty", "mxCartRemove", "mxCartClear"];
    for (var i = 0; i < adlar.length; i++) {
      (function (ad) {
        var asil = window[ad];
        if (typeof asil !== "function" || asil.mxStoreSarili === true || asil.mxStoreYedek === true) {
          return;
        }
        var sarili = function () {
          var sonuc = asil.apply(this, arguments);
          sepetDegisti(ad);
          return sonuc;
        };
        sarili.mxStoreSarili = true;
        window[ad] = sarili;
      })(adlar[i]);
    }
  }

  
  function yedekTanimla() {
    function tanimla(ad, fn) {
      if (typeof window[ad] !== "function") {
        fn.mxStoreYedek = true;
        window[ad] = fn;
      }
    }
    tanimla("mxCartList", function () { return sepetOku(); });
    tanimla("mxCartCount", function () { return sepetSayi(); });
    tanimla("mxCartTotal", function () { return sepetToplam(); });
    tanimla("mxCartAdd", function (item) { sepetEkle(item); });
    tanimla("mxCartSetQty", function (id, qty) { sepetAdet(id, qty); });
    tanimla("mxCartRemove", function (id) { sepetSil(id); });
    tanimla("mxCartClear", function () { sepetTemizle(); });
    tanimla("mxCartRefresh", function () { sepetDegisti("refresh"); });
    tanimla("mxCartAddFromEl", function (el) {
      if (!el || !el.getAttribute) {
        return;
      }
      var id = el.getAttribute("data-mx-id");
      if (!id) {
        return;
      }
      var qty = 1;
      var qtyEl = document.querySelector('[data-mx-qty-for="' + id + '"]');
      if (qtyEl && qtyEl.value) {
        qty = parseInt(qtyEl.value, 10) || 1;
      }
      window.mxCartAdd({
        id: id,
        name: el.getAttribute("data-mx-name") || "",
        price: parseFloat(el.getAttribute("data-mx-price")) || 0,
        img: el.getAttribute("data-mx-img") || "",
        url: el.getAttribute("data-mx-url") || "",
        qty: qty
      });
    });
    if (typeof window.addToCart !== "function") {
      var kopru = function (id, qty) {
        var el = document.querySelector('[data-mx-id="' + id + '"]');
        if (!el) {
          return;
        }
        if (qty) {
          window.mxCartAdd({
            id: id,
            name: el.getAttribute("data-mx-name") || "",
            price: parseFloat(el.getAttribute("data-mx-price")) || 0,
            img: el.getAttribute("data-mx-img") || "",
            url: el.getAttribute("data-mx-url") || "",
            qty: qty
          });
        } else {
          window.mxCartAddFromEl(el);
        }
      };
      kopru.mxBridge = true;
      kopru.mxStoreYedek = true;
      window.addToCart = kopru;
    }
  }

  
  
  
  
  var FAVORI_KEY = "mxFavoriV1";
  var KARSILASTIR_KEY = "mxKarsilastirV1";
  var KARSILASTIR_SINIR = 4;

  
  function guvenliAdres(u) {
    var s = u == null ? "" : String(u).trim();
    if (!s) {
      return "";
    }
    if (s.charAt(0) === "/" && s.charAt(1) !== "/" && s.charAt(1) !== "\\") {
      return s;
    }
    return /^https?:\/\//i.test(s) ? s : "";
  }

  
  function urunNormal(it) {
    if (!it || it.id == null || String(it.id).trim() === "") {
      return null;
    }
    var fiyat = Number(it.price);
    var u = {
      id: String(it.id).trim().slice(0, 64),
      name: it.name != null ? String(it.name).slice(0, 200) : "",
      price: isFinite(fiyat) && fiyat > 0 ? Math.round(fiyat * 100) / 100 : 0,
      img: guvenliAdres(it.img).slice(0, 500),
      url: guvenliAdres(it.url).slice(0, 500)
    };
    
    var st = it.stok != null ? String(it.stok) : (it.stock_status != null ? String(it.stock_status) : "");
    if (st === "var" || st === "in_stock") {
      u.stok = "var";
    } else if (st === "yok" || st === "out_of_stock") {
      u.stok = "yok";
    }
    return u;
  }

  
  function listeDeposu(o) {
    function oku() {
      var ham = depoOku(yerel(), o.anahtar, []);
      var out = [];
      var gorulen = {};
      if (!Array.isArray(ham)) {
        return out;
      }
      for (var i = 0; i < ham.length; i++) {
        var u = urunNormal(ham[i]);
        
        if (u && !Object.prototype.hasOwnProperty.call(gorulen, u.id)) {
          gorulen[u.id] = true;
          out.push(u);
        }
      }
      if (o.sinir > 0 && out.length > o.sinir) {
        out = out.slice(0, o.sinir);
      }
      return out;
    }

    function degisti(kaynak, id, kod) {
      var list = oku();
      var detay = { liste: list, sayi: list.length, sinir: o.sinir, kaynak: kaynak || "", id: id || "", kod: kod || "" };
      domListe(o.tur, list);
      olayYay(o.olay, detay);
      return detay;
    }

    function yaz(list, kaynak, id, kod) {
      depoYaz(yerel(), o.anahtar, list.length ? list : null);
      return degisti(kaynak, id, kod);
    }

    function varMi(id) {
      if (id == null) {
        return false;
      }
      var hedef = String(id);
      var list = oku();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === hedef) {
          return true;
        }
      }
      return false;
    }

    function ekle(item) {
      var yeni = urunNormal(item);
      if (!yeni) {
        return { ok: false, kod: "gecersiz", secili: false, liste: oku() };
      }
      var list = oku();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === yeni.id) {
          
          list[i] = yeni;
          return { ok: true, kod: "zaten", secili: true, liste: yaz(list, "tazele", yeni.id, "zaten").liste };
        }
      }
      if (o.sinir > 0 && list.length >= o.sinir) {
        return { ok: false, kod: "dolu", secili: false, liste: degisti("dolu", yeni.id, "dolu").liste };
      }
      if (o.basaEkle) {
        list.unshift(yeni);
      } else {
        list.push(yeni);
      }
      return { ok: true, kod: "eklendi", secili: true, liste: yaz(list, "ekle", yeni.id, "eklendi").liste };
    }

    function sil(id) {
      var hedef = String(id);
      var list = oku();
      var next = [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id !== hedef) {
          next.push(list[i]);
        }
      }
      return yaz(next, "sil", hedef, "cikti").liste;
    }

    function degistir(item) {
      var u = urunNormal(item);
      if (!u) {
        return { ok: false, kod: "gecersiz", secili: false, liste: oku() };
      }
      if (varMi(u.id)) {
        return { ok: true, kod: "cikti", secili: false, liste: sil(u.id) };
      }
      return ekle(u);
    }

    function temizle() {
      yaz([], "temizle", "", "");
      return [];
    }

    return {
      oku: oku,
      ekle: ekle,
      sil: sil,
      degistir: degistir,
      "var": varMi,
      icinde: varMi,
      sayi: function () { return oku().length; },
      sinir: function () { return o.sinir; },
      dolu: function () { return o.sinir > 0 && oku().length >= o.sinir; },
      temizle: temizle,
      abone: function (fn) { return abone(o.olay, fn); },
      
      _degisti: degisti
    };
  }

  var favoriDepo = listeDeposu({ tur: "favori", anahtar: FAVORI_KEY, olay: "mx:favori", sinir: 0, basaEkle: true });
  var karsilastirDepo = listeDeposu({ tur: "karsilastir", anahtar: KARSILASTIR_KEY, olay: "mx:karsilastir", sinir: KARSILASTIR_SINIR, basaEkle: false });

  
  
  

  
  var uyeDurum = "bilinmiyor";
  var uyeVeri = null;
  var benSozu = null;

  function uyeOzet(u) {
    if (!u) {
      return null;
    }
    return {
      id: u.id,
      ad: u.ad || "",
      soyad: u.soyad || "",
      email: u.email || "",
      telefon: u.telefon || "",
      created_at: u.created_at || null,
      son_giris_at: u.son_giris_at || null
    };
  }

  function uyeDurumAyarla(durum) {
    var onceki = uyeDurum;
    uyeDurum = durum;
    domUye();
    if (onceki !== durum || durum === "giris") {
      olayYay("mx:uye", { durum: uyeDurum, uye: uyeVeri });
    }
  }

  function uyeAyarla(u) {
    uyeVeri = uyeOzet(u);
    depoYaz(oturumDepo(), UYE_CACHE_KEY, uyeVeri);
    uyeDurumAyarla(uyeVeri ? "giris" : (uyeKullanilabilir() ? "misafir" : "kullanilamiyor"));
    return uyeVeri;
  }

  function veriAl(govde) {
    return govde && govde.data !== undefined ? govde.data : govde;
  }

  function uyeBen(zorla) {
    if (!uyeKullanilabilir()) {
      caprazUyar();
      uyeDurumAyarla("kullanilamiyor");
      return Promise.resolve(null);
    }
    if (benSozu && !zorla) {
      return benSozu;
    }
    benSozu = api("/api/public/uye/ben", { uyeGerekli: true }).then(function (g) {
      return uyeAyarla(veriAl(g));
    }, function (err) {
      if (err && err.status === 401) {
        return uyeAyarla(null);
      }
      if (err && (err.kod === "api-yok" || err.kod === "uye-kullanilamiyor")) {
        uyeVeri = null;
        depoYaz(oturumDepo(), UYE_CACHE_KEY, null);
        uyeDurumAyarla("kullanilamiyor");
        return null;
      }
      
      if (uyeDurum === "bilinmiyor") {
        uyeDurumAyarla(uyeVeri ? "giris" : "kullanilamiyor");
      }
      return uyeVeri;
    });
    return benSozu;
  }

  function uyeIstek(yol, opts) {
    var o = opts || {};
    o.uyeGerekli = true;
    return api(yol, o);
  }

  function uyeKayit(v) {
    var d = v || {};
    return uyeIstek("/api/public/uye/kayit", {
      method: "POST",
      body: {
        ad: d.ad,
        soyad: d.soyad,
        email: d.email,
        sifre: d.sifre,
        telefon: d.telefon || "",
        kvkk: d.kvkk === true
      }
    }).then(function (g) {
      benSozu = null;
      return uyeAyarla(veriAl(g));
    });
  }

  function uyeGiris(email, sifre) {
    var b = email && typeof email === "object" ? email : { email: email, sifre: sifre };
    return uyeIstek("/api/public/uye/giris", {
      method: "POST",
      body: { email: b.email, sifre: b.sifre }
    }).then(function (g) {
      benSozu = null;
      return uyeAyarla(veriAl(g));
    });
  }

  function uyeCikis() {
    var bitir = function () {
      benSozu = null;
      uyeAyarla(null);
      return null;
    };
    return uyeIstek("/api/public/uye/cikis", { method: "POST", body: {} }).then(bitir, bitir);
  }

  function uyeGuncelle(v) {
    return uyeIstek("/api/public/uye/ben", { method: "PATCH", body: v || {} }).then(function (g) {
      return uyeAyarla(veriAl(g));
    });
  }

  
  function uyeSifre(eski, yeni) {
    var b = eski && typeof eski === "object" ? eski : { eski: eski, yeni: yeni };
    return uyeIstek("/api/public/uye/sifre", {
      method: "POST",
      body: { eski: b.eski, yeni: b.yeni }
    }).then(function (g) {
      return veriAl(g) || true;
    });
  }

  function uyeAdresler() {
    return uyeIstek("/api/public/uye/adres").then(function (g) {
      var l = veriAl(g);
      return Array.isArray(l) ? l : [];
    });
  }

  function uyeAdresEkle(a) {
    return uyeIstek("/api/public/uye/adres", { method: "POST", body: a || {} }).then(veriAl);
  }

  function uyeAdresGuncelle(id, a) {
    return uyeIstek("/api/public/uye/adres/" + encodeURIComponent(String(id)), {
      method: "PATCH",
      body: a || {}
    }).then(veriAl);
  }

  function uyeAdresSil(id) {
    return uyeIstek("/api/public/uye/adres/" + encodeURIComponent(String(id)), {
      method: "DELETE"
    }).then(veriAl);
  }

  
  function oturumGerekli(girisYolu) {
    return uyeBen().then(function (u) {
      if (!u && uyeDurum === "misafir" && girisYolu) {
        var donus = window.location ? window.location.pathname + (window.location.search || "") : "";
        var ayir = String(girisYolu).indexOf("?") === -1 ? "?" : "&";
        try {
          window.location.href = girisYolu + ayir + "donus=" + encodeURIComponent(donus);
        } catch (e) {}
      }
      return u;
    });
  }

  
  function guvenliDonus(q) {
    if (!q || typeof q !== "string" || q.charAt(0) !== "/") {
      return false;
    }
    if (/[\x00-\x1f\x7f]/.test(q) || q.charAt(1) === "/" || q.charAt(1) === "\\" || q.indexOf("\\") !== -1) {
      return false;
    }
    if (q.indexOf("://") !== -1 || /^[\/]*[a-z][a-z0-9+.\-]*:/i.test(q)) {
      return false;
    }
    try {
      var origin = window.location && window.location.origin;
      if (origin && new window.URL(q, origin).origin !== origin) {
        return false;
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  function donusYolu(varsayilan) {
    var q = "";
    try {
      q = new window.URL(window.location.href).searchParams.get("donus") || "";
    } catch (e) {
      q = "";
    }
    if (guvenliDonus(q)) {
      return q;
    }
    return varsayilan || "";
  }

  
  
  
  
  var KUPON_KEY = "mxKuponV1";

  function kuponKodNormal(v) {
    var k = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "").toUpperCase();
    return /^[A-Z0-9_-]{3,32}$/.test(k) ? k : "";
  }

  function kuponSayi(v, varsayilan) {
    if (v === null || v === undefined || v === "") {
      return varsayilan;
    }
    var n = Number(v);
    return isFinite(n) ? n : varsayilan;
  }

  function kuponKayitNormal(k, kaynak) {
    if (!k || typeof k !== "object") {
      return null;
    }
    var kod = kuponKodNormal(k.kod);
    var tip = k.tip === "yuzde" || k.tip === "tutar" ? k.tip : "";
    var deger = kuponSayi(k.deger, 0);
    if (!kod || !tip || !(deger > 0)) {
      return null;
    }
    return {
      kod: kod,
      tip: tip,
      deger: deger,
      minSepet: kuponSayi(k.minSepet, 0) || 0,
      maxIndirim: kuponSayi(k.maxIndirim, null),
      bitis: k.bitis ? String(k.bitis) : null,
      kaynak: kaynak || k.kaynak || "demo",
      at: k.at || new Date().toISOString()
    };
  }

  
  function kuponHesapla(k, araToplam) {
    if (!k) {
      return { ok: false, neden: "yok" };
    }
    var bit = k.bitis ? Date.parse(k.bitis) : NaN;
    if (isFinite(bit) && Date.now() > bit) {
      return { ok: false, neden: "suresi-doldu" };
    }
    var ara = Math.round((Number(araToplam) || 0) * 100) / 100;
    if (ara <= 0) {
      return { ok: false, neden: "bos-sepet" };
    }
    if (ara < (k.minSepet || 0)) {
      return { ok: false, neden: "min-sepet", minSepet: k.minSepet || 0 };
    }
    var ind = k.tip === "yuzde" ? Math.round(ara * k.deger) / 100 : Math.round(k.deger * 100) / 100;
    if (k.tip === "yuzde" && k.maxIndirim != null && k.maxIndirim > 0 && ind > k.maxIndirim) {
      ind = k.maxIndirim;
    }
    if (ind > ara) {
      ind = ara;
    }
    return { ok: true, indirim: ind };
  }

  
  function kuponDemoListe(v) {
    var out = [];
    var ham = v;
    if (typeof ham === "string") {
      ham = ham.split(/[;\n]/);
    }
    if (!Array.isArray(ham)) {
      return out;
    }
    for (var i = 0; i < ham.length; i++) {
      var x = ham[i];
      if (typeof x === "string") {
        var p = x.split("|");
        if (p.length < 3) {
          continue;
        }
        x = { kod: p[0], tip: (p[1] || "").replace(/^\s+|\s+$/g, ""), deger: p[2], minSepet: p[3], bitis: p[4] ? String(p[4]).replace(/^\s+|\s+$/g, "") : null };
      }
      var k = kuponKayitNormal(x, "demo");
      if (k) {
        out.push(k);
      }
    }
    return out;
  }

  function kuponOku() {
    return kuponKayitNormal(depoOku(yerel(), KUPON_KEY, null));
  }

  function kuponDegisti(kaynak) {
    var d = kuponDurum();
    olayYay("mx:kupon", { kupon: d.kupon, durum: d, kaynak: kaynak || "" });
    return d;
  }

  function kuponDurum(araToplam) {
    var k = kuponOku();
    
    var ara = araToplam == null ? kampanyaDurum().net : Number(araToplam) || 0;
    if (!k) {
      return { kupon: null, araToplam: ara, indirim: 0, gecerli: false, neden: "" };
    }
    var h = kuponHesapla(k, ara);
    return {
      kupon: k,
      araToplam: ara,
      indirim: h.ok ? h.indirim : 0,
      gecerli: !!h.ok,
      neden: h.ok ? "" : h.neden,
      minSepet: h.minSepet != null ? h.minSepet : k.minSepet
    };
  }

  function kuponHata(neden, ek) {
    var e = hata(0, "kupon");
    e.neden = neden;
    if (ek && ek.minSepet != null) {
      e.minSepet = ek.minSepet;
    }
    if (ek && ek.error) {
      e.error = ek.error;
    }
    return e;
  }

  function kuponDemodanUygula(kod, o) {
    var liste = kuponDemoListe(o.demoKuponlar);
    var bulunan = null;
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].kod === kod) {
        bulunan = liste[i];
        break;
      }
    }
    if (!bulunan) {
      return Promise.reject(kuponHata("yok"));
    }
    var h = kuponHesapla(bulunan, kampanyaDurum().net);
    if (!h.ok) {
      return Promise.reject(kuponHata(h.neden, h));
    }
    depoYaz(yerel(), KUPON_KEY, bulunan);
    var d = kuponDegisti("uygula");
    return Promise.resolve({ ok: true, kupon: d.kupon, indirim: d.indirim, demo: true });
  }

  
  function kuponUygula(kodHam, opts) {
    var o = opts || {};
    var kod = kuponKodNormal(kodHam);
    if (!kod) {
      return Promise.reject(kuponHata("yok"));
    }
    var sepet = sepetOku();
    if (!sepet.length) {
      return Promise.reject(kuponHata("bos-sepet"));
    }
    if (apiBilgi.yok) {
      return kuponDemodanUygula(kod, o);
    }
    return api("/api/public/kupon/dogrula", { method: "POST", body: { kod: kod, kalemler: kalemlerSepetten(sepet) } }).then(function (g) {
      var d = veriAl(g) || {};
      var k = kuponKayitNormal(d, "api");
      if (!k) {
        throw kuponHata("yok");
      }
      depoYaz(yerel(), KUPON_KEY, k);
      var dd = kuponDegisti("uygula");
      
      return { ok: true, kupon: dd.kupon, indirim: dd.indirim, sunucuIndirim: d.indirim };
    }, function (err) {
      if (err && err.kod === "api-yok") {
        
        return kuponDemodanUygula(kod, o);
      }
      var b = err && err.body ? err.body : null;
      if (b && b.neden) {
        throw kuponHata(b.neden, { minSepet: b.minSepet, error: b.error });
      }
      if (err && (err.status === 404 || err.status === 503)) {
        
        throw kuponHata("kurulmamis", { error: err.error });
      }
      throw kuponHata("ag", { error: err && err.error });
    });
  }

  function kuponKaldir(kaynak) {
    try {
      yerel().removeItem(KUPON_KEY);
    } catch (e) {}
    return kuponDegisti(kaynak || "kaldir");
  }

  var kuponDepo = {
    oku: kuponOku,
    durum: kuponDurum,
    uygula: kuponUygula,
    kaldir: function () { return kuponKaldir("kaldir"); },
    hesapla: kuponHesapla,
    demoListe: kuponDemoListe,
    kodNormal: kuponKodNormal,
    abone: function (fn) { return abone("mx:kupon", fn); },
    _degisti: kuponDegisti
  };

  
  
  

  
  function kalemlerSepetten(list) {
    var out = [];
    var sira = {};
    for (var i = 0; i < list.length; i++) {
      var anahtar = satirAnahtar(list[i].id, list[i].varyant);
      if (Object.prototype.hasOwnProperty.call(sira, anahtar)) {
        var onceki = out[sira[anahtar]];
        onceki.adet = adetSinirla(onceki.adet + (list[i].qty || 1));
        continue;
      }
      var k = { urunId: list[i].id, adet: adetSinirla(list[i].qty || 1) };
      if (list[i].varyant) {
        k.varyant = list[i].varyant;
      }
      sira[anahtar] = out.length;
      out.push(k);
    }
    return out;
  }

  
  function siparisOlustur(v) {
    var d = v || {};
    var sepet = sepetOku();
    var kalemler = Array.isArray(d.kalemler) && d.kalemler.length ? d.kalemler : kalemlerSepetten(sepet);
    if (!kalemler.length) {
      return Promise.reject(hata(0, "bos-sepet"));
    }
    
    if (apiBilgi.yok || d.demo === true) {
      return demoSiparisOlustur(d, sepet);
    }
    var govde = { kalemler: kalemler, odeme: d.odeme || "kapida" };
    
    var kuponKod = d.kupon !== undefined ? kuponKodNormal(d.kupon) : (kuponOku() ? kuponOku().kod : "");
    if (kuponKod) {
      govde.kupon = kuponKod;
    }
    var alanlar = ["adres", "adresId", "notu", "email", "ad_soyad", "ad", "soyad", "telefon"];
    for (var i = 0; i < alanlar.length; i++) {
      if (d[alanlar[i]] != null && d[alanlar[i]] !== "") {
        govde[alanlar[i]] = d[alanlar[i]];
      }
    }
    return api("/api/public/siparis", { method: "POST", body: govde }).then(function (g) {
      var data = veriAl(g) || {};
      var no = g.no || data.no;
      var kayit = {
        no: no,
        email: data.email || d.email || "",
        toplam: g.toplam != null ? g.toplam : data.toplam,
        durum: g.durum || data.durum || "beklemede",
        data: data,
        at: new Date().toISOString()
      };
      depoYaz(oturumDepo(), SON_SIPARIS_KEY, kayit);
      
      try {
        var gecmis = depoOku(yerel(), ORDERS_KEY, []);
        if (!Array.isArray(gecmis)) {
          gecmis = [];
        }
        gecmis.unshift({
          orderNo: no,
          date: kayit.at,
          items: sepet,
          total: kayit.toplam,
          name: data.ad_soyad || d.ad_soyad || "",
          phone: d.telefon || "",
          address: d.adres && d.adres.adres ? d.adres.adres : "",
          note: d.notu || "",
          email: kayit.email,
          kaynak: "d1",
          durum: kayit.durum
        });
        depoYaz(yerel(), ORDERS_KEY, gecmis.slice(0, 50));
      } catch (e) {}
      if (d.sepetiTemizle !== false) {
        sepetTemizle();
        if (kuponKod) {
          kuponKaldir("siparis");
        }
      }
      return kayit;
    });
  }

  
  function demoSiparisNo() {
    var z = new Date();
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    var rastgele = Math.floor(Math.random() * 900 + 100);
    return "DEMO-" + z.getFullYear() + p2(z.getMonth() + 1) + p2(z.getDate()) + "-" + p2(z.getHours()) + p2(z.getMinutes()) + p2(z.getSeconds()) + "-" + rastgele;
  }

  
  function demoSiparisOlustur(d, sepet) {
    if (d.basarisiz === true) {
      var h = hata(0, "odeme-basarisiz");
      h.demo = true;
      return Promise.reject(h);
    }
    var kalemler = [];
    var ara = 0;
    for (var i = 0; i < sepet.length; i++) {
      var adet = adetSinirla(sepet[i].qty || 1);
      var fiyat = Number(sepet[i].price) || 0;
      ara += fiyat * adet;
      kalemler.push({
        urun_id: sepet[i].id,
        ad: sepet[i].name || sepet[i].id,
        adet: adet,
        birim_fiyat: fiyat,
        satir_toplam: fiyat * adet,
        varyant: sepet[i].varyant || "",
        gorsel: sepet[i].img || ""
      });
    }
    var kargo = Number(d.kargo) > 0 ? Number(d.kargo) : 0;
    var indirim = Number(d.indirim) > 0 ? Number(d.indirim) : 0;
    
    var kh = kampanyaHesapla(kampanyaListe(), sepet);
    var kampIndirim = kh.indirim;
    for (var hi = 0; hi < kh.hediyeler.length; hi++) {
      kalemler.push({
        urun_id: kh.hediyeler[hi].id,
        ad: kampanyaDil(kh.hediyeler[hi].ad, d.dil),
        adet: 1,
        birim_fiyat: 0,
        satir_toplam: 0,
        varyant: "",
        gorsel: kh.hediyeler[hi].img || "",
        hediye: true,
        kampanya: kh.hediyeler[hi].kampanyaId
      });
    }
    
    var kd = d.kupon === false ? null : kuponDurum(yuvarla2(ara - kampIndirim));
    var demoKupon = kd && kd.gecerli ? kd.kupon.kod : "";
    if (!(Number(d.indirim) > 0)) {
      indirim = yuvarla2(kampIndirim + (demoKupon ? kd.indirim : 0));
    }
    var kampOzet = [];
    for (var ui = 0; ui < kh.uygulanan.length; ui++) {
      kampOzet.push({ id: kh.uygulanan[ui].id, tip: kh.uygulanan[ui].tip, ad: kampanyaDil(kh.uygulanan[ui].ad, d.dil), indirim: kh.uygulanan[ui].indirim });
    }
    
    var ts = teslimSepet(sepet, { bolge: d.teslimBolge });
    
    var ks = kargoSepet(sepet, { bolge: d.teslimBolge, ara: ara, esik: d.kargoEsik });
    if (ks && !(Number(d.kargo) >= 0 && d.kargo !== null && d.kargo !== undefined && d.kargo !== "")) {
      kargo = ks.tutar;
    }
    var toplam = Math.max(0, ara + kargo - indirim);
    
    var kv = kdvKural();
    var kvr = kv ? kdvHesapla(kv, sepet, {
      satirIndirim: kh.satirToplamIndirim, kupon: Math.max(0, indirim - kampIndirim), kargo: kargo,
      urunler: (kdvKayit() || {}).urunler || {}
    }) : null;
    var no = demoSiparisNo();
    var at = new Date().toISOString();
    var yontem = d.odeme === "kart" || d.odeme === "havale" || d.odeme === "kapida" ? d.odeme : "kapida";
    var veri = {
      demo: true,
      no: no,
      email: d.email || "",
      ad_soyad: d.ad_soyad || "",
      kalemler: kalemler,
      ara_toplam: ara,
      kargo: kargo,
      indirim: indirim,
      kupon: demoKupon || null,
      kampanya_indirim: kampIndirim,
      kampanyalar: kampOzet,
      tahmini_teslim: ts ? { bolge: ts.bolge, kargo: ts.kargo, min: ts.min, max: ts.max } : null,
      kargo_detay: ks ? { bolge: ks.bolge, desi: ks.desi, ucret_desi: ks.ucretDesi, tarife: ks.tarife, ucret: kargo, ucretsiz: ks.ucretsiz } : null,
      kdv: kvr ? kvr.kdv : null,
      kdv_detay: kvr ? { matrah: kvr.matrah, kdv: kvr.kdv, vergisiz: kvr.vergisiz, oranlar: kvr.oranlar } : null,
      toplam: toplam,
      odeme_yontemi: yontem,
      durum: "onaylandi",
      created_at: at
    };
    var kayit = { no: no, email: veri.email, toplam: toplam, durum: veri.durum, data: veri, at: at, demo: true };
    depoYaz(oturumDepo(), SON_SIPARIS_KEY, kayit);
    try {
      var gecmis = depoOku(yerel(), ORDERS_KEY, []);
      if (!Array.isArray(gecmis)) {
        gecmis = [];
      }
      gecmis.unshift({
        orderNo: no,
        date: at,
        items: sepet,
        total: toplam,
        name: veri.ad_soyad,
        phone: d.telefon || "",
        address: d.adres && d.adres.adres ? d.adres.adres : (typeof d.adres === "string" ? d.adres : ""),
        note: d.notu || "",
        email: veri.email,
        kaynak: "demo",
        durum: veri.durum
      });
      depoYaz(yerel(), ORDERS_KEY, gecmis.slice(0, 50));
    } catch (e) {}
    if (d.sepetiTemizle !== false) {
      sepetTemizle();
      if (demoKupon) {
        kuponKaldir("siparis");
      }
    }
    return Promise.resolve(kayit);
  }

  function siparisListem(sayfa) {
    return uyeIstek("/api/public/siparis", { sorgu: { sayfa: sayfa || 1 } }).then(function (g) {
      var d = veriAl(g) || {};
      if (!Array.isArray(d.siparisler)) {
        d.siparisler = [];
      }
      return d;
    });
  }

  function siparisDetay(no, email) {
    return api("/api/public/siparis/" + encodeURIComponent(String(no || "")), {
      sorgu: email ? { email: email } : null
    }).then(veriAl);
  }

  function sonSiparis() {
    return depoOku(oturumDepo(), SON_SIPARIS_KEY, null);
  }

  
  
  

  function hepsi(kok, secici) {
    var r = kok && kok.querySelectorAll ? kok.querySelectorAll(secici) : [];
    var out = [];
    for (var i = 0; i < r.length; i++) {
      out.push(r[i]);
    }
    return out;
  }

  function domSepet(sayi, kok) {
    var n = sayi == null ? sepetSayi() : sayi;
    var els = hepsi(kok || document, "[data-mx-sepet-sayi]");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = String(n);
      if (n > 0) {
        els[i].removeAttribute("data-mx-bos");
      } else {
        els[i].setAttribute("data-mx-bos", "1");
      }
    }
  }

  function domUye(kok) {
    var r = kok || document;
    var giris = uyeDurum === "giris";
    var els = hepsi(r, "[data-mx-uye-goster]");
    for (var i = 0; i < els.length; i++) {
      var hedef = els[i].getAttribute("data-mx-uye-goster");
      var gorunur = hedef === "giris" ? giris : !giris;
      if (els[i].style) {
        els[i].style.display = gorunur ? "" : "none";
      }
      if (gorunur) {
        els[i].removeAttribute("aria-hidden");
      } else {
        els[i].setAttribute("aria-hidden", "true");
      }
    }
    var adlar = hepsi(r, "[data-mx-uye-ad]");
    for (var j = 0; j < adlar.length; j++) {
      adlar[j].textContent = uyeVeri ? (uyeVeri.ad || uyeVeri.email || "") : "";
    }
    if (document.documentElement && document.documentElement.setAttribute) {
      document.documentElement.setAttribute("data-mx-uye", uyeDurum);
    }
  }

  
  var DUGME_NITELIK = { favori: "data-mx-favori-dugme", karsilastir: "data-mx-karsilastir-dugme" };

  function depoTur(tur) {
    return tur === "karsilastir" ? karsilastirDepo : favoriDepo;
  }

  function enYakin(el, secici) {
    if (!el) {
      return null;
    }
    if (typeof el.closest === "function") {
      try {
        return el.closest(secici);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function dugmeKimlik(el) {
    var id = el.getAttribute("data-mx-id");
    if (id) {
      return id;
    }
    var ata = enYakin(el, "[data-mx-id]");
    return ata ? ata.getAttribute("data-mx-id") : "";
  }

  function dugmeUrun(el) {
    var kaynak = el.getAttribute("data-mx-id") ? el : enYakin(el, "[data-mx-id]");
    if (!kaynak) {
      return null;
    }
    var stok = kaynak.getAttribute("data-mx-stok") || el.getAttribute("data-mx-stok") || "";
    return urunNormal({
      id: kaynak.getAttribute("data-mx-id"),
      name: kaynak.getAttribute("data-mx-name") || "",
      price: parseFloat(kaynak.getAttribute("data-mx-price")) || 0,
      img: kaynak.getAttribute("data-mx-img") || "",
      url: kaynak.getAttribute("data-mx-url") || "",
      stok: stok
    });
  }

  function domListe(tur, list, kok) {
    var r = kok || document;
    var l = list || depoTur(tur).oku();
    var secili = {};
    for (var i = 0; i < l.length; i++) {
      secili[l[i].id] = true;
    }
    var dugmeler = hepsi(r, "[" + DUGME_NITELIK[tur] + "]");
    for (var j = 0; j < dugmeler.length; j++) {
      var el = dugmeler[j];
      var acik = Object.prototype.hasOwnProperty.call(secili, String(dugmeKimlik(el)));
      el.setAttribute("aria-pressed", acik ? "true" : "false");
      if (acik) {
        el.setAttribute("data-mx-secili", "1");
      } else {
        el.removeAttribute("data-mx-secili");
      }
      var etiket = el.getAttribute(acik ? "data-mx-etiket-cikar" : "data-mx-etiket-ekle");
      if (etiket) {
        el.setAttribute("aria-label", etiket);
        el.setAttribute("title", etiket);
      }
    }
    var sayaclar = hepsi(r, "[data-mx-" + tur + "-sayi]");
    for (var k = 0; k < sayaclar.length; k++) {
      sayaclar[k].textContent = String(l.length);
      if (l.length > 0) {
        sayaclar[k].removeAttribute("data-mx-bos");
      } else {
        sayaclar[k].setAttribute("data-mx-bos", "1");
      }
    }
  }

  var doluZaman = null;

  function doluBildir(el) {
    var metin = el.getAttribute("data-mx-etiket-dolu") || "";
    el.setAttribute("data-mx-dolu", "1");
    var bolgeler = hepsi(document, "[data-mx-karsilastir-mesaj]");
    for (var i = 0; i < bolgeler.length; i++) {
      bolgeler[i].textContent = metin;
    }
    if (doluZaman) {
      clearTimeout(doluZaman);
    }
    doluZaman = setTimeout(function () {
      doluZaman = null;
      el.removeAttribute("data-mx-dolu");
      for (var j = 0; j < bolgeler.length; j++) {
        bolgeler[j].textContent = "";
      }
    }, 2400);
  }

  
  function tikTemsilci(ev) {
    var t = ev && ev.target;
    var el = enYakin(t, "[data-mx-favori-dugme],[data-mx-karsilastir-dugme]");
    if (!el) {
      return;
    }
    
    if (typeof ev.preventDefault === "function") {
      ev.preventDefault();
    }
    if (typeof ev.stopPropagation === "function") {
      ev.stopPropagation();
    }
    if (el.disabled || el.getAttribute("aria-disabled") === "true") {
      return;
    }
    var tur = el.hasAttribute(DUGME_NITELIK.karsilastir) ? "karsilastir" : "favori";
    var u = dugmeUrun(el);
    if (!u) {
      return;
    }
    var sonuc = depoTur(tur).degistir(u);
    if (sonuc.kod === "dolu") {
      doluBildir(el);
    }
  }

  function bagla(kok) {
    
    kademeTara(kok);
    
    kampanyaTara(kok);
    
    teslimTara(kok);
    
    kdvTara(kok);
    domSepet(null, kok);
    domUye(kok);
    domListe("favori", null, kok);
    domListe("karsilastir", null, kok);
  }

  
  
  

  var MxStore = {
    __mxStore: true,
    hazir: true,
    surum: "1.7.0",
    api: api,
    apiBilgi: function () {
      return { kok: apiBilgi.kok, ayniOrigin: apiBilgi.ayniOrigin, yok: apiBilgi.yok, uye: uyeKullanilabilir() };
    },
    para: para,
    esc: esc,
    hataMetni: hataMetni,
    bagla: bagla,
    sepet: {
      oku: sepetOku,
      ekle: sepetEkle,
      adet: sepetAdet,
      sil: sepetSil,
      temizle: sepetTemizle,
      toplam: function () { return sepetToplam(); },
      sayi: function () { return sepetSayi(); },
      
      
      ozet: function () {
        var oz = sepetKademeOzet();
        var kv = kdvSepet();
        if (kv) {
          oz.kdv = kv;
        }
        return oz;
      },
      abone: function (fn) { return abone("mx:sepet", fn); }
    },
    uye: {
      durum: function () { return uyeDurum; },
      mevcut: function () { return uyeVeri; },
      kullanilabilir: uyeKullanilabilir,
      kayit: uyeKayit,
      giris: uyeGiris,
      cikis: uyeCikis,
      ben: uyeBen,
      guncelle: uyeGuncelle,
      sifre: uyeSifre,
      adresler: uyeAdresler,
      adresEkle: uyeAdresEkle,
      adresGuncelle: uyeAdresGuncelle,
      adresSil: uyeAdresSil,
      oturumGerekli: oturumGerekli,
      donusYolu: donusYolu,
      abone: function (fn) { return abone("mx:uye", fn); }
    },
    siparis: {
      olustur: siparisOlustur,
      listem: siparisListem,
      detay: siparisDetay,
      son: sonSiparis,
      
      demoKip: function () { return !!apiBilgi.yok; }
    },
    
    favori: favoriDepo,
    karsilastir: karsilastirDepo,
    
    kupon: kuponDepo,
    
    kademe: kademeDepo,
    
    kampanya: kampanyaDepo,
    
    teslim: teslimDepo,
    
    kargo: kargoDepo,
    
    kdv: kdvDepo
  };

  window.MxStore = MxStore;

  
  widgetSar();
  yedekTanimla();

  
  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", function (ev) {
      if (ev && ev.key === CART_KEY) {
        sepetDegisti("sekme");
      } else if (ev && ev.key === FAVORI_KEY) {
        favoriDepo._degisti("sekme");
      } else if (ev && ev.key === KARSILASTIR_KEY) {
        karsilastirDepo._degisti("sekme");
      } else if (ev && ev.key === KUPON_KEY) {
        kuponDepo._degisti("sekme");
      } else if (ev && ev.key === KADEME_KEY) {
        sepetDegisti("sekme");
      } else if (ev && (ev.key === TESLIM_KEY || ev.key === TESLIM_BOLGE_KEY)) {
        olayYay("mx:teslim", { kaynak: "sekme" });
      } else if (ev && ev.key === VERGI_KEY) {
        olayYay("mx:vergi", { kaynak: "sekme" });
      } else if (ev && ev.key === KAMPANYA_KEY) {
        olayYay("mx:kampanya", { liste: kampanyaListe(), kaynak: "sekme" });
        sepetDegisti("sekme");
      }
    });
  }

  
  if (typeof document.addEventListener === "function") {
    document.addEventListener("click", tikTemsilci);
  }

  
  var onbellek = depoOku(oturumDepo(), UYE_CACHE_KEY, null);
  if (onbellek && uyeKullanilabilir()) {
    uyeVeri = uyeOzet(onbellek);
    uyeDurum = "giris";
  }
  if (!uyeKullanilabilir()) {
    caprazUyar();
    uyeDurum = "kullanilamiyor";
  }
  bagla(document);

  
  var kuyruk = Array.isArray(window.mxStoreQ) ? window.mxStoreQ : [];
  window.mxStoreQ = {
    push: function (fn) {
      if (typeof fn === "function") {
        try {
          fn(MxStore);
        } catch (e) {
          if (window.console && window.console.error) {
            window.console.error("MxStore kuyruk:", e);
          }
        }
      }
      return 0;
    }
  };
  for (var qi = 0; qi < kuyruk.length; qi++) {
    window.mxStoreQ.push(kuyruk[qi]);
  }
  olayYay("mx:hazir", { MxStore: MxStore });

  
  if (uyeKullanilabilir()) {
    var gerek = hepsi(document, "[data-mx-uye-goster],[data-mx-uye-ad],[data-mx-uye]").length > 0 || kuyruk.length > 0 || !!onbellek;
    if (gerek) {
      uyeBen();
    } else if (uyeDurum === "bilinmiyor") {
      uyeDurum = "misafir";
      bagla(document);
    }
  }
})();
