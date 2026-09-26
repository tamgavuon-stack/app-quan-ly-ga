# Farm Data Schema v2

## Mục tiêu

Schema v2 chuẩn hóa dữ liệu để app Android, app Windows và Google Drive có thể dùng chung một định dạng. Schema giữ tương thích với dữ liệu v1 đang lưu trong AsyncStorage.

## Các file code chính

- `shared/farm-schema.ts`: type, normalize và migration thuần dữ liệu.
- `lib/farm-store.ts`: lưu local, tạo metadata thiết bị, xóa mềm và báo cáo.
- `tests/farm-store.test.ts`: test migration, normalize, báo cáo và tombstone.

## FarmRecord

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---:|---|
| `id` | string | Có | ID ổn định của giao dịch |
| `kind` | `expense \| income \| flock` | Có | Chi phí, doanh thu hoặc cập nhật đàn |
| `category` | string | Có | Thức ăn, thuốc thú y, gà thịt... |
| `amount` | number | Có | Số tiền VNĐ; bản ghi đàn dùng 0 |
| `quantity` | number | Không | Số lượng gà/trứng nếu có |
| `unit` | string | Không | `con`, `quả`, `kg`... |
| `note` | string | Không | Ghi chú |
| `date` | `YYYY-MM-DD` | Có | Ngày nghiệp vụ |
| `createdAt` | ISO string | Có | Thời điểm tạo bản ghi |
| `updatedAt` | ISO string | Có | Thời điểm cập nhật gần nhất |
| `deviceId` | string | Có | Thiết bị tạo/cập nhật |
| `deletedAt` | ISO string | Không | Tombstone khi xóa mềm |

## FarmLocalEnvelope

```ts
{
  schemaVersion: 2,
  deviceId: "android-...",
  farmId: "quan-ly-chan-nuoi-ga",
  records: [],
  sync: {
    lastSyncedAt?: "...",
    remoteFileId?: "...",
    remoteRevision?: 12,
    pendingChanges: 3
  }
}
```

## FarmSyncDocument

Đây là dạng tài liệu sẽ được dùng khi tích hợp Google Drive:

```ts
{
  schemaVersion: 2,
  documentId: "quan-ly-chan-nuoi-ga",
  farmId: "quan-ly-chan-nuoi-ga",
  updatedAt: "2026-09-26T10:00:00.000Z",
  updatedBy: "windows-...",
  revision: 12,
  records: []
}
```

## Migration v1 → v2

1. App ưu tiên đọc `quan-ly-chan-nuoi-ga.local.v2`.
2. Nếu chưa có, app đọc `quan-ly-chan-nuoi-ga.records.v1`.
3. Mỗi record cũ được bổ sung `createdAt`, `updatedAt`, `deviceId`.
4. Dữ liệu được ghi sang key v2.
5. Key v1 chưa bị xóa để có đường lui trong giai đoạn kiểm thử.
6. Khi đồng bộ, chỉ record không có `deletedAt` được đưa vào báo cáo; record có `deletedAt` vẫn được giữ để thiết bị khác nhận biết thao tác xóa.

## Nguyên tắc cho giai đoạn đồng bộ

- Không xóa vật lý record trong dữ liệu đồng bộ.
- Dùng `id` để merge record giữa thiết bị.
- Dùng `updatedAt` để chọn phiên bản mới hơn trong xung đột đơn giản.
- Dùng `revision` của tài liệu để phát hiện ghi đè ngoài ý muốn.
- Tạo backup trước khi merge hoặc restore.
