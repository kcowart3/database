var SOVEREIGN_ENERGY_KEY = "sovereignEnergyPct";

function getSovereignEnergyPct() {
    var raw = localStorage.getItem(SOVEREIGN_ENERGY_KEY);
    if (raw === null) {
        return 7;
    }
    var n = parseInt(raw, 10);
    if (isNaN(n)) {
        return 7;
    }
    return Math.max(0, Math.min(100, n));
}

function syncDiagnosticEnergyPct() {
    if (typeof jQuery === "undefined") {
        var el = document.getElementById("diagEnergyPct");
        if (el) {
            el.textContent = getSovereignEnergyPct() + "%";
        }
        return;
    }
    var $el = jQuery("#diagEnergyPct");
    if ($el.length) {
        $el.text(getSovereignEnergyPct() + "%");
    }
}

if (typeof jQuery === "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncDiagnosticEnergyPct);
    } else {
        syncDiagnosticEnergyPct();
    }
} else {
jQuery(document).ready(function () {
    $("#button").hover(function () {
        $(".container1").toggleClass("color");
    });

    if (!$("body").hasClass("landing")) {
        return;
    }

    syncDiagnosticEnergyPct();
    $(window).on("storage", function (e) {
        if (e.originalEvent.key === SOVEREIGN_ENERGY_KEY) {
            syncDiagnosticEnergyPct();
        }
    });

    var $nav = $(".diag-rows");
    var $bar = $(".diag-bar");
    var $fill = $(".diag-bar-fill");
    var $links = $(".diag-link");
    var $lastPointerLink = null;

    function setBarFillForLink($link) {
        if (!$link.length || !$nav.length || !$bar.length || !$fill.length) {
            return;
        }
        var barEl = $bar[0];
        var linkEl = $link[0];
        var barRect = barEl.getBoundingClientRect();
        var linkRect = linkEl.getBoundingClientRect();
        var h = barRect.bottom - linkRect.bottom;
        if (h < 0) {
            h = 0;
        }
        var maxH = barRect.height;
        if (h > maxH) {
            h = maxH;
        }
        $fill.css("height", h + "px");
    }

    function clearBarFill() {
        $fill.css("height", "0");
    }

    $links.on("mouseenter", function () {
        $lastPointerLink = $(this);
        setBarFillForLink($lastPointerLink);
    });

    $links.on("mouseleave", function (e) {
        var to = e.relatedTarget;
        if (to && $nav[0].contains(to) && $(to).hasClass("diag-link")) {
            return;
        }
        $lastPointerLink = null;
        clearBarFill();
    });

    $links.on("focus", function () {
        setBarFillForLink($(this));
    });

    $nav.on("focusout", function (e) {
        if (!e.relatedTarget || !$nav[0].contains(e.relatedTarget)) {
            clearBarFill();
        }
    });

    $(window).on("resize", function () {
        if ($lastPointerLink && $lastPointerLink.length) {
            setBarFillForLink($lastPointerLink);
            return;
        }
        var el = document.activeElement;
        if (el && el.classList && el.classList.contains("diag-link")) {
            setBarFillForLink($(el));
        }
    });
});
}