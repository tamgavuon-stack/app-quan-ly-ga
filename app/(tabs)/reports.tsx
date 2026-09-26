import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { filterByPeriod, formatCurrency, periodTitle, summarize, type Period, useFarmStore } from "@/lib/farm-store";

const periods: { key: Period; label: string }[] = [{ key: "month", label: "Tháng" }, { key: "quarter", label: "Quý" }, { key: "year", label: "Năm" }];

export default function ReportsScreen() {
  const colors = useColors();
  const { records } = useFarmStore();
  const [period, setPeriod] = useState<Period>("month");
  const filtered = useMemo(() => filterByPeriod(records, period), [records, period]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const profit = summary.income - summary.expense;
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter((record) => record.kind !== "flock").forEach((record) => map.set(record.category, (map.get(record.category) ?? 0) + record.amount));
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filtered]);
  const max = Math.max(...byCategory.map((item) => item.amount), 1);

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={byCategory}
        keyExtractor={(item) => item.category}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View><Text style={[styles.eyebrow, { color: colors.muted }]}>PHÂN TÍCH DÒNG TIỀN</Text><Text style={[styles.title, { color: colors.foreground }]}>Báo cáo lãi / lỗ</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Theo dõi hiệu quả chăn nuôi rõ ràng hơn.</Text><View style={[styles.periodBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>{periods.map((item) => <Pressable key={item.key} onPress={() => setPeriod(item.key)} style={[styles.periodChip, period === item.key && { backgroundColor: colors.primary }]}><Text style={[styles.periodText, { color: period === item.key ? "#FFFFFF" : colors.muted }]}>{item.label}</Text></Pressable>)}</View><View style={[styles.resultCard, { backgroundColor: profit >= 0 ? colors.primary : colors.error }]}><Text style={styles.cardLabel}>{periodTitle(period).toUpperCase()}</Text><Text style={styles.cardValue}>{formatCurrency(profit)}</Text><Text style={styles.cardCaption}>{profit >= 0 ? "Lợi nhuận ròng" : "Lỗ ròng"}</Text><View style={styles.cardDivider} /><View style={styles.cardRow}><View><Text style={styles.smallLabel}>Tổng thu</Text><Text style={styles.smallValue}>{formatCurrency(summary.income)}</Text></View><View><Text style={styles.smallLabel}>Tổng chi</Text><Text style={styles.smallValue}>{formatCurrency(summary.expense)}</Text></View><View><Text style={styles.smallLabel}>Giao dịch</Text><Text style={styles.smallValue}>{filtered.length}</Text></View></View></View><View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cơ cấu theo nhóm</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>{byCategory.length} nhóm</Text></View>{byCategory.length === 0 && <View style={styles.empty}><IconSymbol name="chart.bar.fill" size={30} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>Chưa có số liệu trong kỳ này.</Text></View>}</View>}
        renderItem={({ item, index }) => { const tint = index % 2 === 0 ? colors.warning : colors.primary; return <View style={styles.barRow}><View style={styles.barLabels}><Text style={[styles.barCategory, { color: colors.foreground }]}>{item.category}</Text><Text style={[styles.barAmount, { color: colors.muted }]}>{formatCurrency(item.amount)}</Text></View><View style={[styles.track, { backgroundColor: colors.surface }]}><View style={[styles.bar, { backgroundColor: tint, width: `${Math.max(8, (item.amount / max) * 100)}%` }]} /></View></View>; }}
        ListFooterComponent={<View style={[styles.tip, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="lightbulb.fill" size={19} color={colors.warning} /><Text style={[styles.tipText, { color: colors.muted }]}>Mẹo: cập nhật giao dịch ngay sau mỗi lần mua cám, tiêm phòng hoặc xuất bán để báo cáo luôn sát thực tế.</Text></View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 5, marginBottom: 20 },
  periodBar: { flexDirection: "row", padding: 4, borderRadius: 13, borderWidth: 1, marginBottom: 16 },
  periodChip: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  periodText: { fontSize: 13, fontWeight: "800" },
  resultCard: { borderRadius: 22, padding: 20, marginBottom: 25 },
  cardLabel: { color: "#D3F3E3", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  cardValue: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", marginTop: 7 },
  cardCaption: { color: "#D3F3E3", fontSize: 13, marginTop: 1 },
  cardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.24)", marginVertical: 17 },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  smallLabel: { color: "#BFEBD5", fontSize: 11, marginBottom: 3 },
  smallValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionHint: { fontSize: 12 },
  barRow: { marginBottom: 15 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  barCategory: { fontSize: 13, fontWeight: "700" },
  barAmount: { fontSize: 12, fontWeight: "700" },
  track: { height: 9, borderRadius: 9, overflow: "hidden" },
  bar: { height: 9, borderRadius: 9 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28 },
  emptyText: { fontSize: 13 },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 15, borderWidth: 1, padding: 13, marginTop: 14 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
