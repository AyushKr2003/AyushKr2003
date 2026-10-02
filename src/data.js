// Live GitHub numbers, so the page never goes stale. The markup already
// holds sensible fallbacks; this only overwrites them when the API answers.
const USER = "AyushKr2003";
const KEY = "aks-gh-v1";

export async function loadStats() {
  let s = null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (cached && Date.now() - cached.t < 30 * 60 * 1000) s = cached;
  } catch {}

  if (!s) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      const [user, repos] = await Promise.all([
        fetch(`https://api.github.com/users/${USER}`, { signal: ctl.signal }).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { signal: ctl.signal }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);
      clearTimeout(timer);
      if (!user || !Array.isArray(repos)) return null;
      const by = Object.fromEntries(repos.map((r) => [r.name, r]));
      s = {
        t: Date.now(),
        repos: user.public_repos,
        totalStars: repos.filter((r) => !r.fork).reduce((n, r) => n + r.stargazers_count, 0),
        stars: Object.fromEntries(repos.map((r) => [r.name, r.stargazers_count])),
        forks: Object.fromEntries(repos.map((r) => [r.name, r.forks_count])),
        niriStars: by["niri-caelestia-shell"]?.stargazers_count ?? 171,
      };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(s));
      } catch {}
    } catch {
      return null;
    }
  }

  document.querySelectorAll("[data-stars]").forEach((el) => {
    const v = s.stars[el.dataset.stars];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-forks]").forEach((el) => {
    const v = s.forks[el.dataset.forks];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-repos]").forEach((el) => (el.textContent = s.repos));
  document.querySelectorAll("[data-total-stars]").forEach((el) => (el.textContent = s.totalStars));
  return s;
}
