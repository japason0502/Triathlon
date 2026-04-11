/**
 * Load blog/posts.json and render .post-card links. Newest date first (JSON order or sort).
 */
(function () {
  function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatJaDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }

  /**
   * @param {string} selector - container CSS selector
   * @param {{ manifestUrl: string, linkPrefix: string }} options
   */
  function renderBlogList(selector, options) {
    var manifestUrl = options.manifestUrl;
    var linkPrefix = options.linkPrefix || "";
    var el = document.querySelector(selector);
    if (!el) return;

    fetch(manifestUrl)
      .then(function (res) {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(function (data) {
        var posts = (data.posts || []).slice();
        posts.sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
        if (posts.length === 0) {
          el.innerHTML = '<p class="blog-list-empty">まだ記事がありません。</p>';
          return;
        }
        el.innerHTML = posts
          .map(function (p) {
            var href = linkPrefix + p.path;
            var label = formatJaDate(p.date);
            var desc = p.description
              ? '<p class="excerpt">' + escapeHtml(p.description) + "</p>"
              : "";
            return (
              '<a class="post-card" href="' +
              escapeHtml(href) +
              '">' +
              '<time datetime="' +
              escapeHtml(p.date) +
              '">' +
              escapeHtml(label) +
              "</time>" +
              "<h2>" +
              escapeHtml(p.title) +
              "</h2>" +
              desc +
              "</a>"
            );
          })
          .join("");
      })
      .catch(function () {
        el.innerHTML = '<p class="blog-list-error">記事一覧を読み込めませんでした。</p>';
      });
  }

  window.renderBlogList = renderBlogList;
})();
