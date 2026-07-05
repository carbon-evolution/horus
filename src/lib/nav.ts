export interface NavChild {
  label: string;
  href: string;
}
export interface NavGroup {
  label: string;
  icon: string; // lucide icon name
  href?: string; // group with a landing page
  children?: NavChild[];
}

// Sidebar navigation tree, mirroring the enterprise layout.
export const NAV: NavGroup[] = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  {
    label: "Companies",
    icon: "Building2",
    children: [
      { label: "Top 10 Overview", href: "/companies" },
      { label: "Company Explorer", href: "/companies/explorer" },
      { label: "Financials", href: "/companies/financials" },
      { label: "News & Events", href: "/companies/news" },
      { label: "Deals & Partnerships", href: "/companies/deals" },
      { label: "Research & Patents", href: "/companies/patents" },
    ],
  },
  {
    label: "Supply Chain",
    icon: "Network",
    children: [
      { label: "Suppliers & Vendors", href: "/supply-chain/suppliers" },
      { label: "Raw Materials", href: "/supply-chain/materials" },
      { label: "Manufacturing Facilities", href: "/supply-chain/facilities" },
      { label: "Supply Chain Map", href: "/supply-chain/map" },
      { label: "Trade & Shipments", href: "/supply-chain/trade" },
    ],
  },
  {
    label: "Risk & Compliance",
    icon: "ShieldAlert",
    children: [
      { label: "Risk Radar", href: "/risk/radar" },
      { label: "Policies & Laws", href: "/risk/policies" },
      { label: "Environmental ESG", href: "/risk/esg" },
      { label: "Geopolitical Risk", href: "/risk/geopolitical" },
    ],
  },
  {
    label: "Data & Analytics",
    icon: "LineChart",
    children: [
      { label: "Market Intelligence", href: "/analytics/market" },
      { label: "Reports", href: "/analytics/reports" },
      { label: "Data Sources", href: "/analytics/sources" },
    ],
  },
  {
    label: "Monitoring",
    icon: "BellRing",
    children: [
      { label: "Alerts & Notifications", href: "/monitoring/alerts" },
      { label: "Watchlist", href: "/monitoring/watchlist" },
    ],
  },
];

export const DATA_SOURCES = [
  "OECD",
  "UN Comtrade",
  "World Bank",
  "SEC EDGAR",
  "Company Filings",
  "NewsAPI",
  "Yahoo Finance",
  "GDELT",
];
