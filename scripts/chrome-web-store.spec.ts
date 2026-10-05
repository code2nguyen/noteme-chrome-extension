import { describe, expect, it } from 'vitest';
import { API, checkUploadedVersion, publish, status, Store, upload } from './chrome-web-store';

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** A store whose fetch answers from a list of responses, recording each request. */
function fakeStore(...responses: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const store: Store = {
    publisherId: 'pub',
    itemId: 'item',
    token: 'token',
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    fetch: async (url, init) => {
      calls.push({
        method: init!.method!,
        url: String(url),
        headers: init!.headers as Record<string, string>,
        body: init!.body,
      });
      const next = responses.shift()!;
      return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
    },
  };
  return { store, calls, sleeps };
}

describe('chrome web store client', () => {
  it('uploads the zip to the v2 endpoint with the token', async () => {
    const { store, calls } = fakeStore({ body: { uploadState: 'SUCCEEDED', crxVersion: '3.0.1' } });
    const zip = new Uint8Array([1, 2, 3]);
    const result = await upload(store, zip);
    expect(result.crxVersion).toBe('3.0.1');
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe(`${API}/upload/v2/publishers/pub/items/item:upload`);
    expect(calls[0].headers).toEqual({ Authorization: 'Bearer token', 'Content-Type': 'application/zip' });
    expect(calls[0].body).toBe(zip);
  });

  it('waits for an upload the store is still processing', async () => {
    const { store, calls, sleeps } = fakeStore(
      { body: { uploadState: 'IN_PROGRESS' } },
      { body: { lastAsyncUploadState: 'IN_PROGRESS' } },
      { body: { lastAsyncUploadState: 'SUCCEEDED' } },
    );
    expect((await upload(store, new Uint8Array())).uploadState).toBe('SUCCEEDED');
    expect(calls.map((call) => call.url)).toEqual([
      `${API}/upload/v2/publishers/pub/items/item:upload`,
      `${API}/v2/publishers/pub/items/item:fetchStatus`,
      `${API}/v2/publishers/pub/items/item:fetchStatus`,
    ]);
    // A pause before each status poll, none after the last.
    expect(sleeps).toEqual([2000, 2000]);
  });

  it('gives up on an upload that stays in progress', async () => {
    const { store, sleeps } = fakeStore(
      { body: { uploadState: 'IN_PROGRESS' } },
      { body: { lastAsyncUploadState: 'IN_PROGRESS' } },
      { body: { lastAsyncUploadState: 'IN_PROGRESS' } },
    );
    await expect(upload(store, new Uint8Array(), 2)).rejects.toThrow('state IN_PROGRESS');
    expect(sleeps).toEqual([2000, 2000]);
  });

  it('checks the version the store read, and only warns when it read none', () => {
    expect(checkUploadedVersion('3.0.1', '3.0.1')).toBeUndefined();
    expect(() => checkUploadedVersion('3.0.0', '3.0.1')).toThrow('read version 3.0.0 from the package, expected 3.0.1');
    expect(checkUploadedVersion(undefined, '3.0.1')).toContain('did not report the uploaded version');
  });

  it('fails on a failed upload and on an HTTP error', async () => {
    await expect(upload(fakeStore({ body: { uploadState: 'FAILED' } }).store, new Uint8Array())).rejects.toThrow(
      'state FAILED',
    );
    await expect(status(fakeStore({ status: 403, body: { error: { message: 'denied' } } }).store)).rejects.toThrow(
      /failed with 403: .*denied/,
    );
  });

  it('submits for review, staged or not', async () => {
    const { store, calls } = fakeStore({ body: { state: 'PENDING_REVIEW' } }, { body: { state: 'PENDING_REVIEW' } });
    expect((await publish(store)).state).toBe('PENDING_REVIEW');
    await publish(store, { staged: true });
    expect(calls[0].url).toBe(`${API}/v2/publishers/pub/items/item:publish`);
    expect(JSON.parse(calls[0].body as string)).toEqual({ publishType: 'DEFAULT_PUBLISH' });
    expect(JSON.parse(calls[1].body as string)).toEqual({ publishType: 'STAGED_PUBLISH' });
  });
});
