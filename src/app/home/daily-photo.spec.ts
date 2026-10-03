import { describe, expect, it } from 'vitest';
import {
  apodUrl,
  bundledPhoto,
  BUNDLED_PHOTO_COUNT,
  dayOfYear,
  localDay,
  parseApod,
  parseWikimediaFeed,
  resizeCommonsThumbnail,
  wikimediaFeedUrl,
} from './daily-photo';

const day = new Date(2026, 9, 3, 23, 30);

// Trimmed from a real api.wikimedia.org featured-feed answer.
const feed = {
  image: {
    title: 'File:Lake Bled.jpg',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake_Bled.jpg/640px-Lake_Bled.jpg',
      width: 640,
      height: 427,
    },
    image: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Lake_Bled.jpg', width: 6000, height: 4000 },
    file_page: 'https://commons.wikimedia.org/wiki/File:Lake_Bled.jpg',
    artist: { text: ' Jane Doe ' },
  },
};

describe('days', () => {
  it('uses the local calendar day', () => {
    expect(localDay(day)).toBe('2026-10-03');
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });
});

describe('bundledPhoto', () => {
  it('picks one of the shipped photos, a different one with an offset', () => {
    const photo = bundledPhoto(day);
    expect(photo.url).toMatch(/^assets\/bg\/bg-\d+-small\.jpg$/);
    expect(Number(photo.url.match(/bg-(\d+)/)![1])).toBeLessThan(BUNDLED_PHOTO_COUNT);
    expect(bundledPhoto(day, 1).url).not.toBe(photo.url);
  });
});

describe('Wikimedia', () => {
  it('builds the feed url for the day', () => {
    expect(wikimediaFeedUrl(day)).toBe('https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/10/03');
  });

  it('resizes thumbnails only', () => {
    expect(resizeCommonsThumbnail('https://x/commons/thumb/a/ab/F.jpg/640px-F.jpg')).toBe(
      'https://x/commons/thumb/a/ab/F.jpg/1920px-F.jpg',
    );
    expect(resizeCommonsThumbnail('https://x/commons/a/ab/F.jpg')).toBe('https://x/commons/a/ab/F.jpg');
  });

  it('reads a large picture as a 1920px thumbnail with its credit', () => {
    expect(parseWikimediaFeed(feed, day)).toEqual({
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake_Bled.jpg/1920px-Lake_Bled.jpg',
      credit: 'Photo by Jane Doe · Wikimedia Commons',
      link: 'https://commons.wikimedia.org/wiki/File:Lake_Bled.jpg',
      source: 'wikimedia',
      day: '2026-10-03',
    });
  });

  it('keeps a small original and survives a day without a picture', () => {
    const small = { image: { ...feed.image, image: { ...feed.image.image, width: 1200 } } };
    expect(parseWikimediaFeed(small, day)?.url).toBe(feed.image.image.source);
    expect(parseWikimediaFeed({ tfa: {} }, day)).toBeNull();
    expect(parseWikimediaFeed(null, day)).toBeNull();
  });
});

describe('NASA APOD', () => {
  it('builds the url and reads an image day', () => {
    expect(apodUrl(day)).toContain('date=2026-10-03');
    const photo = parseApod(
      {
        media_type: 'image',
        url: 'https://apod/s.jpg',
        hdurl: 'https://apod/l.jpg',
        title: 'M31',
        copyright: '\nAnn\n Lee ',
      },
      day,
    );
    expect(photo).toMatchObject({
      url: 'https://apod/l.jpg',
      credit: 'M31 · © Ann Lee · NASA APOD',
      link: 'https://apod.nasa.gov/apod/ap261003.html',
    });
  });

  it('skips video days', () => {
    expect(parseApod({ media_type: 'video', url: 'https://youtube' }, day)).toBeNull();
  });
});
