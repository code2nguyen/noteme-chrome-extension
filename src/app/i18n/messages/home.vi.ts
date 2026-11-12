import type { homeEn } from './home';
import type { Translation } from './types';

export const homeVi: Translation<typeof homeEn> = {
  'home.logo': 'Trang chủ Noteme',
  'home.plan': 'Kế hoạch',
  'home.search': 'Tìm trong ghi chú',
  'home.sites': 'Các trang bạn hay truy cập nhất',
  'home.sites.allow': 'Hiện các trang tôi hay truy cập nhất',
  'home.sites.later': 'Để sau',
  'home.photo.noteme': 'Ảnh của Noteme',
  'home.photo.by': (artist: string) => `Ảnh: ${artist}`,
  'home.clock.open': 'Mở ghi chú của tôi',
  'home.notes': 'Ghi chú của bạn',
  'home.notes.previous': 'Ghi chú trước',
  'home.notes.next': 'Ghi chú sau',
  'home.notes.slide': '{index}/{count}',
  'home.notes.open': (title: string) => `${title}, mở trong Ghi chú`,
  'home.notes.pinned': 'Đã ghim',
  'home.notes.none': 'Chưa có ghi chú nào được ghim. Ghim một ghi chú trong Ghi chú để thấy nó ở đây.',
};
