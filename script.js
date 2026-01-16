/* =====================================================
   CONFIG
===================================================== */

let currentUser = JSON.parse(localStorage.getItem("currentUser"));

const authModal = document.getElementById("authModal");
const loginBtn = document.getElementById("loginBtn");
const profileWrapper = document.getElementById("profileWrapper");

if (!currentUser) {
  // show login button
  loginBtn.style.display = "block";
  profileWrapper.style.display = "none";
} else {
  // user is logged in
  loginBtn.style.display = "none";
  profileWrapper.style.display = "flex";
}


const IMG = "https://image.tmdb.org/t/p/w500";


/* =====================================================
   ELEMENTS
===================================================== */
const grid = document.querySelector(".grid");
const trendingMovies = document.getElementById("trendingMovies");
const trendingShows = document.getElementById("trendingShows");



const trendingRow = document.getElementById("trendingRow");
const continueRow = document.getElementById("continueRow");
const recommendedRow = document.getElementById("recommendedRow");

const searchBox = document.getElementById("searchBox");
const genreFilter = document.getElementById("genreFilter");
const ratingFilter = document.getElementById("ratingFilter");
const languageFilter = document.getElementById("languageFilter");
const moodFilter = document.getElementById("moodFilter");

const navMovies = document.getElementById("navMovies");
const navShows = document.getElementById("navShows");
const navWatchlist = document.getElementById("navWatchlist");

const loginBtn = document.getElementById("loginBtn");
const profileWrapper = document.getElementById("profileWrapper");
const profileAvatar = document.getElementById("profileAvatar");
const profileMenu = document.getElementById("profileMenu");



const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const authTitle = document.getElementById("authTitle");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authToggle = document.getElementById("authToggle");
const authMsg = document.getElementById("authMsg");

const infoOverlay = document.getElementById("infoOverlay");

/* =====================================================
   STATE
===================================================== */
let currentType = "movie";
let page = 1;
let loading = false;
let inWatchlist = false;
let isSignup = false;


let watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");

/* =====================================================
   RESTORE LOGIN
===================================================== */


if (currentUser) {
  loginBtn.style.display = "none";
  profileWrapper.style.display = "block";
  profileAvatar.innerText = currentUser.name.charAt(0);
}

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
   ACTIVE TAB
===================================================== */
function setActiveTab(activeBtn) {
  [navMovies, navShows, navWatchlist].forEach(btn =>
    btn.classList.remove("active")
  );
  activeBtn.classList.add("active");
}

/* =====================================================
   INIT
===================================================== */
setActiveTab(navMovies);
loadHome();
loadContinueWatching();
loadRecommended();
loadBrowse();


/* =====================================================
   NAVIGATION
===================================================== */
navMovies.onclick = () => {
  inWatchlist = false;
  setActiveTab(navMovies);
  switchType("movie");
};

navShows.onclick = () => {
  inWatchlist = false;
  setActiveTab(navShows);
  switchType("tv");
};

navWatchlist.onclick = () => {
  openWatchlist();
};

function switchType(type) {
  currentType = type;
  inWatchlist = false;
  page = 1;
  grid.innerHTML = "";
  loadHome();
  loadContinueWatching();
  loadRecommended();
  loadBrowse();

}
/* =====================================================
   HOME SECTIONS
===================================================== */

/* ---------- Continue Watching (no login required) ---------- */
function saveContinueWatching(movie, type) {
  if (!movie || !movie.id) return;

  let list = JSON.parse(localStorage.getItem("continueWatching") || "[]");

  // remove duplicate
  list = list.filter(m => m.id !== movie.id);

  // add to top
  list.unshift({
    id: movie.id,
    title: movie.title || movie.name,
    poster_path: movie.poster_path,
    _type: type,
    genre_ids: movie.genre_ids || []
  });

  // keep only 10
  localStorage.setItem(
    "continueWatching",
    JSON.stringify(list.slice(0, 10))
  );
}

/* ---------- Load Home ---------- */
async function loadHome() {
  // SAFETY: ensure elements exist
  if (!trendingMovies || !trendingShows) {
    console.error("Trending containers missing");
    return;
  }

  // Show sections
  trendingMovies.style.display = "none";
  trendingShows.style.display = "none";
  continueRow.style.display = "flex";
  recommendedRow.style.display = "flex";

  // LOAD TRENDING (Netflix style)
  if (currentType === "movie") {
    trendingMovies.style.display = "flex";
    loadRow(trendingMovies, "/api/trending?type=movie");
  } else {
    trendingShows.style.display = "flex";
    loadRow(trendingShows, "/api/trending?type=tv");
  }
}


// ----- CONTINUE WATCHING -----
if (continueRow) {
  continueRow.style.display = "flex";
  loadContinueWatching();
}

// ----- RECOMMENDED -----
if (recommendedRow) {
  recommendedRow.style.display = "flex";
  loadRecommended();
}

// ----- HIDE OLD TRENDING ROW (IF EXISTS) -----
if (typeof trendingRow !== "undefined" && trendingRow) {
  trendingRow.style.display = "none";
}



// Continue Watching (localStorage based)
function loadContinueWatching() {
  const list = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  continueRow.innerHTML = "";

  const filtered = list.filter(
    item => item._type === currentType
  );

  if (!filtered.length) return;

  filtered.forEach(item => {
    const card = movieCard(item);
    if (card instanceof Node) {
      continueRow.appendChild(card);
    }
  });
}
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



// Recommended (works with or without login)
async function loadRecommended() {
  const genres = getTopGenres();

  let url = `${BACKEND}/api/movies?type=${currentType}&page=1`;

  if (genres.length) {
    url += `&genre=${genres.join(",")}`;
  }

  const raw = await fetchJSON(url);
  const data = normalizeResults(raw);

  recommendedRow.innerHTML = "";

  if (!data.results.length) return;

  data.results.slice(0, 10).forEach(movie => {
    const card = movieCard(movie);
    if (card instanceof Node) {
      recommendedRow.appendChild(card);
    }
  });
}


/* ---------- Load Continue Watching ---------- */
function loadContinueWatching() {
  const list = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  continueRow.innerHTML = "";

  if (!list.length) return;

  list.forEach(item => {
    const card = movieCard({
      id: item.id,
      title: item.title,
      poster_path: item.poster_path,
      _type: item._type
    });

    if (card instanceof Node) {
      continueRow.appendChild(card);
    }
  });
}
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

/* ---------- Recommended (everyone) ---------- */
async function loadRecommended() {
  const genres = getTopGenres();

  let url = `${BACKEND}/api/movies?type=${currentType}&page=1`;

  if (genres.length) {
    url += `&genre=${genres.join(",")}`;
  }

  const raw = await fetchJSON(url);
  const data = normalizeResults(raw);

  recommendedRow.innerHTML = "";

  if (!data.results.length) return;

  data.results.slice(0, 10).forEach(movie => {
    const card = movieCard(movie);
    if (card instanceof Node) {
      recommendedRow.appendChild(card);
    }
  });
}


/* ---------- Generic Row Loader (existing) ---------- */
async function loadRow(row, endpoint) {
  if (!row) return;

  const raw = await fetchJSON(BACKEND + endpoint);
  const data = normalizeResults(raw);

  row.innerHTML = "";

  if (!data.results.length) {
    console.warn("No trending data:", endpoint);
    return;
  }

  data.results.slice(0, 10).forEach(item => {
    const card = movieCard(item);
    row.appendChild(card);
  });
}

/* =====================================================
   BROWSE + INFINITE SCROLL
===================================================== */
async function loadBrowse() {
  if (loading || inWatchlist) return;
  loading = true;

  const url =
    `${BACKEND}/api/movies?type=${currentType}` +
    `&page=${page}` +
    `&search=${searchBox.value}` +
    `&genre=${genreFilter.value}` +
    `&rating=${ratingFilter.value}` +
    `&language=${languageFilter.value}` +
    `&mood=${moodFilter.value}`;

  const raw = await fetchJSON(url);
  console.log("BROWSE DATA:", raw);

  const data = normalizeResults(raw);

  data.results.forEach(m => {
    const card = movieCard(m);
    if (card instanceof Node) {
      grid.appendChild(card);
    }
  });


  loading = false;
}

window.addEventListener("scroll", () => {
  if (inWatchlist) return;
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    page++;
    loadBrowse();
  }
});

/* =====================================================
   SEARCH & FILTERS
===================================================== */
searchBox.addEventListener("input", debounce(resetBrowse, 400));
genreFilter.onchange = resetBrowse;
ratingFilter.onchange = resetBrowse;
languageFilter.onchange = resetBrowse;
moodFilter.onchange = resetBrowse;

function resetBrowse() {
  inWatchlist = false;
  page = 1;
  grid.innerHTML = "";
  loadBrowse();
}

/* =====================================================
   MOVIE CARD
===================================================== */
function movieCard(movie) {
  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
   <img src="${movie.poster_path
      ? IMG + movie.poster_path
      : movie.poster
        ? IMG + movie.poster
        : "./no-image.png"

    }">

    <h4>${movie.title || movie.name}</h4>
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
  if (!id) {
    console.warn("openDetails called with invalid id");
    return;
  }

  const data = await fetchJSON(`${BACKEND}/api/movie/${id}?type=${type}`);
  if (!data.details) return;

  const director =
    data.credits?.crew?.find(p => p.job === "Director")?.name || "N/A";

  const cast =
    data.credits?.cast?.slice(0, 8).map(c => c.name).join(", ") || "N/A";

  infoOverlay.innerHTML = `
  <div class="detailsOverlay">
    <div class="detailsCard">
      <button class="closeDetails">✕</button>

      <div class="detailsContent">
        <div class="detailsPoster">
          <img src="${data.details.poster_path
      ? IMG + data.details.poster_path
      : "https://via.placeholder.com/400x600?text=No+Image"}">
        </div>

        <div class="detailsInfo">
          <h1>${data.details.title || data.details.name}</h1>

          <div class="meta">
            <span>⭐ ${data.details.vote_average?.toFixed(1)}</span>
            <span>${data.details.original_language?.toUpperCase()}</span>
            <span>${(data.details.release_date || data.details.first_air_date || "")
      .slice(0, 4)
    }</span>

          </div>

          <div class="genres">
            ${(data.details.genres || [])
      .map(g => `<span class="genre">${g.name}</span>`)
      .join("")}
          </div>

          <p class="overview">${data.details.overview}</p>

          <p><b>Director:</b> ${data.credits?.crew?.find(p => p.job === "Director")?.name || "N/A"
    }</p>

          <p class="cast"><b>Cast:</b> ${data.credits?.cast?.slice(0, 6).map(c => c.name).join(", ") || "N/A"
    }</p>

          <div class="actions">
            ${data.trailerKey
      ? `<a class="btn primary" target="_blank"
                   href="https://youtube.com/watch?v=${data.trailerKey}">
                   ▶ Trailer
                 </a>`
      : ""}

            <button class="btn secondary"
              onclick="addToWatchlist(${id})">
              ➕ Watchlist
            </button>

            <a class="btn ghost" target="_blank"
              href="https://www.themoviedb.org/${type}/${id}/watch">
              📺 Watch
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
  infoOverlay.style.display = "flex";

  infoOverlay.onclick = () => (infoOverlay.style.display = "none");
  document.querySelector(".detailsCard").onclick = e => e.stopPropagation();
  document.querySelector(".closeDetails").onclick = () =>
    (infoOverlay.style.display = "none");


}
function showLoginPrompt() {
  grid.innerHTML = `
    <div class="watchlistPrompt">
      <h2>Please login to view your watchlist</h2>
      <button id="loginFromWatchlist" class="cta">
        Login
      </button>
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

async function openWatchlist() {
  setActiveTab(navWatchlist);

  if (!currentUser || !currentUser.token) {
    showLoginPrompt();
    return;
  }

  inWatchlist = true;
  grid.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/watchlist`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });

    const watchlistIds = await res.json();

    console.log("WATCHLIST IDS:", watchlistIds);

    if (!Array.isArray(watchlistIds) || watchlistIds.length === 0) {
      grid.innerHTML = `<h2 style="color:#aaa">Your watchlist is empty 🍿</h2>`;
      return;
    }

    // 🔥 FORCE render each movie by fetching TMDB details
    for (const id of watchlistIds) {
      const data = await fetchJSON(
        `${API_BASE}/api/movie/${id}?type=movie`
      );

      if (data && data.details) {
        grid.appendChild(movieCard(data.details));
      }
    }

  } catch (err) {
    console.error("Watchlist render error:", err);
    grid.innerHTML = `<h2 style="color:red">Failed to load watchlist</h2>`;
  }
}



/* =====================================================
   AUTH
===================================================== */
/* =====================================================
   AUTH
===================================================== */

// Open / Close auth modal
loginBtn.onclick = () => {
  authModal.style.display = "flex";
  authMsg.innerText = "";
};

closeAuth.onclick = () => {
  authModal.style.display = "none";
};

// Toggle Login / Signup
authToggle.onclick = () => {
  isSignup = !isSignup;
  authTitle.innerText = isSignup ? "Create Profile" : "Sign In";
  authName.style.display = isSignup ? "block" : "none";
  authMsg.innerText = "";
};

// Email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Submit Login / Signup (LOCALSTORAGE ONLY)
authSubmit.onclick = () => {
  authMsg.innerText = "";

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const name = authName.value.trim();

  // Validation
  if (!email || !password || (isSignup && !name)) {
    authMsg.innerText = "All fields are required";
    return;
  }

  if (!isValidEmail(email)) {
    authMsg.innerText = "Please enter a valid email address";
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // SIGN UP
  if (isSignup) {
    if (users.find(u => u.email === email)) {
      authMsg.innerText = "User already exists";
      return;
    }

    users.push({ name, email, password });
    localStorage.setItem("users", JSON.stringify(users));

    authMsg.innerText = "Signup successful! Please sign in.";
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

  // Save session
  currentUser = user;
  localStorage.setItem("currentUser", JSON.stringify(user));

  // Update UI
  loginBtn.style.display = "none";
  profileWrapper.style.display = "block";
  profileAvatar.innerText = user.name.charAt(0);

  authModal.style.display = "none";
};

/* =====================================================
   LOGOUT (KEEP ONLY ONCE)
===================================================== */


/* =====================================================
   UTIL
===================================================== */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function addToWatchlist(movieId) {

  try {
    const res = await fetch(
      `${API_BASE}/api/watchlist/${movieId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentUser.token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || data.error || "Failed to add to watchlist");
      return;
    }

    alert("Added to Watchlist ⭐");

  } catch (err) {
    alert("Server error while adding to watchlist");
  }
}



// expose functions for inline HTML usage
window.addToWatchlist = addToWatchlist;
window.openWatchlist = openWatchlist;

