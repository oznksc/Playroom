// Entry must initialize native modules before App / Skia load.
import "react-native-gesture-handler";
import "react-native-reanimated";

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
