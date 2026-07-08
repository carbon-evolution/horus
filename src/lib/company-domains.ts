// Company id -> primary web domain, used to fetch brand logos. Ids match the
// company records in data.ts. Missing ids fall back to an initials badge.
export const COMPANY_DOMAIN: Record<string, string> = {
  // Semiconductor
  nvidia: "nvidia.com", broadcom: "broadcom.com", tsmc: "tsmc.com", samsung: "samsung.com",
  asml: "asml.com", amd: "amd.com", amat: "appliedmaterials.com", intel: "intel.com",
  arm: "arm.com", skhynix: "skhynix.com", lam: "lamresearch.com", qualcomm: "qualcomm.com",
  kla: "kla.com", micron: "micron.com", adi: "analog.com", ti: "ti.com",
  tel: "tel.com", mediatek: "mediatek.com", infineon: "infineon.com", nxp: "nxp.com",
  // AI
  microsoft: "microsoft.com", alphabet: "google.com", amazon: "amazon.com", meta: "meta.com",
  openai: "openai.com", alibaba: "alibaba.com", palantir: "palantir.com", anthropic: "anthropic.com",
  databricks: "databricks.com", xai: "x.ai", perplexity: "perplexity.ai", scaleai: "scale.com",
  midjourney: "midjourney.com", cerebras: "cerebras.ai", mistral: "mistral.ai", cohere: "cohere.com",
  abridge: "abridge.com", huggingface: "huggingface.co", runway: "runwayml.com", deepseek: "deepseek.com",
  // Battery
  catl: "catl.com", byd: "byd.com", tesla: "tesla.com", lges: "lgensol.com",
  panasonic: "panasonic.com", samsungsdi: "samsungsdi.com", skon: "sk-on.com", calb: "calb.com",
  eve: "evebattery.com", gotion: "gotion.com.cn", toshiba: "toshiba.com", clarios: "clarios.com",
  svolt: "svolt.cn", aesc: "aesc-group.com", sunwoda: "sunwoda.com", lishen: "lishen.com.cn",
  northvolt: "northvolt.com", exide: "exideindustries.com", quantumscape: "quantumscape.com", gsyuasa: "gs-yuasa.com",
};

// Company id -> locally-hosted logo (user-supplied high-res images). Highest
// priority — used before any external source.
export const LOCAL_LOGO: Record<string, string> = {
  tsmc: "/logos/tsmc.png",
  skhynix: "/logos/skhynix.png",
  skon: "/logos/skon.png",
  alphabet: "/logos/alphabet.png",
  eve: "/logos/eve.png",
  lges: "/logos/lges.png",
  byd: "/logos/byd.png",
};

// Company id -> simple-icons slug (vector SVG brand logos, razor-sharp at any
// size). Only ids with a confirmed icon; the rest fall back to a favicon.
export const SIMPLE_ICON: Record<string, string> = {
  nvidia: "nvidia", amd: "amd", intel: "intel", samsung: "samsung", arm: "arm",
  qualcomm: "qualcomm", mediatek: "mediatek", broadcom: "broadcom", nxp: "nxp",
  meta: "meta",
  anthropic: "anthropic", alibaba: "alibabadotcom", palantir: "palantir",
  databricks: "databricks", huggingface: "huggingface", xai: "x", perplexity: "perplexity",
  cohere: "cohere", mistral: "mistralai",
  tesla: "tesla", panasonic: "panasonic", toshiba: "toshiba",
  lges: "lg", samsungsdi: "samsung",  // LG Energy → LG mark, Samsung SDI → Samsung mark
};

// Display-name -> domain, for components that only have a company name.
export const DOMAIN_BY_NAME: Record<string, string> = {
  "NVIDIA": "nvidia.com", "Broadcom": "broadcom.com", "TSMC": "tsmc.com", "Samsung": "samsung.com",
  "ASML": "asml.com", "AMD": "amd.com", "Applied Materials": "appliedmaterials.com", "Intel": "intel.com",
  "Arm Holdings": "arm.com", "SK hynix": "skhynix.com", "Lam Research": "lamresearch.com", "Qualcomm": "qualcomm.com",
  "KLA": "kla.com", "Micron": "micron.com", "Analog Devices": "analog.com", "Texas Instruments": "ti.com",
  "Tokyo Electron": "tel.com", "MediaTek": "mediatek.com", "Infineon": "infineon.com", "NXP": "nxp.com",
  "Microsoft": "microsoft.com", "Alphabet": "abc.xyz", "Amazon": "amazon.com", "Meta": "meta.com",
  "OpenAI": "openai.com", "Alibaba": "alibaba.com", "Palantir": "palantir.com", "Anthropic": "anthropic.com",
  "Databricks": "databricks.com", "xAI": "x.ai", "Perplexity": "perplexity.ai", "Scale AI": "scale.com",
  "CATL": "catl.com", "BYD": "byd.com", "Tesla": "tesla.com", "LG Energy": "lgensol.com",
  "Panasonic": "panasonic.com", "Samsung SDI": "samsungsdi.com", "SK On": "sk-on.com", "Northvolt": "northvolt.com",
  "QuantumScape": "quantumscape.com", "GS Yuasa": "gs-yuasa.com", "Toshiba": "toshiba.com", "Clarios": "clarios.com",
};
