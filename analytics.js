(() => {
  if (location.hostname !== "globalreachfaculty.com") return;

  const measurementId = "G-1SBQTRSPFM";
  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  tag.referrerPolicy = "no-referrer";

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Keep referral domains and avoid collecting arbitrary URL parameters.
    page_location: location.origin + location.pathname,
    page_referrer: document.referrer ? new URL(document.referrer).origin : "",
  });

  document.head.append(tag);
})();
