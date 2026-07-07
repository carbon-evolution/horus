import type { Industry, SupplierEdge, RawMaterial, TradeShipment } from "@/lib/types";

// Supply-chain fixtures kept separate from data.ts to keep each file focused.
// Same shape the live provider will return (UN Comtrade / registries / World Bank).
interface SupplyBlock {
  supplierEdges: SupplierEdge[];
  materials: RawMaterial[];
  shipments: TradeShipment[];
}

const semiconductor: SupplyBlock = {
  supplierEdges: [
    { buyer: "TSMC", supplier: "ASML", tier: 1, material: "EUV Lithography", spend: "$12.8B", risk: "medium" },
    { buyer: "TSMC", supplier: "Applied Materials", tier: 1, material: "Deposition", spend: "$9.4B", risk: "medium" },
    { buyer: "TSMC", supplier: "Tokyo Electron", tier: 1, material: "Coater/Developer", spend: "$6.1B", risk: "low" },
    { buyer: "TSMC", supplier: "Shin-Etsu Chemical", tier: 2, material: "Silicon Wafers", spend: "$4.2B", risk: "low" },
    { buyer: "NVIDIA", supplier: "TSMC", tier: 1, material: "Advanced Logic", spend: "$14.2B", risk: "high" },
    { buyer: "NVIDIA", supplier: "SK hynix", tier: 1, material: "HBM Memory", spend: "$9.1B", risk: "medium" },
    { buyer: "Intel", supplier: "ASML", tier: 1, material: "EUV Lithography", spend: "$5.8B", risk: "medium" },
    { buyer: "Samsung", supplier: "Applied Materials", tier: 1, material: "Deposition", spend: "$6.3B", risk: "medium" },
    { buyer: "Apple", supplier: "TSMC", tier: 1, material: "Advanced Logic", spend: "$18.0B", risk: "high" },
    { buyer: "ASML", supplier: "Zeiss", tier: 2, material: "EUV Optics", spend: "$3.4B", risk: "high" },
    { buyer: "ASML", supplier: "Cymer", tier: 2, material: "Light Sources", spend: "$2.1B", risk: "medium" },
    { buyer: "Micron", supplier: "Tokyo Electron", tier: 1, material: "Etch", spend: "$3.6B", risk: "low" },
  ],
  materials: [
    { id: "polysilicon", name: "Polysilicon", category: "Substrate", price: "$8.20/kg", concentration: 79, supplyRisk: "high", topProducers: [{ country: "China", share: 64 }, { country: "Germany", share: 9 }, { country: "USA", share: 6 }], usedIn: "Wafers" },
    { id: "neon", name: "Neon Gas", category: "Process Gas", price: "$540/m³", concentration: 74, supplyRisk: "high", topProducers: [{ country: "Ukraine", share: 50 }, { country: "China", share: 18 }, { country: "Russia", share: 12 }], usedIn: "Lithography" },
    { id: "gallium", name: "Gallium", category: "Compound", price: "$390/kg", concentration: 94, supplyRisk: "high", topProducers: [{ country: "China", share: 94 }, { country: "Japan", share: 3 }, { country: "Russia", share: 2 }], usedIn: "RF / Power chips" },
    { id: "germanium", name: "Germanium", category: "Compound", price: "$1,900/kg", concentration: 83, supplyRisk: "high", topProducers: [{ country: "China", share: 60 }, { country: "Russia", share: 12 }, { country: "USA", share: 11 }], usedIn: "Optics / IR" },
    { id: "photoresist", name: "Photoresist", category: "Chemical", price: "$3,100/kg", concentration: 88, supplyRisk: "medium", topProducers: [{ country: "Japan", share: 78 }, { country: "USA", share: 10 }, { country: "South Korea", share: 8 }], usedIn: "Patterning" },
    { id: "rare-earths", name: "Rare Earths", category: "Elements", price: "$68/kg", concentration: 85, supplyRisk: "high", topProducers: [{ country: "China", share: 70 }, { country: "USA", share: 14 }, { country: "Myanmar", share: 8 }], usedIn: "Magnets / Polishing" },
    { id: "palladium", name: "Palladium", category: "Metal", price: "$980/oz", concentration: 77, supplyRisk: "medium", topProducers: [{ country: "Russia", share: 40 }, { country: "South Africa", share: 37 }, { country: "Canada", share: 9 }], usedIn: "Plating" },
    { id: "tungsten", name: "Tungsten", category: "Metal", price: "$340/mtu", concentration: 86, supplyRisk: "high", topProducers: [{ country: "China", share: 80 }, { country: "Vietnam", share: 5 }, { country: "Russia", share: 3 }], usedIn: "Interconnects" },
  ],
  shipments: [
    { lane: "NL → Taiwan", origin: "Netherlands", destination: "Taiwan", mode: "air", commodity: "EUV Systems", volume: "42 units/yr", tariff: "0%", risk: "medium" },
    { lane: "Taiwan → USA", origin: "Taiwan", destination: "USA", mode: "air", commodity: "Advanced Logic", volume: "$28B/yr", tariff: "0%", risk: "high" },
    { lane: "China → Global", origin: "China", destination: "Global", mode: "sea", commodity: "Gallium/Germanium", volume: "620 t/yr", tariff: "Export-controlled", risk: "high" },
    { lane: "Japan → S. Korea", origin: "Japan", destination: "South Korea", mode: "sea", commodity: "Photoresist", volume: "$2.1B/yr", tariff: "0%", risk: "medium" },
    { lane: "Ukraine → EU/Asia", origin: "Ukraine", destination: "Global", mode: "air", commodity: "Neon Gas", volume: "constrained", tariff: "0%", risk: "high" },
    { lane: "USA → Taiwan", origin: "USA", destination: "Taiwan", mode: "air", commodity: "EDA / IP cores", volume: "$6B/yr", tariff: "0%", risk: "low" },
  ],
};

const ai: SupplyBlock = {
  supplierEdges: [
    { buyer: "Microsoft", supplier: "NVIDIA", tier: 1, material: "GPUs", spend: "$28.4B", risk: "high" },
    { buyer: "Amazon", supplier: "NVIDIA", tier: 1, material: "GPUs", spend: "$18.2B", risk: "high" },
    { buyer: "Meta", supplier: "NVIDIA", tier: 1, material: "GPUs", spend: "$16.5B", risk: "high" },
    { buyer: "NVIDIA", supplier: "TSMC", tier: 1, material: "Advanced Logic", spend: "$14.2B", risk: "high" },
    { buyer: "NVIDIA", supplier: "SK hynix", tier: 1, material: "HBM Memory", spend: "$9.1B", risk: "medium" },
    { buyer: "CoreWeave", supplier: "NVIDIA", tier: 1, material: "GPUs", spend: "$7.5B", risk: "high" },
    { buyer: "Microsoft", supplier: "Dell", tier: 1, material: "AI Servers", spend: "$6.7B", risk: "low" },
    { buyer: "Alphabet", supplier: "Broadcom", tier: 1, material: "TPU ASICs", spend: "$8.0B", risk: "medium" },
    { buyer: "Amazon", supplier: "Marvell", tier: 1, material: "Trainium ASICs", spend: "$4.0B", risk: "medium" },
    { buyer: "Microsoft", supplier: "Vertiv", tier: 2, material: "Cooling/Power", spend: "$4.3B", risk: "low" },
  ],
  materials: [
    { id: "hbm", name: "HBM Memory", category: "Component", price: "$18/GB", concentration: 92, supplyRisk: "high", topProducers: [{ country: "South Korea", share: 68 }, { country: "USA", share: 22 }, { country: "Japan", share: 6 }], usedIn: "AI accelerators" },
    { id: "cowos", name: "CoWoS Packaging", category: "Component", price: "capacity-bound", concentration: 90, supplyRisk: "high", topProducers: [{ country: "Taiwan", share: 85 }, { country: "USA", share: 8 }, { country: "Japan", share: 5 }], usedIn: "GPU packaging" },
    { id: "substrate", name: "ABF Substrate", category: "Component", price: "tight", concentration: 80, supplyRisk: "medium", topProducers: [{ country: "Japan", share: 45 }, { country: "Taiwan", share: 30 }, { country: "South Korea", share: 20 }], usedIn: "Advanced packaging" },
    { id: "gpu", name: "GPUs", category: "Accelerator", price: "$25k+/unit", concentration: 88, supplyRisk: "high", topProducers: [{ country: "Taiwan", share: 60 }, { country: "USA", share: 30 }, { country: "South Korea", share: 8 }], usedIn: "Training/Inference" },
    { id: "power", name: "Grid Power", category: "Utility", price: "$/MWh", concentration: 55, supplyRisk: "medium", topProducers: [{ country: "USA", share: 40 }, { country: "China", share: 25 }, { country: "EU", share: 20 }], usedIn: "Datacenters" },
  ],
  shipments: [
    { lane: "Taiwan → USA", origin: "Taiwan", destination: "USA", mode: "air", commodity: "GPUs / Accelerators", volume: "$34B/yr", tariff: "0%", risk: "high" },
    { lane: "S. Korea → Taiwan", origin: "South Korea", destination: "Taiwan", mode: "air", commodity: "HBM Memory", volume: "$9B/yr", tariff: "0%", risk: "medium" },
    { lane: "USA → China", origin: "USA", destination: "China", mode: "air", commodity: "AI GPUs", volume: "restricted", tariff: "Export-controlled", risk: "high" },
    { lane: "USA → Middle East", origin: "USA", destination: "Middle East", mode: "air", commodity: "AI Servers", volume: "$12B/yr", tariff: "0%", risk: "medium" },
  ],
};

const battery: SupplyBlock = {
  supplierEdges: [
    { buyer: "CATL", supplier: "Ganfeng Lithium", tier: 1, material: "Lithium", spend: "$8.9B", risk: "high" },
    { buyer: "Tesla", supplier: "Panasonic", tier: 1, material: "Cells (4680)", spend: "$4.1B", risk: "medium" },
    { buyer: "Tesla", supplier: "CATL", tier: 1, material: "LFP Cells", spend: "$5.2B", risk: "high" },
    { buyer: "LG Energy", supplier: "POSCO Future M", tier: 1, material: "Cathode", spend: "$3.6B", risk: "low" },
    { buyer: "CATL", supplier: "Glencore", tier: 2, material: "Cobalt", spend: "$7.2B", risk: "high" },
    { buyer: "BYD", supplier: "Ganfeng Lithium", tier: 1, material: "Lithium", spend: "$4.4B", risk: "high" },
    { buyer: "LG Energy", supplier: "GM", tier: 1, material: "JV Offtake", spend: "$2.3B", risk: "medium" },
    { buyer: "Panasonic", supplier: "Sumitomo", tier: 2, material: "Nickel", spend: "$2.8B", risk: "medium" },
    { buyer: "Samsung SDI", supplier: "Umicore", tier: 1, material: "Cathode", spend: "$2.1B", risk: "medium" },
    { buyer: "CATL", supplier: "Huayou Cobalt", tier: 2, material: "Nickel/Cobalt", spend: "$3.9B", risk: "high" },
  ],
  materials: [
    { id: "lithium", name: "Lithium", category: "Metal", price: "$13,800/t", concentration: 82, supplyRisk: "high", topProducers: [{ country: "Australia", share: 47 }, { country: "Chile", share: 24 }, { country: "China", share: 18 }], usedIn: "Cathode / Electrolyte" },
    { id: "cobalt", name: "Cobalt", category: "Metal", price: "$27,500/t", concentration: 88, supplyRisk: "high", topProducers: [{ country: "DR Congo", share: 74 }, { country: "Indonesia", share: 6 }, { country: "Russia", share: 4 }], usedIn: "Cathode" },
    { id: "nickel", name: "Nickel", category: "Metal", price: "$16,200/t", concentration: 76, supplyRisk: "medium", topProducers: [{ country: "Indonesia", share: 55 }, { country: "Philippines", share: 11 }, { country: "Russia", share: 7 }], usedIn: "High-Ni Cathode" },
    { id: "graphite", name: "Graphite", category: "Mineral", price: "$1,050/t", concentration: 84, supplyRisk: "high", topProducers: [{ country: "China", share: 65 }, { country: "Mozambique", share: 13 }, { country: "Madagascar", share: 8 }], usedIn: "Anode" },
    { id: "manganese", name: "Manganese", category: "Metal", price: "$2,100/t", concentration: 70, supplyRisk: "medium", topProducers: [{ country: "South Africa", share: 36 }, { country: "Gabon", share: 22 }, { country: "China", share: 17 }], usedIn: "NMC Cathode" },
  ],
  shipments: [
    { lane: "Australia → China", origin: "Australia", destination: "China", mode: "sea", commodity: "Lithium (spodumene)", volume: "$9B/yr", tariff: "0%", risk: "medium" },
    { lane: "DR Congo → China", origin: "DR Congo", destination: "China", mode: "sea", commodity: "Cobalt", volume: "$6B/yr", tariff: "0%", risk: "high" },
    { lane: "Indonesia → S. Korea", origin: "Indonesia", destination: "South Korea", mode: "sea", commodity: "Nickel", volume: "$5B/yr", tariff: "0%", risk: "medium" },
    { lane: "China → USA/EU", origin: "China", destination: "Global", mode: "sea", commodity: "Graphite (anode)", volume: "restricted", tariff: "Export-controlled", risk: "high" },
  ],
};

export const SUPPLY_DATA: Record<Industry, SupplyBlock> = { semiconductor, ai, battery };
