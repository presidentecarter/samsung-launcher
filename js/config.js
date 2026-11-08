/**
 * Launcher configuration — edit tiles here, redeploy with tools/deploy.sh
 *
 * appIds: run tools/list-apps.sh to list every app installed on the TV with
 * its appId.
 *
 * Artwork per tile:
 *   logo  monochrome logo (white on transparent PNG/SVG in img/logos/),
 *         painted in the theme's accent colour when tileStyle is "logo"
 *   img   full-colour icon override
 *   (neither) the TV's own icon for that app, pulled automatically
 */

const CONFIG = {
    /** Omarchy theme to start with — any key of THEMES in js/themes.js.
     *  Import more with tools/sync-themes.py. The Theme button cycles them;
     *  the choice is remembered across power cycles. */
    theme: "jade-horse",

    /** "logo" = theme-coloured logos, "icon" = the apps' full-colour icons */
    tileStyle: "logo",

    tiles: [
        { name: "Dropout",    appId: "MjdLQbVh6K.Dropout",        logo: "img/logos/dropout.png" },
        { name: "Disney+",    appId: "MCmYXNxgcu.DisneyPlus",     logo: "img/logos/disneyplus.png" },
        { name: "YouTube",    appId: "9Ur5IzDKqV.TizenYouTube",   logo: "img/logos/youtube.svg",    img: "img/icons/youtube.svg" },
        { name: "YouTube TV", appId: "PvWgqxV3Xa.YouTubeTV",      logo: "img/logos/youtube-tv.svg", img: "img/icons/youtube-tv.svg" },
        { name: "HBO Max",    appId: "5b8c3eb16b.BeamCTVDev",     logo: "img/logos/hbomax.png" },
        { name: "Apple TV",   appId: "com.samsung.tv.aria-video", logo: "img/logos/appletv.png" },
        { name: "Spotify",    appId: "rJeHak5zRg.Spotify",        logo: "img/logos/spotify.png" },
    ],

    /** top-bar buttons (reach with Up from the tiles) */
    /** first one that launches wins (com.samsung.tv.store "launches" but
     *  shows nothing on this TV; org.volt.apps is the visible Apps panel) */
    appStoreIds: ["org.volt.apps", "com.samsung.tv.store"],
    settingsIds: ["org.tizen.menu", "com.samsung.tv.coba.setting"],

    /** screensaver: after idleMinutes with no remote input, fade to a
     *  fullscreen slideshow of the active theme's wallpapers. 0 disables.
     *  includeShared also mixes in img/savers/* (all-theme collection). */
    screensaver: {
        idleMinutes: 5,
        secondsPerImage: 30,
        showClock: true,
        includeShared: false,
    },

    /** ms for the "Launching…" overlay animation before launch fires */
    launchAnimationMs: 350,
};
