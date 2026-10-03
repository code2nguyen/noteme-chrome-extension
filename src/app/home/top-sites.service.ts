import { Injectable } from '@angular/core';

export interface Site {
  url: string;
  title: string;
  host: string;
  letter: string;
  icon?: string;
}

/** Optional: asked for only when the person turns shortcuts on, so updating Noteme triggers no permission warning. */
const PERMISSIONS: chrome.permissions.Permissions = { permissions: ['topSites', 'favicon'] };
const MAX_SITES = 8;

const hasPermissionsApi = () => typeof chrome !== 'undefined' && !!chrome.permissions;

export function toSite(url: string, title: string, iconBase?: string): Site {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // keep the raw url
  }
  const name = title?.trim() || host;
  return {
    url,
    host,
    title: name.length > 18 ? name.slice(0, 17).replace(/[\s.:|–-]+$/, '') + '…' : name,
    letter: (host[0] ?? '?').toUpperCase(),
    icon: iconBase ? `${iconBase}?pageUrl=${encodeURIComponent(url)}&size=64` : undefined,
  };
}

/** The person's most visited sites, through chrome.topSites, with icons from Chrome's favicon cache. */
@Injectable({ providedIn: 'root' })
export class TopSitesService {
  get supported(): boolean {
    return hasPermissionsApi();
  }

  async granted(): Promise<boolean> {
    return hasPermissionsApi() ? chrome.permissions.contains(PERMISSIONS) : false;
  }

  /** Must run inside a click: Chrome shows its permission prompt. */
  async request(): Promise<boolean> {
    return hasPermissionsApi() ? chrome.permissions.request(PERMISSIONS) : false;
  }

  async sites(): Promise<Site[]> {
    if (!(await this.granted()) || !chrome.topSites) {
      return [];
    }
    const iconBase = chrome.runtime.getURL('/_favicon/');
    const sites = await chrome.topSites.get();
    return sites.slice(0, MAX_SITES).map((site) => toSite(site.url, site.title, iconBase));
  }
}
