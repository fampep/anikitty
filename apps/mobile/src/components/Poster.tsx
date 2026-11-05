import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { colors } from "@/theme";

export function Poster({
  uri,
  style,
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
}) {
  if (!uri) {
    return <View style={[{ backgroundColor: colors.card }, style]} />;
  }
  return <Image source={{ uri }} style={[{ backgroundColor: colors.card }, style]} />;
}
