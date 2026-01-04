// Reklam Atölyesi - İçerik Analiz ve Düzeltme Scripti
// Kullanım: node analyze-fix.js [--fix] [--report-only]

var fs = require('fs');
var path = require('path');

// Analiz edilecek kelimeler
var searchTerms = {
  'lojistik': {
    pattern: /lojistik/gi,
    replacement: 'teslimat',
    context: 'reklam/tabela hizmetleri'
  },
  'ithalat': {
    pattern: /ithalat/gi,
    replacement: 'dijital baskı',
    context: 'reklam hizmetleri'
  },
  'ihracat': {
    pattern: /ihracat/gi,
    replacement: 'tabela imalatı',
    context: 'reklam hizmetleri'
  },
  'transit ticaret': {
    pattern: /transit\s+ticaret/gi,
    replacement: 'reklam çözümleri',
    context: 'reklam hizmetleri'
  }
};

// Yazım hataları
var typos = {
  'Reklam Atölayı': 'Reklam Atölyesi',
  'Reklam Atölya[^s]': 'Reklam Atölyesi',
  'Reklam Atölye[^si]': 'Reklam Atölyesi',
  'reklam atölye[^si]': 'Reklam Atölyesi'
};

// Sonuçlar
var results = {
  files: [],
  issues: [],
  fixes: [],
  menuCSS: []
};

// Dosya uzantıları
var fileExtensions = ['.html', '.js', '.json', '.php', '.txt'];

// Dosya tarama fonksiyonu
function scanDirectory(dir, fileList) {
  var files = fs.readdirSync(dir);
  
  files.forEach(function(file) {
    var filePath = path.join(dir, file);
    var stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // node_modules ve .git gibi klasörleri atla
      if (!file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath, fileList);
      }
    } else {
      var ext = path.extname(file).toLowerCase();
      if (fileExtensions.includes(ext) || ext === '') {
        fileList.push(filePath);
      }
    }
  });
}

// Dosya analizi
function analyzeFile(filePath) {
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    var relativePath = path.relative(process.cwd(), filePath);
    var issues = [];
    var fixes = [];
    var modified = false;
    var newContent = content;
    
    // 1. Arama terimlerini kontrol et
    Object.keys(searchTerms).forEach(function(term) {
      var config = searchTerms[term];
      var matches = content.match(config.pattern);
      
      if (matches) {
        matches.forEach(function(match) {
          var lines = content.substring(0, content.indexOf(match)).split('\n');
          var lineNumber = lines.length;
          var context = lines[lines.length - 1].substring(Math.max(0, lines[lines.length - 1].length - 50));
          
          issues.push({
            type: 'search_term',
            term: term,
            match: match,
            line: lineNumber,
            context: context.trim(),
            file: relativePath
          });
          
          // Düzeltme yapılacaksa
          if (process.argv.includes('--fix')) {
            // JSON dosyalarında dikkatli değiştir
            if (filePath.endsWith('.json')) {
              // Sadece "tr" alanlarındaki metinleri değiştir
              newContent = newContent.replace(
                new RegExp('("tr"\\s*:\\s*"[^"]*?)' + match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^"]*")', 'gi'),
                function(m, before, after) {
                  return before + config.replacement + after;
                }
              );
            } else {
              newContent = newContent.replace(config.pattern, config.replacement);
            }
            modified = true;
          }
        });
      }
    });
    
    // 2. Yazım hatalarını kontrol et
    Object.keys(typos).forEach(function(typo) {
      // Regex pattern'i düzelt - [^s] gibi negatif karakter sınıflarını doğru işle
      var patternStr = typo.replace(/\[(\^?)(.*?)\]/g, function(m, neg, chars) {
        if (neg === '^') {
          return '[^' + chars + ']';
        }
        return '[' + chars + ']';
      });
      var pattern = new RegExp('\\b' + patternStr + '\\b', 'gi');
      var matches = [];
      var match;
      
      // Global flag ile tüm eşleşmeleri bul
      while ((match = pattern.exec(content)) !== null) {
        // "Reklam Atölyesi" kelimesinin içindeki "Reklam Atölye" kısmını atla
        var before = content.substring(Math.max(0, match.index - 5), match.index);
        var after = content.substring(match.index + match[0].length, match.index + match[0].length + 2);
        if (after.toLowerCase() === 'si' || after.toLowerCase() === 'sı') {
          continue; // "Reklam Atölyesi" kelimesinin içindeyse atla
        }
        matches.push({
          text: match[0],
          index: match.index
        });
      }
      
      if (matches.length > 0) {
        matches.forEach(function(matchInfo) {
          var lines = content.substring(0, matchInfo.index).split('\n');
          var lineNumber = lines.length;
          
          issues.push({
            type: 'typo',
            original: matchInfo.text,
            correct: typos[typo],
            line: lineNumber,
            file: relativePath
          });
          
          if (process.argv.includes('--fix')) {
            // Sadece kelime sınırlarında değiştir
            var fixPattern = new RegExp('\\b' + patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
            newContent = newContent.replace(fixPattern, function(m) {
              // "Reklam Atölyesi" içindeyse değiştirme
              var idx = newContent.indexOf(m);
              var checkAfter = newContent.substring(idx + m.length, idx + m.length + 2);
              if (checkAfter.toLowerCase() === 'si' || checkAfter.toLowerCase() === 'sı') {
                return m;
              }
              return typos[typo];
            });
            modified = true;
          }
        });
      }
    });
    
    // 3. Menü CSS kontrolü
    if (filePath.includes('menu') && (filePath.endsWith('.html') || filePath.endsWith('.css'))) {
      var menuIssues = checkMenuCSS(content, relativePath);
      if (menuIssues.length > 0) {
        results.menuCSS.push({
          file: relativePath,
          issues: menuIssues
        });
      }
    }
    
    // Dosyayı kaydet
    if (modified && process.argv.includes('--fix')) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      fixes.push({
        file: relativePath,
        changes: issues.length
      });
    }
    
    if (issues.length > 0) {
      results.files.push({
        file: relativePath,
        issues: issues
      });
    }
    
    if (fixes.length > 0) {
      results.fixes.push.apply(results.fixes, fixes);
    }
    
  } catch (error) {
    console.error('Dosya okuma hatası:', filePath, error.message);
  }
}

// Menü CSS kontrolü
function checkMenuCSS(content, filePath) {
  var issues = [];
  
  // gap kontrolü
  if (!content.match(/gap\s*:\s*\d+px/i)) {
    issues.push({
      type: 'missing_gap',
      message: 'Menü öğeleri arasında gap tanımlı değil'
    });
  } else {
    var gapMatch = content.match(/gap\s*:\s*(\d+)px/i);
    if (gapMatch && parseInt(gapMatch[1]) < 10) {
      issues.push({
        type: 'low_gap',
        value: gapMatch[1] + 'px',
        recommendation: 'gap değeri en az 10px olmalı'
      });
    }
  }
  
  // padding kontrolü
  var paddingMatches = content.match(/\.modulexmenulist\s+ul\s+a\s*\{[^}]*padding[^}]*\}/gi);
  if (paddingMatches) {
    paddingMatches.forEach(function(match) {
      if (!match.match(/padding\s*:\s*\d+px\s+\d+px/i)) {
        issues.push({
          type: 'single_padding',
          message: 'Menü öğelerinde yatay padding eksik, padding: 10px 15px önerilir'
        });
      }
    });
  }
  
  // margin kontrolü
  if (!content.match(/\.modulexmenulist\s+ul\s+a[^}]*margin/i)) {
    issues.push({
      type: 'missing_margin',
      message: 'Menü öğelerinde margin tanımlı değil, margin: 0 2px önerilir'
    });
  }
  
  return issues;
}

// Rapor oluştur
function generateReport() {
  console.log('\n========================================');
  console.log('REKLAM ATÖLYESİ - İÇERİK ANALİZ RAPORU');
  console.log('========================================\n');
  
  // Toplam dosya sayısı
  var totalFiles = results.files.length;
  var totalIssues = 0;
  
  results.files.forEach(function(file) {
    totalIssues += file.issues.length;
  });
  
  console.log('📊 GENEL İSTATİSTİKLER:');
  console.log('   Toplam analiz edilen dosya:', totalFiles);
  console.log('   Toplam sorun:', totalIssues);
  console.log('');
  
  // Sorun türlerine göre grupla
  var byType = {};
  results.files.forEach(function(file) {
    file.issues.forEach(function(issue) {
      if (!byType[issue.type]) {
        byType[issue.type] = [];
      }
      byType[issue.type].push(issue);
    });
  });
  
  console.log('🔍 SORUN TÜRLERİ:');
  Object.keys(byType).forEach(function(type) {
    console.log('   ' + type + ':', byType[type].length, 'adet');
  });
  console.log('');
  
  // Dosya bazında detaylar
  if (results.files.length > 0) {
    console.log('📁 SORUNLU DOSYALAR:');
    results.files.forEach(function(file) {
      console.log('\n   📄 ' + file.file);
      file.issues.forEach(function(issue) {
        if (issue.type === 'search_term') {
          console.log('      ⚠️  [' + issue.term + '] Satır ' + issue.line + ': "' + issue.match + '"');
          console.log('         Bağlam: ...' + issue.context + '...');
        } else if (issue.type === 'typo') {
          console.log('      ✏️  [Yazım Hatası] Satır ' + issue.line + ': "' + issue.original + '" → "' + issue.correct + '"');
        }
      });
    });
  }
  
  // Menü CSS sorunları
  if (results.menuCSS.length > 0) {
    console.log('\n🎨 MENÜ CSS SORUNLARI:');
    results.menuCSS.forEach(function(menu) {
      console.log('\n   📄 ' + menu.file);
      menu.issues.forEach(function(issue) {
        console.log('      ⚠️  ' + issue.type + ': ' + (issue.message || issue.recommendation || issue.value));
      });
    });
  }
  
  // Düzeltmeler
  if (results.fixes.length > 0) {
    console.log('\n✅ YAPILAN DÜZELTMELER:');
    results.fixes.forEach(function(fix) {
      console.log('   ✓ ' + fix.file + ' - ' + fix.changes + ' değişiklik');
    });
  }
  
  console.log('\n========================================\n');
  
  // Öneriler
  if (totalIssues > 0 && !process.argv.includes('--fix')) {
    console.log('💡 ÖNERİ: Düzeltmeleri uygulamak için:');
    console.log('   node analyze-fix.js --fix\n');
  }
}

// Ana fonksiyon
function main() {
  var targetDir = path.join(__dirname);
  
  console.log('🔍 Analiz başlatılıyor...');
  console.log('📂 Hedef klasör:', targetDir);
  console.log('');
  
  var fileList = [];
  scanDirectory(targetDir, fileList);
  
  console.log('📋 ' + fileList.length + ' dosya bulundu, analiz ediliyor...\n');
  
  fileList.forEach(function(file) {
    analyzeFile(file);
  });
  
  generateReport();
}

// Script çalıştır
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, scanDirectory, checkMenuCSS };

