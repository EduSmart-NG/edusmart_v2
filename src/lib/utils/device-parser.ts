/**
 * Device information parser utility
 * Parses User-Agent strings to extract browser, OS, and device information
 */

export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  isBot?: boolean;
}

/**
 * Parse User-Agent string to extract device information
 *
 * @param userAgent - User-Agent string from request
 * @returns Parsed device information
 */
export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return {
      deviceType: "unknown",
    };
  }

  const ua = userAgent.toLowerCase();

  // Check for bots first
  const isBot = /bot|crawler|spider|scraper|curl|wget/i.test(userAgent);

  // Detect device type
  const isMobile =
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua);
  const isTablet = /tablet|ipad|playbook|silk|kindle/i.test(ua);

  let deviceType: DeviceInfo["deviceType"] = "desktop";
  if (isTablet) {
    deviceType = "tablet";
  } else if (isMobile) {
    deviceType = "mobile";
  } else if (isBot) {
    deviceType = "unknown";
  }

  // Parse browser
  const browser = parseBrowser(ua);

  // Parse operating system
  const os = parseOS(ua);

  // Parse device
  const device = parseDevice(ua);

  return {
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    device: device,
    deviceType,
    isBot,
  };
}

/**
 * Parse browser information from User-Agent
 */
function parseBrowser(ua: string): { name?: string; version?: string } {
  let name: string | undefined;
  let version: string | undefined;

  // Chrome
  if (ua.includes("edg/")) {
    name = "Edge";
    const match = ua.match(/edg\/([\d.]+)/);
    version = match?.[1];
  }
  // Edge (older)
  else if (ua.includes("edge/")) {
    name = "Edge";
    const match = ua.match(/edge\/([\d.]+)/);
    version = match?.[1];
  }
  // Chrome
  else if (ua.includes("chrome/") && !ua.includes("edg")) {
    name = "Chrome";
    const match = ua.match(/chrome\/([\d.]+)/);
    version = match?.[1];
  }
  // Safari
  else if (ua.includes("safari/") && !ua.includes("chrome")) {
    name = "Safari";
    const match = ua.match(/version\/([\d.]+)/);
    version = match?.[1];
  }
  // Firefox
  else if (ua.includes("firefox/")) {
    name = "Firefox";
    const match = ua.match(/firefox\/([\d.]+)/);
    version = match?.[1];
  }
  // Opera
  else if (ua.includes("opr/") || ua.includes("opera/")) {
    name = "Opera";
    const match = ua.match(/(?:opr|opera)\/([\d.]+)/);
    version = match?.[1];
  }
  // Internet Explorer
  else if (ua.includes("trident/") || ua.includes("msie")) {
    name = "Internet Explorer";
    const match = ua.match(/(?:msie |rv:)([\d.]+)/);
    version = match?.[1];
  }
  // Samsung Internet
  else if (ua.includes("samsungbrowser/")) {
    name = "Samsung Internet";
    const match = ua.match(/samsungbrowser\/([\d.]+)/);
    version = match?.[1];
  }

  return { name, version };
}

/**
 * Parse operating system information from User-Agent
 */
function parseOS(ua: string): { name?: string; version?: string } {
  let name: string | undefined;
  let version: string | undefined;

  // Windows
  if (ua.includes("windows")) {
    name = "Windows";
    if (ua.includes("windows nt 10.0")) {
      version = "10/11";
    } else if (ua.includes("windows nt 6.3")) {
      version = "8.1";
    } else if (ua.includes("windows nt 6.2")) {
      version = "8";
    } else if (ua.includes("windows nt 6.1")) {
      version = "7";
    }
  }
  // macOS
  else if (ua.includes("mac os x")) {
    name = "macOS";
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) {
      version = match[1].replace(/_/g, ".");
    }
  }
  // iOS
  else if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    name = "iOS";
    const match = ua.match(/os ([\d_]+)/);
    if (match) {
      version = match[1].replace(/_/g, ".");
    }
  }
  // Android
  else if (ua.includes("android")) {
    name = "Android";
    const match = ua.match(/android ([\d.]+)/);
    version = match?.[1];
  }
  // Linux
  else if (ua.includes("linux")) {
    name = "Linux";
  }
  // Chrome OS
  else if (ua.includes("cros")) {
    name = "Chrome OS";
  }

  return { name, version };
}

/**
 * Parse device information from User-Agent
 */
function parseDevice(ua: string): string | undefined {
  // iPhone models
  if (ua.includes("iphone")) {
    return "iPhone";
  }
  // iPad models
  else if (ua.includes("ipad")) {
    return "iPad";
  }
  // Samsung devices
  else if (ua.includes("samsung")) {
    const match = ua.match(/samsung[- ]([a-z0-9]+)/i);
    return match ? `Samsung ${match[1].toUpperCase()}` : "Samsung";
  }
  // Pixel devices
  else if (ua.includes("pixel")) {
    const match = ua.match(/pixel ([\da-z]+)/i);
    return match ? `Google Pixel ${match[1]}` : "Google Pixel";
  }
  // Generic Android
  else if (ua.includes("android")) {
    return "Android Device";
  }
  // Mac
  else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    return "Mac";
  }
  // Windows PC
  else if (ua.includes("windows")) {
    return "Windows PC";
  }
  // Linux PC
  else if (ua.includes("linux")) {
    return "Linux PC";
  }

  return undefined;
}

/**
 * Format device information for display
 *
 * @param deviceInfo - Parsed device information
 * @returns Human-readable device description
 */
export function formatDeviceInfo(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];

  if (deviceInfo.isBot) {
    return "Bot/Crawler";
  }

  if (deviceInfo.browser) {
    parts.push(deviceInfo.browser);
  }

  if (deviceInfo.os) {
    parts.push(`on ${deviceInfo.os}`);
  }

  if (deviceInfo.device) {
    parts.push(`(${deviceInfo.device})`);
  } else if (deviceInfo.deviceType !== "unknown") {
    parts.push(`(${deviceInfo.deviceType})`);
  }

  return parts.length > 0 ? parts.join(" ") : "Unknown Device";
}

/**
 * Get device icon name based on device type
 * Useful for rendering device icons in UI
 *
 * @param deviceType - Device type
 * @returns Icon name (for lucide-react icons)
 */
export function getDeviceIcon(deviceType: DeviceInfo["deviceType"]): string {
  switch (deviceType) {
    case "mobile":
      return "Smartphone";
    case "tablet":
      return "Tablet";
    case "desktop":
      return "Monitor";
    default:
      return "HelpCircle";
  }
}

/**
 * Check if device is considered secure
 * (Modern browser with recent version)
 *
 * @param deviceInfo - Parsed device information
 * @returns Whether device is considered secure
 */
export function isSecureDevice(deviceInfo: DeviceInfo): boolean {
  if (deviceInfo.isBot) {
    return false;
  }

  const modernBrowsers = ["chrome", "firefox", "safari", "edge"];
  const browser = deviceInfo.browser?.toLowerCase();

  if (!browser || !modernBrowsers.includes(browser)) {
    return false;
  }

  // Check for minimum version (basic check)
  if (deviceInfo.browserVersion) {
    const majorVersion = parseInt(deviceInfo.browserVersion.split(".")[0]);

    // Rough minimum versions for modern security features
    const minimumVersions: Record<string, number> = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
    };

    const minVersion = minimumVersions[browser];
    if (minVersion && majorVersion < minVersion) {
      return false;
    }
  }

  return true;
}
