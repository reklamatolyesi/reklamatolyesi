// Firebase CRUD işlemleri
// Global user object - tüm modüller tarafından erişilebilir
window.user = {
    id: null,
    email: null,
    name: null,
    isLoggedIn: false,
    loginMethod: null, // 'email', 'google'
};

// Backward compatibility için
var user = window.user;

// Debug için console'a yazdır
console.log('Firebase.js loaded, user object initialized:', window.user);
console.log('User object is also available as:', user);

// Veri ekleme - Yeni döküman oluşturur
function dataAddWeb(collection, json, docId = null) {
    if (docId) {
        return db.collection(collection).doc(docId).set(json);
    } else {
        return db.collection(collection).doc().set(json);
    }
}

// Veri silme - Belirtilen ID'ye sahip dökümanı siler
function dataDeleteWeb(collection, docId) {
    db.collection(collection).doc(docId).delete();
}

// Veri güncelleme - Belirtilen ID'ye sahip dökümanı günceller
function dataUpdateWeb(collection, docId, json) {
    db.collection(collection).doc(docId).update(json);
}

// Tek döküman getirme - Belirtilen ID'ye sahip dökümanı getirir
function dataGetWeb(collection, docId) {
    return db.collection(collection).doc(docId).get();
}

// Tüm dökümanları listeleme - Koleksiyondaki tüm dökümanları getirir
function dataListWeb(collection) {
    return db.collection(collection).get();
}

// Koşullu sorgulama - Belirli koşullara göre dökümanları getirir
function dataQueryWeb(collection, field, operator, value) {
    return db.collection(collection).where(field, operator, value).get();
}

// Sıralı listeleme - Dökümanları belirtilen alana göre sıralar
function dataOrderWeb(collection, field, direction = 'asc') {
    return db.collection(collection).orderBy(field, direction).get();
}

// Limitli listeleme - Belirtilen sayıda döküman getirir
function dataLimitWeb(collection, limit) {
    return db.collection(collection).limit(limit).get();
}

// Sayfalama - Belirtilen dökümandan sonraki dökümanları getirir
function dataPaginateWeb(collection, lastDoc, limit) {
    return db.collection(collection).startAfter(lastDoc).limit(limit).get();
}

// Gerçek zamanlı dinleme - Koleksiyondaki değişiklikleri dinler
function dataListenWeb(collection, callback) {
    return db.collection(collection).onSnapshot(callback);
}

// Belirli ID ile veri ekleme - Özel ID ile döküman oluşturur
function dataAddWithIdWeb(collection, docId, json) {
    db.collection(collection).doc(docId).set(json);
}

// Veri var mı kontrol etme - Belirtilen ID'ye sahip döküman var mı kontrol eder
function dataExistsWeb(collection, docId) {
    return db
        .collection(collection)
        .doc(docId)
        .get()
        .then((doc) => doc.exists);
}

// Toplu veri ekleme - Birden fazla dökümanı aynı anda ekler
function dataBatchAddWeb(collection, dataArray) {
    const batch = db.batch();
    dataArray.forEach((data) => {
        const docRef = db.collection(collection).doc();
        batch.set(docRef, data);
    });
    return batch.commit();
}

// Toplu veri silme - Birden fazla dökümanı aynı anda siler
function dataBatchDeleteWeb(collection, docIds) {
    const batch = db.batch();
    docIds.forEach((id) => {
        const docRef = db.collection(collection).doc(id);
        batch.delete(docRef);
    });
    return batch.commit();
}

// Firebase Authentication işlemleri

// Kullanıcı kaydı - Firebase Authentication ile
function authRegisterWeb(email, password, additionalData = {}) {
    return firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Kullanıcı profilini güncelle
            if (additionalData.name) {
                user.updateProfile({
                    displayName: additionalData.name,
                });
            }

            // Ek bilgileri Firestore'a kaydet
            if (Object.keys(additionalData).length > 0) {
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    createdAt: new Date(),
                    isActive: true,
                    ...additionalData,
                };
                db.collection('users').doc(user.uid).set(userData);
            }

            return user;
        });
}

// Kullanıcı girişi - Firebase Authentication ile
function authLoginWeb(email, password) {
    return firebase.auth().signInWithEmailAndPassword(email, password);
}

// Kullanıcı çıkışı
function authLogoutWeb() {
    return firebase.auth().signOut();
}

// Şifre sıfırlama maili gönderme
function authResetPasswordWeb(email) {
    return firebase.auth().sendPasswordResetEmail(email);
}

// Mevcut kullanıcı bilgisi
function authCurrentUserWeb() {
    return firebase.auth().currentUser;
}

// Authentication durumu dinleme
function authStateListenerWeb(callback) {
    return firebase.auth().onAuthStateChanged(callback);
}

// Google ile giriş
function authGoogleLoginWeb() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return firebase
        .auth()
        .signInWithPopup(provider)
        .then((result) => {
            const user = result.user;

            // Kullanıcı bilgilerini Firestore'a kaydet
            const userData = {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date(),
                isActive: true,
                loginMethod: 'google',
            };

            db.collection('users').doc(user.uid).set(userData, { merge: true });

            return user;
        });
}

// Email doğrulama maili gönderme
function authSendEmailVerificationWeb() {
    const user = firebase.auth().currentUser;
    if (user) {
        return user.sendEmailVerification();
    }
    return Promise.reject('No user logged in');
}

// Sayfa yüklendiğinde authentication durumunu kontrol et
function initializeAuthState() {
    console.log('Initializing auth state...');

    authStateListenerWeb((firebaseUser) => {
        console.log('Auth state changed, firebaseUser:', firebaseUser);

        if (firebaseUser) {
            // Kullanıcı giriş yapmış - global user objesini doldur
            console.log(
                'User is authenticated, updating global user object...',
            );

            window.user.id = firebaseUser.uid;
            window.user.email = firebaseUser.email;
            window.user.name = firebaseUser.displayName || '';
            window.user.isLoggedIn = true;

            console.log('Basic user info set:', {
                id: window.user.id,
                email: window.user.email,
                isLoggedIn: window.user.isLoggedIn,
            });

            // Firestore'dan ek bilgileri al
            dataGetWeb('users', firebaseUser.uid)
                .then((userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        window.user.name =
                            userData.name || firebaseUser.displayName || '';
                        window.user.loginMethod =
                            userData.loginMethod || 'email';
                        console.log(
                            'Additional user data loaded from Firestore:',
                            userData,
                        );
                    } else {
                        window.user.loginMethod = 'email';
                        console.log(
                            'No additional user data found in Firestore',
                        );
                    }

                    // localStorage'ı güncelle
                    localStorage.setItem('user', JSON.stringify(window.user));

                    console.log(
                        '✅ User authenticated and global object updated:',
                        window.user,
                    );
                    console.log(
                        'You can now access user via: window.user or user',
                    );
                })
                .catch((error) => {
                    console.error('Error fetching user data:', error);
                    // Firestore hatası olsa bile temel bilgileri kullan
                    window.user.loginMethod = 'email';
                    localStorage.setItem('user', JSON.stringify(window.user));
                    console.log(
                        '✅ User authenticated (with Firestore error):',
                        window.user,
                    );
                });
        } else {
            // Kullanıcı giriş yapmamış - global user objesini temizle
            console.log(
                'User is not authenticated, clearing global user object...',
            );

            window.user.id = null;
            window.user.email = null;
            window.user.name = null;
            window.user.isLoggedIn = false;
            window.user.loginMethod = null;

            // localStorage'ı temizle
            localStorage.removeItem('user');

            console.log(
                '❌ User not authenticated, global object cleared:',
                window.user,
            );
        }
    });
}

console.log('About to initialize auth state...');
initializeAuthState();
console.log('Auth state initialization called');
