/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MESIN JAVASCRIPT — Peta Relasi dan Riwayat Hukum Perdirjen DJPb       ║
 * ║  Versi : 8.0.1  (Perbaikan Tampilan Mobile)                            ║
 * ║  Tempel : Sebagai file djpb-engine.js, lalu panggil via <script src>   ║
 * ║           tepat sebelum </body> di index.html                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── FITUR BARU (v8.0.0) ───────────────────────────────────────────────────
 * PANDUAN-1: Modal Panduan Penggunaan (#panduan-modal).
 *            Tombol ? (#panduan-btn) di header memicu modal informatif yang
 *            mencakup: Navigasi Peta, Interaksi Node, Pencarian & Referensi,
 *            Panel Detail, dan Pengaturan & Alat.
 *            Konten kaya dengan ikon SVG inline (.inline-icon) di dalam teks.
 *
 * PANDUAN-2: Logika Escape key direfaktor menjadi satu handler terpusat
 *            (handleGlobalEscape) yang memeriksa ketiga modal secara aman —
 *            hanya menutup modal yang sedang terbuka, tanpa konflik.
 *
 * ── FITUR SEBELUMNYA (v7.1.0) ─────────────────────────────────────────────
 * UX-3: Cross-Highlighting via toggleNodeHighlight().
 *
 * ── FITUR SEBELUMNYA (v7.0.0) ─────────────────────────────────────────────
 * REF-1..6: Modal Referensi Katalog Perdirjen.
 *
 * ── FITUR SEBELUMNYA (v6.0.0) ─────────────────────────────────────────────
 * EDGE-FILTER: Toggle checkbox Legenda R-01 s.d R-04.
 *
 * ── FITUR SEBELUMNYA (v5.2.x) ─────────────────────────────────────────────
 * CLUSTER-1..3: Smart Clustering Vis.js + fix Ghost Node via .slice().
 *
 * ── FITUR SEBELUMNYA (v5.1.0) ─────────────────────────────────────────────
 * Custom Autocomplete Dropdown (T-06).
 *
 * ── FITUR SEBELUMNYA (v5.0.0) ─────────────────────────────────────────────
 * MULTI-1..5: Multi-Ego Network.
 *
 * ── FITUR SEBELUMNYA (v4.0.0) ─────────────────────────────────────────────
 * SETTINGS-1..6: Modal Pengaturan (labels, freeze, dark mode).
 */

(function () {
  'use strict';

  /* =========================================================================
   * BAGIAN 1 — KONSTANTA & KONFIGURASI ATURAN BISNIS
   * ========================================================================= */

  /** Warna NODE per ID Tipe */
  var NODE_COLORS = {
    'T-01': { background: '#6B46C1', border: '#4C2E91', highlight: { background: '#7C3AED', border: '#6D28D9' } },
    'T-02': { background: '#B7791F', border: '#92600A', highlight: { background: '#D69E2E', border: '#B7791F' } },
    'T-03': { background: '#744A07', border: '#5C3A05', highlight: { background: '#92600A', border: '#744A07' } },
    'T-04': { background: '#276749', border: '#1D4F36', highlight: { background: '#2F855A', border: '#276749' } },
    'T-05': { background: '#38A169', border: '#276749', highlight: { background: '#48BB78', border: '#38A169' } },
    'T-06': { background: '#2C74B3', border: '#1E5799', highlight: { background: '#3182CE', border: '#2C74B3' } },
    'T-07': { background: '#2B6CB0', border: '#2C5282', highlight: { background: '#3182CE', border: '#2B6CB0' } }
  };
  var NODE_COLOR_DEFAULT = {
    background: '#718096', border: '#4A5568',
    highlight:  { background: '#4A5568', border: '#2D3748' }
  };

  /** Warna & label EDGE per ID Relasi */
  var EDGE_COLORS = {
    'R-01': { color: '#3182CE', highlight: '#2B6CB0', label: 'Mengingat'          },
    'R-02': { color: '#E53E3E', highlight: '#C53030', label: 'Mencabut Seluruhnya' },
    'R-03': { color: '#DD6B20', highlight: '#C05621', label: 'Mencabut Sebagian'  },
    'R-04': { color: '#D69E2E', highlight: '#B7791F', label: 'Mengubah'           }
  };
  var EDGE_COLOR_DEFAULT = { color: '#A0AEC0', highlight: '#718096', label: 'Tidak Diketahui' };

  /**
   * Terjemahan ID Tipe → nama panjang + CSS class badge
   * FIX-6: Nama panjang digunakan di panel detail agar pengguna tidak melihat
   * kode mesin seperti "T-06".
   */
  var TYPE_META = {
    'T-01': { name: 'Undang-Undang (UU)',                      css: 'uu'        },
    'T-02': { name: 'Peraturan Pemerintah (PP)',               css: 'pp'        },
    'T-03': { name: 'Peraturan Presiden (Perpres)',            css: 'pp'        },
    'T-04': { name: 'Peraturan Menteri Keuangan (PMK)',        css: 'pmk'       },
    'T-05': { name: 'Keputusan Menteri Keuangan (KMK)',        css: 'pmk'       },
    'T-06': { name: 'Peraturan Direktur Jenderal (Perdirjen)', css: 'perdirjen' },
    'T-07': { name: 'Keputusan Direktur Jenderal (Kepdirjen)', css: 'perdirjen' }
  };

  /** CSS class rel-pill per ID Relasi */
  var REL_PILL_CLASS = {
    'R-01': 'r-cite',
    'R-02': 'r-revoke-all',
    'R-03': 'r-revoke-part',
    'R-04': 'r-amend'
  };

  /** CSS class relasi-chip per ID Relasi */
  var CHIP_CLASS = {
    'R-01': 'cite',
    'R-02': 'revoke',
    'R-03': 'revoke',
    'R-04': 'amend'
  };

  /**
   * FIX-2: Batas rentang tahun yang ditampilkan di dropdown filter.
   * Hanya tahun dalam rentang [YEAR_MIN, YEAR_MAX] yang akan masuk daftar.
   */
  var YEAR_MIN = 2014;
  var YEAR_MAX = 2026;

  /* =========================================================================
   * BAGIAN 2 — STATE TERPUSAT
   * ========================================================================= */

  var State = {
    masterMap:        new Map(),  // Map<id_baku, rowObject>
    allEdgeDefs:      [],         // [{from, to, idRel, _idx}] sudah divalidasi
    networkInst:      null,       // instance vis.Network aktif
    nodesDS:          null,       // vis.DataSet nodes multi-ego aktif
    edgesDS:          null,       // vis.DataSet edges multi-ego aktif
    activeEgos:       [],         // MULTI-1: array ID semua ego yang aktif di kanvas
    lastSelectedEgo:  null,       // MULTI-5: ego terakhir yang diklik/dipilih user
    visContainer:     null,       // FIX-1: div#vis-canvas-container
    activeRels: {                 // EDGE-FILTER: tipe relasi yang aktif/tampil
      'R-01': true,
      'R-02': true,
      'R-03': true,
      'R-04': true
    }
  };

  /**
   * SETTINGS-1: State terpusat untuk tiga toggle pengaturan.
   * hideLabels  — apakah label garis relasi disembunyikan
   * freezeNet   — apakah fisika Vis.js dimatikan
   * darkMode    — apakah tema gelap aktif
   */
  var Settings = {
    hideLabels: false,
    freezeNet:  false,
    darkMode:   false
  };

  /* =========================================================================
   * BAGIAN 3 — CSS DINAMIS (Injeksi Style)
   * =========================================================================
   *
   * POIN-11: .detail-card-body dan .riwayat-table-wrap mendapat
   * max-height: 250px; overflow-y: auto; overflow-x: auto;
   * agar setiap seksi dapat di-scroll secara independen.
   *
   * FIX-4: Menyuntikkan fix scroll + layout ke #detail-panel.
   * FIX-1: z-index untuk #vis-canvas-container.
   */
  function injectDynamicStyles() {
    if (document.getElementById('djpb-dynamic-styles')) return; // idempoten
    var style = document.createElement('style');
    style.id  = 'djpb-dynamic-styles';
    style.textContent = [

      /* FIX-4: Scroll panel detail */
      '#detail-panel {',
      '  display: flex;',
      '  flex-direction: column;',
      '  max-height: calc(100vh - 60px);',
      '}',

      /* Scroll utama panel: flex:1 1 auto agar mengisi sisa tinggi, overflow-y scroll */
      '.panel-body {',
      '  flex: 1 1 auto;',
      '  min-height: 0;',
      '  overflow-y: auto !important;',
      '  overflow-x: hidden;',
      '}',

      /* Cegah squashing: setiap kartu mempertahankan tinggi aslinya */
      '.detail-card {',
      '  flex-shrink: 0;',
      '}',

      /* POIN-11: Scroll independen per seksi card body */
      '.detail-card-body {',
      '  max-height: 250px;',
      '  overflow-y: auto;',
      '  overflow-x: hidden;',
      '}',

      /* Cegah squashing pada seksi riwayat */
      '.riwayat-section {',
      '  flex-shrink: 0;',
      '}',

      /* POIN-11: Scroll independen untuk tabel riwayat */
      '.riwayat-table-wrap {',
      '  max-height: 250px;',
      '  overflow-y: auto;',
      '  overflow-x: hidden;',
      '}',

      /* FIX-4 / POIN Bungkus Teks: Word wrap untuk semua teks panjang di panel */
      '#detail-panel .data-value,',
      '#detail-panel .data-value.judul,',
      '#detail-panel .node-id,',
      '#detail-panel .relasi-chip {',
      '  white-space: normal;',
      '  word-wrap: break-word;',
      '  overflow-wrap: anywhere;',
      '}',

      /* FIX-6: Deep-link cursor */
      '.relasi-chip[data-target-id],',
      '#dp-riwayat-tbody tr[data-target-id] {',
      '  cursor: pointer;',
      '  transition: opacity 0.15s;',
      '}',
      '.relasi-chip[data-target-id]:hover,',
      '#dp-riwayat-tbody tr[data-target-id]:hover { opacity: 0.72; }',

      /* Search bar: dropdown select */
      '.map-search-bar select {',
      '  border: none; outline: none;',
      '  font-family: var(--font-body); font-size: 11px;',
      '  color: var(--text-secondary); background: transparent;',
      '  cursor: pointer; padding-right: 4px; max-width: 115px;',
      '}',

      /* Search bar: divider vertikal */
      '.map-search-bar .bar-divider {',
      '  width: 1px; height: 16px; background: var(--border); flex-shrink: 0;',
      '}',

      /* Search bar: wrapper input + dropdown */
      '.search-input-wrapper {',
      '  position: relative; display: flex; flex: 1; align-items: center;',
      '}',

      /* Search bar: input teks */
      '.map-search-bar #search-input {',
      '  border: none; outline: none;',
      '  font-family: var(--font-body); font-size: 12px;',
      '  color: var(--text-primary); background: transparent; width: 100%;',
      '}',
      '.map-search-bar #search-input::placeholder { color: var(--text-muted); }',

      /* Custom Autocomplete Dropdown */
      '.custom-dropdown {',
      '  position: absolute; top: calc(100% + 4px); left: 0; width: 100%;',
      '  min-width: 240px; display: none;',
      '  background: var(--bg-white);',
      '  border: 1px solid var(--border-strong);',
      '  border-radius: var(--radius);',
      '  box-shadow: var(--shadow-lg);',
      '  max-height: 280px; overflow-y: auto; z-index: 9999;',
      '}',
      '.custom-dropdown.is-open { display: block; }',

      '.custom-dropdown-item {',
      '  padding: 7px 12px;',
      '  font-family: var(--font-body); font-size: 12px;',
      '  color: var(--text-primary);',
      '  cursor: pointer;',
      '  border-bottom: 1px solid var(--border);',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '  transition: background 0.1s;',
      '}',
      '.custom-dropdown-item:last-child { border-bottom: none; }',
      '.custom-dropdown-item:hover {',
      '  background: var(--bg-hover, #EEF2FF);',
      '  color: var(--accent, #2C74B3);',
      '}',

      '.custom-dropdown-empty {',
      '  padding: 10px 12px;',
      '  font-family: var(--font-body); font-size: 11px;',
      '  color: var(--text-muted); text-align: center;',
      '}',

      /* Dark mode overrides untuk custom dropdown */
      'body.dark-mode .custom-dropdown {',
      '  background: var(--bg-surface, #1E2130);',
      '  border-color: var(--border-strong);',
      '}',
      'body.dark-mode .custom-dropdown-item {',
      '  color: var(--text-primary);',
      '  border-bottom-color: var(--border);',
      '}',
      'body.dark-mode .custom-dropdown-item:hover {',
      '  background: rgba(44,116,179,0.18);',
      '  color: #7EB8F7;',
      '}',

      /* FIX-1: Vis.js container tetap di bawah elemen UI floating */
      '#vis-canvas-container {',
      '  position: absolute;',
      '  inset: 0;',
      '  z-index: 1;',
      '}',

      /* Pastikan elemen UI floating tetap di atas kanvas Vis.js */
      '#network-map .map-toolbar   { z-index: 10; }',
      '#network-map .legend        { z-index: 10; }',
      '#network-map .map-statusbar { z-index: 10; }',
      '#network-map .map-empty-state { z-index: 5; }',
      '#active-filters-container   { z-index: 10; }',

      /* Canvas Vis.js mengisi kontainernya */
      '#vis-canvas-container canvas { display: block !important; }'

    ].join('\n');
    document.head.appendChild(style);
  }

  /* =========================================================================
   * BAGIAN 4 — PEMUATAN DATA CSV (PapaParse)
   * ========================================================================= */

  /**
   * Mem-parsing satu file CSV via PapaParse.
   * @returns {Promise<Array>}
   */
  function parseCSV(url) {
    return new Promise(function (resolve, reject) {
      Papa.parse(url, {
        download:       true,
        header:         true,
        skipEmptyLines: true,
        complete: function (results) {
          if (results.errors.length) {
            console.warn('[DJPb] Peringatan parsing ' + url + ':', results.errors);
          }
          resolve(results.data);
        },
        error: function (err) {
          reject(new Error('[DJPb] Gagal membaca ' + url + ': ' + err.message));
        }
      });
    });
  }

  /**
   * Titik masuk utama: muat kedua CSV secara paralel.
   * Graf BELUM digambar — menunggu input pencarian dari user.
   */
  function loadData() {
    console.log('[DJPb] Memuat data CSV...');
    showEmptyState('Memuat Data...', 'Membaca Tabel_Master.csv dan Tabel_Relasi.csv.', false);

    Promise.all([
      parseCSV('Tabel_Master.csv'),
      parseCSV('Tabel_Relasi.csv')
    ]).then(function (results) {
      var masterRows   = results[0];
      var relationRows = results[1];

      console.log('[DJPb] Master:', masterRows.length, '| Relasi:', relationRows.length);

      // Indeks master ke Map
      State.masterMap.clear();
      masterRows.forEach(function (row) {
        var id = trim(row['ID Aturan + Tahun (Baku)']);
        if (id) State.masterMap.set(id, row);
      });

      // Validasi & cache edge definitions
      State.allEdgeDefs = [];
      relationRows.forEach(function (row, idx) {
        var from  = trim(row['ID Sumber (Yang Aksi)']);
        var to    = trim(row['ID Target (Yang Dikenai)']);
        var idRel = trim(row['ID Relasi']);
        if (!from || !to || !idRel) return;
        if (!State.masterMap.has(from) || !State.masterMap.has(to)) {
          console.warn('[DJPb] Edge #' + idx + ' ref tidak ada di Master:', from, '->', to);
          return;
        }
        State.allEdgeDefs.push({ from: from, to: to, idRel: idRel, _idx: idx });
      });

      // Perbarui status bar
      updateStatusBar(State.masterMap.size, State.allEdgeDefs.length);

      // Bangun UI pencarian
      buildSearchUI();

      // Daftarkan event listener toolbar
      registerHeaderToolbar();

      // Tampilkan empty state: siap menunggu input
      showEmptyState(
        'Data Berhasil Dimuat',
        'Gunakan kotak pencarian di atas untuk memilih peraturan dan memulai visualisasi.',
        false
      );

    }).catch(function (err) {
      console.error('[DJPb] ERROR:', err);
      showEmptyState('Gagal Memuat Data', 'Periksa konsol browser. Error: ' + err.message, true);
    });
  }

  /* =========================================================================
   * BAGIAN 5 — UI PENCARIAN DINAMIS (Dropdown Tahun + Custom Autocomplete)
   * =========================================================================
   *
   * Mengubah .map-search-bar menjadi:
   * [🔍] [Dropdown Tahun 2014–2026] | [Input Pencarian + Custom Dropdown T-06]
   *
   * FIX-2: Hanya tahun dalam rentang YEAR_MIN–YEAR_MAX yang ditampilkan.
   * FIX-3: Dropdown hanya berisi T-06, nilai = Penulisan Asli murni.
   * 5.1  : <datalist> diganti Custom Autocomplete Dropdown (div kustom) agar
   * tidak hilang saat mouse bergeser. Dropdown hilang hanya saat:
   * (a) user memilih item, (b) user klik di luar, (c) user tekan Escape.
   */
 function buildSearchUI() {
    var bar = document.querySelector('.map-search-bar');
    if (!bar) return;

    /* Kumpulkan & filter tahun dalam rentang 2014–2026, descending */
    var tahunSet = {};
    State.masterMap.forEach(function (row) {
      var t = parseInt(trim(row['Tahun']), 10);
      if (!isNaN(t) && t >= YEAR_MIN && t <= YEAR_MAX) {
        tahunSet[t] = true;
      }
    });
    var tahunList = Object.keys(tahunSet)
      .map(Number)
      .sort(function (a, b) { return b - a; });

    /* Bangun elemen dropdown custom untuk tahun */
    var optionsTahunHTML = '<div class="custom-dropdown-item year-item" data-year="">Semua Tahun</div>';
    tahunList.forEach(function (t) {
      optionsTahunHTML += '<div class="custom-dropdown-item year-item" data-year="' + t + '">' + t + '</div>';
    });

    bar.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" style="width:13px;height:13px;color:var(--text-muted);flex-shrink:0;">' +
      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      
      /* Dropdown Tahun Custom (Menggantikan <select>) */
      '<div class="custom-year-wrapper">' +
        '<div id="filter-tahun-display" data-value="" title="Filter berdasarkan tahun">Semua Tahun <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;margin-left:2px;margin-top:1px;"><polyline points="6 9 12 15 18 9"/></svg></div>' +
        '<div id="custom-year-dropdown" class="custom-dropdown">' + optionsTahunHTML + '</div>' +
      '</div>' +
      
      '<span class="bar-divider"></span>' +
      
      '<div class="search-input-wrapper">' +
      '<input id="search-input"' +
      ' placeholder="Ketik nomor Perdirjen" autocomplete="off"/>' +
      '<div id="custom-search-dropdown" class="custom-dropdown"></div>' +
      '</div>';

    /* Isi dropdown pencarian awal */
    refreshCustomDropdown('', '');

    var yearDisp   = document.getElementById('filter-tahun-display');
    var yearDrop   = document.getElementById('custom-year-dropdown');
    var inputEl    = document.getElementById('search-input');
    var searchDrop = document.getElementById('custom-search-dropdown');

    /* Event: Buka/Tutup Dropdown Tahun */
    if (yearDisp && yearDrop) {
      yearDisp.addEventListener('click', function (e) {
        e.stopPropagation();
        yearDrop.classList.toggle('is-open');
        if (searchDrop) searchDrop.classList.remove('is-open');
      });

      /* Event: Pilih Tahun dari Dropdown Custom */
      yearDrop.addEventListener('click', function (e) {
        var item = e.target.closest('.year-item');
        if (!item) return;
        var val = item.getAttribute('data-year');
        var text = val === '' ? 'Semua Tahun' : val;
        
        yearDisp.innerHTML = text + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;margin-left:2px;margin-top:1px;"><polyline points="6 9 12 15 18 9"/></svg>';
        yearDisp.setAttribute('data-value', val);
        yearDrop.classList.remove('is-open');

        /* Update dropdown pencarian utama */
        var textVal = inputEl ? inputEl.value : '';
        refreshCustomDropdown(val, textVal);
        if (inputEl) { inputEl.value = ''; inputEl.focus(); }
      });
    }

    if (inputEl && searchDrop) {
      inputEl.addEventListener('focus', function () {
        var selVal = yearDisp ? yearDisp.getAttribute('data-value') : '';
        refreshCustomDropdown(selVal, inputEl.value.trim());
        searchDrop.classList.add('is-open');
        if (yearDrop) yearDrop.classList.remove('is-open');
      });

      inputEl.addEventListener('input', function () {
        var selVal = yearDisp ? yearDisp.getAttribute('data-value') : '';
        refreshCustomDropdown(selVal, inputEl.value.trim());
        searchDrop.classList.add('is-open');
      });

      searchDrop.addEventListener('click', function (e) {
        var item = e.target.closest('.custom-dropdown-item:not(.year-item)');
        if (!item) return;
        var val = item.getAttribute('data-value');
        if (!val) return;
        inputEl.value = val;
        searchDrop.classList.remove('is-open');
        var targetId = resolveSearchInput(val);
        if (targetId) renderEgoNetwork(targetId);
      });

      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          searchDrop.classList.remove('is-open');
          var targetId = resolveSearchInput(inputEl.value.trim());
          if (targetId) {
            renderEgoNetwork(targetId);
          } else {
            inputEl.style.outline = '2px solid var(--rel-revoke-all)';
            setTimeout(function () { inputEl.style.outline = ''; }, 1200);
          }
        }
        if (e.key === 'Escape') {
          searchDrop.classList.remove('is-open');
        }
      });
    }

    /* Tutup semua dropdown saat klik di luar kotak pencarian */
    document.addEventListener('click', function (e) {
      if (searchDrop && !inputEl.contains(e.target) && !searchDrop.contains(e.target)) {
        searchDrop.classList.remove('is-open');
      }
      if (yearDrop && !yearDisp.contains(e.target) && !yearDrop.contains(e.target)) {
        yearDrop.classList.remove('is-open');
      }
    });
  } // ── akhir buildSearchUI()

  /**
   * 5.1: Mengisi ulang custom dropdown berdasarkan filter tahun dan teks.
   *
   * Hanya T-06 yang masuk dropdown.
   * Menampilkan max 80 item agar DOM tidak membengkak.
   *
   * @param {string} tahunFilter — '' untuk semua tahun
   * @param {string} textFilter  — '' untuk semua teks (substring, case-insensitive)
   */
  function refreshCustomDropdown(tahunFilter, textFilter) {
    var dd = document.getElementById('custom-search-dropdown');
    if (!dd) return;

    var lowerText = (textFilter || '').toLowerCase();
    var items = [];

    State.masterMap.forEach(function (row) {
      /* Hanya Perdirjen (T-06) */
      if (trim(row['ID Tipe']) !== 'T-06') return;
      /* Filter tahun jika dipilih */
      if (tahunFilter && trim(row['Tahun']) !== String(tahunFilter)) return;

      var penulisan = trim(row['Penulisan Asli']);
      if (!penulisan) return;

      /* Filter teks jika ada input */
      if (lowerText && !penulisan.toLowerCase().includes(lowerText)) return;

      items.push(penulisan);
    });

    if (!items.length) {
      dd.innerHTML =
        '<div class="custom-dropdown-empty">Tidak ada hasil yang cocok.</div>';
      return;
    }

    /* Batasi 80 item agar tetap responsif */
    var MAX_ITEMS = 80;
    var limited   = items.length > MAX_ITEMS;
    var slice     = limited ? items.slice(0, MAX_ITEMS) : items;

    var html = '';
    slice.forEach(function (penulisan) {
      html +=
        '<div class="custom-dropdown-item" data-value="' + escH(penulisan) +
        '" title="' + escH(penulisan) + '">' + escH(penulisan) + '</div>';
    });
    if (limited) {
      html +=
        '<div class="custom-dropdown-empty">… dan ' + (items.length - MAX_ITEMS) +
        ' hasil lainnya. Ketik lebih spesifik.</div>';
    }
    dd.innerHTML = html;
  }

  /**
   * Mengurai nilai input → ID Aturan Baku (string kunci di masterMap).
   *
   * FIX-3: Urutan pencocokan yang diperbarui:
   * 1. Cocokkan tepat dengan Penulisan Asli (T-06 diutamakan, lalu semua tipe)
   * 2. Cocokkan tepat dengan ID Baku
   * 3. Substring case-insensitive pada Penulisan Asli T-06
   * 4. Substring case-insensitive pada ID Baku atau Penulisan Asli semua tipe
   *
   * @param {string} raw
   * @returns {string|null} ID Baku atau null bila tidak ditemukan
   */
  function resolveSearchInput(raw) {
    if (!raw) return null;
    var lower = raw.toLowerCase();

    /* Langkah 1a: Penulisan Asli tepat (T-06 dulu) */
    var found = null;
    State.masterMap.forEach(function (row, id) {
      if (found) return;
      if (trim(row['ID Tipe']) !== 'T-06') return;
      if (trim(row['Penulisan Asli']).toLowerCase() === lower) found = id;
    });
    if (found) return found;

    /* Langkah 1b: Penulisan Asli tepat (semua tipe) */
    State.masterMap.forEach(function (row, id) {
      if (found) return;
      if (trim(row['Penulisan Asli']).toLowerCase() === lower) found = id;
    });
    if (found) return found;

    /* Langkah 2: ID Baku tepat */
    if (State.masterMap.has(raw)) return raw;

    /* Langkah 3: Substring pada Penulisan Asli T-06 */
    State.masterMap.forEach(function (row, id) {
      if (found) return;
      if (trim(row['ID Tipe']) !== 'T-06') return;
      var penulisan = trim(row['Penulisan Asli']).toLowerCase();
      if (penulisan.includes(lower)) found = id;
    });
    if (found) return found;

    /* Langkah 4: Substring pada ID Baku atau Penulisan Asli semua tipe */
    State.masterMap.forEach(function (row, id) {
      if (found) return;
      var penulisan = trim(row['Penulisan Asli']).toLowerCase();
      if (id.toLowerCase().includes(lower) || penulisan.includes(lower)) found = id;
    });
    return found;
  }

  /* =========================================================================
   * BAGIAN 6 — MULTI-EGO NETWORK RENDERER
   * =========================================================================
   *
   * MULTI-2: renderEgoNetwork(newEgoId)
   * - Cek apakah newEgoId sudah ada di State.activeEgos; jika belum, push.
   * - Iterasi SEMUA ID di State.activeEgos untuk mengumpulkan node & edge
   * Degree-1 dari setiap ego secara union (tanpa duplikat).
   * - Node yang ID-nya ada di State.activeEgos mendapat gaya isEgo.
   *
   * MULTI-3: renderActiveFilterChips()
   * - Render chip untuk tiap ego aktif di #active-filters-container.
   * - Tombol × menghapus satu ego dan memanggil ulang renderAllEgos().
   *
   * MULTI-4: renderAllEgos()
   * - Fungsi internal yang membaca State.activeEgos dan merender ulang
   * seluruh grafik dari scratch agar gaya isEgo konsisten.
   * ========================================================================= */

  /**
   * Titik masuk: tambahkan newEgoId ke State.activeEgos lalu render ulang.
   * @param {string} newEgoId
   */
  function renderEgoNetwork(newEgoId) {
    if (!State.masterMap.has(newEgoId)) {
      console.warn('[DJPb] renderEgoNetwork: ID tidak ditemukan di masterMap:', newEgoId);
      return;
    }

    /* MULTI-1: Tambahkan ke array jika belum ada */
    var alreadyActive = false;
    for (var i = 0; i < State.activeEgos.length; i++) {
      if (State.activeEgos[i] === newEgoId) { alreadyActive = true; break; }
    }
    if (!alreadyActive) {
      State.activeEgos.push(newEgoId);
    }

    /* Catat sebagai ego terakhir yang dipilih (untuk tombol "Fokus di Peta") */
    State.lastSelectedEgo = newEgoId;

    /* Render seluruh graf berdasarkan activeEgos terbaru */
    renderAllEgos();

    /* Perbarui panel detail untuk ego yang baru ditambahkan */
    var allCurrentEdges = State.edgesDS ? State.edgesDS.get() : [];
    updateDetailPanel(newEgoId, State.masterMap.get(newEgoId), allCurrentEdges);
  }

  /**
   * MULTI-4: Bangun ulang seluruh dataset Vis.js dari State.activeEgos[].
   * Dipanggil setelah penambahan atau penghapusan ego.
   *
   * CLUSTER-1: Identifikasi node Leaf R-01 dan tandai dengan isLeafR01 + parentEgo.
   */
  function renderAllEgos() {
    if (!State.activeEgos.length) {
      /* Tidak ada ego aktif: bersihkan graf dan tampilkan empty state */
      if (State.networkInst) {
        State.nodesDS.clear();
        State.edgesDS.clear();
      }
      renderActiveFilterChips();
      updateStatusBar(0, 0);
      showEmptyState(
        'Semua Filter Dihapus',
        'Gunakan kotak pencarian untuk menambahkan peraturan ke peta.',
        false
      );
      return;
    }

    console.log('[DJPb] Render Multi-Ego:', State.activeEgos);

    /* ── 1. Kumpulkan semua node-ID & edge-def dari SELURUH ego (union) ── */
    var unionNodeIds  = {};   // { id: true }
    var unionEdgeDefs = {};   // { 'e-idx': edgeDef }  — kunci unik by _idx

    State.activeEgos.forEach(function (egoId) {
      unionNodeIds[egoId] = true;
      State.allEdgeDefs.forEach(function (e) {
        /* EDGE-FILTER: Bypass jika relasi ini sedang dinonaktifkan di legenda */
        if (!State.activeRels[e.idRel]) return;

        if (e.from === egoId || e.to === egoId) {
          unionNodeIds[e.from] = true;
          unionNodeIds[e.to]   = true;
          unionEdgeDefs['e-' + e._idx] = e;
        }
      });
    });

    /* ── 1b. CLUSTER-1: Identifikasi Leaf R-01 per ego ── */
    /*
     * Untuk setiap egoId, kita cari node yang:
     * a) Merupakan TARGET dari edge R-01 yang berasal dari egoId (ego → target via R-01)
     * b) Merupakan Leaf Node: hanya memiliki 1 edge di dalam unionEdgeDefs
     * (derajat = 1, hanya terhubung ke ego tersebut)
     *
     * Langkah:
     * 1. Hitung degree setiap node di dalam graf yang akan dirender
     * 2. Untuk setiap ego, cari node target R-01 yang degree-nya = 1
     * 3. Simpan mapping: nodeId → { isLeafR01: true, parentEgo: egoId }
     */

    /* Hitung degree setiap node berdasarkan unionEdgeDefs */
    var nodeDegree = {}; // { nodeId: count }
    Object.keys(unionEdgeDefs).forEach(function (key) {
      var e = unionEdgeDefs[key];
      nodeDegree[e.from] = (nodeDegree[e.from] || 0) + 1;
      nodeDegree[e.to]   = (nodeDegree[e.to]   || 0) + 1;
    });

    /* Mapping node → info kluster */
    var leafR01Map = {}; // { nodeId: { isLeafR01: true, parentEgo: egoId } }

    State.activeEgos.forEach(function (egoId) {
      Object.keys(unionEdgeDefs).forEach(function (key) {
        var e = unionEdgeDefs[key];
        /* Hanya relasi R-01 yang berasal dari ego ini */
        if (e.idRel !== 'R-01') return;
        if (e.from  !== egoId)  return;

        var targetId = e.to;

        /* Jangan tandai node yang juga merupakan ego aktif */
        var isActiveEgo = false;
        for (var i = 0; i < State.activeEgos.length; i++) {
          if (State.activeEgos[i] === targetId) { isActiveEgo = true; break; }
        }
        if (isActiveEgo) return;

        /* Hanya node dengan degree = 1 (leaf) */
        if ((nodeDegree[targetId] || 0) !== 1) return;

        /* Tandai sebagai Leaf R-01; jika sudah ada parentEgo lain, skip
           (node yang terhubung ke lebih dari 1 ego tidak bisa di-kluster
           ke salah satu ego saja — meski degree-nya 1, ini tidak mungkin
           secara logika; guard ini sebagai safety net) */
        if (!leafR01Map[targetId]) {
          leafR01Map[targetId] = { isLeafR01: true, parentEgo: egoId };
        }
      });
    });

    /* ── 2. Bangun array node Vis.js ── */
    /* Buat lookup set activeEgos untuk O(1) check */
    var activeEgoSet = {};
    State.activeEgos.forEach(function (id) { activeEgoSet[id] = true; });

    var nodesArray = [];
    Object.keys(unionNodeIds).forEach(function (id) {
      var row = State.masterMap.get(id);
      if (!row) return;

      var idTipe    = trim(row['ID Tipe']);
      var penulisan = trim(row['Penulisan Asli']) || id;
     var status    = trim(row['Status Sekarang']);
      var isEgo     = !!activeEgoSet[id];  /* true untuk SEMUA ego aktif */
      var colorDef  = NODE_COLORS[idTipe] || NODE_COLOR_DEFAULT;

      /* Ambil nama tipe dokumen lengkap dari kamus TYPE_META */
      var tipeMetaObj = TYPE_META[idTipe] || { name: idTipe || '—' };
      var tipeDokumen = tipeMetaObj.name;

      /* CLUSTER-1: Bawa informasi leaf R-01 ke dalam properti node */
      var leafInfo  = leafR01Map[id] || null;

      var nodeObj = {
        id:    id,
        label: penulisan,
        title: penulisan + '\nStatus: ' + (status || '—') + '\nTipe Dokumen: ' + tipeDokumen,
        color: {
          background: colorDef.background,
          border:     colorDef.border,
          highlight:  colorDef.highlight,
          hover: { background: colorDef.highlight.background, border: colorDef.highlight.border }
        },
        font: {
          color: '#FFFFFF',
          size:  isEgo ? 13 : 11,
          face:  'Plus Jakarta Sans, sans-serif'
        },
        shape:       'box',
        borderWidth: isEgo ? 3 : 1.5,
        borderWidthSelected: 4,
        margin:      isEgo ? 10 : 6,
        shadow: {
          enabled: true,
          size:    isEgo ? 14 : 6,
          x: 2, y: 2,
          color: isEgo ? 'rgba(44,116,179,0.35)' : 'rgba(0,0,0,0.18)'
        },
        widthConstraint: { minimum: isEgo ? 90 : 60, maximum: isEgo ? 200 : 160 }
      };

      /* CLUSTER-1: Tambahkan properti penanda jika node adalah leaf R-01 */
      if (leafInfo) {
        nodeObj.isLeafR01 = true;
        nodeObj.parentEgo = leafInfo.parentEgo;
      }

      nodesArray.push(nodeObj);
    });

    /* ── 3. Bangun array edge Vis.js ── */
    var edgesArray = [];
    Object.keys(unionEdgeDefs).forEach(function (key) {
      var e        = unionEdgeDefs[key];
      var colorDef = EDGE_COLORS[e.idRel] || EDGE_COLOR_DEFAULT;
      edgesArray.push({
        id:    'e-' + e._idx,
        from:  e.from,
        to:    e.to,
        label: colorDef.label,
        color: {
          color:     colorDef.color,
          highlight: colorDef.highlight,
          hover:     colorDef.highlight,
          inherit:   false
        },
        arrows: { to: { enabled: true, scaleFactor: 0.85, type: 'arrow' } },
        smooth: { enabled: true, type: 'dynamic', roundness: 0.35 },
        font: {
          size: 9, color: colorDef.color,
          face: 'Plus Jakarta Sans, sans-serif',
          align: 'middle', strokeWidth: 2, strokeColor: '#FFFFFF'
        },
        width: 1.8, selectionWidth: 3, hoverWidth: 2.5,
        _relId: e.idRel
      });
    });

    /* ── 4. Render / update Vis.js ── */
    hideEmptyState();

    if (!State.networkInst) {
      initVisNetwork(nodesArray, edgesArray);
    } else {
      /* PATCH-1: Buka semua kluster aktif sebelum clear() agar tidak ada
       * ghost nodes tersisa di memori internal Vis.js. Gunakan .slice()
       * karena openCluster() memodifikasi body.nodeIndices secara langsung. */
      var currentNodes = State.networkInst.body.nodeIndices.slice();
      currentNodes.forEach(function (id) {
        if (State.networkInst.isCluster(id)) {
          State.networkInst.openCluster(id);
        }
      });

      State.nodesDS.clear();
      State.edgesDS.clear();
      State.nodesDS.add(nodesArray);
      State.edgesDS.add(edgesArray);

      /* PATCH-2: applyClustering() dipanggil SEGERA setelah data diisi,
       * sebelum fisika berjalan → kluster terbentuk sejak awal sehingga
       * stabilisasi fisika langsung memperhitungkan topologi yang sudah
       * terkompresi, bukan topologi penuh yang meledak lalu dikompresi. */
      applyClustering();

      /* Aktifkan fisika sementara untuk relayout */
      State.networkInst.setOptions({ physics: { enabled: true } });
      State.networkInst.once('stabilizationIterationsDone', function () {
        State.networkInst.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        applyActiveSettings();
      });
    }

    /* ── 5. Update chip filter & status bar ── */
    renderActiveFilterChips();
    updateStatusBar(nodesArray.length, edgesArray.length);
  }

  /* =========================================================================
   * BAGIAN 6b — SISTEM KLUSTER (CLUSTER-2)
   * =========================================================================
   *
   * applyClustering() dipanggil setelah fit() selesai di renderAllEgos().
   * Untuk setiap egoId di State.activeEgos, fungsi ini:
   * 1. Menggunakan State.networkInst.cluster() dengan joinCondition yang
   * mencocokkan isLeafR01 === true dan parentEgo === egoId.
   * 2. Di processProperties, menghitung jumlah child nodes:
   * - Jika < 3 : batalkan kluster (return null agar Vis.js tidak membuat cluster)
   * - Jika >= 3: set label kluster dan properti tampilan
   * 3. clusterNodeProperties mengatur desain visual node kluster.
   * ========================================================================= */

  /**
   * CLUSTER-2: Terapkan kluster untuk setiap ego aktif.
   * Dipanggil tepat setelah State.networkInst.fit() di renderAllEgos().
   */
  function applyClustering() {
    var net = State.networkInst;
    if (!net) return;

    State.activeEgos.forEach(function (egoId) {
      net.cluster({
        /**
         * joinCondition: kembalikan true hanya untuk node yang merupakan
         * Leaf R-01 milik ego ini.
         *
         * @param {Object} nodeOptions — properti node dari DataSet
         * @returns {boolean}
         */
        joinCondition: function (nodeOptions) {
          return nodeOptions.isLeafR01 === true &&
                 nodeOptions.parentEgo === egoId;
        },

        /**
         * processProperties: dipanggil dengan daftar child nodes yang
         * memenuhi joinCondition. Gunakan ini untuk:
         * - Memutuskan apakah kluster benar-benar dibuat (< 3 → null)
         * - Mengatur label dan properti kluster jika dibuat
         *
         * @param {Object} clusterOptions  — properti kluster default dari Vis.js
         * @param {Array}  childNodes      — array objek node yang masuk kluster
         * @param {Array}  childEdges      — array objek edge yang menghubungkan
         * @returns {Object|null}
         */
        processProperties: function (clusterOptions, childNodes /*, childEdges */) {
          var count = childNodes.length;

          /* Jika kurang dari 3 node: tolak kluster — kembalikan clusterOptions
           * dengan flag khusus yang akan kita cek, ATAU cukup kembalikan
           * objek dengan label kosong. Cara paling bersih di Vis.js v9:
           * kembalikan null untuk mencegah pembentukan kluster. */
          if (count < 3) {
            /* Vis.js akan tetap membuat kluster jika kita return objek apapun.
             * Untuk mencegahnya, kita set clusterOptions.skipCluster = true
             * dan tangkap di luar — namun Vis.js tidak mendukung ini secara
             * native. Solusi: kembalikan objek dengan label "" lalu segera
             * buka kluster tersebut setelahnya (openCluster).
             * Pendekatan terbaik yang kompatibel: set label kosong &
             * tandai agar dibuka ulang. */
            clusterOptions._skipOpen = true;
            clusterOptions.label = '';
            return clusterOptions;
          }

          /* Kluster valid (>= 3 node): atur label */
          clusterOptions.label =
            '+' + count + ' Dasar Hukum\n(Klik Ganda Buka)';

          return clusterOptions;
        },

        /**
         * clusterNodeProperties: desain visual node kluster.
         */
        clusterNodeProperties: {
          shape:       'circle',
          color: {
            background: '#3182CE',
            border:     '#2B6CB0',
            highlight: {
              background: '#4299E1',
              border:     '#2B6CB0'
            },
            hover: {
              background: '#4299E1',
              border:     '#2B6CB0'
            }
          },
          font: {
            color: '#ffffff',
            size:  11,
            face:  'Plus Jakarta Sans, sans-serif',
            multi: true   /* izinkan \n dalam label */
          },
          borderWidth:  2,
          shadow:       true,
          widthConstraint:  { minimum: 80, maximum: 120 },
          heightConstraint: { minimum: 80 }
        }
      });
    });

    /* ── Setelah semua kluster dibentuk: buka kembali kluster dengan < 3 node ── */
    /*
     * Vis.js tidak menyediakan cara langsung untuk membatalkan pembentukan
     * kluster dari dalam processProperties. Pendekatan yang digunakan:
     * iterasi semua node di network; jika sebuah node adalah kluster DAN
     * jumlah node di dalamnya < 3, langsung openCluster.
     */
    /* PATCH-4: Gunakan .slice() agar iterasi tidak rusak ketika openCluster()
     * memodifikasi net.body.nodeIndices secara in-place di tengah forEach. */
    var allNodeIds = net.body.nodeIndices.slice();
    allNodeIds.forEach(function (nodeId) {
      if (!net.isCluster(nodeId)) return;
      /* Ambil node-node di dalam kluster ini */
      var nodesInCluster = net.getNodesInCluster(nodeId);
      if (nodesInCluster.length < 3) {
        net.openCluster(nodeId);
      }
    });
  }

  /**
   * MULTI-3: Render chip filter aktif ke #active-filters-container.
   * Setiap chip menampilkan label Penulisan Asli dan tombol × untuk hapus.
   */
  function renderActiveFilterChips() {
    var container = document.getElementById('active-filters-container');
    if (!container) return;

    if (!State.activeEgos.length) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    State.activeEgos.forEach(function (egoId) {
      var row       = State.masterMap.get(egoId);
      var label     = row ? (trim(row['Penulisan Asli']) || egoId) : egoId;
      var shortLabel = label.length > 32 ? label.substring(0, 30) + '…' : label;
      html +=
        '<span class="ego-filter-chip" data-ego-id="' + escH(egoId) + '" title="' + escH(label) + '">' +
        '<span class="ego-filter-chip-label">' + escH(shortLabel) + '</span>' +
        '<button class="ego-filter-chip-remove" title="Hapus ' + escH(shortLabel) + ' dari peta" aria-label="Hapus">&#x2715;</button>' +
        '</span>';
    });
    container.innerHTML = html;

    /* Pasang event listener pada tombol × */
    container.querySelectorAll('.ego-filter-chip-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var chip  = btn.closest('.ego-filter-chip');
        var egoId = chip ? chip.getAttribute('data-ego-id') : null;
        if (!egoId) return;
        removeEgoFromActive(egoId);
      });
    });
  }

  /**
   * Hapus satu ego dari State.activeEgos dan render ulang.
   * @param {string} egoId
   */
  function removeEgoFromActive(egoId) {
    State.activeEgos = State.activeEgos.filter(function (id) { return id !== egoId; });

    /* Jika ego yang dihapus adalah lastSelectedEgo, ganti ke ego terakhir yang tersisa */
    if (State.lastSelectedEgo === egoId) {
      State.lastSelectedEgo = State.activeEgos.length
        ? State.activeEgos[State.activeEgos.length - 1]
        : null;
    }

    if (!State.activeEgos.length) {
      /* Semua filter dihapus: bersihkan kanvas */
      if (State.networkInst) {
        State.nodesDS.clear();
        State.edgesDS.clear();
      }
      renderActiveFilterChips();
      updateStatusBar(0, 0);
      resetDetailPanel();
      showEmptyState(
        'Semua Filter Dihapus',
        'Gunakan kotak pencarian untuk menambahkan peraturan ke peta.',
        false
      );
      return;
    }

    /* Masih ada ego tersisa: render ulang dan perbarui panel ke lastSelectedEgo */
    renderAllEgos();
    if (State.lastSelectedEgo) {
      var allCurrentEdges = State.edgesDS ? State.edgesDS.get() : [];
      updateDetailPanel(
        State.lastSelectedEgo,
        State.masterMap.get(State.lastSelectedEgo),
        allCurrentEdges
      );
    }
  }

  /**
   * Menginisialisasi vis.Network (dipanggil sekali saat ego-network pertama dirender).
   *
   * FIX-1: Vis.Network di-attach ke #vis-canvas-container yang dibuat secara
   * dinamis di dalam #network-map.
   */
  function initVisNetwork(nodesArray, edgesArray) {
    State.nodesDS = new vis.DataSet(nodesArray);
    State.edgesDS = new vis.DataSet(edgesArray);

    /* FIX-1: Buat kontainer khusus untuk Vis.js */
    var mapEl = document.getElementById('network-map');
    var visContainer = document.getElementById('vis-canvas-container');

    if (!visContainer) {
      visContainer = document.createElement('div');
      visContainer.id = 'vis-canvas-container';
      mapEl.appendChild(visContainer);
    }

    State.visContainer = visContainer;

    var options = {
      layout: { improvedLayout: true, hierarchical: { enabled: false } },
      physics: {
        enabled: true,
        solver:  'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity:        0.01,
          springLength:          210,
          springConstant:        0.08,
          damping:               0.6,
          avoidOverlap:          0.6
        },
        stabilization: { enabled: true, iterations: 350, updateInterval: 40, fit: true }
      },
      interaction: {
        hover:             true,
        tooltipDelay:      120,
        hideEdgesOnDrag:   false,
        multiselect:       false,
        navigationButtons: false,
        keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 }, bindToWindow: false }
      },
      nodes: { widthConstraint: { minimum: 60, maximum: 180 } },
      edges: { length: 220 }
    };

    /* FIX-1: Attach ke visContainer, bukan ke mapEl langsung */
    State.networkInst = new vis.Network(
      visContainer,
      { nodes: State.nodesDS, edges: State.edgesDS },
      options
    );

    /* PATCH-3: applyClustering() dipanggil synchronous tepat setelah Network
     * dibuat, sebelum stabilisasi fisika pertama berjalan. Dengan demikian
     * Vis.js langsung menstabilkan topologi yang sudah terkompresi. */
    applyClustering();

    State.networkInst.once('stabilizationIterationsDone', function () {
      State.networkInst.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
      /* Terapkan setting aktif setelah graph pertama kali stabil */
      applyActiveSettings();
    });

    registerNetworkEvents();
    registerMapToolbar();
  }

  /* =========================================================================
   * BAGIAN 7 — EVENT LISTENERS
   * ========================================================================= */

  /**
   * Event Vis.js: klik node, deselect, zoom, doubleClick.
   *
   * CLUSTER-3: doubleClick diperbarui untuk menangani node kluster:
   * - Jika kluster → openCluster() + applyActiveSettings()
   * - Jika bukan kluster → renderEgoNetwork() seperti sebelumnya
   */
  function registerNetworkEvents() {
    var net = State.networkInst;

    /* Klik node → perbarui panel detail */
    net.on('selectNode', function (params) {
      if (!params.nodes.length) return;
      var nodeId = params.nodes[0];

      /* Jika node yang diklik adalah kluster, tidak perlu update panel detail */
      if (net.isCluster(nodeId)) return;

      var data   = State.masterMap.get(nodeId);
      if (!data) return;

      /* MULTI-5: Catat node yang diklik sebagai lastSelectedEgo */
      State.lastSelectedEgo = nodeId;

      var connEdgeIds = net.getConnectedEdges(nodeId);
      var connEdges   = connEdgeIds
        .map(function (eid) { return State.edgesDS.get(eid); })
        .filter(Boolean);

      updateDetailPanel(nodeId, data, connEdges);
    });

    /* Klik kanvas kosong → reset panel */
    net.on('deselectNode', function () {
      if (!net.getSelectedNodes().length) resetDetailPanel();
    });

    /* Zoom → update status bar (Saat scroll manual) */
    net.on('zoom', function (params) {
      var pct    = Math.round(params.scale * 100);
      var zoomEl = document.querySelector('.map-stat-chip:last-child span');
      if (zoomEl) zoomEl.textContent = pct + '%';
    });

    /* Zoom → update status bar (Saat animasi JS seperti Fit / Fokus selesai) */
    net.on('animationFinished', function () {
      var pct    = Math.round(net.getScale() * 100);
      var zoomEl = document.querySelector('.map-stat-chip:last-child span');
      if (zoomEl) zoomEl.textContent = pct + '%';
    });

    /**
     * CLUSTER-3: Dobel-klik node.
     *
     * Cek apakah node yang diklik adalah kluster:
     * - YA  : buka kluster, lalu terapkan kembali setting aktif
     * - TIDAK: tambahkan sebagai ego baru (deep-link via kanvas)
     */
    net.on('doubleClick', function (params) {
      if (!params.nodes.length) return;
      var clickedId = params.nodes[0];

      if (net.isCluster(clickedId)) {
        /* CLUSTER-3: Buka kluster */
        net.openCluster(clickedId);
        /* Terapkan kembali setting aktif agar fisika/label tetap konsisten */
        applyActiveSettings();
      } else {
        /* Bukan kluster: tambahkan ego baru seperti sebelumnya */
        renderEgoNetwork(clickedId);
      }
    });
  }

  /**
   * Tombol floating di dalam kanvas peta (Zoom In / Zoom Out / Fit).
   */
  function registerMapToolbar() {
    on('.map-tool-btn[title="Fit ke Layar"]', 'click', function () {
      if (State.networkInst)
        State.networkInst.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    });
    on('.map-tool-btn[title="Zoom In (+)"]', 'click', function () {
      if (!State.networkInst) return;
      State.networkInst.moveTo({
        scale: State.networkInst.getScale() * 1.3,
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
      });
    });
    on('.map-tool-btn[title="Zoom Out (-)"]', 'click', function () {
      if (!State.networkInst) return;
      State.networkInst.moveTo({
        scale: State.networkInst.getScale() * 0.77,
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
      });
    });
  }

  /**
   * 3 tombol di .header-toolbar + tombol panel.
   * Dipanggil setelah CSV berhasil dimuat.
   *
   * POIN-10: Event listener Ekspor header dihapus (tombolnya sudah dihapus di HTML).
   * FIX-5:   Tombol "Filter" difokuskan ke elemen input pencarian.
   */
  function registerHeaderToolbar() {

   /* 1. Muat Data — reset & muat ulang */
    on('.toolbar-btn[title="Muat Data"]', 'click', function () {
      resetAll();
      loadData();
      
      /* Pastikan panel detail kembali terbuka ke kondisi default */
      var dp = document.getElementById('detail-panel');
      var nm = document.getElementById('network-map');
      if (dp) dp.classList.remove('is-hidden');
      if (nm) nm.classList.remove('is-expanded');
    });

    /* 2. REF-1: Referensi Peraturan — buka modal referensi */
    on('.toolbar-btn[title="Referensi Peraturan"]', 'click', openReferensiModal);

    /* 3. Pengaturan — buka modal */
    on('.toolbar-btn[title="Pengaturan"]', 'click', openSettingsModal);

   /* Panel — tombol tutup */
    on('.panel-close-btn', 'click', function () {
      if (State.networkInst) State.networkInst.selectNodes([]);
      resetDetailPanel();
      
      /* Sembunyikan panel dan perlebar peta */
      var dp = document.getElementById('detail-panel');
      var nm = document.getElementById('network-map');
      if (dp) dp.classList.add('is-hidden');
      if (nm) nm.classList.add('is-expanded');
    });

    /* Tombol — Buka kembali panel detail via ikon informasi (i) */
    on('#panel-open-btn', 'click', function () {
      var dp = document.getElementById('detail-panel');
      var nm = document.getElementById('network-map');
      if (dp) dp.classList.remove('is-hidden');
      if (nm) nm.classList.remove('is-expanded');
    });

    /* Panel Footer — Fokus di Peta (MULTI-5: gunakan lastSelectedEgo) */
    on('.panel-footer-btn:not(.primary)', 'click', function () {
      var focusTarget = State.lastSelectedEgo ||
                        (State.activeEgos.length ? State.activeEgos[State.activeEgos.length - 1] : null);
      if (!State.networkInst || !focusTarget) return;
      State.networkInst.focus(focusTarget, {
        scale: 1.4,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' }
      });
    });

    /* Panel Footer — Salin Detail Peraturan (POIN-10: listener tetap, teks alert diperbarui) */
    on('.panel-footer-btn.primary', 'click', salinDetailPeraturan);
  }

  /* =========================================================================
   * BAGIAN 8 — UPDATE PANEL DETAIL & DEEP LINKING
   * ========================================================================= */

  /**
   * Memperbarui seluruh konten #detail-panel.
   *
   * POIN-9: Mengekstrak Tanggal Berlaku, Instansi Penerbit, dan Tempat Terbit
   * dari masterMap dan mengisinya ke ID DOM baru.
   */
 function updateDetailPanel(nodeId, data, connectedEdges) {
    if (!data) return;

    var idTipe    = trim(data['ID Tipe']);
    var nomor     = trim(data['Nomor'])              || '—';
    var tahun     = trim(data['Tahun'])              || '—';
    var judul     = trim(data['Judul'])              || '—';
    var tglDit    = trim(data['Tanggal Ditetapkan']) || '—';
    var status    = trim(data['Status Sekarang'])    || '—';

    /* POIN-9: Tiga field tambahan */
    var tglBerlaku = trim(data['Tanggal Berlaku'])   || '—';
    var instansi   = trim(data['Instansi Penerbit']) || '—';
    var tempat     = trim(data['Tempat Terbit'])      || '—';

    /* 1. Type Badge — FIX-6: nama panjang dari TYPE_META */
    var typeMeta = TYPE_META[idTipe] || { name: idTipe || '—', css: '' };
    var badgeEl  = document.getElementById('dp-type-badge');
    if (badgeEl) {
      badgeEl.className = 'type-badge ' + typeMeta.css;
      badgeEl.innerHTML =
        '<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">' +
        '<circle cx="4" cy="4" r="4"/></svg>' + escH(typeMeta.name);
    }

    /* 2. Status Pill */
    var statusEl = document.getElementById('dp-status-pill');
    if (statusEl) {
      var berlaku = /berlaku/i.test(status) && !/tidak|dicabut/i.test(status);
      statusEl.className = 'status-pill ' + (berlaku ? 'active' : 'revoked');
      statusEl.innerHTML = '<span class="dot"></span>' + escH(berlaku ? 'Berlaku' : status);
    }

    /* 3. Teks field utama */
    setTxt('dp-primary-key',  nodeId);
    setTxt('dp-nomor',        nomor);
    setTxt('dp-tahun',        tahun);
    setTxt('dp-tanggal',      tglDit);
    setTxt('dp-judul',        judul);

    /* POIN-9: Isi tiga field baru */
    setTxt('dp-tgl-berlaku',  tglBerlaku);
    setTxt('dp-instansi',     instansi);
    setTxt('dp-tempat',       tempat);

    /* 4. Chip relasi */
    buildRelasiChips(nodeId, connectedEdges);

    /* 5. Tabel riwayat */
    buildRiwayatTable(nodeId, connectedEdges);
  }

  /**
   * UX-3: Menyalakan/mematikan highlight visual pada node Vis.js
   */
  function toggleNodeHighlight(nodeId, isHover) {
    if (!State.nodesDS || !State.nodesDS.get(nodeId)) return;

    if (isHover) {
      /* Saat Mouse Masuk: Jadikan node menyala warna Emas/Kuning */
      State.nodesDS.update({
        id: nodeId,
        borderWidth: 5,
        shadow: { size: 18, color: 'rgba(214, 158, 46, 0.85)' },
        color: { border: '#D69E2E' }
      });
    } else {
      /* Saat Mouse Keluar: Kembalikan ke warna asli */
      var row = State.masterMap.get(nodeId);
      var idTipe = row ? trim(row['ID Tipe']) : '';
      var colorDef = NODE_COLORS[idTipe] || NODE_COLOR_DEFAULT;
      var isEgo = State.activeEgos.indexOf(nodeId) !== -1;

      State.nodesDS.update({
        id: nodeId,
        borderWidth: isEgo ? 3 : 1.5,
        shadow: { 
          enabled: true, 
          size: isEgo ? 14 : 6, 
          color: isEgo ? 'rgba(44,116,179,0.35)' : 'rgba(0,0,0,0.18)' 
        },
        color: { border: colorDef.border }
      });
    }
  }

  /**
   * Mengisi chip relasi (dasar hukum & aksi).
   * FIX-6: Klik chip → deep-link ke renderEgoNetwork().
   */
  function buildRelasiChips(nodeId, edges) {
    var dasarEl = document.getElementById('dp-chips-dasar');
    var aksiEl  = document.getElementById('dp-chips-aksi');
    if (!dasarEl || !aksiEl) return;

    var dasarHTML = '';
    var aksiHTML  = '';

    edges.forEach(function (edge) {
      /* Hanya edge di mana node ini adalah sumber */
      if (edge.from !== nodeId) return;

      var targetId    = edge.to;
      var targetRow   = State.masterMap.get(targetId);
      var targetLabel = targetRow
        ? (trim(targetRow['Penulisan Asli']) || targetId)
        : targetId;

      var chipCls = CHIP_CLASS[edge._relId] || 'cite';
      var chip =
        '<span class="relasi-chip ' + chipCls +
        '" data-target-id="' + escH(targetId) + '" title="Klik untuk buka: ' + escH(targetLabel) + '">' +
        '<span class="chip-dot"></span>' + escH(targetLabel) + '</span>';

      if (edge._relId === 'R-01') {
        dasarHTML += chip;
      } else {
        aksiHTML += chip;
      }
    });

    dasarEl.innerHTML = dasarHTML ||
      '<span style="font-size:10px;color:var(--text-muted);">—</span>';
    aksiEl.innerHTML  = aksiHTML  ||
      '<span style="font-size:10px;color:var(--text-muted);">—</span>';

    /* FIX-6 & UX-3: Pasang deep-link dan Cross-Highlighting pada setiap chip */
    [dasarEl, aksiEl].forEach(function (container) {
      container.querySelectorAll('.relasi-chip[data-target-id]').forEach(function (chip) {
        var tid = chip.getAttribute('data-target-id');
        if (!tid) return;

        /* 1. Event Klik (Deep-link) */
        chip.addEventListener('click', function () { renderEgoNetwork(tid); });
        
        /* 2. Event Mouse Masuk (Menyala) */
        chip.addEventListener('mouseenter', function () { toggleNodeHighlight(tid, true); });
        
        /* 3. Event Mouse Keluar (Mati) */
        chip.addEventListener('mouseleave', function () { toggleNodeHighlight(tid, false); });
      });
    });
  }

  /**
   * Mengisi tabel riwayat.
   * FIX-6: Baris dapat diklik → deep-link ke renderEgoNetwork().
   */
  function buildRiwayatTable(nodeId, edges) {
    var tbody   = document.getElementById('dp-riwayat-tbody');
    var countEl = document.getElementById('dp-riwayat-count');
    if (!tbody) return;

    /* Semua edge kecuali R-01 (Mengingat) masuk riwayat */
    var outgoing = edges.filter(function (e) { return e.from === nodeId && e._relId !== 'R-01'; });
    var incoming = edges.filter(function (e) { return e.to   === nodeId && e._relId !== 'R-01'; });
    var allEdges = outgoing.concat(incoming);

    if (countEl) countEl.textContent = allEdges.length + ' entri';

    if (!allEdges.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:16px;' +
        'color:var(--text-muted);font-size:11px;">Tidak ada riwayat perubahan</td></tr>';
      return;
    }

    var html = '';
    allEdges.forEach(function (edge, i) {
      var isOut    = (edge.from === nodeId);
      var refId    = isOut ? edge.to : edge.from;
      var refRow   = State.masterMap.get(refId);
      var refLabel = refRow ? (trim(refRow['Penulisan Asli']) || refId) : refId;
      var refTahun = refRow ? (trim(refRow['Tahun']) || '—') : '—';
      var relLabel = (EDGE_COLORS[edge._relId] || EDGE_COLOR_DEFAULT).label;
      var pillCls  = REL_PILL_CLASS[edge._relId] || 'r-cite';
      var dirLabel = isOut ? relLabel : ('Dikenai: ' + relLabel);

      html +=
        '<tr data-target-id="' + escH(refId) + '" style="cursor:pointer;"' +
        ' title="Klik untuk buka: ' + escH(refLabel) + '">' +
        '<td style="color:var(--text-muted);font-weight:600;">' + pad2(i + 1) + '</td>' +
        '<td><span class="node-id" title="' + escH(refId) + '">' + escH(refLabel) + '</span></td>' +
        '<td><span class="rel-pill ' + pillCls + '"><span class="rel-dot"></span>' +
        escH(dirLabel) + '</span></td>' +
        '<td>' + escH(refTahun) + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;

    /* FIX-6 & UX-3: Pasang deep-link dan Cross-Highlighting pada tabel riwayat */
    tbody.querySelectorAll('tr[data-target-id]').forEach(function (tr) {
      var tid = tr.getAttribute('data-target-id');
      if (!tid) return;

      /* 1. Event Klik (Deep-link) */
      tr.addEventListener('click', function () { renderEgoNetwork(tid); });
      
      /* 2. Event Mouse Masuk (Menyala) */
      tr.addEventListener('mouseenter', function () { toggleNodeHighlight(tid, true); });
      
      /* 3. Event Mouse Keluar (Mati) */
      tr.addEventListener('mouseleave', function () { toggleNodeHighlight(tid, false); });
    });
  }

  /**
   * Reset panel detail ke kondisi placeholder kosong.
   */
  function resetDetailPanel() {
    setTxt('dp-primary-key',  '—');
    setTxt('dp-nomor',        '—');
    setTxt('dp-tahun',        '—');
    setTxt('dp-tanggal',      '—');
    setTxt('dp-judul',        'Klik sebuah node untuk melihat detail peraturan.');

    /* POIN-9: Reset field tambahan */
    setTxt('dp-tgl-berlaku',  '—');
    setTxt('dp-instansi',     '—');
    setTxt('dp-tempat',       '—');

    var badgeEl = document.getElementById('dp-type-badge');
    if (badgeEl) {
      badgeEl.className = 'type-badge perdirjen';
      badgeEl.innerHTML =
        '<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">' +
        '<circle cx="4" cy="4" r="4"/></svg>—';
    }

    var statusEl = document.getElementById('dp-status-pill');
    if (statusEl) {
      statusEl.className = 'status-pill active';
      statusEl.innerHTML = '<span class="dot"></span>—';
    }

    var dasarEl = document.getElementById('dp-chips-dasar');
    if (dasarEl) dasarEl.innerHTML =
      '<span style="font-size:10px;color:var(--text-muted);">—</span>';

    var aksiEl = document.getElementById('dp-chips-aksi');
    if (aksiEl)  aksiEl.innerHTML  =
      '<span style="font-size:10px;color:var(--text-muted);">—</span>';

    var tbody = document.getElementById('dp-riwayat-tbody');
    if (tbody) tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:16px;' +
      'color:var(--text-muted);font-size:11px;">Pilih node untuk melihat riwayat</td></tr>';

    var countEl = document.getElementById('dp-riwayat-count');
    if (countEl) countEl.textContent = '0 entri';
  }

  /* =========================================================================
   * BAGIAN 9 — STATUS BAR, EMPTY STATE, SALIN DETAIL, RESET
   * ========================================================================= */

  function updateStatusBar(nodeCount, edgeCount) {
    var chips = document.querySelectorAll('.map-stat-chip span');
    if (chips[0]) chips[0].textContent = nodeCount;
    if (chips[1]) chips[1].textContent = edgeCount;
    var dot = document.querySelector('.map-stat-dot');
    if (dot) dot.style.background = nodeCount > 0 ? 'var(--status-active)' : 'var(--text-muted)';
  }

  function showEmptyState(label, sub, isError) {
    var el = document.querySelector('.map-empty-state');
    if (!el) return;
    el.style.display = '';
    var lEl = el.querySelector('.map-empty-label');
    var sEl = el.querySelector('.map-empty-sub');
    if (lEl) lEl.textContent = label;
    if (sEl) {
      sEl.textContent = sub;
      sEl.style.color = isError ? 'var(--rel-revoke-all)' : '';
    }
  }

  function hideEmptyState() {
    var el = document.querySelector('.map-empty-state');
    if (el) el.style.display = 'none';
  }

  /**
   * Salin detail Peraturan ke clipboard.
   * POIN-10: Teks alert diperbarui sesuai nama tombol baru "Salin Detail Peraturan".
   * Field baru (Tanggal Berlaku, Instansi, Tempat) disertakan dalam output.
   * PATCH-3.4: Menyertakan bagian "RELASI TERHUBUNG" dan "RIWAYAT PERUBAHAN"
   * dari DOM elemen #dp-chips-dasar, #dp-chips-aksi, dan #dp-riwayat-tbody.
   */
  function salinDetailPeraturan() {
    var nomorEl    = document.getElementById('dp-nomor');
    var judulEl    = document.getElementById('dp-judul');
    var tahunEl    = document.getElementById('dp-tahun');
    var spillEl    = document.getElementById('dp-status-pill');
    var keyEl      = document.getElementById('dp-primary-key');
    var tglDitEl   = document.getElementById('dp-tanggal');
    var tglBerlEl  = document.getElementById('dp-tgl-berlaku');
    var instansiEl = document.getElementById('dp-instansi');
    var tempatEl   = document.getElementById('dp-tempat');

    if (!nomorEl || nomorEl.textContent === '—') {
      var toast = document.getElementById('copy-toast');
      if (toast) {
        toast.textContent = 'Tidak ada peraturan yang dipilih'; /* Teks diubah dinamis */
        toast.classList.add('show');
        setTimeout(function() {
          toast.classList.remove('show');
        }, 2000);
      }
      return;
    }

    /* ── Bagian 1: Identitas Dokumen ── */
    var lines = [
      'DETAIL PERDIRJEN — DJPb Knowledge Management System',
      '=====================================================',
      'Peraturan        : ' + (keyEl      ? keyEl.textContent           : '—'),
      'Nomor            : ' + (nomorEl    ? nomorEl.textContent          : '—'),
      'Tahun            : ' + (tahunEl    ? tahunEl.textContent          : '—'),
      'Status           : ' + (spillEl    ? spillEl.textContent.trim()   : '—'),
      'Tgl. Ditetapkan  : ' + (tglDitEl  ? tglDitEl.textContent         : '—'),
      'Tgl. Berlaku     : ' + (tglBerlEl ? tglBerlEl.textContent        : '—'),
      'Instansi Penerbit: ' + (instansiEl? instansiEl.textContent       : '—'),
      'Tempat Terbit    : ' + (tempatEl  ? tempatEl.textContent         : '—'),
      'Judul            : ' + (judulEl    ? judulEl.textContent          : '—')
    ];

    /* ── Bagian 2: Relasi Terhubung ── */
    lines.push('');
    lines.push('RELASI TERHUBUNG');
    lines.push('-----------------------------------------------------');

    /* Dasar Hukum yang Diingat — baca chip dari #dp-chips-dasar */
    var dasarEl   = document.getElementById('dp-chips-dasar');
    var dasarChips = dasarEl
      ? dasarEl.querySelectorAll('.relasi-chip')
      : [];
    lines.push('Dasar Hukum yang Diingat:');
    if (dasarChips.length) {
      dasarChips.forEach(function (chip, i) {
        lines.push('  ' + pad2(i + 1) + '. ' + chip.textContent.trim());
      });
    } else {
      lines.push('  —');
    }

    /* Peraturan yang Diubah/Dicabut — baca chip dari #dp-chips-aksi */
    var aksiEl   = document.getElementById('dp-chips-aksi');
    var aksiChips = aksiEl
      ? aksiEl.querySelectorAll('.relasi-chip')
      : [];
    lines.push('Peraturan yang Diubah / Dicabut:');
    if (aksiChips.length) {
      aksiChips.forEach(function (chip, i) {
        lines.push('  ' + pad2(i + 1) + '. ' + chip.textContent.trim());
      });
    } else {
      lines.push('  —');
    }

    /* ── Bagian 3: Riwayat Perubahan ── */
    lines.push('');
    lines.push('RIWAYAT PERUBAHAN');
    lines.push('-----------------------------------------------------');

    var tbody = document.getElementById('dp-riwayat-tbody');
    var rows  = tbody ? tbody.querySelectorAll('tr[data-target-id]') : [];

    if (rows.length) {
      /* Header kolom dengan padding rata */
      lines.push(
        padR('No.', 4) + '  ' +
        padR('Kode Peraturan', 40) + '  ' +
        padR('Relasi', 24) + '  ' +
        'Tahun'
      );
      rows.forEach(function (tr) {
        var tds  = tr.querySelectorAll('td');
        /* td[0]=No, td[1]=Kode Peraturan (.node-id), td[2]=Relasi (.rel-pill), td[3]=Tahun */
        var no     = tds[0] ? tds[0].textContent.trim() : '';
        var kode   = tds[1] ? tds[1].textContent.trim() : '';
        var relasi = tds[2] ? tds[2].textContent.trim() : '';
        var tahun  = tds[3] ? tds[3].textContent.trim() : '';
        lines.push(
          padR(no,     4) + '  ' +
          padR(kode,  40) + '  ' +
          padR(relasi, 24) + '  ' +
          tahun
        );
      });
    } else {
      lines.push('  Tidak ada riwayat perubahan.');
    }

    /* ── Penutup ── */
    lines.push('');
    lines.push('Disalin pada: ' + new Date().toLocaleString('id-ID'));

    var text = lines.join('\n');

   navigator.clipboard.writeText(text)
      .then(function () { 
        var toast = document.getElementById('copy-toast');
        if (toast) {
          toast.textContent = 'Detail Perdirjen berhasil disalin ke clipboard!'; /* Kembalikan teks sukses */
          toast.classList.add('show');
          setTimeout(function() {
            toast.classList.remove('show');
          }, 2000); /* Hilang otomatis setelah 2 detik */
        }
      })
      .catch(function () {
        var w = window.open('', '_blank');
        if (w) {
          w.document.write('<pre style="font-family:monospace;padding:20px;">' + escH(text) + '</pre>');
        }
      });
  }

  /**
   * Helper: padding kanan (right-pad) string s sampai panjang n.
   * Digunakan untuk alignment kolom tabel riwayat pada output teks.
   */
  function padR(s, n) {
    var str = String(s);
    while (str.length < n) str += ' ';
    return str;
  }

  /**
   * Reset penuh: hapus semua state & kembalikan UI ke kondisi awal.
   */
  function resetAll() {
    State.masterMap.clear();
    State.allEdgeDefs     = [];
    State.activeEgos      = [];   /* MULTI-1: reset array, bukan null */
    State.lastSelectedEgo = null;

    if (State.networkInst) {
      State.networkInst.destroy();
      State.networkInst = null;
    }
    State.nodesDS = null;
    State.edgesDS = null;

    /* FIX-1: Hapus vis-canvas-container jika ada agar dibuat ulang saat load berikutnya */
    var oldContainer = document.getElementById('vis-canvas-container');
    if (oldContainer && oldContainer.parentNode) {
      oldContainer.parentNode.removeChild(oldContainer);
    }
    State.visContainer = null;

    /* Bersihkan chip filter aktif */
    var filterContainer = document.getElementById('active-filters-container');
    if (filterContainer) filterContainer.innerHTML = '';

    /* Kembalikan search bar ke bentuk aslinya (sebelum buildSearchUI) */
    var bar = document.querySelector('.map-search-bar');
    if (bar) {
      bar.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
        ' stroke-linecap="round" style="width:13px;height:13px;color:var(--text-muted);flex-shrink:0;">' +
        '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input type="text" placeholder="Cari nomor atau judul peraturan..." />';
    }

    resetDetailPanel();
    updateStatusBar(0, 0);
    showEmptyState('Memuat Ulang...', 'Mohon tunggu sebentar.', false);
  }

  /* =========================================================================
   * BAGIAN 9c — EDGE FILTERING (TOGGLE LEGENDA RELASI)
   * =========================================================================
   *
   * EDGE-FILTER-1: registerLegendFilters()
   * Pasang event listener 'change' via event delegation pada .legend.
   * Saat checkbox .legend-toggle berubah:
   * 1. Update State.activeRels[relId] = checked
   * 2. Panggil renderAllEgos() jika State.activeEgos tidak kosong.
   *
   * Perilaku:
   * - Toggle OFF → edge bertipe relId dan node eksklusif relasi itu
   * hilang dari kanvas karena tidak masuk unionNodeIds/unionEdgeDefs.
   * - Node Ego utama TIDAK pernah hilang karena unionNodeIds[egoId]=true
   * diset SEBELUM loop filter.
   * - resetSettings() juga mereset activeRels ke semua true + sync UI.
   * ========================================================================= */

  /**
   * EDGE-FILTER-1: Pasang listener change pada checkbox di .legend .legend-toggle.
   * Menggunakan event delegation pada elemen .legend sehingga cukup satu listener.
   */
  function registerLegendFilters() {
    var legendEl = document.querySelector('.legend');
    if (!legendEl) return;

    legendEl.addEventListener('change', function (e) {
      /* Tangani HANYA checkbox di dalam .legend-toggle */
      if (!e.target || e.target.type !== 'checkbox') return;
      var parentLabel = e.target.closest('.legend-toggle');
      if (!parentLabel) return;

      var relId   = e.target.value;    /* 'R-01' | 'R-02' | 'R-03' | 'R-04' */
      var checked = e.target.checked;

      /* Update State.activeRels */
      if (Object.prototype.hasOwnProperty.call(State.activeRels, relId)) {
        State.activeRels[relId] = checked;
      }

      /* Re-render graf hanya jika ada ego aktif di kanvas */
      if (State.activeEgos.length > 0) {
        renderAllEgos();
      }
    });
  }

  /* =========================================================================
   * BAGIAN 9d — REFERENSI MODAL (REF-2..6)
   * =========================================================================
   *
   * REF-2: openReferensiModal()
   * - Tampilkan #referensi-modal (class is-open)
   * - Populasi dropdown #referensi-tahun-filter secara dinamis:
   * * Kumpulkan tahun unik dari T-06, filter 2014-2026, sort descending
   * * Tambahkan opsi "Semua Tahun" di atas
   * - Panggil renderReferensiTable('Semua Tahun')
   *
   * REF-3: closeReferensiModal()
   * - Hapus class is-open dari #referensi-modal
   * - Kembalikan body overflow ke default
   *
   * REF-4: renderReferensiTable(tahunFilter)
   * - Loop masterMap, saring T-06 + tahun 2014-2026
   * - Jika tahunFilter !== 'Semua Tahun', saring lebih spesifik
   * - Sort hasil berdasarkan Tahun descending lalu Penulisan Asli ascending
   * - Render ke #referensi-tbody; update badge jumlah
   * - Setiap <tr> punya data-id = ID Baku
   *
   * REF-5: Klik baris #referensi-tbody → renderEgoNetwork(id) + tutup modal
   *
   * REF-6: registerReferensiModal()
   * - Tombol X (#referensi-close-btn) → closeReferensiModal
   * - Overlay (#referensi-overlay) → closeReferensiModal
   * - Escape key (dengan guard: hanya jika settings-modal TIDAK terbuka)
   * - Change pada #referensi-tahun-filter → renderReferensiTable(value)
   * - Event delegation klik pada #referensi-tbody
   * ========================================================================= */

  /**
   * REF-2: Buka modal referensi, isi dropdown tahun, render tabel awal.
   */
  function openReferensiModal() {
    var modal = document.getElementById('referensi-modal');
    if (!modal) return;

    /* ── Populasi dropdown tahun secara dinamis ── */
    var selectEl = document.getElementById('referensi-tahun-filter');
    if (selectEl) {
      /* Kumpulkan tahun unik dari T-06 dalam rentang 2014-2026 */
      var tahunSet = {};
      State.masterMap.forEach(function (row) {
        if (trim(row['ID Tipe']) !== 'T-06') return;
        var t = parseInt(trim(row['Tahun']), 10);
        if (!isNaN(t) && t >= YEAR_MIN && t <= YEAR_MAX) {
          tahunSet[t] = true;
        }
      });

      var tahunList = Object.keys(tahunSet)
        .map(Number)
        .sort(function (a, b) { return b - a; }); // descending

      /* Rebuild opsi dropdown (reset dahulu, pertahankan "Semua Tahun") */
      selectEl.innerHTML = '<option value="Semua Tahun">Semua Tahun</option>';
      tahunList.forEach(function (t) {
        var opt = document.createElement('option');
        opt.value       = String(t);
        opt.textContent = String(t);
        selectEl.appendChild(opt);
      });

      /* Reset ke "Semua Tahun" setiap kali modal dibuka */
      selectEl.value = 'Semua Tahun';
    }

    /* ── Render tabel dengan semua tahun ── */
    renderReferensiTable('Semua Tahun');

    /* ── Buka modal ── */
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  /**
   * REF-3: Tutup modal referensi.
   */
  function closeReferensiModal() {
    var modal = document.getElementById('referensi-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /**
   * REF-4: Render tabel katalog Perdirjen ke #referensi-tbody.
   *
   * @param {string} tahunFilter  — 'Semua Tahun' | '2024' | '2023' | dst.
   */
  function renderReferensiTable(tahunFilter) {
    var tbody   = document.getElementById('referensi-tbody');
    var badgeEl = document.getElementById('referensi-count-badge');
    if (!tbody) return;

    var semua  = (!tahunFilter || tahunFilter === 'Semua Tahun');
    var items  = [];

    State.masterMap.forEach(function (row, id) {
      /* Hanya Perdirjen (T-06) */
      if (trim(row['ID Tipe']) !== 'T-06') return;

      /* Hanya tahun dalam rentang 2014-2026 */
      var t = parseInt(trim(row['Tahun']), 10);
      if (isNaN(t) || t < YEAR_MIN || t > YEAR_MAX) return;

      /* Jika ada filter tahun spesifik, terapkan */
      if (!semua && String(t) !== String(tahunFilter)) return;

      var penulisan = trim(row['Penulisan Asli']) || id;
      var judul     = trim(row['Judul'])           || '—';

      items.push({
        id:        id,
        penulisan: penulisan,
        tahun:     t,
        judul:     judul
      });
    });

    /* Sort: tahun descending, lalu penulisan ascending */
    items.sort(function (a, b) {
      if (b.tahun !== a.tahun) return b.tahun - a.tahun;
      return a.penulisan.localeCompare(b.penulisan, 'id');
    });

    /* Update badge jumlah */
    if (badgeEl) badgeEl.textContent = items.length + ' peraturan';

    if (!items.length) {
      tbody.innerHTML =
        '<tr class="referensi-empty-row"><td colspan="3">Tidak ada data untuk tahun yang dipilih.</td></tr>';
      return;
    }

    var html = '';
    items.forEach(function (item) {
      html +=
        '<tr data-id="' + escH(item.id) + '" title="Klik untuk membuka peta: ' + escH(item.penulisan) + '">' +
        '<td>' + escH(item.penulisan) + '</td>' +
        '<td>' + escH(String(item.tahun)) + '</td>' +
        '<td>' + escH(item.judul) + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
  }

  /**
   * REF-6: Pasang semua event listener untuk modal referensi.
   * Dipanggil satu kali dari init().
   */
  function registerReferensiModal() {
    /* Tutup via tombol X */
    on('#referensi-close-btn', 'click', closeReferensiModal);

    /* Tutup via klik overlay */
    on('#referensi-overlay', 'click', closeReferensiModal);

    /* PANDUAN-2: Escape dikelola oleh handleGlobalEscape (dipasang di registerPanduanModal).
     * Tidak perlu listener Escape terpisah di sini. */

    /* Change dropdown tahun → render ulang tabel */
    var selEl = document.getElementById('referensi-tahun-filter');
    if (selEl) {
      selEl.addEventListener('change', function () {
        renderReferensiTable(selEl.value);
      });
    }

    /* REF-5: Event delegation klik pada baris tabel */
    var tbody = document.getElementById('referensi-tbody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        var id = tr.getAttribute('data-id');
        if (!id) return;
        /* Gambar peta ego untuk peraturan yang diklik */
        renderEgoNetwork(id);
        /* Tutup modal */
        closeReferensiModal();
     });
    }
  }

  /* =========================================================================
   * BAGIAN 9e — PANDUAN MODAL (PANDUAN-1 & PANDUAN-2)
   * =========================================================================
   *
   * PANDUAN-1: openPanduanModal() / closePanduanModal()
   *   Buka/tutup #panduan-modal via class .is-open, serta lock/unlock
   *   body scroll.
   *
   * PANDUAN-2: handleGlobalEscape(e)
   *   Handler Escape terpusat yang menggantikan tiga listener Escape terpisah
   *   (settings, referensi, panduan). Ia hanya menutup SATU modal — modal
   *   yang sedang terbuka dengan prioritas: Settings > Referensi > Panduan.
   *   Dengan demikian tidak ada konflik tutup-simultan jika dua modal
   *   secara tidak sengaja terbuka bersamaan.
   *
   * PANDUAN-3: registerPanduanModal()
   *   Pasang semua event listener untuk #panduan-modal:
   *   - Tombol X (#panduan-close-btn) → closePanduanModal
   *   - Tombol Tutup footer (#panduan-close-btn-footer) → closePanduanModal
   *   - Overlay (#panduan-overlay) → closePanduanModal
   *   - Tombol #panduan-btn di header → openPanduanModal
   *   - Escape key → handleGlobalEscape (satu listener, tidak duplikat)
   *
   * Catatan penting:
   *   registerSettingsModal() dan registerReferensiModal() TIDAK lagi
   *   mendaftarkan listener Escape sendiri-sendiri. Semua Escape dikelola
   *   oleh handleGlobalEscape yang dipasang satu kali di registerPanduanModal.
   * ========================================================================= */

  /**
   * PANDUAN-1: Buka modal panduan.
   */
  function openPanduanModal() {
    var modal = document.getElementById('panduan-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  /**
   * PANDUAN-1: Tutup modal panduan.
   */
  function closePanduanModal() {
    var modal = document.getElementById('panduan-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    /* Kembalikan overflow hanya jika tidak ada modal lain yang terbuka */
    var anyOpen = ['settings-modal', 'referensi-modal'].some(function (id) {
      var m = document.getElementById(id);
      return m && m.classList.contains('is-open');
    });
    if (!anyOpen) document.body.style.overflow = '';
  }

  /**
   * PANDUAN-2: Handler Escape terpusat untuk ketiga modal.
   *
   * Prioritas: Settings → Referensi → Panduan.
   * Hanya satu modal yang ditutup per satu keydown Escape.
   *
   * @param {KeyboardEvent} e
   */
  function handleGlobalEscape(e) {
    if (e.key !== 'Escape') return;

    var setModal = document.getElementById('settings-modal');
    var refModal = document.getElementById('referensi-modal');
    var panModal = document.getElementById('panduan-modal');

    if (setModal && setModal.classList.contains('is-open')) {
      closeSettingsModal();
    } else if (refModal && refModal.classList.contains('is-open')) {
      closeReferensiModal();
    } else if (panModal && panModal.classList.contains('is-open')) {
      closePanduanModal();
    }
  }

  /**
   * PANDUAN-3: Pasang semua listener untuk #panduan-modal.
   * Juga mendaftarkan handleGlobalEscape sebagai satu-satunya handler Escape.
   * Dipanggil sekali dari init().
   */
  function registerPanduanModal() {
    /* Tombol X di header */
    on('#panduan-close-btn', 'click', closePanduanModal);

    /* Tombol Tutup di footer */
    on('#panduan-close-btn-footer', 'click', closePanduanModal);

    /* Klik overlay */
    on('#panduan-overlay', 'click', closePanduanModal);

    /* Tombol ? di header */
    on('#panduan-btn', 'click', openPanduanModal);

    /* PANDUAN-2: Satu listener Escape terpusat untuk semua modal */
    document.addEventListener('keydown', handleGlobalEscape);
  }

  /* =========================================================================
   *
   * SETTINGS-1 : openSettingsModal / closeSettingsModal
   * SETTINGS-2 : applyHideLabels(bool)
   * SETTINGS-3 : applyFreezeNetwork(bool)
   * SETTINGS-4 : applyDarkMode(bool)
   * SETTINGS-5 : resetSettings()
   * SETTINGS-6 : registerSettingsModal() — pasang semua listener modal
   * ========================================================================= */

  /**
   * Terapkan kembali semua setting yang sedang aktif ke graf yang baru dirender.
   * Dipanggil setelah stabilisasi selesai pada setiap render baru.
   */
  function applyActiveSettings() {
    applyHideLabels(Settings.hideLabels);
    applyFreezeNetwork(Settings.freezeNet);
    /* Dark mode tidak perlu diulang — itu class di body, tidak bergantung graf */
  }

  /**
   * Buka modal pengaturan dan sinkronkan posisi toggle ke state Settings.
   */
  function openSettingsModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;

    /* Sinkronkan checkbox ke Settings state saat ini */
    syncToggleUI();

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden'; // cegah scroll background
  }

  /**
   * Tutup modal pengaturan.
   */
  function closeSettingsModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /**
   * Sinkronkan state checkbox DOM ke objek Settings.
   */
  function syncToggleUI() {
    var elLabels = document.getElementById('toggle-hide-labels');
    var elFreeze = document.getElementById('toggle-freeze-network');
    var elDark   = document.getElementById('toggle-dark-mode');
    if (elLabels) elLabels.checked = Settings.hideLabels;
    if (elFreeze) elFreeze.checked = Settings.freezeNet;
    if (elDark)   elDark.checked   = Settings.darkMode;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-2: Sembunyikan / tampilkan label teks di atas garis relasi.
   *
   * Jika hide=true  → iterasi semua edge di edgesDS, set font.size=0
   * Jika hide=false → kembalikan font.size=9 dan label dari EDGE_COLORS
   * ────────────────────────────────────────────────────────────────────────── */
  function applyHideLabels(hide) {
    Settings.hideLabels = hide;
    if (!State.edgesDS) return; // belum ada graf, tidak perlu apa-apa

    var updates = [];
    State.edgesDS.forEach(function (edge) {
      if (hide) {
        /* Sembunyikan: font size 0 agar invisible, label tetap ada di data */
        updates.push({
          id:   edge.id,
          font: { size: 0, strokeWidth: 0 }
        });
      } else {
        /* Tampilkan kembali: kembalikan dari EDGE_COLORS lewat _relId */
        var relId    = edge._relId;
        var colorDef = EDGE_COLORS[relId] || EDGE_COLOR_DEFAULT;
        updates.push({
          id:    edge.id,
          label: colorDef.label,
          font: {
            size: 9, color: colorDef.color,
            face: 'Plus Jakarta Sans, sans-serif',
            align: 'middle', strokeWidth: 2, strokeColor: '#FFFFFF'
          }
        });
      }
    });

    if (updates.length) State.edgesDS.update(updates);
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-3: Bekukan / cairkan animasi fisika Vis.js.
   *
   * Jika freeze=true  → physics.enabled = false (node berhenti memantul)
   * Jika freeze=false → physics.enabled = true, jalankan stabilisasi singkat,
   * lalu matikan lagi agar graf tidak meledak
   * ────────────────────────────────────────────────────────────────────────── */
  function applyFreezeNetwork(freeze) {
    Settings.freezeNet = freeze;
    if (!State.networkInst) return;

    if (freeze) {
      /* Pengguna ingin membekukan: Matikan fisika */
      State.networkInst.setOptions({ physics: { enabled: false } });
    } else {
      /* Pengguna ingin mencairkan: Hidupkan fisika terus-menerus */
      State.networkInst.setOptions({ physics: { enabled: true } });
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-4: Toggle Dark Mode.
   * ────────────────────────────────────────────────────────────────────────── */
  function applyDarkMode(dark) {
    Settings.darkMode = dark;
    if (dark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-5: Reset semua pengaturan ke default (semua Off).
   * EDGE-FILTER: Juga reset activeRels ke semua true dan sinkronkan checkbox.
   * ────────────────────────────────────────────────────────────────────────── */
  function resetSettings() {
    applyHideLabels(false);
    applyFreezeNetwork(false);
    applyDarkMode(false);
    syncToggleUI();

    /* EDGE-FILTER: Kembalikan semua tipe relasi ke aktif */
    State.activeRels['R-01'] = true;
    State.activeRels['R-02'] = true;
    State.activeRels['R-03'] = true;
    State.activeRels['R-04'] = true;

    /* Sinkronkan checkbox legenda ke kondisi checked */
    document.querySelectorAll('.legend-toggle input[type="checkbox"]').forEach(function (cb) {
      cb.checked = true;
    });

    /* Re-render jika ada ego aktif agar perubahan filter terefleksi */
    if (State.activeEgos.length > 0) {
      renderAllEgos();
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-6: Pasang semua event listener untuk elemen modal.
   * Dipanggil satu kali dari init().
   * ────────────────────────────────────────────────────────────────────────── */
  function registerSettingsModal() {
    /* Tutup via tombol X */
    on('#settings-close-btn', 'click', closeSettingsModal);

    /* Tutup via klik overlay */
    on('#settings-overlay', 'click', closeSettingsModal);

    /* PANDUAN-2: Escape dikelola oleh handleGlobalEscape (dipasang di registerPanduanModal).
     * Tidak perlu listener Escape terpisah di sini. */

    /* Toggle 1: Sembunyikan label garis */
    var elLabels = document.getElementById('toggle-hide-labels');
    if (elLabels) {
      elLabels.addEventListener('change', function () {
        applyHideLabels(elLabels.checked);
      });
    }

    /* Toggle 2: Bekukan jaringan */
    var elFreeze = document.getElementById('toggle-freeze-network');
    if (elFreeze) {
      elFreeze.addEventListener('change', function () {
        applyFreezeNetwork(elFreeze.checked);
      });
    }

    /* Toggle 3: Dark mode */
    var elDark = document.getElementById('toggle-dark-mode');
    if (elDark) {
      elDark.addEventListener('change', function () {
        applyDarkMode(elDark.checked);
      });
    }

    /* Tombol Reset */
    on('#settings-reset-btn', 'click', resetSettings);
  }

  /* =========================================================================
   * BAGIAN 10 — HELPERS
   * ========================================================================= */

  function trim(v)  { return (v || '').trim(); }
  function pad2(n)  { return String(n).padStart(2, '0'); }

  function escH(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setTxt(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /** addEventListener via querySelector, null-safe */
  function on(selector, event, handler) {
    var el = document.querySelector(selector);
    if (el) el.addEventListener(event, handler);
  }

  /* =========================================================================
   * ENTRY POINT
   * ========================================================================= */

  function init() {
    injectDynamicStyles();    // CSS dinamis disuntikkan
    registerSettingsModal();  // SETTINGS-6: pasang listener modal pengaturan
    registerReferensiModal(); // REF-6: pasang listener modal referensi
    registerPanduanModal();   // PANDUAN-3: pasang listener modal panduan + Escape terpusat
    registerLegendFilters();  // EDGE-FILTER-1: pasang listener toggle legenda
    loadData();               // Muat CSV
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();