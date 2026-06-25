/* Wermom first-party analytics beacon. Cookieless, async, fails silent, does not block render.
   Endpoint is filled at injection time (replace https://wermom-collect.wermom.workers.dev/p with the live Worker URL). */
(function () {
  try {
    var EP = "https://wermom-collect.wermom.workers.dev/p"; // e.g. https://wermom-collect.<subdomain>.workers.dev/p
    if (!EP || EP.indexOf("__") === 0) return; // not configured yet, do nothing
    var pick = function (key, sess) {
      try {
        var s = sess ? sessionStorage : localStorage;
        var v = s.getItem(key);
        if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); s.setItem(key, v); }
        return v;
      } catch (e) { return ""; }
    };
    var q = new URLSearchParams(location.search);
    var sid = pick("wm_sid", true);
    var vid = pick("wm_vid", false);
    var t0 = Date.now();
    var dwellSent = false;
    function body(update) {
      return JSON.stringify({
        site: location.hostname.replace(/^www\./, ""),
        path: location.pathname,
        referrer: document.referrer || "",
        session_id: sid,
        visitor_id: vid,
        utm_source: q.get("utm_source") || "",
        utm_medium: q.get("utm_medium") || "",
        utm_campaign: q.get("utm_campaign") || "",
        dwell_ms: update ? Date.now() - t0 : 0,
        u: update ? 1 : 0
      });
    }
    function send(update) {
      try {
        var b = body(update);
        if (update && navigator.sendBeacon) { navigator.sendBeacon(EP, b); return; }
        fetch(EP, { method: "POST", body: b, keepalive: true, mode: "cors",
          headers: { "Content-Type": "application/json" } }).catch(function () {});
      } catch (e) {}
    }
    send(false); // pageview on load
    function flush() { if (!dwellSent) { dwellSent = true; send(true); } } // dwell on leave
    addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
    addEventListener("pagehide", flush);
  } catch (e) {}
})();
