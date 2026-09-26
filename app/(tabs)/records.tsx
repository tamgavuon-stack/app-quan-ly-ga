import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { formatCurrency, formatDate, removeRecord, type RecordKind, useFarmStore } from "@/lib/farm-store";

const filters: { key: "all" | RecordKind; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "expense", label: "Chi phí" },
  { key: "income", label: "Doanh thu" },
  { key: "flock", label: "Đàn gà" },
];

export default function RecordsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { records } = useFarmStore();
  const [filter, setFilter] = useState<"all" | RecordKind>("all");
  const data = useMemo(() => filter === "all" ? records : records.filter((record) => record.kind === filter), [records, filter]);

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.muted }]}>NHẬT KÝ TRANG TRẠI</Text><Text style={[styles.title, { color: colors.foreground }]}>Sổ giao dịch</Text></View><Pressable onPress={() => router.push("/add")} style={[styles.addButton, { backgroundColor: colors.primary }]}><IconSymbol name="plus" size={22} color="#FFFFFF" /></Pressable></View>
            <View style={styles.filterRow}>{filters.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: colors.border }, filter === item.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.filterText, { color: filter === item.key ? "#FFFFFF" : colors.muted }]}>{item.label}</Text></Pressable>)}</View>
            <Text style={[styles.count, { color: colors.muted }]}>{data.length} giao dịch được ghi nhận</Text>
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}><IconSymbol name="tray" size={28} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Chưa có dữ liệu</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Thêm chi phí, doanh thu hoặc cập nhật đàn để bắt đầu.</Text></View>}
        renderItem={({ item }) => {
          const tint = item.kind === "expense" ? colors.warning : item.kind === "income" ? colors.success : colors.primary;
          return <View style={[styles.row, { borderBottomColor: colors.border }]}><View style={[styles.iconBox, { backgroundColor: tint + "18" }]}><IconSymbol name={item.kind === "expense" ? "arrow.down" : item.kind === "income" ? "arrow.up" : "bird.fill"} size={18} color={tint} /></View><View style={styles.main}><Text style={[styles.category, { color: colors.foreground }]}>{item.category}</Text><Text style={[styles.meta, { color: colors.muted }]}>{formatDate(item.date)}{item.note ? ` · ${item.note}` : ""}</Text></View><View style={styles.right}><Text style={[styles.amount, { color: tint }]}>{item.kind === "flock" ? `${(item.quantity ?? 0).toLocaleString("vi-VN")} con` : `${item.kind === "expense" ? "-" : "+"}${formatCurrency(item.amount)}`}</Text><Pressable onPress={() => Alert.alert("Xóa giao dịch?", "Thao tác này không thể hoàn tác.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: () => removeRecord(item.id) }])} hitSlop={10}><IconSymbol name="trash" size={16} color={colors.muted} /></Pressable></View></View>;
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  title: { fontSize: 28, fontWeight: "900" },
  addButton: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 7, marginBottom: 12 },
  filterChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10 },
  filterText: { fontSize: 11, fontWeight: "800" },
  count: { fontSize: 12, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  iconBox: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  main: { flex: 1, minWidth: 0 },
  category: { fontSize: 14, fontWeight: "800" },
  meta: { fontSize: 11, marginTop: 4 },
  right: { alignItems: "flex-end", gap: 8, marginLeft: 8 },
  amount: { fontSize: 12, fontWeight: "900" },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 28 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 20 },
});
