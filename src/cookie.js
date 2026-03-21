// CSS ayrı dosyada yüklenecek (cookie.css)

// Dil tespiti - URL'den dil kodunu al
function detectLang() {
  var path = window.location.pathname;
  var match = path.match(/^\/(tr|en|ar)\//);
  return match ? match[1] : 'tr';
}

// Çok dilli metinler
var cookieTexts = {
  tr: {
    bannerText: 'Bu web sitesi, 6698 sayılı KVKK ve GDPR kapsamında size daha iyi bir deneyim sunmak için çerezler kullanmaktadır.',
    accept: 'Kabul Et',
    details: 'Detaylı Bilgi',
    modalTitle: 'Çerez ve Gizlilik Politikası',
    modalIntro: '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Genel Veri Koruma Yönetmeliği (GDPR) uyarınca, web sitemizde aşağıdaki amaçlar için çerezler kullanılmaktadır:',
    essential: '<strong>Zorunlu Çerezler:</strong> Sitenin temel işlevlerini yerine getirebilmesi için kesinlikle gerekli olan çerezlerdir. Bu çerezler olmadan web sitesinin çalışması mümkün değildir.',
    analytics: '<strong>Performans ve Analitik Çerezleri:</strong> Sitemizin performansını ölçmek ve iyileştirmek için kullanılır. Ziyaretçilerin siteyi nasıl kullandığı hakkında anonim istatistiksel veriler toplar.',
    functional: '<strong>İşlevsellik Çerezleri:</strong> Size daha gelişmiş ve kişiselleştirilmiş bir deneyim sunmak için kullanılır. Tercihlerinizi hatırlamak için kullanılır.',
    advertising: '<strong>Hedefleme/Reklam Çerezleri:</strong> Size ve ilgi alanlarınıza uygun reklamlar göstermek için kullanılır.',
    optOut: 'Çerezleri kabul etmek istemiyorsanız, tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Ancak bu durumda site işlevlerinin bir kısmı düzgün çalışmayabilir.',
    moreInfo: 'Daha detaylı bilgi için Gizlilik Politikamızı inceleyebilirsiniz.',
    modalAccept: 'Anladım ve Kabul Ediyorum'
  },
  en: {
    bannerText: 'This website uses cookies to provide you with a better experience in accordance with KVKK Law No. 6698 and GDPR.',
    accept: 'Accept',
    details: 'More Info',
    modalTitle: 'Cookie and Privacy Policy',
    modalIntro: 'In accordance with the Personal Data Protection Law (KVKK) No. 6698 and the General Data Protection Regulation (GDPR), cookies are used on our website for the following purposes:',
    essential: '<strong>Essential Cookies:</strong> These cookies are strictly necessary for the website to function properly. The website cannot operate without these cookies.',
    analytics: '<strong>Performance and Analytics Cookies:</strong> Used to measure and improve the performance of our website. They collect anonymous statistical data about how visitors use the site.',
    functional: '<strong>Functionality Cookies:</strong> Used to provide you with a more advanced and personalized experience. They are used to remember your preferences.',
    advertising: '<strong>Targeting/Advertising Cookies:</strong> Used to show you advertisements relevant to you and your interests.',
    optOut: 'If you do not want to accept cookies, you can disable them in your browser settings. However, some site features may not work properly in that case.',
    moreInfo: 'For more detailed information, please review our Privacy Policy.',
    modalAccept: 'I Understand and Accept'
  },
  ar: {
    bannerText: 'يستخدم هذا الموقع ملفات تعريف الارتباط لتزويدك بتجربة أفضل وفقًا لقانون KVKK رقم 6698 واللائحة العامة لحماية البيانات (GDPR).',
    accept: 'قبول',
    details: 'مزيد من المعلومات',
    modalTitle: 'سياسة ملفات تعريف الارتباط والخصوصية',
    modalIntro: 'وفقًا لقانون حماية البيانات الشخصية (KVKK) رقم 6698 واللائحة العامة لحماية البيانات (GDPR)، تُستخدم ملفات تعريف الارتباط على موقعنا الإلكتروني للأغراض التالية:',
    essential: '<strong>ملفات تعريف الارتباط الضرورية:</strong> هذه الملفات ضرورية للغاية لكي يعمل الموقع بشكل صحيح. لا يمكن تشغيل الموقع بدون هذه الملفات.',
    analytics: '<strong>ملفات تعريف الارتباط للأداء والتحليلات:</strong> تُستخدم لقياس أداء موقعنا وتحسينه. تجمع بيانات إحصائية مجهولة حول كيفية استخدام الزوار للموقع.',
    functional: '<strong>ملفات تعريف الارتباط الوظيفية:</strong> تُستخدم لتزويدك بتجربة أكثر تقدمًا وتخصيصًا. تُستخدم لتذكر تفضيلاتك.',
    advertising: '<strong>ملفات تعريف الارتباط المستهدفة/الإعلانية:</strong> تُستخدم لعرض إعلانات ذات صلة بك وباهتماماتك.',
    optOut: 'إذا كنت لا ترغب في قبول ملفات تعريف الارتباط، يمكنك تعطيلها من إعدادات المتصفح. ومع ذلك، قد لا تعمل بعض ميزات الموقع بشكل صحيح في هذه الحالة.',
    moreInfo: 'لمزيد من المعلومات التفصيلية، يرجى مراجعة سياسة الخصوصية الخاصة بنا.',
    modalAccept: 'أفهم وأقبل'
  }
};

// Cookie kontrolü
function checkCookie(name) {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(name + "="));
}

// Cookie ayarla
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// Cookie bildirimi göster
function showCookieNotice() {
  if (!checkCookie("cookieConsent")) {
    var lang = detectLang();
    var t = cookieTexts[lang] || cookieTexts['tr'];

    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.innerHTML = `
            <div>${t.bannerText}</div>
            <div class="cookie-banner-buttons">
                <button onclick="acceptCookies()" class="accept-btn">${t.accept}</button>
                <button onclick="showCookieDetails()" class="details-btn">${t.details}</button>
            </div>
        `;
    document.body.appendChild(banner);

    // Modal oluştur
    const modal = document.createElement("div");
    modal.className = "cookie-modal";
    modal.innerHTML = `
            <h2>${t.modalTitle}</h2>
            <p>${t.modalIntro}</p>
            <ul>
                <li>${t.essential}</li>
                <li>${t.analytics}</li>
                <li>${t.functional}</li>
                <li>${t.advertising}</li>
            </ul>
            <p>${t.optOut}</p>
            <p>${t.moreInfo}</p>

            <div style="text-align: right; margin-top: 20px;">
                <button onclick="acceptCookies()" class="accept-btn" style="font-size: 16px;">${t.modalAccept}</button>
            </div>
        `;
    document.body.appendChild(modal);

    // Overlay oluştur
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }
}

// Cookie detaylarını göster
function showCookieDetails() {
  document.querySelector(".cookie-modal").classList.add("active");
  document.querySelector(".modal-overlay").classList.add("active");
}

// Cookieleri kabul et
function acceptCookies() {
  setCookie("cookieConsent", "true", 365);
  document.querySelector(".cookie-banner")?.remove();
  document.querySelector(".cookie-modal")?.remove();
  document.querySelector(".modal-overlay")?.remove();
}

// Sayfa yüklendiğinde çalıştır
window.addEventListener("load", showCookieNotice);
