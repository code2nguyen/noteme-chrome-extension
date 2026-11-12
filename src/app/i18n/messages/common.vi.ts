import type { commonEn } from './common';
import type { Translation } from './types';

export const commonVi: Translation<typeof commonEn> = {
  'common.note': 'Ghi chú',
  'common.page': 'Giấy',
  'common.flow': 'Sơ đồ',
  'common.list': 'Việc cần làm',
  'common.sheet': 'Bảng tính',
  'common.notes': 'Ghi chú',
  'common.archive': 'Lưu trữ',
  'common.settings': 'Cài đặt',
  'common.cancel': 'Hủy',
  'common.undo': 'Hoàn tác',
  'omnibox.search': (query: string) => `Tìm ${query} trong Noteme`,
  'common.delete': 'Xóa',
  'common.loading': 'Đang tải…',
  'common.untitled.note': 'Ghi chú trống',
  'common.untitled.page': 'Giấy chưa đặt tên',
  'common.untitled.flow': 'Sơ đồ chưa đặt tên',
  'common.untitled.list': 'Việc cần làm chưa đặt tên',
  'common.untitled.sheet': 'Bảng tính chưa đặt tên',
  'common.nothingWritten': 'Chưa có nội dung.',
  'common.image.tooLarge': 'Ảnh quá lớn: tối đa 10 MB.',
  'common.image.notImage': 'Chỉ có thể dán hoặc thả ảnh vào đây.',
  'common.image.notSaved': 'Không thể lưu ảnh trên thiết bị này.',
};
