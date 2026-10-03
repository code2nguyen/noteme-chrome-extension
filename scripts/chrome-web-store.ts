// Chrome Web Store API v2 client used by the release workflow (v1.1 stops working on 15 October 2026).
// Plain Node (type stripping, no dependencies), so the publish job runs it without `npm ci`.
//
//   node scripts/chrome-web-store.ts upload <zip> [--expect-version <x.y.z>]
//   node scripts/chrome-web-store.ts publish [--staged]
//   node scripts/chrome-web-store.ts status
//
// Reads CWS_ACCESS_TOKEN (OAuth token with the chromewebstore scope), CWS_PUBLISHER_ID and CWS_ITEM_ID.

import { readFile } from 'node:fs/promises';

export const API = 'https://chromewebstore.googleapis.com';

export interface Store {
  publisherId: string;
  itemId: string;
  token: string;
  fetch?: typeof fetch;
  /** Waits between status polls while the store processes an upload. */
  sleep?: (ms: number) => Promise<void>;
}

export type UploadState = 'SUCCEEDED' | 'IN_PROGRESS' | 'FAILED' | 'NOT_FOUND' | 'UPLOAD_STATE_UNSPECIFIED';

export interface UploadResponse {
  name?: string;
  itemId?: string;
  crxVersion?: string;
  uploadState?: UploadState;
}

export interface StatusResponse {
  lastAsyncUploadState?: UploadState;
  submittedItemRevisionStatus?: unknown;
  publishedItemRevisionStatus?: unknown;
  takenDown?: boolean;
  warned?: boolean;
}

export interface PublishResponse {
  name?: string;
  itemId?: string;
  state?: string;
}

const item = (store: Store) => `publishers/${store.publisherId}/items/${store.itemId}`;

async function call<T>(
  store: Store,
  method: 'GET' | 'POST',
  url: string,
  init: { body?: BodyInit; type?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${store.token}` };
  if (init.type) {
    headers['Content-Type'] = init.type;
  }
  const response = await (store.fetch ?? fetch)(url, { method, headers, body: init.body });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export function status(store: Store): Promise<StatusResponse> {
  return call(store, 'GET', `${API}/v2/${item(store)}:fetchStatus`);
}

/**
 * Uploads a new package and waits until the store has processed it. Large packages come back `IN_PROGRESS`; the
 * item's status then reports the upload's outcome.
 */
export async function upload(store: Store, zip: Uint8Array<ArrayBuffer>, attempts = 30): Promise<UploadResponse> {
  const result = await call<UploadResponse>(store, 'POST', `${API}/upload/v2/${item(store)}:upload`, {
    body: zip,
    type: 'application/zip',
  });
  let state = result.uploadState;
  const sleep = store.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 0; state === 'IN_PROGRESS' && attempt < attempts; attempt++) {
    await sleep(2000);
    state = (await status(store)).lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') {
    throw new Error(`Upload ended in state ${state ?? 'unknown'}: ${JSON.stringify(result)}`);
  }
  return { ...result, uploadState: state };
}

/** Submits the uploaded package for review. Staged: once approved, it waits for a manual publish in the dashboard. */
export function publish(store: Store, { staged = false } = {}): Promise<PublishResponse> {
  return call(store, 'POST', `${API}/v2/${item(store)}:publish`, {
    body: JSON.stringify({ publishType: staged ? 'STAGED_PUBLISH' : 'DEFAULT_PUBLISH' }),
    type: 'application/json',
  });
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  const store: Store = {
    publisherId: env('CWS_PUBLISHER_ID'),
    itemId: env('CWS_ITEM_ID'),
    token: env('CWS_ACCESS_TOKEN'),
  };
  const option = (name: string) => {
    const index = rest.indexOf(name);
    return index === -1 ? undefined : rest[index + 1];
  };

  if (command === 'upload') {
    const path = rest[0];
    if (!path || path.startsWith('--')) {
      throw new Error('upload needs the path of the zip');
    }
    const result = await upload(store, await readFile(path));
    console.log(`Uploaded ${path}: version ${result.crxVersion ?? '?'}`);
    const expected = option('--expect-version');
    if (expected && result.crxVersion && result.crxVersion !== expected) {
      throw new Error(`The store read version ${result.crxVersion} from the package, expected ${expected}`);
    }
  } else if (command === 'publish') {
    const result = await publish(store, { staged: rest.includes('--staged') });
    console.log(`Submitted for review: ${result.state ?? JSON.stringify(result)}`);
  } else if (command === 'status') {
    console.log(JSON.stringify(await status(store), null, 2));
  } else {
    throw new Error(`Unknown command ${command ?? '(none)'}: use upload, publish or status`);
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
