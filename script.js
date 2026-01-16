/* =====================================================
   AUTH STATE (LOCALSTORAGE – NETLIFY SAFE)
===================================================== */

let searchBox - null;

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = "8dd19f897799957dab98b123ccd611d2";
const IMG = "https://image.tmdb.org/t/p/w500";





let currentUser = JSON.parse(localStorage.getItem("currentUser"));
const grid = document.querySelector(".grid");

const loginBtn = document.getElementById("loginBtn");
const profileWrapper = document.getElementById("profileWrapper");
const profileAvatar = document.getElementById("profileAvatar");

const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const authTitle = document.getElementById("authTitle");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authToggle = document.getElementById("authToggle");
const authMsg = document.getElementById("authMsg");

const profileMenu = document.getElementById("profileMenu");
const logoutBtn = document.getElementById("logoutBtn");
let isSignup = false;

// UI restore
if (currentUser) {
  loginBtn.style.display = "none";
  profileWrapper.style.display = "flex";
  profileAvatar.innerText = currentUser.name.charAt(0);
} else {
  loginBtn.style.display = "block";
  profileWrapper.style.display = "none";
}


/* =====================================================
   STATE
===================================================== */
let currentType = "movie";
let page = 1;
let loading = false;
let inWatchlist = false;

/* =====================================================
   RESTORE LOGIN
===================================================== */

/* =====================================================
   SAFE FETCH
===================================================== */
async function fetchJSON(url, fallback = []) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return fallback;
  }
}

function normalizeResults(data) {
  if (Array.isArray(data)) {
    return { results: data };
  }
  if (data && Array.isArray(data.results)) {
    return data;
  }
  return { results: [] };
}

/* =====================================================
   NAV ELEMENTS
===================================================== */
const navMovies = document.getElementById("navMovies");
const navShows = document.getElementById("navShows");
const navWatchlist = document.getElementById("navWatchlist");

/* =====================================================
   ACTIVE TAB
===================================================== */
function setActiveTab(activeBtn) {
  if (!activeBtn) return;

  [navMovies, navShows, navWatchlist].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  activeBtn.classList.add("active");
}

/* =====================================================
   INIT (SAFE)
===================================================== */
if (navMovies) {
  setActiveTab(navMovies);
}

if (typeof loadHome === "function") loadHome();
if (typeof loadContinueWatching === "function") loadContinueWatching();
if (typeof loadRecommended === "function") loadRecommended();
if (typeof loadBrowse === "function") loadBrowse();


/* =====================================================
   NAVIGATION
===================================================== */
/* =====================================================
   NAVIGATION
===================================================== */
if (navMovies) {
  navMovies.onclick = () => {
    inWatchlist = false;
    setActiveTab(navMovies);
    switchType("movie");
  };
}

if (navShows) {
  navShows.onclick = () => {
    inWatchlist = false;
    setActiveTab(navShows);
    switchType("tv");
  };
}

if (navWatchlist) {
  navWatchlist.onclick = () => {
    openWatchlist();
  };
}

function switchType(type) {
  currentType = type;
  inWatchlist = false;
  page = 1;

  if (grid) grid.innerHTML = "";

  if (typeof loadHome === "function") loadHome();
  if (typeof loadContinueWatching === "function") loadContinueWatching();
  if (typeof loadRecommended === "function") loadRecommended();
  if (typeof loadBrowse === "function") loadBrowse();
}

/* =====================================================
   HOME SECTIONS
===================================================== */
/* ---------- Continue Watching (no login required) ---------- */
function saveContinueWatching(movie, type) {
  if (!movie || !movie.id) return;

  let list = JSON.parse(localStorage.getItem("continueWatching") || "[]");

  list = list.filter(m => m.id !== movie.id);

  list.unshift({
    id: movie.id,
    title: movie.title || movie.name,
    poster_path: movie.poster_path,
    _type: type,
    genre_ids: movie.genre_ids || []
  });

  localStorage.setItem(
    "continueWatching",
    JSON.stringify(list.slice(0, 10))
  );
}

/* ---------- Load Home ---------- */
async function loadHome() {
  if (!trendingMovies || !trendingShows) return;

  trendingMovies.style.display = "none";
  trendingShows.style.display = "none";

  if (continueRow) continueRow.style.display = "flex";
  if (recommendedRow) recommendedRow.style.display = "flex";

  if (currentType === "movie") {
    trendingMovies.style.display = "flex";
    loadRow(trendingMovies, "/api/trending?type=movie");
  } else {
    trendingShows.style.display = "flex";
    loadRow(trendingShows, "/api/trending?type=tv");
  }
}

/* ---------- Continue Watching ---------- */
function loadContinueWatching() {
  if (!continueRow) return;

  const list = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  continueRow.innerHTML = "";

  const filtered = list.filter(item => item._type === currentType);
  if (!filtered.length) return;

  filtered.forEach(item => {
    const card = movieCard(item);
    if (card) continueRow.appendChild(card);
  });
}

/* ---------- Genre Helper ---------- */
function getTopGenres() {
  const list = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  const genreCount = {};

  list
    .filter(item => item._type === currentType)
    .forEach(item => {
      (item.genre_ids || []).forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });

  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
}

/* ---------- Recommended ---------- */
async function loadRecommended() {
  if (!recommendedRow) return;

  const genres = getTopGenres();
  let url = `${TMDB_BASE}/discover/${currentType}?api_key=${TMDB_KEY}&page=1`


  if (genres.length) {
    url += `&genre=${genres.join(",")}`;
  }

  const raw = await fetchJSON(url);
  const data = normalizeResults(raw);

  recommendedRow.innerHTML = "";
  if (!data.results.length) return;

  data.results.slice(0, 10).forEach(movie => {
    const card = movieCard(movie);
    if (card) recommendedRow.appendChild(card);
  });
}

/* ---------- Generic Row Loader ---------- */
async function loadRow(row, endpoint) {
  if (!row) return;

  const raw = await fetchJSON(
    `${TMDB_BASE}/trending/${currentType}/day?api_key=${TMDB_KEY}`
  )

  const data = normalizeResults(raw);

  row.innerHTML = "";
  if (!data.results.length) return;

  data.results.slice(0, 10).forEach(item => {
    const card = movieCard(item);
    if (card) row.appendChild(card);
  });
}

/* ---------- Browse + Infinite Scroll ---------- */
async function loadBrowse() {
  if (!searchBox) return;

  const query = searchBox.value.trim();
  if (loading || inWatchlist) return;
  loading = true;

  let url;

  if (query) {
    isSearchMode = true;
    url = `${TMDB_BASE}/search/${currentType}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
  } else {
    isSearchMode = false;
    url = `${TMDB_BASE}/discover/${currentType}?api_key=${TMDB_KEY}&page=${page}`;

    if (languageFilter.value) {
      url += `&with_original_language=${languageFilter.value}`;
    }

    if (ratingFilter.value) {
      url += `&vote_average.gte=${ratingFilter.value}`;
    }

    const moodMap = {
      happy: "35",
      romantic: "10749",
      dark: "27,53",
      action: "28"
    };

    if (moodFilter.value && moodMap[moodFilter.value]) {
      url += `&with_genres=${moodMap[moodFilter.value]}`;
    }
  }

  const raw = await fetchJSON(url);
  const data = normalizeResults(raw);

  if (data.results.length === 0) {
    loading = false;
    return;
  }

  data.results.forEach(movie => {
    // ✅ show only watchlisted movies
    grid.appendChild(movieCard(movie));

  });


  loading = false;
}
window.addEventListener("scroll", () => {
  if (loading || inWatchlist) return;

  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    page++;
    loadBrowse();
  }
});


/* =====================================================
   SEARCH & FILTERS
===================================================== */
if (searchBox) {
  searchBox.addEventListener("input", debounce(resetBrowse, 400));
}
if (genreFilter) genreFilter.onchange = resetBrowse;
if (ratingFilter) ratingFilter.onchange = resetBrowse;
if (languageFilter) languageFilter.onchange = resetBrowse;
if (moodFilter) moodFilter.onchange = resetBrowse;

function resetBrowse() {
  inWatchlist = false;
  page = 1;
  if (grid) grid.innerHTML = "";
  if (typeof loadBrowse === "function") loadBrowse();
}

/* =====================================================
   MOVIE CARD
===================================================== */
function movieCard(movie) {
  if (!movie) return null;

  const div = document.createElement("div");
  div.className = "card";

  const poster =
    movie.poster_path
      ? IMG + movie.poster_path
      : movie.poster
        ? IMG + movie.poster
        : "./no-image.png";

  div.innerHTML = `
    <img src="${poster}">
    <h4>${movie.title || movie.name || "Untitled"}</h4>
    <p>⭐ ${movie.vote_average || movie.rating || "N/A"}</p>
  `;

  div.onclick = () => {
    saveContinueWatching(movie, movie._type || currentType);
    openDetails(movie.id, movie._type || currentType);
  };

  return div;
}

/* =====================================================
   MOVIE DETAILS
===================================================== */
async function openDetails(id, type = currentType) {
  const data = await fetchJSON(
    `${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos`
  );

  if (!data || !data.id) return;

  const trailer = data.videos?.results?.find(v => v.type === "Trailer");

  infoOverlay.innerHTML = `
    <div class="detailsOverlay">
      <div class="detailsCard">
        <button class="closeDetails">✕</button>

        <div class="detailsContent">
          <div class="detailsPoster">
            <img src="${data.poster_path ? IMG + data.poster_path : "./no-image.png"}">
          </div>

          <div class="detailsInfo">
            <h1>${data.title || data.name}</h1>

            <div class="meta">
              <span>⭐ ${data.vote_average?.toFixed(1)}</span>
              <span>${data.original_language?.toUpperCase()}</span>
              <span>${(data.release_date || data.first_air_date || "").slice(0, 4)}</span>
            </div>

            <p class="overview">${data.overview}</p>

            <p><b>Cast:</b> ${data.credits?.cast?.slice(0, 6).map(c => c.name).join(", ") || "N/A"
    }</p>
<div class="actions">
  ${trailer
      ? `<a class="btn primary" target="_blank"
           href="https://youtube.com/watch?v=${trailer.key}">
           ▶ Trailer
         </a>`
      : ""
    }

  <button class="btn secondary" onclick='addToWatchlist({
    id: ${data.id},
    title: "${(data.title || data.name).replace(/"/g, "")}",
    poster_path: "${data.poster_path || ""}",
    vote_average: ${data.vote_average || 0},
    _type: "${type}"
  })'>
    ➕ Watchlist
  </button>

  <a class="btn ghost" target="_blank"
     href="https://www.themoviedb.org/${type}/${data.id}/watch">
     📺 Where to Watch
  </a>
</div>

          </div>
        </div>
      </div>
    </div>
  `;

  infoOverlay.style.display = "flex";
  document.querySelector(".closeDetails").onclick = () =>
    (infoOverlay.style.display = "none");
}


/* =====================================================
   LOGIN PROMPT
===================================================== */
function showLoginPrompt() {
  if (!grid) return;

  grid.innerHTML = `
    <div class="watchlistPrompt">
      <h2>Please login to view your watchlist</h2>
      <button id="loginFromWatchlist" class="cta">Login</button>
    </div>
  `;

  const btn = document.getElementById("loginFromWatchlist");
  if (btn) {
    btn.onclick = () => {
      authModal.style.display = "flex";
    };
  }
}

/* =====================================================
   WATCHLIST
===================================================== */
function addToWatchlist(movie) {
  if (!currentUser) {
    showLoginPrompt();
    return;
  }

  if (!movie || !movie.id) return;

  let list = getUserWatchlist();

  if (list.find(m => m.id === movie.id)) {
    alert("Already in watchlist");
    return;
  }

  list.push(movie);
  saveUserWatchlist(list);

  alert("Added to Watchlist ⭐");
}

function getUserWatchlist() {
  if (!currentUser) return [];
  return JSON.parse(
    localStorage.getItem(`watchlist_${currentUser.email}`) || "[]"
  );
}

function saveUserWatchlist(list) {
  if (!currentUser) return;
  localStorage.setItem(
    `watchlist_${currentUser.email}`,
    JSON.stringify(list)
  );
}

function openWatchlist() {
  if (typeof setActiveTab === "function" && navWatchlist) {
    setActiveTab(navWatchlist);
  }

  if (!currentUser) {
    showLoginPrompt();
    return;
  }

  if (!grid) return;
  grid.innerHTML = "";

  const list = getUserWatchlist();

  if (!list.length) {
    grid.innerHTML = `<h2 style="color:#aaa">Your watchlist is empty 🍿</h2>`;
    return;
  }

  list.forEach(movie => {
    const card = movieCard(movie);
    if (card) grid.appendChild(card);
  });
}
function isInWatchlist(movieId) {
  if (!currentUser) return false;

  const list = JSON.parse(
    localStorage.getItem(`watchlist_${currentUser.email}`) || "[]"
  );

  return list.some(m => m.id === movieId);
}

/* =====================================================
   AUTH ACTIONS
===================================================== */
if (authToggle) {
  authToggle.onclick = () => {
    isSignup = !isSignup;
    authTitle.innerText = isSignup ? "Create Profile" : "Sign In";
    authName.style.display = isSignup ? "block" : "none";
    authMsg.innerText = "";
  };
}

if (authSubmit) {
  authSubmit.onclick = () => {
    authMsg.innerText = "";

    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    const name = authName.value.trim();

    if (!email || !password || (isSignup && !name)) {
      authMsg.innerText = "All fields are required";
      return;
    }

    let users = JSON.parse(localStorage.getItem("users") || "[]");

    // SIGN UP
    if (isSignup) {
      if (users.find(u => u.email === email)) {
        authMsg.innerText = "User already exists";
        return;
      }

      users.push({ name, email, password });
      localStorage.setItem("users", JSON.stringify(users));

      authMsg.innerText = "Signup successful! Please login.";
      isSignup = false;
      authTitle.innerText = "Sign In";
      authName.style.display = "none";
      return;
    }

    // LOGIN
    const user = users.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      authMsg.innerText = "Invalid email or password";
      return;
    }

    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));

    if (loginBtn) loginBtn.style.display = "none";
    if (profileWrapper) profileWrapper.style.display = "flex";
    if (profileAvatar) profileAvatar.innerText = user.name.charAt(0);

    if (authModal) authModal.style.display = "none";
  };
}

/* =====================================================
   AUTH (LOCALSTORAGE ONLY – NETLIFY SAFE)
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
   searchBox = document.getElementById("searchBox");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      page = 1;
      loading = false;
      inWatchlist = false;
      if (grid) grid.innerHTML = "";
      loadBrowse();
    });
  }


  // ===== ELEMENTS =====
  const loginBtn = document.getElementById("loginBtn");
  const profileWrapper = document.getElementById("profileWrapper");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileMenu = document.getElementById("profileMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  const authModal = document.getElementById("authModal");
  const closeAuth = document.getElementById("closeAuth");
  const authTitle = document.getElementById("authTitle");
  const authName = document.getElementById("authName");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authSubmit = document.getElementById("authSubmit");
  const authToggle = document.getElementById("authToggle");
  const authMsg = document.getElementById("authMsg");

  let isSignup = false;
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // ===== UI UPDATE =====
  function updateAuthUI() {
    if (currentUser) {
      loginBtn.style.display = "none";
      profileWrapper.style.display = "flex";
      profileAvatar.innerText =
        currentUser.name?.charAt(0).toUpperCase() || "👤";
    } else {
      loginBtn.style.display = "block";
      profileWrapper.style.display = "none";
      profileMenu.style.display = "none";
    }
  }

  // ===== OPEN / CLOSE MODAL =====
  loginBtn.onclick = () => {
    authModal.style.display = "flex";
    authMsg.innerText = "";
  };

  closeAuth.onclick = () => {
    authModal.style.display = "none";
  };

  // ===== TOGGLE LOGIN / SIGNUP =====
  authToggle.onclick = () => {
    isSignup = !isSignup;
    authTitle.innerText = isSignup ? "Create Account" : "Sign In";
    authName.style.display = isSignup ? "block" : "none";
    authMsg.innerText = "";
  };

  // ===== SUBMIT AUTH =====
  authSubmit.onclick = () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    const name = authName.value.trim();

    if (!email || !password || (isSignup && !name)) {
      authMsg.innerText = "All fields required";
      return;
    }

    let users = JSON.parse(localStorage.getItem("users") || "[]");

    // SIGNUP
    if (isSignup) {
      if (users.find(u => u.email === email)) {
        authMsg.innerText = "User already exists";
        return;
      }

      users.push({ name, email, password });
      localStorage.setItem("users", JSON.stringify(users));

      authMsg.innerText = "Signup successful. Please login.";
      isSignup = false;
      authTitle.innerText = "Sign In";
      authName.style.display = "none";
      return;
    }

    // LOGIN
    const user = users.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      authMsg.innerText = "Invalid email or password";
      return;
    }

    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));

    authModal.style.display = "none";
    updateAuthUI();
  };

  // ===== AVATAR CLICK → SHOW LOGOUT =====
  profileAvatar.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.style.display =
      profileMenu.style.display === "block" ? "none" : "block";
  });

  // ===== LOGOUT =====
  logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.removeItem("currentUser");
    currentUser = null;
    updateAuthUI();
  });

  // ===== CLOSE MENU ON OUTSIDE CLICK =====
  document.addEventListener("click", () => {
    profileMenu.style.display = "none";
  });

  // ===== INIT =====
  updateAuthUI();
});


function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}


// expose functions
window.openWatchlist = openWatchlist;


