// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "list.bullet.rectangle": "format-list-bulleted",
  "chart.bar.fill": "bar-chart",
  "leaf.fill": "eco",
  "arrow.up.right": "north-east",
  "arrow.down.right": "south-east",
  "arrow.down.circle.fill": "arrow-downward",
  "arrow.up.circle.fill": "arrow-upward",
  "arrow.down": "arrow-downward",
  "arrow.up": "arrow-upward",
  "bird.fill": "flutter-dash",
  "cart.fill": "shopping-cart",
  "checkmark": "check",
  "plus": "add",
  "trash": "delete-outline",
  "tray": "inbox",
  "lightbulb.fill": "lightbulb-outline",
  "cloud.fill": "cloud",
  "arrow.triangle.2.circlepath": "sync",
  "tablecells.fill": "table-chart",
  "arrow.down.doc.fill": "file-download",
  "arrow.clockwise": "refresh",
} as IconMapping;

export function IconSymbol({ name, size = 24, color, style }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: SymbolWeight }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
