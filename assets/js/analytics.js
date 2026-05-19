// Google Analytics 4 (gtag.js) loader.
// 各ページの <head> で `<script src=".../assets/js/analytics.js"></script>` として読み込む。
(function () {
  var GA_ID = "G-6HHFMD2N40";

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", GA_ID);
})();
