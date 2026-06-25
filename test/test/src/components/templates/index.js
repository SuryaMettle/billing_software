import { generateModernA4, ModernA4Preview } from "./modern-a4.jsx";
import { generateClassicA4, ClassicA4Preview } from "./classic-a4.jsx";
import { generateMinimalA4, MinimalA4Preview } from "./minimal-a4.jsx";
import { generateThermal80, Thermal80Preview, printThermal80 } from "./thermal-80mm.jsx";

export const TEMPLATES = {
  "modern-a4": {
    id: "modern-a4",
    name: "Modern",
    description: "Colored header, rounded cards",
    paperSize: "A4",
    icon: "🎨",
    generatePDF: generateModernA4,
    Preview: ModernA4Preview,
  },
  "classic-a4": {
    id: "classic-a4",
    name: "Classic",
    description: "Formal black & white, GST-ready",
    paperSize: "A4",
    icon: "📋",
    generatePDF: generateClassicA4,
    Preview: ClassicA4Preview,
  },
  "minimal-a4": {
    id: "minimal-a4",
    name: "Minimal",
    description: "Clean, whitespace-heavy, premium",
    paperSize: "A4",
    icon: "✨",
    generatePDF: generateMinimalA4,
    Preview: MinimalA4Preview,
  },
  "thermal-80mm": {
    id: "thermal-80mm",
    name: "Thermal Receipt",
    description: "80mm POS receipt printer",
    paperSize: "80mm",
    icon: "🧾",
    generatePDF: generateThermal80,
    Preview: Thermal80Preview,
    printNative: printThermal80,
  },
};

export const DEFAULT_TEMPLATE = "modern-a4";