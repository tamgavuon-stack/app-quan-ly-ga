import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { GOOGLE_DRIVE_SCOPE } from "@/lib/google-drive-client";
import { authenticateWithGoogleDrive } from "@/lib/google-oauth";
import { syncWithGoogleDrive } from "@/lib/google-drive-sync";
import { clearDriveToken, loadDriveToken, saveDriveToken, type OAuthToken } from "@/lib/sync-credentials";
import { useFarmStore } from "@/lib/farm-store";

const clientId = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? "";

export default function SyncScreen() {
  const colors = useColors();
  const router = useRouter();
  const { sync, deviceId } = useFarmStore();
  const [token, setToken] = useState<OAuthToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void loadDriveToken().then((value) => { setToken(value); setLoading(false); });
  }, []);

  const configured = Boolean(clientId);
  const connected = Boolean(token?.refreshToken || token?.accessToken);

  async function disconnect() {
    await clearDriveToken();
    setToken(null);
    Alert.alert("Đã ngắt kết nối", "Token Google Drive đã được xóa khỏi thiết bị này.");
  }

  async function startConnect() {
    if (!configured) {
      Alert.alert("Chưa có Client ID", "Hãy tạo OAuth Client cho ứng dụng Android trong Google Cloud Console, sau đó cấu hình EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID trước khi kết nối.");
      return;
    }
    setConnecting(true);
    try {
      const nextToken = await authenticateWithGoogleDrive(clientId);
      await saveDriveToken(nextToken);
      setToken(nextToken);
      Alert.alert("Đã kết nối", "Google Drive đã được kết nối. Dữ liệu sẽ được đồng bộ ở bước tiếp theo.");
    } catch (error) {
      Alert.alert("Không thể kết nối", error instanceof Error ? error.message : "Đã xảy ra lỗi khi đăng nhập Google.");
    } finally {
      setConnecting(false);
    }
  }

  async function syncNow() {
    if (!configured) {
      Alert.alert("Chưa cấu hình Google Drive", "Cấu hình Client ID trước khi bật đồng bộ thật. Dữ liệu hiện vẫn được lưu offline trên thiết bị.");
      return;
    }
    setConnecting(true);
    try {
      const result = await syncWithGoogleDrive(clientId);
      setToken(result.token);
      Alert.alert("Đồng bộ hoàn tất", `${result.uploaded ? "Đã cập nhật dữ liệu trên Google Drive." : "Đã nhận dữ liệu mới từ Google Drive."}${result.conflicts ? ` Phát hiện ${result.conflicts} xung đột cần xem lại.` : " Không có xung đột."}`);
    } catch (error) {
      Alert.alert("Đồng bộ thất bại", error instanceof Error ? error.message : "Không thể đồng bộ với Google Drive.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScreenContainer className="px-5 pt-3">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.left" size={24} color={colors.foreground} /></Pressable>
          <View style={{ flex: 1 }}><Text style={[styles.eyebrow, { color: colors.muted }]}>ĐỒNG BỘ DỮ LIỆU</Text><Text style={[styles.title, { color: colors.foreground }]}>Google Drive</Text></View>
          <View style={[styles.cloudIcon, { backgroundColor: colors.primary + "18" }]}><IconSymbol name="cloud.fill" size={23} color={colors.primary} /></View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : configured ? colors.warning : colors.muted }]} />
          <View style={{ flex: 1 }}><Text style={[styles.statusTitle, { color: colors.foreground }]}>{loading ? "Đang kiểm tra…" : connected ? "Đã kết nối Google Drive" : configured ? "Sẵn sàng kết nối" : "Chưa cấu hình"}</Text><Text style={[styles.statusText, { color: colors.muted }]}>{connected ? "Token được lưu an toàn trên thiết bị." : "Dữ liệu hiện vẫn được lưu offline."}</Text></View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Trạng thái dữ liệu</Text>
          <InfoRow label="Thiết bị" value={deviceId === "unknown-device" ? "Đang khởi tạo…" : deviceId.slice(0, 18)} colors={colors} />
          <InfoRow label="Thay đổi chờ đồng bộ" value={`${sync.pendingChanges} bản ghi`} colors={colors} />
          <InfoRow label="Lần đồng bộ cuối" value={sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString("vi-VN") : "Chưa đồng bộ"} colors={colors} />
          <InfoRow label="Phạm vi Google" value={GOOGLE_DRIVE_SCOPE.split("/").pop() ?? "drive.appdata"} colors={colors} />
        </View>

        <Pressable disabled={connecting} onPress={connected ? syncNow : startConnect} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, connecting && { opacity: 0.65 }, pressed && styles.pressed]}><IconSymbol name={connected ? "arrow.triangle.2.circlepath" : "cloud.fill"} size={20} color="#FFFFFF" /><Text style={styles.primaryText}>{connecting ? (connected ? "Đang đồng bộ…" : "Đang mở Google…") : connected ? "Đồng bộ ngay" : "Kết nối Google Drive"}</Text></Pressable>
        {connected && <Pressable onPress={disconnect} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.error }]}>Ngắt kết nối và xóa token</Text></Pressable>}

        <View style={[styles.note, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}><IconSymbol name="lightbulb.fill" size={20} color={colors.primary} /><Text style={[styles.noteText, { color: colors.foreground }]}>Google Drive chỉ lưu dữ liệu khi bạn cấp quyền. Bản ghi trên thiết bị vẫn dùng được khi không có mạng; đồng bộ sẽ được bổ sung ngay sau khi cấu hình Client ID.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  back: { width: 40, height: 40, justifyContent: "center" },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800" },
  title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 4 },
  cloudIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statusCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  statusDot: { width: 11, height: 11, borderRadius: 6, marginRight: 12 },
  statusTitle: { fontSize: 15, fontWeight: "800" },
  statusText: { fontSize: 12, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 7 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: "700", maxWidth: "55%", textAlign: "right" },
  primaryButton: { minHeight: 52, borderRadius: 15, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  secondaryText: { fontSize: 13, fontWeight: "700" },
  note: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 16, padding: 14 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
