import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addRecord, currentDateKey, expenseCategories, flockCategories, incomeCategories, type RecordKind } from "@/lib/farm-store";

const kindOptions: { key: RecordKind; label: string; icon: any }[] = [
  { key: "expense", label: "Chi phí", icon: "arrow.down.circle.fill" },
  { key: "income", label: "Doanh thu", icon: "arrow.up.circle.fill" },
  { key: "flock", label: "Đàn gà", icon: "bird.fill" },
];

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AddRecordScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ kind?: RecordKind }>();
  const initialKind = params.kind === "income" || params.kind === "flock" ? params.kind : "expense";
  const [kind, setKind] = useState<RecordKind>(initialKind);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const categories = useMemo(() => kind === "expense" ? expenseCategories : kind === "income" ? incomeCategories : flockCategories, [kind]);
  const tint = kind === "expense" ? colors.warning : kind === "income" ? colors.success : colors.primary;

  function switchKind(next: RecordKind) {
    setKind(next);
    setCategory("");
    setAmount("");
    setQuantity("");
  }

  async function save() {
    if (!category) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn một nhóm giao dịch.");
      return;
    }
    const parsedAmount = parseNumber(amount);
    const parsedQuantity = parseNumber(quantity);
    if (kind !== "flock" && parsedAmount <= 0) {
      Alert.alert("Kiểm tra số tiền", "Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }
    if (kind === "flock" && parsedQuantity <= 0) {
      Alert.alert("Kiểm tra số lượng", "Vui lòng nhập số lượng gà lớn hơn 0.");
      return;
    }
    addRecord({ kind, category, amount: kind === "flock" ? 0 : parsedAmount, quantity: parsedQuantity || undefined, unit: kind === "flock" ? "con" : undefined, note: note.trim() || undefined, date: currentDateKey() });
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}><IconSymbol name="chevron.left" size={24} color={colors.foreground} /></Pressable>
            <View style={styles.headerText}><Text style={[styles.title, { color: colors.foreground }]}>Ghi giao dịch</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Lưu ngay vào sổ trang trại</Text></View>
          </View>

          <View style={[styles.kindBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {kindOptions.map((option) => (
              <Pressable key={option.key} onPress={() => switchKind(option.key)} style={[styles.kindItem, kind === option.key && { backgroundColor: tint }]}>
                <IconSymbol name={option.icon} size={17} color={kind === option.key ? "#FFFFFF" : colors.muted} />
                <Text style={[styles.kindLabel, { color: kind === option.key ? "#FFFFFF" : colors.muted }]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>{kind === "flock" ? "Loại đàn" : "Nhóm giao dịch"}</Text>
          <View style={styles.chips}>
            {categories.map((item) => (
              <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, category === item && { backgroundColor: tint, borderColor: tint }]}>
                <Text style={[styles.chipText, { color: category === item ? "#FFFFFF" : colors.foreground }]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {kind !== "flock" ? <Field label="Số tiền (VNĐ)" value={amount} onChangeText={setAmount} placeholder="Ví dụ: 2.500.000" keyboardType="numeric" colors={colors} /> : <Field label="Số lượng (con)" value={quantity} onChangeText={setQuantity} placeholder="Ví dụ: 500" keyboardType="numeric" colors={colors} />}
          {kind === "flock" && <Text style={[styles.helper, { color: colors.muted }]}>Mỗi lần cập nhật sẽ cộng thêm vào tổng đàn để theo dõi biến động.</Text>}
          <Field label="Ghi chú (không bắt buộc)" value={note} onChangeText={setNote} placeholder={kind === "expense" ? "Nhà cung cấp, loại cám..." : kind === "income" ? "Khách hàng, đơn hàng..." : "Lứa, chuồng, ghi chú..."} colors={colors} multiline />

          <Pressable onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: tint }, pressed && styles.pressed]}>
            <IconSymbol name="checkmark" size={20} color="#FFFFFF" /><Text style={styles.saveText}>Lưu giao dịch</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, colors }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "numeric"; multiline?: boolean; colors: any }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} multiline={multiline} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }, multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(128,128,128,0.10)" },
  headerText: { marginLeft: 13 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 12, marginTop: 3 },
  kindBar: { flexDirection: "row", padding: 4, borderRadius: 15, borderWidth: 1, marginBottom: 24 },
  kindItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 11 },
  kindLabel: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 9 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12, fontWeight: "700" },
  field: { marginBottom: 18 },
  input: { minHeight: 51, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  multiline: { minHeight: 84, paddingTop: 14, textAlignVertical: "top" },
  helper: { fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 18 },
  saveButton: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 8 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
