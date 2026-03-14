(() => {
  const CONFIG = window.TMDB_CONFIG || {};
  const API_BASE = 'https://api.themoviedb.org/3';
  const IMG_BASE = CONFIG.IMAGE_BASE || 'https://image.tmdb.org/t/p/';
  const FALLBACK_POSTER = 'https://via.placeholder.com/500x750/0f172a/94a3b8?text=No+Image';
  const FAVORITES_KEY = 'filmfinder_favorites';
  const RATINGS_KEY = 'filmfinder_ratings';
  const PROFILE_CACHE_KEY = 'filmfinder_profile_cache';

  const page = document.body.dataset.page;

  function isConfigured() {
    return CONFIG.READ_ACCESS_TOKEN && !CONFIG.READ_ACCESS_TOKEN.includes('PASTE_YOUR');
  }

  function setupNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('nav-list');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function updateFavCount() {
    const count = getFavorites().length;
    document.querySelectorAll('#fav-count').forEach((el) => (el.textContent = count));
  }

  async function api(path, params = {}) {
    if (!isConfigured()) {
      throw new Error('TMDb token is missing. Open config.js and paste your Read Access Token.');
    }
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    if (!url.searchParams.has('language') && CONFIG.LANGUAGE) {
      url.searchParams.set('language', CONFIG.LANGUAGE);
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${CONFIG.READ_ACCESS_TOKEN}`,
        accept: 'application/json'
      }
    });
    if (!response.ok) throw new Error(`TMDb request failed: ${response.status}`);
    return response.json();
  }

  function posterUrl(path, size = 'w500') {
    return path ? `${IMG_BASE}${size}${path}` : FALLBACK_POSTER;
  }

  function backdropUrl(path, size = 'original') {
    return path ? `${IMG_BASE}${size}${path}` : '';
  }

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
  }

  function getRatings() {
    try { return JSON.parse(localStorage.getItem(RATINGS_KEY)) || {}; } catch { return {}; }
  }

  function saveFavorites(list) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    updateFavCount();
  }

  function saveRatings(ratings) {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  }

  function getProfileCache() {
    try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)) || {}; } catch { return {}; }
  }

  function setProfileCache(movie) {
    const cache = getProfileCache();
    cache[movie.id] = {
      id: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  }

  function isFavorite(id) {
    return getFavorites().includes(Number(id));
  }

  function toggleFavorite(movie) {
    const current = getFavorites();
    const numericId = Number(movie.id);
    const next = current.includes(numericId)
      ? current.filter((id) => id !== numericId)
      : [...current, numericId];
    setProfileCache(movie);
    saveFavorites(next);
    return next.includes(numericId);
  }

  function removeFavorite(id) {
    saveFavorites(getFavorites().filter((movieId) => movieId !== Number(id)));
  }

  function setRating(movie, rating) {
    const ratings = getRatings();
    ratings[movie.id] = Number(rating);
    setProfileCache(movie);
    saveRatings(ratings);
  }

  function removeRating(id) {
    const ratings = getRatings();
    delete ratings[id];
    saveRatings(ratings);
  }

  function yearFromDate(date) {
    return date ? String(date).slice(0, 4) : '—';
  }

  function createMovieCard(movie) {
    setProfileCache(movie);
    const favoriteActive = isFavorite(movie.id);
    const genresText = Array.isArray(movie.genre_names) && movie.genre_names.length
      ? movie.genre_names.slice(0, 2).join(', ')
      : '';

    const article = document.createElement('article');
    article.className = 'movie-card';
    article.innerHTML = `
      <a class="movie-poster-link" href="film_details.html?id=${movie.id}">
        <img src="${posterUrl(movie.poster_path)}" alt="${escapeHtml(movie.title)} poster" loading="lazy" />
      </a>
      <div class="movie-card-body">
        <div>
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="movie-card-meta">
            <span>${yearFromDate(movie.release_date)}</span>
            <span>•</span>
            <span>TMDb ${formatScore(movie.vote_average)}</span>
            ${genresText ? `<span>•</span><span>${escapeHtml(genresText)}</span>` : ''}
          </div>
        </div>
        <div class="movie-card-actions">
          <button class="mini-btn favorite ${favoriteActive ? 'active' : ''}" data-favorite-id="${movie.id}">
            ${favoriteActive ? '♥ Favorite' : '♡ Favorite'}
          </button>
          <a class="mini-btn primary" href="film_details.html?id=${movie.id}">Details</a>
        </div>
      </div>
    `;

    const favoriteBtn = article.querySelector('[data-favorite-id]');
    favoriteBtn.addEventListener('click', () => {
      const active = toggleFavorite(movie);
      favoriteBtn.classList.toggle('active', active);
      favoriteBtn.textContent = active ? '♥ Favorite' : '♡ Favorite';
    });

    return article;
  }

  function attachGenreNames(movies, genresMap) {
    return movies.map((movie) => ({
      ...movie,
      genre_names: (movie.genre_ids || []).map((id) => genresMap.get(id)).filter(Boolean)
    }));
  }

  function renderMovieGrid(targetId, movies, genresMap = new Map()) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = '';

    const ctaSections = ['popular-grid', 'upcoming-grid', 'toprated-grid', 'similar-grid'];
    const usesSectionCta = ctaSections.includes(targetId);
    target.classList.toggle('home-section-grid', usesSectionCta);

    const normalized = attachGenreNames(movies, genresMap);
    normalized.forEach((movie) => target.appendChild(createMovieCard(movie)));

    if (usesSectionCta) {
      target.appendChild(createSectionCtaCard());
    }
  }

  function createSectionCtaCard() {
    const article = document.createElement('article');
    article.className = 'movie-card section-cta-card';
    article.innerHTML = `
      <div class="section-cta-card-inner">
        <span class="cta-kicker">Need more?</span>
        <h3>Open full movie database</h3>
        <p>Browse many more titles, use filters and find exactly what you want to watch.</p>
        <a class="btn section-cta-btn" href="films.html">See all movies</a>
      </div>
    `;
    return article;
  }

  async function loadGenres() {
    const data = await api('/genre/movie/list');
    return data.genres || [];
  }

  async function initHome() {
    const [genres, trendingData, popularData, upcomingData, topData] = await Promise.all([
      loadGenres(),
      api('/trending/movie/week'),
      api('/movie/popular'),
      api('/movie/upcoming'),
      api('/movie/top_rated')
    ]);

    const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));
    renderMovieGrid('popular-grid', popularData.results.slice(0, 9), genreMap);
    renderMovieGrid('upcoming-grid', upcomingData.results.slice(0, 9), genreMap);
    renderMovieGrid('toprated-grid', topData.results.slice(0, 9), genreMap);
    initHeroSlider(trendingData.results.slice(0, 6));
  }

  function initHeroSlider(movies) {
    const card = document.querySelector('.hero-slider-card');
    const content = document.getElementById('hero-slider-content');
    const dotsWrap = document.getElementById('hero-dots');
    const prev = document.getElementById('hero-prev');
    const next = document.getElementById('hero-next');
    if (!content || movies.length === 0) return;

    let index = 0;
    let autoplayId = null;

    const render = () => {
      const movie = movies[index];
      content.style.backgroundImage = `url('${backdropUrl(movie.backdrop_path)}')`;
      content.innerHTML = `
        <div class="hero-slider-inner">
          <p class="eyebrow">Trending now</p>
          <h2>${escapeHtml(movie.title)}</h2>
          <div class="hero-meta">
            <span>${yearFromDate(movie.release_date)}</span>
            <span>TMDb ${formatScore(movie.vote_average)}</span>
          </div>
          <p>${escapeHtml(limitText(movie.overview || 'No overview available.', 180))}</p>
          <a class="btn" href="film_details.html?id=${movie.id}">Open details</a>
        </div>
      `;
      dotsWrap.innerHTML = '';
      movies.forEach((_, dotIndex) => {
        const dot = document.createElement('button');
        dot.className = `slider-dot ${dotIndex === index ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Open slide ${dotIndex + 1}`);
        dot.addEventListener('click', () => {
          index = dotIndex;
          render();
          restartAutoplay();
        });
        dotsWrap.appendChild(dot);
      });
    };

    const goToNext = () => {
      index = (index + 1) % movies.length;
      render();
    };

    const goToPrev = () => {
      index = (index - 1 + movies.length) % movies.length;
      render();
    };

    const stopAutoplay = () => {
      if (autoplayId) {
        clearInterval(autoplayId);
        autoplayId = null;
      }
    };

    const startAutoplay = () => {
      stopAutoplay();
      autoplayId = setInterval(goToNext, 5000);
    };

    const restartAutoplay = () => {
      startAutoplay();
    };

    prev?.addEventListener('click', () => {
      goToPrev();
      restartAutoplay();
    });

    next?.addEventListener('click', () => {
      goToNext();
      restartAutoplay();
    });

    card?.addEventListener('mouseenter', stopAutoplay);
    card?.addEventListener('mouseleave', startAutoplay);

    render();
    startAutoplay();
  }

  async function initMovies() {
    const genres = await loadGenres();
    const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));
    populateGenreSelect(genres);
    populateYearSelect();

    const state = {
      search: '',
      genre: '',
      year: '',
      sort: new URLSearchParams(window.location.search).get('sort') || 'popularity.desc',
      page: Number(new URLSearchParams(window.location.search).get('page')) || 1
    };

    const searchInput = document.getElementById('search-input');
    const genreSelect = document.getElementById('genre-select');
    const yearSelect = document.getElementById('year-select');
    const sortSelect = document.getElementById('sort-select');
    const searchBtn = document.getElementById('search-btn');
    const resetBtn = document.getElementById('reset-btn');

    sortSelect.value = state.sort;

    const loadCatalog = async () => {
      document.getElementById('results-summary').textContent = 'Loading movies...';
      const params = {
        page: state.page,
        include_adult: 'false'
      };

      let data;
      if (state.search.trim()) {
        data = await api('/search/movie', { query: state.search.trim(), page: state.page, include_adult: 'false' });
        let results = data.results || [];
        if (state.genre) results = results.filter((movie) => (movie.genre_ids || []).includes(Number(state.genre)));
        if (state.year) results = results.filter((movie) => yearFromDate(movie.release_date) === state.year);
        results = sortResultsLocally(results, state.sort);
        renderCatalog(results, data.total_results || results.length, Math.min(data.total_pages || 1, 500), genreMap);
      } else {
        data = await api('/discover/movie', {
          page: state.page,
          sort_by: state.sort,
          with_genres: state.genre,
          primary_release_year: state.year,
          include_adult: 'false',
          vote_count_gte: 50
        });
        renderCatalog(data.results || [], data.total_results || 0, Math.min(data.total_pages || 1, 500), genreMap);
      }
      syncUrl(state);
    };

    const triggerReload = (resetPage = true) => {
      if (resetPage) state.page = 1;
      loadCatalog().catch(showPageError);
    };

    searchBtn.addEventListener('click', () => {
      state.search = searchInput.value.trim();
      triggerReload(true);
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        state.search = searchInput.value.trim();
        triggerReload(true);
      }
    });
    genreSelect.addEventListener('change', () => { state.genre = genreSelect.value; triggerReload(true); });
    yearSelect.addEventListener('change', () => { state.year = yearSelect.value; triggerReload(true); });
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; triggerReload(true); });
    resetBtn.addEventListener('click', () => {
      state.search = '';
      state.genre = '';
      state.year = '';
      state.sort = 'popularity.desc';
      state.page = 1;
      searchInput.value = '';
      genreSelect.value = '';
      yearSelect.value = '';
      sortSelect.value = state.sort;
      loadCatalog().catch(showPageError);
    });

    function renderCatalog(results, totalResults, totalPages, genresMap) {
      const grid = document.getElementById('catalog-grid');
      const empty = document.getElementById('catalog-empty');
      grid.innerHTML = '';
      if (!results.length) {
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        const normalized = attachGenreNames(results, genresMap);
        normalized.forEach((movie) => grid.appendChild(createMovieCard(movie)));
      }
      document.getElementById('results-summary').textContent = `${totalResults} results • page ${state.page} of ${totalPages}`;
      renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
      const wrap = document.getElementById('pagination');
      wrap.innerHTML = '';
      if (totalPages <= 1) return;
      const pages = buildPageNumbers(state.page, totalPages);
      pages.forEach((value) => {
        if (value === '…') {
          const spacer = document.createElement('span');
          spacer.className = 'page-btn';
          spacer.textContent = '…';
          spacer.style.pointerEvents = 'none';
          wrap.appendChild(spacer);
          return;
        }
        const btn = document.createElement('button');
        btn.className = `page-btn ${value === state.page ? 'active' : ''}`;
        btn.textContent = String(value);
        btn.addEventListener('click', () => {
          state.page = value;
          loadCatalog().catch(showPageError);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        wrap.appendChild(btn);
      });
    }

    loadCatalog().catch(showPageError);
  }

  function syncUrl(state) {
    const params = new URLSearchParams();
    if (state.search) params.set('q', state.search);
    if (state.genre) params.set('genre', state.genre);
    if (state.year) params.set('year', state.year);
    if (state.sort && state.sort !== 'popularity.desc') params.set('sort', state.sort);
    if (state.page && state.page !== 1) params.set('page', state.page);
    history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
  }

  function populateGenreSelect(genres) {
    const select = document.getElementById('genre-select');
    if (!select) return;
    genres.forEach((genre) => {
      const option = document.createElement('option');
      option.value = String(genre.id);
      option.textContent = genre.name;
      select.appendChild(option);
    });
    const params = new URLSearchParams(window.location.search);
    select.value = params.get('genre') || '';
  }

  function populateYearSelect() {
    const select = document.getElementById('year-select');
    if (!select) return;
    const current = new Date().getFullYear() + 1;
    for (let year = current; year >= 1970; year--) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      select.appendChild(option);
    }
    const params = new URLSearchParams(window.location.search);
    select.value = params.get('year') || '';
    const q = params.get('q');
    const searchInput = document.getElementById('search-input');
    if (q && searchInput) searchInput.value = q;
  }

  function sortResultsLocally(results, sort) {
    const sorted = [...results];
    switch (sort) {
      case 'vote_average.desc':
        return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      case 'primary_release_date.desc':
        return sorted.sort((a, b) => String(b.release_date || '').localeCompare(String(a.release_date || '')));
      case 'primary_release_date.asc':
        return sorted.sort((a, b) => String(a.release_date || '').localeCompare(String(b.release_date || '')));
      case 'title.asc':
        return sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
      case 'title.desc':
        return sorted.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
      default:
        return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }
  }

  function buildPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push('…');
    for (let page = start; page <= end; page++) pages.push(page);
    if (end < total - 1) pages.push('…');
    pages.push(total);
    return pages;
  }

  async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('id');
    if (!movieId) throw new Error('Movie id is missing in URL.');

    const data = await api(`/movie/${movieId}`, { append_to_response: 'videos,similar' });
    setProfileCache(data);

    const title = document.getElementById('detail-title');
    const meta = document.getElementById('detail-meta');
    const description = document.getElementById('detail-description');
    const poster = document.getElementById('detail-poster');
    const hero = document.getElementById('detail-backdrop');
    const favoriteBtn = document.getElementById('toggle-favorite-btn');
    const clearRatingBtn = document.getElementById('clear-rating-btn');

    title.textContent = data.title;
    description.textContent = data.overview || 'No overview available.';
    poster.src = posterUrl(data.poster_path);
    poster.alt = `${data.title} poster`;
    hero.style.backgroundImage = `url('${backdropUrl(data.backdrop_path || data.poster_path)}')`;
    meta.textContent = `${yearFromDate(data.release_date)} • ${formatRuntime(data.runtime)} • ${formatScore(data.vote_average)} TMDb • ${(data.genres || []).map((genre) => genre.name).join(', ')}`;

    const refreshFavoriteBtn = () => {
      const active = isFavorite(data.id);
      favoriteBtn.textContent = active ? '♥ Remove from favorites' : '♡ Add to favorites';
      favoriteBtn.classList.toggle('danger', active);
    };

    favoriteBtn.addEventListener('click', () => {
      toggleFavorite(data);
      refreshFavoriteBtn();
    });
    refreshFavoriteBtn();

    const youtubeVideo = ((data.videos && data.videos.results) || []).find(
      (video) => video.site === 'YouTube' && video.type === 'Trailer'
    ) || ((data.videos && data.videos.results) || []).find((video) => video.site === 'YouTube');

    const trailerFrameWrap = document.getElementById('trailer-frame-wrap');
    const trailerFrame = document.getElementById('detail-trailer');
    const trailerLink = document.getElementById('trailer-link');
    const noTrailer = document.getElementById('no-trailer');

    if (youtubeVideo) {
      const url = `https://www.youtube.com/embed/${youtubeVideo.key}`;
      trailerFrame.src = url;
      trailerFrameWrap.classList.remove('hidden');
      trailerLink.href = `https://www.youtube.com/watch?v=${youtubeVideo.key}`;
      trailerLink.classList.remove('hidden');
      noTrailer.classList.add('hidden');
    } else {
      trailerFrameWrap.classList.add('hidden');
      noTrailer.classList.remove('hidden');
    }

    initRatingStars(data);
    clearRatingBtn.addEventListener('click', () => {
      removeRating(data.id);
      initRatingStars(data);
    });

    renderMovieGrid('similar-grid', (data.similar?.results || []).slice(0, 9), new Map((data.genres || []).map((genre) => [genre.id, genre.name])));
  }

  function initRatingStars(movie) {
    const wrap = document.getElementById('rating-stars');
    const clearBtn = document.getElementById('clear-rating-btn');
    if (!wrap) return;
    const current = getRatings()[movie.id] || 0;
    wrap.innerHTML = '';
    for (let index = 1; index <= 10; index++) {
      const star = document.createElement('button');
      star.className = `star-btn ${index <= current ? 'active' : ''}`;
      star.textContent = '★';
      star.title = `Rate ${index}/10`;
      star.addEventListener('click', () => {
        setRating(movie, index);
        initRatingStars(movie);
      });
      wrap.appendChild(star);
    }
    clearBtn.classList.toggle('hidden', !current);
  }

  async function initProfile() {
    const favorites = getFavorites();
    const ratings = getRatings();
    const cache = getProfileCache();
    const ids = Array.from(new Set([...favorites, ...Object.keys(ratings).map(Number)]));
    const grid = document.getElementById('profile-grid');
    const empty = document.getElementById('profile-empty');
    document.getElementById('favorites-total').textContent = String(favorites.length);
    document.getElementById('ratings-total').textContent = String(Object.keys(ratings).length);

    if (!ids.length) {
      empty.classList.remove('hidden');
      return;
    }

    const movies = await Promise.all(ids.map(async (id) => {
      try {
        return cache[id] || await api(`/movie/${id}`);
      } catch {
        return cache[id] || null;
      }
    }));

    grid.innerHTML = '';
    movies.filter(Boolean).forEach((movie) => {
      const rating = ratings[movie.id] || null;
      const favorite = favorites.includes(Number(movie.id));
      const card = document.createElement('article');
      card.className = 'profile-card';
      card.innerHTML = `
        <img src="${posterUrl(movie.poster_path)}" alt="${escapeHtml(movie.title)} poster" loading="lazy" />
        <div>
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="profile-card-meta">${yearFromDate(movie.release_date)} • TMDb ${formatScore(movie.vote_average)}</div>
          <div class="profile-rating-inline">${rating ? `Your rating: ${'★'.repeat(rating)}${'☆'.repeat(10 - rating)}` : 'Not rated yet'}</div>
        </div>
        <div class="profile-card-actions">
          <a class="mini-btn primary" href="film_details.html?id=${movie.id}">Details</a>
          ${favorite ? `<button class="mini-btn favorite active" data-remove-favorite="${movie.id}">Remove favorite</button>` : ''}
          ${rating ? `<button class="mini-btn" data-edit-rating="${movie.id}">Edit rating</button><button class="mini-btn" data-delete-rating="${movie.id}">Delete rating</button>` : ''}
        </div>
      `;
      card.querySelector('[data-remove-favorite]')?.addEventListener('click', () => {
        removeFavorite(movie.id);
        initProfile().catch(showPageError);
      });
      card.querySelector('[data-edit-rating]')?.addEventListener('click', () => {
        const next = prompt('Set a new rating from 1 to 10:', String(rating));
        const value = Number(next);
        if (value >= 1 && value <= 10) {
          setRating(movie, value);
          initProfile().catch(showPageError);
        }
      });
      card.querySelector('[data-delete-rating]')?.addEventListener('click', () => {
        removeRating(movie.id);
        initProfile().catch(showPageError);
      });
      grid.appendChild(card);
    });
  }

  function formatRuntime(runtime) {
    if (!runtime) return 'Runtime unknown';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function formatScore(score) {
    return score ? Number(score).toFixed(1) : 'N/A';
  }

  function limitText(text, max) {
    return text.length <= max ? text : `${text.slice(0, max).trim()}…`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showPageError(error) {
    console.error(error);
    const targets = [
      document.getElementById('results-summary'),
      document.getElementById('detail-title'),
      document.getElementById('profile-empty')
    ].filter(Boolean);
    if (targets[0]) targets[0].textContent = error.message;
    if (targets[1]) targets[1].textContent = error.message;
    if (targets[2]) {
      targets[2].classList.remove('hidden');
      targets[2].textContent = error.message;
    }
  }

  async function boot() {
    setupNav();
    updateFavCount();
    if (!['home', 'movies', 'details', 'profile', 'about'].includes(page)) return;
    if (page === 'home') await initHome();
    if (page === 'movies') await initMovies();
    if (page === 'details') await initDetails();
    if (page === 'profile') await initProfile();
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(showPageError);
  });
})();
