/**
 * Launcher configuration — edit tiles here, redeploy with ./deploy.sh
 *
 * appId discovery: install the app, open this launcher, press 9 on the
 * remote. Every installed app and its exact appId is listed. Paste it in.
 *
 * shortcut: number key on the remote. 0 = reserved for Settings. "9" is
 * reserved for the appId debug overlay.
 */

const CONFIG = {
    /** true = weird things with the TV? a debug toast explains key handling */
    debugToasts: false,

    tiles: [
        {
            name: "Dropout",
            appId: "",            // ← fill in after pressing 9 (debug overlay)
            url: "",              // fallback: "" to use native app, or e.g. "https://www.dropout.tv/browse"
            shortcut: "1",
            text: "DROPOUT",      // shown until you add img/s/dropout.png
            // img: "img/dropout.png",
        },
        {
            name: "Disney+",
            appId: "",
            url: "",
            shortcut: "2",
            text: "Disney+",
        },
        {
            name: "YouTube",
            appId: "",            // native app — your Premium login stays as-is
            url: "",
            shortcut: "3",
            text: "YouTube",
        },
        {
            name: "YouTube TV",
            appId: "",
            url: "",
            shortcut: "4",
            text: "YouTube TV",
        },
        {
            name: "Max",
            appId: "",            // launches the NATIVE Max app: your HBO login & Up Next stay untouched
            url: "",
            shortcut: "5",
            text: "Max",
        },
        {
            name: "Apple TV",
            appId: "",
            url: "",
            shortcut: "6",
            text: "Apple TV+",
        },
        {
            name: "Spotify",
            appId: "",            // native app — Spotify Connect to Sonos works unchanged
            url: "",
            shortcut: "7",
            text: "Spotify",
        },
    ],

    /** screensaver: after idleMinutes with no remote input, fade to a
     *  fullscreen slideshow of img/savers/*.png (sorted). 0 disables. */
    screensaver: {
        idleMinutes: 5,
        secondsPerImage: 30,
        showClock: true,
    },

    /** ms for the "Launching…" overlay animation before launch fires */
    launchAnimationMs: 350,

    /** hard-coded, common Samsung/Tizen appIds from public launcher projects —
     *  verify each with the debug overlay before trusting. Empty = skip. */
    known: {
        youtube: "9HVLDgIots.youtube",
        netflix: "9nwRhOE3Y.TizenNetflix",
    },
};
