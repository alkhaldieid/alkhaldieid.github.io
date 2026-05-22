import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://alkhaldieid.github.io";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_POSTS_DIR = path.join(os.homedir(), "signal-pipeline", "posts");

const args = process.argv.slice(2);
const mode = args.includes("--publish") ? "publish" : "review";
const confirmed = args.includes("--confirm");
const postsDir = argValue("--posts-dir", process.env.SIGNAL_POSTS_DIR || DEFAULT_POSTS_DIR);

if (mode === "publish" && !confirmed) {
  console.error("Publishing is gated. Re-run with --publish --confirm after reviewing the proposed posts.");
  process.exit(1);
}

const profile = readJson(path.join(ROOT, "data", "profile.json"));
const profileAr = readJson(path.join(ROOT, "data", "profile-ar.json"));
const overrides = readJson(path.join(ROOT, "data", "post-overrides.json"));
const fieldNotes = readJson(path.join(ROOT, "data", "field-notes.json"));
const posts = loadPosts(postsDir, overrides, { includeUnreviewed: mode === "review" });

if (mode === "review") {
  const reviewPath = path.join(ROOT, "data", "signal-posts.review.json");
  fs.writeFileSync(
    reviewPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        postsDir,
        count: posts.length,
        nextStep: "Review new items, add a curated entry to data/post-overrides.json for anything approved, then run npm run publish:posts.",
        posts
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  console.log(`Review file written: ${path.relative(ROOT, reviewPath)}`);
  console.log(`Posts found: ${posts.length}`);
  console.log("No website pages were changed. Run npm run publish:posts after review.");
  process.exit(0);
}

buildSite(posts);
console.log(`Published ${posts.length} reviewed blog posts into the website.`);

function argValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1] || fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadPosts(directory, overrideMap, { includeUnreviewed = false } = {}) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Signal posts directory does not exist: ${directory}`);
  }

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => parsePost(path.join(directory, file), overrideMap))
    .filter((post) => post.publish !== false && (includeUnreviewed || post.reviewed))
    .sort((a, b) => b.generated.localeCompare(a.generated));
}

function parsePost(filePath, overrideMap) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const fileName = path.basename(filePath);
  const base = fileName.replace(/\.txt$/, "");
  const slugKey = base.replace(/__\d{8}-\d{6}$/, "");
  const fallbackSlug = slugify(slugKey);
  const hasOverride = Boolean(overrideMap[slugKey] || overrideMap[fallbackSlug]);
  const override = overrideMap[slugKey] || overrideMap[fallbackSlug] || {};
  const urlSlug = slugify(override.slug || fallbackSlug);

  const titleFromHeader = findHeaderTitle(lines);
  const generated = findMeta(lines, "generated") || generatedFromFileName(base);
  const mode = findMeta(lines, "mode") || "auto";
  const separatorIndex = lines.findIndex((line) => /^-{8,}\s*$/.test(line.trim()));
  const body = lines
    .slice(separatorIndex >= 0 ? separatorIndex + 1 : 0)
    .join("\n")
    .trim();
  const title = override.title || titleFromHeader || titleFromSlug(slugKey);
  const publicBody = override.body || body;
  const excerpt = override.excerpt || summarize(publicBody || titleFromHeader, 230);
  const tags = override.tags || deriveTags(`${title}\n${body}`);

  return {
    sourceFile: fileName,
    sourcePath: filePath,
    slug: urlSlug,
    title,
    originalTitle: titleFromHeader,
    generated,
    mode,
    tags,
    excerpt,
    body: publicBody,
    publish: override.publish,
    reviewed: hasOverride
  };
}

function findHeaderTitle(lines) {
  for (const line of lines) {
    if (!line.startsWith("#")) continue;
    const clean = line.replace(/^#\s?/, "").trim();
    if (!clean || clean === "VISUAL TO CREATE :") continue;
    if (isMetaLine(clean)) continue;
    return clean;
  }
  return "";
}

function findMeta(lines, key) {
  const pattern = new RegExp(`^#\\s*${key}\\s*:\\s*(.+)$`, "i");
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function isMetaLine(text) {
  return /^(mode|user_prompt|generated|voice|unified_score|critique_avg|virality_avg|engagement|revisions)\s*:/i.test(text);
}

function generatedFromFileName(base) {
  const match = base.match(/__(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) return new Date().toISOString().slice(0, 19);
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function titleFromSlug(slug) {
  return slug
    .replace(/-+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function summarize(value, length) {
  return plainText(value)
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length)
    .replace(/\s+\S*$/, "")
    .trim();
}

function plainText(value) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function deriveTags(text) {
  const lowered = text.toLowerCase();
  const tags = [];
  const add = (condition, label) => {
    if (condition && !tags.includes(label)) tags.push(label);
  };
  add(lowered.includes("mcp"), "MCP");
  add(lowered.includes("rag") || lowered.includes("retrieval"), "RAG");
  add(lowered.includes("arabic") || lowered.includes("gulf") || lowered.includes("saudi"), "Arabic AI");
  add(lowered.includes("insurance") || lowered.includes("claims") || lowered.includes("underwriting"), "Insurance AI");
  add(lowered.includes("agent"), "Agentic AI");
  add(lowered.includes("compliance") || lowered.includes("governance"), "Governance");
  add(tags.length === 0, "AI Strategy");
  return tags.slice(0, 4);
}

function buildSite(allPosts) {
  ensureDir(path.join(ROOT, "about"));
  ensureDir(path.join(ROOT, "ar"));
  fs.rmSync(path.join(ROOT, "field-notes"), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "blog", "posts"), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "writing"), { recursive: true, force: true });
  ensureDir(path.join(ROOT, "field-notes"));
  ensureDir(path.join(ROOT, "blog", "posts"));

  fs.writeFileSync(path.join(ROOT, "index.html"), homePage(allPosts), "utf8");
  fs.writeFileSync(path.join(ROOT, "about", "index.html"), aboutPage(), "utf8");
  fs.writeFileSync(path.join(ROOT, "ar", "index.html"), arabicPage(), "utf8");
  fs.writeFileSync(path.join(ROOT, "blog", "index.html"), blogPage(allPosts), "utf8");
  ensureDir(path.join(ROOT, "writing"));
  fs.writeFileSync(path.join(ROOT, "writing", "index.html"), redirectPage("/blog/"), "utf8");
  fs.writeFileSync(path.join(ROOT, "404.html"), notFoundPage(), "utf8");
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robots(), "utf8");
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap(allPosts), "utf8");
  fs.writeFileSync(path.join(ROOT, "index.xml"), rss(allPosts), "utf8");
  fs.writeFileSync(path.join(ROOT, "index.json"), searchIndex(allPosts), "utf8");

  for (const note of fieldNotes) {
    const noteDir = path.join(ROOT, "field-notes", note.slug);
    ensureDir(noteDir);
    fs.writeFileSync(path.join(noteDir, "index.html"), fieldNotePage(note), "utf8");
  }

  for (const post of allPosts) {
    const postDir = path.join(ROOT, "blog", "posts", post.slug);
    ensureDir(postDir);
    fs.writeFileSync(path.join(postDir, "index.html"), articlePage(post), "utf8");
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function layout({ title, description, pathName = "/", current = "home", body, schema = "", lang = "en", dir = "ltr" }) {
  const canonical = `${SITE_URL}${pathName}`;
  const isArabic = lang === "ar";
  const displayName = isArabic ? profileAr.shortName : profile.shortName;
  const displayTitle = isArabic ? profileAr.title : profile.title;
  const pageTitle = title === profile.name || title === profileAr.name ? `${title} | ${displayTitle}` : `${title} | ${displayName}`;
  const nav = isArabic
    ? { home: "الرئيسية", about: "الملف", blog: "المقالات", english: "English" }
    : { home: "Index", about: "Profile", blog: "Essays", arabic: "العربية" };
  const footerText = isArabic
    ? profileAr.footer
    : `${profile.shortName} - AI systems, evaluation, and regulated enterprise workflows.`;
  const authorName = isArabic ? profileAr.name : profile.name;
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(authorName)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_URL}/assets/eid-alkhaldi.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <title>${esc(pageTitle)}</title>
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${SITE_URL}/">
  <link rel="alternate" hreflang="ar" href="${SITE_URL}/ar/">
  <link rel="alternate" type="application/rss+xml" title="${esc(profile.shortName)} blog" href="/index.xml">
  <link rel="stylesheet" href="/css/site.css?v=20260522-redesign">
  ${schema}
</head>
<body>
  <header class="site-header">
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/">
        <span class="brand-mark">EA</span>
        <span>${esc(displayName)}</span>
      </a>
      <div class="nav-links">
        ${navLink("/", nav.home, current === "home")}
        ${navLink("/about/", nav.about, current === "about")}
        ${navLink("/blog/", nav.blog, current === "blog")}
        ${isArabic ? navLink("/", nav.english, false) : navLink("/ar/", nav.arabic, current === "arabic")}
      </div>
    </nav>
  </header>
  ${body}
  <footer class="footer">
    <div class="wrap">
      <span>${esc(footerText)}</span>
      <span class="footer-links">${profile.links.map((link) => `<a href="${link.url}" target="_blank" rel="noopener">${esc(link.label)}</a>`).join("")}</span>
    </div>
  </footer>
</body>
</html>
`;
}

function navLink(href, label, active, external = false) {
  const attrs = [
    `href="${href}"`,
    active ? `aria-current="page"` : "",
    external ? `target="_blank" rel="noopener"` : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `<a ${attrs}>${esc(label)}</a>`;
}

function homePage(posts) {
  const latest = posts.slice(0, 6);
  const featuredNote = fieldNotes[0];
  return layout({
    title: profile.name,
    description: profile.headline,
    current: "home",
    schema: personSchema(),
    body: `<main>
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <p class="eyebrow">Professional record</p>
        <h1>${esc(profile.name)}</h1>
        <p class="lead">${esc(profile.headline)}</p>
        <dl class="hero-facts">
          <div><dt>Credential</dt><dd>${esc(profile.credential)}, Electrical Engineering</dd></div>
          <div><dt>Base</dt><dd>${esc(profile.location)}</dd></div>
          <div><dt>Work</dt><dd>${esc(profile.availability)}</dd></div>
        </dl>
      </div>
      <aside>
        <div class="portrait-frame">
          <img class="portrait" src="/assets/eid-alkhaldi.jpg" alt="${esc(profile.name)}">
        </div>
        <div class="side-note">
          <strong>Working thesis</strong>
          <span>AI value in regulated enterprises is created less by model access than by evaluation, evidence boundaries, authority design, and disciplined handover.</span>
        </div>
      </aside>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Non-commodity edge</p>
          <h2>Judgment under institutional constraints.</h2>
        </div>
        <p>${esc(profile.summary[0])}</p>
      </div>
      <div class="edge-grid">
        ${profile.edge.map(edgeCard).join("")}
      </div>
    </div>
  </section>
  <section class="section alt">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Evidence record</p>
          <h2>Research depth, domain judgment, and bilingual deployment context.</h2>
        </div>
        <p>${esc(profile.summary[1])}</p>
      </div>
      <div class="proof-grid">
        ${profile.proof.map((item) => `<div class="card proof-card"><strong>${esc(item.value)}</strong><p>${esc(item.label)}</p></div>`).join("")}
      </div>
    </div>
  </section>
  ${featuredNote ? featuredFieldNote(featuredNote) : ""}
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Selected systems</p>
          <h2>Work shaped by auditability, domain constraints, and handover.</h2>
        </div>
        <p>The emphasis is not demo fluency. The emphasis is whether a system remains legible when policies conflict, evidence is incomplete, and decisions carry operational consequence.</p>
      </div>
      <div class="project-grid">
        ${profile.projects.map(projectCard).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Essays</p>
          <h2>Field notes on AI systems that have to survive contact with institutions.</h2>
        </div>
        <p>Essays on RAG, agents, MCP, insurance automation, Arabic-English evaluation, and the control systems around AI.</p>
      </div>
      <div class="post-grid">
        ${latest.map(postCard).join("")}
      </div>
      <div class="link-row">
        <a class="button secondary" href="/blog/">All essays</a>
      </div>
    </div>
  </section>
</main>`
  });
}

function aboutPage() {
  return layout({
    title: "Profile",
    description: "Professional profile for Eid Alkhaldi, focused on regulated AI systems, insurance workflows, Arabic-English evaluation, and applied machine learning.",
    pathName: "/about/",
    current: "about",
    schema: personSchema(),
    body: `<main>
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Profile</p>
      <h1>Research-trained AI systems work for regulated, bilingual enterprise environments.</h1>
      <p class="lead">${esc(profile.summary[1])}</p>
      <div class="link-row">
        ${profile.links.map((link) => `<a class="button secondary" href="${link.url}" target="_blank" rel="noopener">${esc(link.label)}</a>`).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Operating range</p>
          <h2>Where the work is strongest.</h2>
        </div>
        <ul class="tag-list">
          ${profile.focus.map((item) => `<li class="tag">${esc(item)}</li>`).join("")}
        </ul>
      </div>
      <div class="edge-grid">
        ${profile.edge.map(edgeCard).join("")}
      </div>
      <div class="experience-list">
        ${profile.experience.map((item) => `<div class="experience-item"><div class="period">${esc(item.period)}</div><div><h3>${esc(item.role)}</h3><p>${esc(item.body)}</p></div></div>`).join("")}
      </div>
    </div>
  </section>
  <section class="section alt">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Research</p>
          <h2>Published machine-learning research behind the systems work.</h2>
        </div>
        <p>Doctoral work on ensemble optimization and medical image classification established the research habits that still matter in production AI: controlled comparison, reproducibility, and careful claims about model behavior.</p>
      </div>
      <div class="publication-list">
        ${profile.publications.map((item) => `<div class="publication-item"><div class="period">${esc(item.venue)}</div><div><h3><a href="${item.url}" target="_blank" rel="noopener">${esc(item.title)}</a></h3></div></div>`).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Method</p>
          <h2>Principles I use to judge AI systems.</h2>
        </div>
        <ul class="principle-list">
          ${profile.principles.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </div>
    </div>
  </section>
</main>`
  });
}

function arabicPage() {
  return layout({
    title: profileAr.name,
    description: profileAr.headline,
    pathName: "/ar/",
    current: "arabic",
    lang: "ar",
    dir: "rtl",
    schema: personSchema("ar"),
    body: `<main>
  <section class="hero compact">
    <div class="wrap hero-grid">
      <div>
        <p class="eyebrow">${arInline(profileAr.byline)}</p>
        <h1>${arInline(profileAr.title)}</h1>
        <p class="lead">${arInline(profileAr.headline)}</p>
        <dl class="hero-facts">
          <div><dt>المجال</dt><dd>${arInline(profileAr.availability)}</dd></div>
          <div><dt>الموقع</dt><dd>${arInline(profileAr.location)}</dd></div>
        </dl>
      </div>
      <aside>
        <div class="portrait-frame">
          <img class="portrait" src="/assets/eid-alkhaldi.jpg" alt="${esc(profileAr.name)}">
        </div>
        <div class="side-note">
          <strong>${arInline(profileAr.coreIdea.heading)}</strong>
          <span>${arInline(profileAr.coreIdea.body)}</span>
        </div>
      </aside>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${arInline(profileAr.about.heading)}</p>
          <h2>${arInline(profileAr.about.tagline)}</h2>
        </div>
        <p>${arInline(profileAr.about.body)}</p>
      </div>
      <div class="edge-grid">
        ${profileAr.edge.map(edgeCardAr).join("")}
      </div>
    </div>
  </section>
  <section class="section alt">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${arInline(profileAr.experience.heading)}</p>
          <h2>${arInline(profileAr.experience.tagline)}</h2>
        </div>
        <p>${arInline(profileAr.experience.body)}</p>
      </div>
      <div class="proof-grid">
        ${profileAr.proof.map((item) => `<div class="card proof-card"><strong>${arInline(item.value)}</strong><p>${arInline(item.label)}</p></div>`).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${arInline(profileAr.focusHeading)}</p>
          <h2>${arInline(profileAr.focusTagline)}</h2>
        </div>
        <ul class="tag-list">
          ${profileAr.focus.map((item) => `<li class="tag">${arInline(item)}</li>`).join("")}
        </ul>
      </div>
    </div>
  </section>
</main>`
  });
}

function blogPage(posts) {
  return layout({
    title: "Essays",
    description: "Essays by Eid Alkhaldi on agentic AI, RAG, MCP, Arabic-English evaluation, insurance automation, and AI governance.",
    pathName: "/blog/",
    current: "blog",
    body: `<main>
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Essays</p>
      <h1>Production AI, retrieval, agents, and Arabic-English enterprise systems.</h1>
      <p class="lead">A technical archive on evaluation, governance, tool use, retrieval discipline, and the institutional controls around AI.</p>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="post-grid">
        ${posts.map(postCard).join("")}
      </div>
    </div>
  </section>
</main>`
  });
}

function fieldNotePage(note) {
  const pathName = `/field-notes/${note.slug}/`;
  return layout({
    title: note.title,
    description: note.summary,
    pathName,
    current: "home",
    body: `<main>
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">${esc(note.eyebrow)}</p>
      <h1>${esc(note.title)}</h1>
      <p class="lead">${esc(note.summary)}</p>
      <dl class="hero-facts note-facts">
        <div><dt>Date</dt><dd>${esc(formatDate(note.date))}</dd></div>
        <div><dt>Location</dt><dd>${esc(note.location)}</dd></div>
        <div><dt>Role</dt><dd>${esc(note.role)}</dd></div>
      </dl>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="note-layout">
        <div class="note-copy">
          ${note.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
        </div>
        <aside class="note-themes">
          <p class="eyebrow">Discussion themes</p>
          <ul class="principle-list">
            ${note.themes.map((theme) => `<li>${esc(theme)}</li>`).join("")}
          </ul>
        </aside>
      </div>
    </div>
  </section>
  <section class="section alt">
    <div class="wrap">
      <div class="gallery-grid">
        ${note.images.map(noteImage).join("")}
      </div>
    </div>
  </section>
</main>`
  });
}

function articlePage(post) {
  const pathName = `/blog/posts/${post.slug}/`;
  return layout({
    title: post.title,
    description: post.excerpt,
    pathName,
    current: "blog",
    schema: articleSchema(post, pathName),
    body: `<main>
  <article class="article">
    <p class="eyebrow">Essay</p>
    <h1>${esc(post.title)}</h1>
    <p class="meta"><time datetime="${esc(post.generated)}">${esc(formatDate(post.generated))}</time></p>
    <ul class="tag-list">
      ${post.tags.map((tag) => `<li class="tag">${esc(tag)}</li>`).join("")}
    </ul>
    <div class="article-body">
      ${postBody(post.body)}
    </div>
  </article>
</main>`
  });
}

function notFoundPage() {
  return layout({
    title: "Page not found",
    description: "The requested page could not be found.",
    pathName: "/404.html",
    body: `<main>
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">404</p>
      <h1>This page is not here anymore.</h1>
      <p class="lead">The site was rebuilt around a cleaner professional record and essay archive.</p>
      <div class="hero-actions">
        <a class="button" href="/">Go home</a>
        <a class="button secondary" href="/blog/">All essays</a>
      </div>
    </div>
  </section>
</main>`
  });
}

function redirectPage(target) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${target}">
  <title>Redirecting</title>
</head>
<body>
  <p><a href="${target}">Continue</a></p>
</body>
</html>
`;
}

function projectCard(project) {
  return `<article class="card">
    <p class="meta">${esc(project.eyebrow)}</p>
    <h3>${esc(project.title)}</h3>
    <p>${esc(project.body)}</p>
  </article>`;
}

function featuredFieldNote(note) {
  const image = note.images[0];
  return `<section class="section alt">
    <div class="wrap">
      <div class="feature-note">
        <figure class="feature-media">
          <img src="${esc(image.src)}" alt="${esc(image.alt)}">
        </figure>
        <div class="feature-copy">
          <p class="eyebrow">${esc(note.eyebrow)}</p>
          <h2>${esc(note.title)}</h2>
          <p>${esc(note.summary)}</p>
          <a class="button" href="/field-notes/${esc(note.slug)}/">Read field note</a>
        </div>
      </div>
    </div>
  </section>`;
}

function edgeCard(item) {
  return `<article class="card edge-card">
    <h3>${esc(item.title)}</h3>
    <p>${esc(item.body)}</p>
  </article>`;
}

function edgeCardAr(item) {
  return `<article class="card edge-card">
    <h3>${arInline(item.title)}</h3>
    <p>${arInline(item.body)}</p>
  </article>`;
}

function noteImage(image) {
  return `<figure class="gallery-item">
    <img src="${esc(image.src)}" alt="${esc(image.alt)}">
    <figcaption>${esc(image.caption)}</figcaption>
  </figure>`;
}

function postCard(post) {
  return `<a class="card post-card" href="/blog/posts/${post.slug}/">
    <span>
      <span class="meta">${esc(formatDate(post.generated))}</span>
      <h3>${esc(post.title)}</h3>
      <p>${esc(post.excerpt)}</p>
    </span>
    <span class="tags">${post.tags.map((tag) => `<span class="mini-tag">${esc(tag)}</span>`).join("")}</span>
  </a>`;
}

function postBody(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p dir="auto">${inlineMarkdown(paragraph)}</p>`)
    .join("\n");
}

function inlineMarkdown(value) {
  return esc(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(^|\s)#([A-Za-z][A-Za-z0-9_]*)/g, '$1<span class="hash">#$2</span>');
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function arInline(value) {
  return esc(value).replace(/\b([A-Za-z0-9]+(?:\/[A-Za-z0-9]+)*)\b/g, "<bdi>$1</bdi>");
}

function personSchema(lang = "en") {
  const isArabic = lang === "ar";
  const json = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: isArabic ? profileAr.name : profile.name,
    jobTitle: isArabic ? profileAr.title : profile.title,
    image: `${SITE_URL}/assets/eid-alkhaldi.jpg`,
    url: SITE_URL,
    sameAs: profile.links.map((link) => link.url),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Riyadh",
      addressCountry: "Saudi Arabia"
    },
    knowsAbout: isArabic ? profileAr.focus : profile.focus
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function articleSchema(post, pathName) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.generated,
    dateModified: post.generated,
    author: {
      "@type": "Person",
      name: profile.name
    },
    mainEntityOfPage: `${SITE_URL}${pathName}`,
    keywords: post.tags.join(", ")
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function robots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function sitemap(posts) {
  const staticPages = [
    { url: "/", updated: new Date().toISOString() },
    { url: "/about/", updated: new Date().toISOString() },
    { url: "/ar/", updated: new Date().toISOString() },
    { url: "/blog/", updated: posts[0]?.generated || new Date().toISOString() },
    ...fieldNotes.map((note) => ({ url: `/field-notes/${note.slug}/`, updated: `${note.date}T00:00:00` }))
  ];
  const postPages = posts.map((post) => ({
    url: `/blog/posts/${post.slug}/`,
    updated: post.generated
  }));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...postPages]
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${new Date(page.updated).toISOString()}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

function rss(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(profile.shortName)} - Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>${esc(profile.headline)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/index.xml" rel="self" type="application/rss+xml" />
${posts
  .map((post) => {
    const url = `${SITE_URL}/blog/posts/${post.slug}/`;
    return `    <item>
      <title>${esc(post.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(post.generated).toUTCString()}</pubDate>
      <description>${esc(post.excerpt)}</description>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;
}

function searchIndex(posts) {
  return (
    JSON.stringify(
      [
        ...fieldNotes.map((note) => ({
          title: note.title,
          url: `/field-notes/${note.slug}/`,
          date: `${note.date}T00:00:00`,
          tags: ["Insurance", "Digital Transformation", "AI"],
          excerpt: note.summary
        })),
        ...posts.map((post) => ({
          title: post.title,
          url: `/blog/posts/${post.slug}/`,
          date: post.generated,
          tags: post.tags,
          excerpt: post.excerpt
        }))
      ],
      null,
      2
    ) + "\n"
  );
}
