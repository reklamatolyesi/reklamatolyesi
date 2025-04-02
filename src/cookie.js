// Cookie bildirimi için stil tanımlamaları
const cookieStyle = `
    .cookie-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(33, 33, 33, 0.98);
        color: #fff;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
        max-width: 90%;
        width: 480px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        animation: slideUp 0.5s ease;
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    .cookie-banner-buttons {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }
    .cookie-banner button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .cookie-banner .accept-btn {
        background: #2196F3;
        color: white;
    }
    .cookie-banner .accept-btn:hover {
        background: #1976D2;
    }
    .cookie-banner .details-btn {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
    .cookie-banner .details-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    .cookie-modal {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        z-index: 10000;
        color: #333;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }
    .cookie-modal.active {
        display: block;
        animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -48%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
    .cookie-modal h2 {
        margin: 0 0 20px 0;
        color: #1a1a1a;
        font-size: 24px;
    }
    .cookie-modal p, .cookie-modal li {
        line-height: 1.6;
        margin: 10px 0;
        color: #444;
    }
    .cookie-modal ul {
        padding-left: 20px;
    }
    .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 9999;
        backdrop-filter: blur(4px);
    }
    .modal-overlay.active {
        display: block;
        animation: fadeOverlay 0.3s ease;
    }
    @keyframes fadeOverlay {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

// Stil ekle
const styleSheet = document.createElement('style');
styleSheet.textContent = cookieStyle;
document.head.appendChild(styleSheet);

// Cookie kontrolü
function checkCookie(name) {
    return document.cookie
        .split(';')
        .some((c) => c.trim().startsWith(name + '='));
}

// Cookie ayarla
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// Cookie bildirimi göster
function showCookieNotice() {
    if (!checkCookie('cookieConsent')) {
        const banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div>Bu web sitesi, 6698 sayılı KVKK ve GDPR kapsamında size daha iyi bir deneyim sunmak için çerezler kullanmaktadır.</div>
            <div class="cookie-banner-buttons">
                <button onclick="acceptCookies()" class="accept-btn">Kabul Et</button>
                <button onclick="showCookieDetails()" class="details-btn">Detaylı Bilgi</button>
            </div>
        `;
        document.body.appendChild(banner);

        // Modal oluştur
        const modal = document.createElement('div');
        modal.className = 'cookie-modal';
        modal.innerHTML = `
            <h2>Çerez ve Gizlilik Politikası</h2>
            <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Genel Veri Koruma Yönetmeliği (GDPR) uyarınca, web sitemizde aşağıdaki amaçlar için çerezler kullanılmaktadır:</p>
            <ul>
                <li><strong>Zorunlu Çerezler:</strong> Sitenin temel işlevlerini yerine getirebilmesi için kesinlikle gerekli olan çerezlerdir. Bu çerezler olmadan web sitesinin çalışması mümkün değildir.</li>
                <li><strong>Performans ve Analitik Çerezleri:</strong> Sitemizin performansını ölçmek ve iyileştirmek için kullanılır. Ziyaretçilerin siteyi nasıl kullandığı hakkında anonim istatistiksel veriler toplar.</li>
                <li><strong>İşlevsellik Çerezleri:</strong> Size daha gelişmiş ve kişiselleştirilmiş bir deneyim sunmak için kullanılır. Tercihlerinizi hatırlamak için kullanılır.</li>
                <li><strong>Hedefleme/Reklam Çerezleri:</strong> Size ve ilgi alanlarınıza uygun reklamlar göstermek için kullanılır.</li>
            </ul>
            <p>Çerezleri kabul etmek istemiyorsanız, tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Ancak bu durumda site işlevlerinin bir kısmı düzgün çalışmayabilir.</p>
            <p>Daha detaylı bilgi için Gizlilik Politikamızı inceleyebilirsiniz.</p>

            <div style="text-align: right; margin-top: 20px;">
                <button onclick="acceptCookies()" class="accept-btn" style="font-size: 16px;">Anladım ve Kabul Ediyorum</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Overlay oluştur
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }
}

// Cookie detaylarını göster
function showCookieDetails() {
    document.querySelector('.cookie-modal').classList.add('active');
    document.querySelector('.modal-overlay').classList.add('active');
}

// Cookieleri kabul et
function acceptCookies() {
    setCookie('cookieConsent', 'true', 365);
    document.querySelector('.cookie-banner')?.remove();
    document.querySelector('.cookie-modal')?.remove();
    document.querySelector('.modal-overlay')?.remove();
}

// Sayfa yüklendiğinde çalıştır
window.addEventListener('load', showCookieNotice);
