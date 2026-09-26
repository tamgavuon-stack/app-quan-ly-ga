import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  formatCurrency,
  formatDate,
  filterByPeriod,
  periodTitle,
  summarize,
  type Period,
  useFarmStore,
} from "@/lib/farm-store";

const periodOptions: { key: Period; label: string }[] = [
  { key: "month", label: "Tháng" },
  { key: "quarter", label: "Quý" },
  { key: "year", label: "Năm" },
];

function kindLabel(kind: string) {
  if (kind === "expense") return "Chi phí";
  if (kind === "income") return "Doanh thu";
  return "Đàn gà";
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { records, hydrated } = useFarmStore();
  const [period, setPeriod] = useState<Period>("month");
  const filtered = useMemo(() => filterByPeriod(records, period), [records, period]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const profit = summary.income - summary.expense;
  const flock = useMemo(
    () => records.filter((record) => record.kind === "flock").reduce((total, record) => total + (record.quantity ?? 0), 0),
    [records],
  );
  const recent = records.slice(0, 5);

  const header = (
    <View>
      <View style={styles.topbar}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>SỔ TAY TRANG TRẠI</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Chào bà con 👋</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Theo dõi đàn gà, dòng tiền thật gọn.</Text>
        </View>
        <Pressable onPress={() => router.push("/sync")} style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
          <IconSymbol name="cloud.fill" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.periodBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {periodOptions.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => setPeriod(option.key)}
            style={[styles.periodChip, period === option.key && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.periodText, { color: period === option.key ? "#FFFFFF" : colors.muted }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>KẾT QUẢ {periodTitle(period).toUpperCase()}</Text>
            <Text style={styles.heroAmount}>{formatCurrency(profit)}</Text>
            <Text style={styles.heroCaption}>{profit >= 0 ? "Đang có lãi" : "Đang cần kiểm soát chi phí"}</Text>
          </View>
          <View style={styles.profitIcon}>
            <IconSymbol name={profit >= 0 ? "arrow.up.right" : "arrow.down.right"} size={28} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroFoot}>
          <View><Text style={styles.heroSmall}>Doanh thu</Text><Text style={styles.heroSmallValue}>{formatCurrency(summary.income)}</Text></View>
          <View><Text style={styles.heroSmall}>Chi phí</Text><Text style={styles.heroSmallValue}>{formatCurrency(summary.expense)}</Text></View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricIcon, { backgroundColor: colors.warning + "20" }]}><IconSymbol name="cart.fill" size={19} color={colors.warning} /></View>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>Chi phí kỳ này</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{formatCurrency(summary.expense)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricIcon, { backgroundColor: colors.success + "20" }]}><IconSymbol name="bird.fill" size={19} color={colors.success} /></View>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>Tổng đàn hiện có</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{flock.toLocaleString("vi-VN")} con</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ghi nhanh</Text>
        <Text style={[styles.sectionHint, { color: colors.muted }]}>Chọn loại giao dịch</Text>
      </View>
      <View style={styles.quickGrid}>
        <QuickAction title="Thêm chi phí" icon="arrow.down.circle.fill" tint={colors.warning} onPress={() => router.push({ pathname: "/add", params: { kind: "expense" } })} colors={colors} />
        <QuickAction title="Ghi doanh thu" icon="arrow.up.circle.fill" tint={colors.success} onPress={() => router.push({ pathname: "/add", params: { kind: "income" } })} colors={colors} />
        <QuickAction title="Cập nhật đàn" icon="bird.fill" tint={colors.primary} onPress={() => router.push({ pathname: "/add", params: { kind: "flock" } })} colors={colors} />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Giao dịch gần đây</Text>
        <Pressable onPress={() => router.push("/records")}><Text style={[styles.seeAll, { color: colors.primary }]}>Xem tất cả</Text></Pressable>
      </View>
      {!hydrated && <Text style={[styles.empty, { color: colors.muted }]}>Đang tải dữ liệu…</Text>}
    </View>
  );

  return (
    <ScreenContainer className="px-5 pt-3">
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>Chưa có giao dịch. Hãy bắt đầu bằng một ghi nhanh.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.transaction, { borderBottomColor: colors.border }]}>
            <View style={[styles.transactionIcon, { backgroundColor: (item.kind === "expense" ? colors.warning : item.kind === "income" ? colors.success : colors.primary) + "18" }]}>
              <IconSymbol name={item.kind === "expense" ? "arrow.down" : item.kind === "income" ? "arrow.up" : "bird.fill"} size={18} color={item.kind === "expense" ? colors.warning : item.kind === "income" ? colors.success : colors.primary} />
            </View>
            <View style={styles.transactionMain}><Text style={[styles.transactionTitle, { color: colors.foreground }]}>{item.category}</Text><Text style={[styles.transactionMeta, { color: colors.muted }]}>{kindLabel(item.kind)} · {formatDate(item.date)}</Text></View>
            <Text style={[styles.transactionAmount, { color: item.kind === "expense" ? colors.warning : item.kind === "income" ? colors.success : colors.primary }]}>{item.kind === "flock" ? `${(item.quantity ?? 0).toLocaleString("vi-VN")} con` : `${item.kind === "expense" ? "-" : "+"}${formatCurrency(item.amount)}`}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

function QuickAction({ title, icon, tint, onPress, colors }: { title: string; icon: any; tint: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: tint + "18" }]}><IconSymbol name={icon} size={23} color={tint} /></View>
      <Text style={[styles.quickText, { color: colors.foreground }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  eyebrow: { fontSize: 11, letterSpacing: 1.3, fontWeight: "800", marginBottom: 5 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  periodBar: { flexDirection: "row", padding: 4, borderRadius: 13, borderWidth: 1, marginBottom: 16 },
  periodChip: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  periodText: { fontSize: 13, fontWeight: "700" },
  hero: { borderRadius: 22, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: { color: "#D3F3E3", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  heroAmount: { color: "#FFFFFF", fontSize: 30, lineHeight: 38, fontWeight: "900", marginTop: 7 },
  heroCaption: { color: "#D3F3E3", fontSize: 13, marginTop: 2 },
  profitIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.22)", marginVertical: 17 },
  heroFoot: { flexDirection: "row", gap: 36 },
  heroSmall: { color: "#BFEBD5", fontSize: 12, marginBottom: 3 },
  heroSmallValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  metricCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  metricLabel: { fontSize: 11, marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: "800" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionHint: { fontSize: 12 },
  seeAll: { fontSize: 13, fontWeight: "700" },
  quickGrid: { flexDirection: "row", gap: 9, marginBottom: 25 },
  quickAction: { flex: 1, minHeight: 96, borderRadius: 17, borderWidth: 1, padding: 12, justifyContent: "space-between" },
  quickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickText: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  transaction: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  transactionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  transactionMain: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: "700" },
  transactionMeta: { fontSize: 11, marginTop: 3 },
  transactionAmount: { fontSize: 13, fontWeight: "800", marginLeft: 8 },
  empty: { textAlign: "center", fontSize: 13, paddingVertical: 18, lineHeight: 20 },
});
