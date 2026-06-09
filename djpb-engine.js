/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MESIN JAVASCRIPT — Peta Relasi dan Riwayat Hukum Perdirjen DJPb       ║
 * ║  Versi : 4.0.0  (Settings Modal — Toggle Labels, Freeze, Dark Mode)    ║
 * ║  Tempel : Sebagai file djpb-engine.js, lalu panggil via <script src>   ║
 * ║           tepat sebelum </body> di index.html                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── FITUR BARU (v4.0.0) ───────────────────────────────────────────────────
 *  SETTINGS-1: Modal Pengaturan (#settings-modal) muncul saat tombol
 *              roda gigi di header diklik. Overlay menutup modal saat diklik.
 *
 *  SETTINGS-2: Toggle "Sembunyikan Teks Garis" — iterasi edgesDS dan
 *              set font.size=0 / kembalikan ke ukuran asli berdasarkan
 *              EDGE_COLORS.
 *
 *  SETTINGS-3: Toggle "Bekukan Jaringan" — setOptions physics enabled
 *              true/false secara mulus.
 *
 *  SETTINGS-4: Toggle "Dark Mode" — toggle class .dark-mode di <body>.
 *
 *  SETTINGS-5: Tombol "Kembalikan ke Pengaturan Awal" — reset semua toggle
 *              dan kembalikan state visual ke default.
 *
 * ── DAFTAR PERBAIKAN TERDAHULU (v3.4) ────────────────────────────────────
 *  PATCH-3.4 : salinDetailPerdirjen() menyertakan Relasi & Riwayat.
 *  POIN-9    : Field Tanggal Berlaku, Instansi, Tempat Terbit.
 *  FIX-1..6  : Vis.js toolbar, tahun, datalist, scroll, Filter, deep-link.
 */

(function () {
  'use strict';

  /* =========================================================================
   *  BAGIAN 1 — KONSTANTA & KONFIGURASI ATURAN BISNIS
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
   *        kode mesin seperti "T-06".
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
   *  BAGIAN 2 — STATE TERPUSAT
   * ========================================================================= */

  var State = {
    masterMap:       new Map(),  // Map<id_baku, rowObject>
    allEdgeDefs:     [],         // [{from, to, idRel, _idx}] sudah divalidasi
    networkInst:     null,       // instance vis.Network aktif
    nodesDS:         null,       // vis.DataSet nodes ego-network aktif
    edgesDS:         null,       // vis.DataSet edges ego-network aktif
    currentEgo:      null,       // nodeId pusat ego-network saat ini
    visContainer:    null        // FIX-1: div#vis-canvas-container
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
   *  BAGIAN 3 — CSS DINAMIS (Injeksi Style)
   * =========================================================================
   *
   *  POIN-11: .detail-card-body dan .riwayat-table-wrap mendapat
   *           max-height: 250px; overflow-y: auto; overflow-x: auto;
   *           agar setiap seksi dapat di-scroll secara independen.
   *
   *  FIX-4: Menyuntikkan fix scroll + layout ke #detail-panel.
   *  FIX-1: z-index untuk #vis-canvas-container.
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

      /* Search bar: input teks */
      '.map-search-bar input[list] {',
      '  border: none; outline: none;',
      '  font-family: var(--font-body); font-size: 12px;',
      '  color: var(--text-primary); background: transparent; width: 200px;',
      '}',
      '.map-search-bar input[list]::placeholder { color: var(--text-muted); }',

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

      /* Canvas Vis.js mengisi kontainernya */
      '#vis-canvas-container canvas { display: block !important; }'

    ].join('\n');
    document.head.appendChild(style);
  }

  /* =========================================================================
   *  BAGIAN 4 — PEMUATAN DATA CSV (PapaParse)
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
        'Data CSV Berhasil Dimuat',
        'Gunakan kotak pencarian di atas untuk memilih peraturan dan memulai visualisasi.',
        false
      );

    }).catch(function (err) {
      console.error('[DJPb] ERROR:', err);
      showEmptyState('Gagal Memuat Data', 'Periksa konsol browser. Error: ' + err.message, true);
    });
  }

  /* =========================================================================
   *  BAGIAN 5 — UI PENCARIAN DINAMIS (Dropdown Tahun + Datalist)
   * =========================================================================
   *
   *  Mengubah .map-search-bar menjadi:
   *  [🔍] [Dropdown Tahun 2014–2026] | [Input Pencarian + Datalist T-06]
   *
   *  FIX-2: Hanya tahun dalam rentang YEAR_MIN–YEAR_MAX yang ditampilkan.
   *  FIX-3: Datalist hanya berisi T-06, nilai <option> = Penulisan Asli murni.
   */
  function buildSearchUI() {
    var bar = document.querySelector('.map-search-bar');
    if (!bar) return;

    /* FIX-2: Kumpulkan & filter tahun dalam rentang 2014–2026, descending */
    var tahunSet = {};
    State.masterMap.forEach(function (row) {
      var t = parseInt(trim(row['Tahun']), 10);
      if (!isNaN(t) && t >= YEAR_MIN && t <= YEAR_MAX) {
        tahunSet[t] = true;
      }
    });
    var tahunList = Object.keys(tahunSet)
      .map(Number)
      .sort(function (a, b) { return b - a; }); // descending

    /* Bangun HTML search bar baru */
    var optionsTahun = tahunList
      .map(function (t) { return '<option value="' + t + '">' + t + '</option>'; })
      .join('');

    bar.innerHTML =
      /* Ikon kaca pembesar */
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" style="width:13px;height:13px;color:var(--text-muted);flex-shrink:0;">' +
      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      /* FIX-2: Dropdown tahun dengan rentang terbatas */
      '<select id="filter-tahun" title="Filter berdasarkan tahun">' +
      '<option value="">Semua Tahun</option>' + optionsTahun +
      '</select>' +
      /* Divider */
      '<span class="bar-divider"></span>' +
      /* FIX-3: Input dengan datalist — placeholder merujuk Penulisan Asli */
      '<input id="search-input" list="dl-perdirjen"' +
      ' placeholder="Ketik nomor Perdirjen, misal: PER-1/PB/2024..." autocomplete="off"/>' +
      '<datalist id="dl-perdirjen"></datalist>';

    /* FIX-3: Isi datalist awal (semua tahun) */
    refreshDatalist('');

    /* Event: Dropdown tahun berubah */
    var selectEl = document.getElementById('filter-tahun');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        refreshDatalist(selectEl.value);
        var inputEl = document.getElementById('search-input');
        if (inputEl) { inputEl.value = ''; inputEl.focus(); }
      });
    }

    /* Event: Input pencarian — deteksi pilihan datalist atau Enter */
    var inputEl = document.getElementById('search-input');
    if (inputEl) {
      /* 'change' terpicu saat user memilih dari datalist atau keluar dari field */
      inputEl.addEventListener('change', function () {
        var targetId = resolveSearchInput(inputEl.value.trim());
        if (targetId) renderEgoNetwork(targetId);
      });
      /* Enter untuk konfirmasi pencarian manual */
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var targetId = resolveSearchInput(inputEl.value.trim());
          if (targetId) {
            renderEgoNetwork(targetId);
          } else {
            inputEl.style.outline = '2px solid var(--rel-revoke-all)';
            setTimeout(function () { inputEl.style.outline = ''; }, 1200);
          }
        }
      });
    }
  }

  /**
   * Mengisi ulang datalist berdasarkan filter tahun.
   *
   * FIX-3: Hanya T-06 yang masuk datalist.
   *        Nilai <option> = Penulisan Asli MURNI (bukan "ID - Penulisan Asli").
   *
   * @param {string} tahunFilter — '' untuk semua tahun
   */
  function refreshDatalist(tahunFilter) {
    var dl = document.getElementById('dl-perdirjen');
    if (!dl) return;
    var opts = [];
    State.masterMap.forEach(function (row) {
      /* FIX-3: Hanya Perdirjen (T-06) */
      if (trim(row['ID Tipe']) !== 'T-06') return;
      /* FIX-2: Terapkan filter tahun jika dipilih */
      if (tahunFilter && trim(row['Tahun']) !== String(tahunFilter)) return;

      var penulisan = trim(row['Penulisan Asli']);
      if (!penulisan) return; // abaikan baris tanpa penulisan asli

      /* FIX-3: value = Penulisan Asli murni */
      opts.push('<option value="' + escH(penulisan) + '">');
    });
    dl.innerHTML = opts.join('');
  }

  /**
   * Mengurai nilai input → ID Aturan Baku (string kunci di masterMap).
   *
   * FIX-3: Urutan pencocokan yang diperbarui:
   *  1. Cocokkan tepat dengan Penulisan Asli (T-06 diutamakan, lalu semua tipe)
   *  2. Cocokkan tepat dengan ID Baku
   *  3. Substring case-insensitive pada Penulisan Asli T-06
   *  4. Substring case-insensitive pada ID Baku atau Penulisan Asli semua tipe
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
   *  BAGIAN 6 — EGO-NETWORK RENDERER
   * ========================================================================= */

  function renderEgoNetwork(egoId) {
    if (!State.masterMap.has(egoId)) {
      console.warn('[DJPb] renderEgoNetwork: ID tidak ditemukan di masterMap:', egoId);
      return;
    }

    State.currentEgo = egoId;
    console.log('[DJPb] Ego-Network untuk:', egoId);

    /* 1. Kumpulkan node-ID ego-network (Degree-1) */
    var egoNodeIds  = {};
    var egoEdgeDefs = [];
    egoNodeIds[egoId] = true;

    State.allEdgeDefs.forEach(function (e) {
      var fromIsEgo = (e.from === egoId);
      var toIsEgo   = (e.to   === egoId);
      if (fromIsEgo || toIsEgo) {
        egoNodeIds[e.from] = true;
        egoNodeIds[e.to]   = true;
        egoEdgeDefs.push(e);
      }
    });

    /* 2. Bangun array node Vis.js */
    var nodesArray = [];
    Object.keys(egoNodeIds).forEach(function (id) {
      var row = State.masterMap.get(id);
      if (!row) return;

      var idTipe    = trim(row['ID Tipe']);
      var penulisan = trim(row['Penulisan Asli']) || id;
      var status    = trim(row['Status Sekarang']);
      var isEgo     = (id === egoId);
      var colorDef  = NODE_COLORS[idTipe] || NODE_COLOR_DEFAULT;

      nodesArray.push({
        id:    id,
        label: penulisan,
        title: penulisan + '\nStatus: ' + (status || '—') + '\nID: ' + id,
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
      });
    });

    /* 3. Bangun array edge Vis.js */
    var edgesArray = [];
    egoEdgeDefs.forEach(function (e) {
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

    /* 4. Sembunyikan empty-state & render/update network */
    hideEmptyState();

    if (!State.networkInst) {
      /* Inisialisasi pertama kali */
      initVisNetwork(nodesArray, edgesArray);
    } else {
      /* Update DataSet tanpa re-init DOM */
      State.nodesDS.clear();
      State.edgesDS.clear();
      State.nodesDS.add(nodesArray);
      State.edgesDS.add(edgesArray);
      /* Aktifkan fisika sementara untuk relayout */
      State.networkInst.once('stabilizationIterationsDone', function () {
        State.networkInst.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        /* Terapkan kembali setting aktif setelah relayout selesai */
        applyActiveSettings();
      });
    }

    /* 5. Status bar & panel detail */
    updateStatusBar(nodesArray.length, edgesArray.length);
    updateDetailPanel(egoId, State.masterMap.get(egoId), edgesArray);
  }

  /**
   * Menginisialisasi vis.Network (dipanggil sekali saat ego-network pertama dirender).
   *
   * FIX-1: Vis.Network di-attach ke #vis-canvas-container yang dibuat secara
   *        dinamis di dalam #network-map.
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

    State.networkInst.once('stabilizationIterationsDone', function () {
      State.networkInst.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
      /* Terapkan setting aktif setelah graph pertama kali stabil */
      applyActiveSettings();
    });

    registerNetworkEvents();
    registerMapToolbar();
  }

  /* =========================================================================
   *  BAGIAN 7 — EVENT LISTENERS
   * ========================================================================= */

  /**
   * Event Vis.js: klik node, deselect, zoom.
   */
  function registerNetworkEvents() {
    var net = State.networkInst;

    /* Klik node → perbarui panel detail */
    net.on('selectNode', function (params) {
      if (!params.nodes.length) return;
      var nodeId = params.nodes[0];
      var data   = State.masterMap.get(nodeId);
      if (!data) return;

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

    /* Zoom → update status bar */
    net.on('zoom', function (params) {
      var pct    = Math.round(params.scale * 100);
      var zoomEl = document.querySelector('.map-stat-chip:last-child span');
      if (zoomEl) zoomEl.textContent = pct + '%';
    });

    /* Dobel-klik node → ego-network baru (deep-link via kanvas) */
    net.on('doubleClick', function (params) {
      if (!params.nodes.length) return;
      renderEgoNetwork(params.nodes[0]);
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
    });

    /* 2. FIX-5: Filter — fokus & seleksi ke kotak pencarian */
    on('.toolbar-btn[title="Filter"]', 'click', function () {
      var inputEl = document.getElementById('search-input')
                 || document.querySelector('.map-search-bar input');
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    });

    /* 3. Pengaturan — buka modal */
    on('.toolbar-btn[title="Pengaturan"]', 'click', openSettingsModal);

    /* Panel — tombol tutup */
    on('.panel-close-btn', 'click', function () {
      if (State.networkInst) State.networkInst.selectNodes([]);
      resetDetailPanel();
    });

    /* Panel Footer — Fokus di Peta */
    on('.panel-footer-btn:not(.primary)', 'click', function () {
      if (!State.networkInst || !State.currentEgo) return;
      State.networkInst.focus(State.currentEgo, {
        scale: 1.4,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' }
      });
    });

    /* Panel Footer — Salin Detail Perdirjen (POIN-10: listener tetap, teks alert diperbarui) */
    on('.panel-footer-btn.primary', 'click', salinDetailPerdirjen);
  }

  /* =========================================================================
   *  BAGIAN 8 — UPDATE PANEL DETAIL & DEEP LINKING
   * ========================================================================= */

  /**
   * Memperbarui seluruh konten #detail-panel.
   *
   * POIN-9: Mengekstrak Tanggal Berlaku, Instansi Penerbit, dan Tempat Terbit
   *         dari masterMap dan mengisinya ke ID DOM baru.
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

    /* FIX-6: Pasang deep-link pada setiap chip */
    [dasarEl, aksiEl].forEach(function (container) {
      container.querySelectorAll('.relasi-chip[data-target-id]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var tid = chip.getAttribute('data-target-id');
          if (tid) renderEgoNetwork(tid);
        });
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

    /* FIX-6: Pasang deep-link pada setiap baris tabel riwayat */
    tbody.querySelectorAll('tr[data-target-id]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var tid = tr.getAttribute('data-target-id');
        if (tid) renderEgoNetwork(tid);
      });
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
   *  BAGIAN 9 — STATUS BAR, EMPTY STATE, SALIN DETAIL, RESET
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
   * Salin detail Perdirjen ke clipboard.
   * POIN-10: Teks alert diperbarui sesuai nama tombol baru "Salin Detail Perdirjen".
   *          Field baru (Tanggal Berlaku, Instansi, Tempat) disertakan dalam output.
   * PATCH-3.4: Menyertakan bagian "RELASI TERHUBUNG" dan "RIWAYAT PERUBAHAN"
   *            dari DOM elemen #dp-chips-dasar, #dp-chips-aksi, dan #dp-riwayat-tbody.
   */
  function salinDetailPerdirjen() {
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
      alert('Tidak ada peraturan yang dipilih.\nKlik sebuah node terlebih dahulu.');
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
      .then(function () { alert('Detail Perdirjen berhasil disalin ke clipboard!'); })
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
    State.allEdgeDefs = [];
    State.currentEgo  = null;

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
   *  BAGIAN 9b — SETTINGS MODAL
   * =========================================================================
   *
   *  SETTINGS-1 : openSettingsModal / closeSettingsModal
   *  SETTINGS-2 : applyHideLabels(bool)
   *  SETTINGS-3 : applyFreezeNetwork(bool)
   *  SETTINGS-4 : applyDarkMode(bool)
   *  SETTINGS-5 : resetSettings()
   *  SETTINGS-6 : registerSettingsModal() — pasang semua listener modal
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
   *                     lalu matikan lagi agar graf tidak meledak
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
   * ────────────────────────────────────────────────────────────────────────── */
  function resetSettings() {
    applyHideLabels(false);
    applyFreezeNetwork(false);
    applyDarkMode(false);
    syncToggleUI();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * SETTINGS-6: Pasang semua event listener untuk elemen modal.
   *             Dipanggil satu kali dari init().
   * ────────────────────────────────────────────────────────────────────────── */
  function registerSettingsModal() {
    /* Tutup via tombol X */
    on('#settings-close-btn', 'click', closeSettingsModal);

    /* Tutup via klik overlay */
    on('#settings-overlay', 'click', closeSettingsModal);

    /* Tutup via tombol Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('is-open')) closeSettingsModal();
      }
    });

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
   *  BAGIAN 10 — HELPERS
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
   *  ENTRY POINT
   * ========================================================================= */

  function init() {
    injectDynamicStyles(); // CSS dinamis disuntikkan
    registerSettingsModal(); // SETTINGS-6: pasang listener modal (sebelum loadData)
    loadData();            // Muat CSV
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
