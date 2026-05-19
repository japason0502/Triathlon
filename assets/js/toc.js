// 記事内の H2 / H3 / H4 を拾って <details> 形式の目次を挿入する。
// blog post テンプレ (build_blog_manifest.py の _md_to_post_html) と
// 手書き .html 記事から <script src="../../assets/js/toc.js" defer> で読み込む前提。
(function () {
  var body = document.querySelector("article.post .post-body");
  if (!body) return;

  var headings = body.querySelectorAll("h2, h3, h4");
  if (headings.length < 2) return;

  headings.forEach(function (h, i) {
    if (!h.id) h.id = "sec-" + (i + 1);
  });

  var details = document.createElement("details");
  details.className = "post-toc";
  details.open = true;

  var summary = document.createElement("summary");
  summary.textContent = "目次";
  details.appendChild(summary);

  var ul = document.createElement("ul");
  headings.forEach(function (h) {
    var li = document.createElement("li");
    li.className = "post-toc-" + h.tagName.toLowerCase();
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ul.appendChild(li);
  });
  details.appendChild(ul);

  var header = document.querySelector("article.post .post-header");
  if (header && header.parentNode) {
    header.parentNode.insertBefore(details, header.nextSibling);
  } else {
    body.parentNode.insertBefore(details, body);
  }
})();
