import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

/*
  Caelestia's motion tokens, as eases.
  v1 (niri fork, config/AppearanceConfig.qml) and v2 (plugin/.../tokens.hpp)
  share the curves; v2 adds the expressive spatial springs and makes them the
  default for drawers.
*/
const bez = (a, b, c, d) => `M0,0 C${a},${b} ${c},${d} 1,1`;

export const EASE = {
  // M3 "emphasized": two cubic segments
  emphasized: CustomEase.create("cl-emphasized", "M0,0 C0.05,0 0.133,0.06 0.166,0.4 0.208,0.82 0.25,1 1,1"),
  emphasizedDecel: CustomEase.create("cl-emphDecel", bez(0.05, 0.7, 0.1, 1)),
  emphasizedAccel: CustomEase.create("cl-emphAccel", bez(0.3, 0, 0.8, 0.15)),
  standard: CustomEase.create("cl-standard", bez(0.2, 0, 0, 1)),
  standardAccel: CustomEase.create("cl-standardAccel", bez(0.3, 0, 1, 1)),
  // expressive springs: these overshoot
  fastSpatial: CustomEase.create("cl-fastSpatial", bez(0.42, 1.67, 0.21, 0.9)),
  spatial: CustomEase.create("cl-spatial", bez(0.38, 1.21, 0.22, 1)),
  slowSpatial: CustomEase.create("cl-slowSpatial", bez(0.39, 1.29, 0.35, 0.98)),
  effects: CustomEase.create("cl-effects", bez(0.34, 0.8, 0.34, 1)),
};

// milliseconds → seconds
export const DUR = {
  small: 0.2,
  normal: 0.4,
  large: 0.6,
  extraLarge: 1,
  fastSpatial: 0.35,
  spatial: 0.5,
  slowSpatial: 0.65,
  effects: 0.2,
};
