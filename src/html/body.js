export const HTML_BODY = `
<!-- ════ GATE ════════════════════════════════════════════════ -->
<div id="screen-gate" class="screen">
  <div class="gate-box">
    <div class="gate-logo">ASM<span>2026</span></div>
    <div class="gate-sub">Worship Grow Go · Anthem Students</div>

    <!-- Two-lane landing (default) -->
    <div class="gate-lanes" id="gate-lanes">
      <div class="gate-lane">
        <div class="lane-icon">👁</div>
        <div class="lane-title">Quick View</div>
        <div class="lane-desc">View-only access with passcode</div>
        <button class="lane-btn lane-btn-view" onclick="showPasscodeForm()">Enter Passcode</button>
      </div>
      <div class="gate-lane gate-lane-leader">
        <div class="lane-icon">⚡</div>
        <div class="lane-title">Leader Login</div>
        <div class="lane-desc">Full access for team leaders</div>
        <button class="lane-btn lane-btn-leader" onclick="showLeaderForm()">Sign In</button>
      </div>
    </div>

    <!-- Passcode sub-form -->
    <div class="gate-form" id="gate-passcode-form" style="display:none">
      <div class="gate-form-back">
        <button class="back-btn" onclick="showLanes()">← Back</button>
        <span class="form-title">Quick View</span>
      </div>
      <input id="gate-input" class="gate-input" type="password" placeholder="Enter passcode" autocomplete="off">
      <button class="gate-btn" id="gate-btn" onclick="checkPasscode()">Enter →</button>
      <div class="gate-error" id="gate-error"></div>
    </div>

    <!-- Leader login sub-form -->
    <div class="gate-form" id="gate-leader-form" style="display:none">
      <div class="gate-form-back">
        <button class="back-btn" onclick="showLanes()">← Back</button>
        <span class="form-title">Leader Login</span>
      </div>
      <input id="gate-leader-email" class="gate-input" type="email" placeholder="Email" autocomplete="email">
      <input id="gate-leader-password" class="gate-input" type="password" placeholder="Password" autocomplete="current-password">
      <button class="gate-btn" id="gate-leader-btn" onclick="doGateLeaderLogin()">Sign In →</button>
      <div class="gate-error" id="gate-leader-error"></div>
      <a class="gate-link" href="#" onclick="event.preventDefault();openAuthModal('signup')">New leader? Sign up</a>
    </div>

    <a class="gate-need-access" href="#" onclick="event.preventDefault();showNeedAccess()">Need access? →</a>
  </div>
</div>

<!-- ════ APP ══════════════════════════════════════════════════ -->
<div id="screen-app" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM<span>&nbsp;2026</span></div>
      <div class="nav-pills">
        <button class="nav-pill active" onclick="switchMainNav('roster',this)">Roster</button>
        <button class="nav-pill" onclick="switchMainNav('activity',this)">Activity</button>
        <button class="nav-pill" onclick="switchMainNav('dump',this)">Brain Dump</button>
      </div>
      <div class="nav-right" id="nav-right"></div>
      <button class="nav-hamburger" id="nav-hamburger" onclick="toggleMobileNav()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="mobile-nav-overlay" id="mobile-nav-overlay" onclick="closeMobileNav()"></div>
  <div class="mobile-nav-drawer" id="mobile-nav-drawer">
    <button class="mob-nav-pill" id="mob-pill-roster"   onclick="switchMainNav('roster',this);closeMobileNav()">Roster</button>
    <button class="mob-nav-pill" id="mob-pill-activity" onclick="switchMainNav('activity',this);closeMobileNav()">Activity</button>
    <button class="mob-nav-pill" id="mob-pill-dump"     onclick="switchMainNav('dump',this);closeMobileNav()">Brain Dump</button>
  </div>

  <!-- ROSTER PANEL -->
  <div id="nav-roster" class="nav-panel">
    <div class="container">
      <header>
        <div class="logo-line">Worship <span>Grow Go</span></div>
        <div class="subtitle">Anthem Students · ASM 2026</div>
      </header>

      <div class="readonly-banner" id="readonly-banner" style="display:none">
        <p>You're viewing in <strong>read-only mode</strong>. Log in to edit.</p>
        <button class="nav-btn primary" onclick="openAuthModal('login')">Log In</button>
      </div>

      <div class="seg-tabs">
        <button class="seg-btn active" onclick="switchTab('hs',this)">High School</button>
        <button class="seg-btn" onclick="switchTab('ms',this)">Middle School</button>
      </div>

      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input class="search-input" id="roster-search" placeholder="Search students…" oninput="filterRoster(this.value)">
      </div>

      <!-- HS -->
      <div id="tab-hs" class="tab-panel active">
        <div class="stats" id="hs-stats"></div>
        <div class="section-header">
          <div class="section-label">⚡ Core</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','core')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-core-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🔗 Loosely Connected</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','loose')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-loose-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🌙 Fringe</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','fringe')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-fringe-grid"></div>
      </div>

      <!-- MS -->
      <div id="tab-ms" class="tab-panel">
        <div class="stats" id="ms-stats"></div>
        <div class="section-header">
          <div class="section-label">⚡ Core</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','core')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-core-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🔗 Loosely Connected</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','loose')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-loose-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🌙 Fringe</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','fringe')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-fringe-grid"></div>
      </div>

      <footer>Worship Grow Go · Anthem Students 2026</footer>
    </div>
  </div>

  <!-- ACTIVITY PANEL -->
  <div id="nav-activity" class="nav-panel" style="display:none">
    <div class="container">
      <header>
        <div class="logo-line" style="font-size:clamp(40px,8vw,72px)">Recent <span>Activity</span></div>
        <div class="subtitle">What's been happening</div>
      </header>
      <div class="activity-list" id="activity-feed">
        <div class="loader"><div class="loader-ring"></div></div>
      </div>
    </div>
  </div>

  <!-- BRAIN DUMP PANEL -->
  <div id="nav-dump" class="nav-panel" style="display:none">
    <div class="container">
      <div class="dump-wrap">
        <div class="dump-title">Brain <span style="color:var(--accent)">Dump</span></div>
        <p class="dump-sub">Just type anything. Names, conversations, prayer requests. AI will match students and let you log each one as a hangout.</p>
        <textarea id="dump-text" class="dump-area" placeholder="e.g. Had coffee with Lily Larson today. She's been stressed about college apps but is excited about soccer. Also bumped into Josh Mullin at church — he wants to get more plugged in…"></textarea>
        <button class="dump-submit" id="dump-btn" onclick="processBrainDump()">✨ Process & Assign</button>
        <div id="dump-result"></div>
      </div>
    </div>
  </div>
</div>

<!-- ════ STUDENT DETAIL ═══════════════════════════════════════ -->
<div id="screen-student" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM<span>&nbsp;2026</span></div>
      <div class="nav-right" id="student-nav-right"></div>
    </div>
  </nav>
  <div class="container">
    <button class="student-back" onclick="goBack()">← Back to Roster</button>
    <div id="student-content"></div>
  </div>
</div>

<!-- ════ ADMIN ════════════════════════════════════════════════ -->
<div id="screen-admin" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM <span>Admin</span></div>
      <div class="nav-right">
        <button class="nav-btn" onclick="showScreen('app')">← Back</button>
        <button class="nav-btn danger" onclick="logout()">Log Out</button>
      </div>
    </div>
  </nav>
  <div class="container">
    <div class="admin-title">Admin Panel</div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('overview',this)">Overview</button>
      <button class="admin-tab" onclick="switchAdminTab('users',this)">Users</button>
      <button class="admin-tab" onclick="switchAdminTab('metrics',this)">Metrics</button>
    </div>
    <div id="admin-overview" class="admin-sec active">
      <div class="kpi-grid" id="admin-stats-grid"><div class="loader"><div class="loader-ring"></div></div></div>
    </div>
    <div id="admin-users" class="admin-sec">
      <div id="admin-users-table" style="overflow-x:auto"></div>
    </div>
    <div id="admin-metrics" class="admin-sec">
      <div id="admin-metrics-content"><div class="loader"><div class="loader-ring"></div></div></div>
    </div>
    <footer>Worship Grow Go · Admin</footer>
  </div>
</div>

<!-- ════ MODALS ═══════════════════════════════════════════════ -->

<!-- AUTH -->
<div class="modal-overlay" id="auth-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('auth-modal')">✕</button>
    <div class="modal-title" id="auth-modal-title">Welcome Back</div>
    <div class="modal-sub">ASM 2026 · Anthem Students</div>
    <div class="modal-tabs">
      <button class="modal-tab active" id="tab-login-btn" onclick="switchAuthTab('login')">Log In</button>
      <button class="modal-tab" id="tab-signup-btn" onclick="switchAuthTab('signup')">Sign Up</button>
    </div>
    <div id="auth-login-form" class="auth-form">
      <div class="field"><label>Email</label><input type="email" id="login-email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="auth-msg" id="login-msg"></div>
      <button class="auth-submit" id="login-submit" onclick="doLogin()">Log In</button>
    </div>
    <div id="auth-signup-form" class="auth-form" style="display:none">
      <div class="field"><label>Full Name</label><input type="text" id="signup-name" placeholder="First Last" autocomplete="name"></div>
      <div class="field"><label>Email</label><input type="email" id="signup-email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="signup-password" placeholder="Min 8 characters" autocomplete="new-password"></div>
      <div class="auth-msg" id="signup-msg"></div>
      <button class="auth-submit" id="signup-submit" onclick="doSignup()">Create Account</button>
    </div>
  </div>
</div>

<!-- EDIT STUDENT -->
<div class="modal-overlay" id="edit-modal">
  <div class="modal" style="max-width:500px">
    <button class="modal-close" onclick="closeEditModal()">✕</button>
    <div class="modal-title" id="edit-modal-title">Edit Student</div>
    <div class="modal-sub" id="edit-modal-sub">High School · Core</div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div class="photo-preview" id="edit-photo-preview">
        <div class="av-fallback" id="edit-pv-fallback" style="background:var(--accent)">?</div>
        <img id="edit-pv-img" src="" alt="" onload="this.classList.add('loaded')" onerror="this.style.display='none'">
      </div>
      <div style="flex:1">
        <div class="field" style="margin-bottom:8px">
          <label>Photo URL (Google Drive)</label>
          <input type="text" id="ef-photoUrl" placeholder="https://drive.google.com/file/d/…" oninput="updateEditPhotoPreview()">
        </div>
        <label class="upload-label" for="photo-upload-input">📸 Upload Photo</label>
        <input type="file" id="photo-upload-input" accept="image/*" onchange="uploadStudentPhoto(this)">
      </div>
    </div>
    <div class="field"><label>Full Name *</label><input type="text" id="ef-name" placeholder="First Last"></div>
    <div class="field-row">
      <div class="field"><label>Grade</label><input type="text" id="ef-grade" placeholder="9"></div>
      <div class="field"><label>Birthday</label><input type="text" id="ef-birthday" placeholder="MM/DD/YYYY"></div>
    </div>
    <div class="field"><label>School</label><input type="text" id="ef-school" placeholder="School name"></div>
    <div class="field"><label>Interest / Sport</label><input type="text" id="ef-interest" placeholder="Soccer, Guitar…"></div>
    <div class="field"><label>Primary Goal</label><input type="text" id="ef-primary-goal" placeholder="e.g. Get plugged into a community group"></div>
    <div class="field"><label>Notes</label><input type="text" id="ef-notes" placeholder="Optional notes"></div>
    <div class="field" id="ef-connected-field">
      <label>Connection Status</label>
      <div class="connected-toggle" id="ef-connected-toggle" onclick="toggleConnected()">
        <div class="toggle-dot"></div>
        <span class="toggle-label">Not Connected</span>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-save" id="ef-save-btn" onclick="saveEdit()">Save Changes</button>
      <button class="btn-secondary" onclick="closeEditModal()">Cancel</button>
      <button class="btn-danger" id="ef-delete-btn" onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>

<!-- PROFILE -->
<div class="modal-overlay" id="profile-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeProfileModal()">✕</button>
    <div class="modal-title">My Profile</div>
    <div class="modal-sub">Leader Account</div>
    <div class="profile-av-wrap">
      <div class="profile-av" id="profile-av-lg">
        <span id="profile-av-initials">?</span>
        <img id="profile-av-img" src="" alt="" onload="this.classList.add('loaded')" onerror="this.style.display='none'">
      </div>
      <div>
        <div style="font-size:16px;font-weight:600" id="profile-display-name">Loading…</div>
        <div style="font-size:12px;color:var(--muted)" id="profile-display-email"></div>
        <label class="upload-label" for="profile-photo-input" style="margin-top:8px">📸 Change Photo</label>
        <input type="file" id="profile-photo-input" accept="image/*" onchange="uploadProfilePhoto(this)">
      </div>
    </div>
    <div class="field"><label>Display Name</label><input type="text" id="profile-name-input" placeholder="Your full name"></div>
    <div class="field"><label>Leader Since</label><input type="text" id="profile-since-input" placeholder="e.g. September 2022"></div>
    <div class="field"><label>Fun Fact</label><input type="text" id="profile-funfact-input" placeholder="e.g. I can eat 12 tacos in one sitting"></div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveProfile()">Save Profile</button>
      <button class="btn-secondary" onclick="closeProfileModal()">Cancel</button>
      <button class="btn-danger" onclick="logout()">Log Out</button>
    </div>
  </div>
</div>

<!-- LOG HANGOUT -->
<div class="modal-overlay" id="interaction-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeInteractionModal()">✕</button>
    <div class="modal-title">Log Hangout</div>
    <div class="modal-sub" id="int-modal-sub">with Student</div>
    <div class="field"><label>Leader Name</label><input type="text" id="int-leader" placeholder="Your name"></div>
    <div class="field"><label>Date</label><input type="date" id="int-date"></div>
    <div class="field"><label>What happened? Any key moments or prayer requests?</label><textarea id="int-summary" rows="5" placeholder="e.g. We grabbed coffee and she opened up about some struggles at home. She's been thinking about what it means to grow in her faith. Prayed together at the end."></textarea></div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveInteraction()">Log It ✓</button>
      <button class="btn-secondary" onclick="closeInteractionModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- EDIT HANGOUT NOTE -->
<div class="modal-overlay" id="edit-interaction-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('edit-interaction-modal')">✕</button>
    <div class="modal-title">Edit Hangout Note</div>
    <div class="field"><label>Date</label><input type="date" id="edit-int-date"></div>
    <div class="field"><label>What happened? Any key moments or prayer requests?</label><textarea id="edit-int-summary" rows="5"></textarea></div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveEditedInteraction()">Save Changes</button>
      <button class="btn-secondary" onclick="closeModal('edit-interaction-modal')">Cancel</button>
    </div>
  </div>
</div>

<!-- CONFIRM DELETE NOTE -->
<div class="modal-overlay" id="confirm-delete-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('confirm-delete-modal')">✕</button>
    <div class="modal-title">Delete Note?</div>
    <div class="modal-sub">Are you sure you want to delete this note? This cannot be undone.</div>
    <div class="modal-actions">
      <button class="btn-danger" onclick="confirmDeleteInteraction()">Delete</button>
      <button class="btn-secondary" onclick="closeModal('confirm-delete-modal')">Cancel</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div id="toast" class="toast"></div>
`;
