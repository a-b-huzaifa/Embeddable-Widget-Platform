const http = require('http');
const https = require('https');

const DEFAULT_TIMEOUT_MS = 2500;

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^.*:/, ''); // strip IPv6 prefix if present
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === 'localhost' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.')
  );
}

function fetchJsonWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP status code ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse JSON response: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Provider A: ip-api.com
 */
class IpApiProvider {
  constructor(baseUrl = process.env.GEO_PROVIDER_A_URL || 'http://ip-api.com/json') {
    this.name = 'ip-api.com';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async lookup(ip) {
    const url = `${this.baseUrl}/${encodeURIComponent(ip)}`;
    const data = await fetchJsonWithTimeout(url);

    if (data.status === 'fail') {
      throw new Error(`ip-api.com failed: ${data.message || 'Lookup failed'}`);
    }

    return {
      country: data.country || null,
      country_code: data.countryCode || null,
      city: data.city || null,
      region: data.regionName || data.region || null,
      latitude: data.lat || null,
      longitude: data.lon || null,
      provider: this.name
    };
  }
}

/**
 * Provider B: ipapi.co
 */
class IpApiCoProvider {
  constructor(baseUrl = process.env.GEO_PROVIDER_B_URL || 'https://ipapi.co') {
    this.name = 'ipapi.co';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async lookup(ip) {
    const url = `${this.baseUrl}/${encodeURIComponent(ip)}/json/`;
    const data = await fetchJsonWithTimeout(url);

    if (data.error) {
      throw new Error(`ipapi.co error: ${data.reason || 'Lookup error'}`);
    }

    return {
      country: data.country_name || null,
      country_code: data.country_code || null,
      city: data.city || null,
      region: data.region || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      provider: this.name
    };
  }
}

/**
 * GeoEnrichmentService with Pluggable Fallback Chain
 */
class GeoEnrichmentService {
  constructor(providers = [new IpApiProvider(), new IpApiCoProvider()]) {
    this.providers = providers;
  }

  async resolveIpGeo(ip, customProviders = null) {
    if (!ip || isPrivateOrLocalIp(ip)) {
      return null;
    }

    const providerList = customProviders || this.providers;

    for (const provider of providerList) {
      try {
        const geoData = await provider.lookup(ip);
        if (geoData && (geoData.country || geoData.city)) {
          return geoData;
        }
      } catch (err) {
        // Safe side effect: Log warning and continue to next provider in fallback chain
        console.warn(`[GeoService] Provider ${provider.name} failed for IP ${ip}: ${err.message}`);
      }
    }

    // Graceful degradation: All providers failed or timed out, return null without throwing
    return null;
  }
}

const defaultGeoService = new GeoEnrichmentService();

module.exports = {
  GeoEnrichmentService,
  IpApiProvider,
  IpApiCoProvider,
  isPrivateOrLocalIp,
  geoService: defaultGeoService,
  resolveIpGeo: defaultGeoService.resolveIpGeo.bind(defaultGeoService)
};
