// A short, human-readable name of the browser and system, sent with a check-in so the scan log can tell devices apart.
export function describeDevice(userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const ua = userAgent || "";
  const browser =
    /Edg\//.test(ua) ? "Edge"
      : /OPR\/|Opera/.test(ua) ? "Opera"
        : /Firefox\//.test(ua) ? "Firefox"
          : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
            : /Safari\//.test(ua) ? "Safari"
              : "Trình duyệt";
  const system =
    /Windows/.test(ua) ? "Windows"
      : /Android/.test(ua) ? "Android"
        : /iPhone|iPad|iPod/.test(ua) ? "iOS"
          : /Mac OS X|Macintosh/.test(ua) ? "macOS"
            : /Linux/.test(ua) ? "Linux"
              : "";
  return `Web ${browser}${system ? ` / ${system}` : ""}`.slice(0, 80);
}
