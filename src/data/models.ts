export interface CarModel {
  id: number;
  brandId: number;
  model: string;
  slug: string;
  startYear: number | null;
  endYear: number | null;
}

export const models: CarModel[] = [
  // Toyota (1)
  { id: 1, brandId: 1, model: "Camry", slug: "camry", startYear: null, endYear: null },
  { id: 2, brandId: 1, model: "Corolla", slug: "corolla", startYear: null, endYear: null },
  { id: 3, brandId: 1, model: "RAV4", slug: "rav4", startYear: null, endYear: null },
  { id: 4, brandId: 1, model: "Land Cruiser Prado", slug: "land-cruiser-prado", startYear: null, endYear: null },
  { id: 5, brandId: 1, model: "Land Cruiser", slug: "land-cruiser", startYear: null, endYear: null },
  { id: 6, brandId: 1, model: "2000GT", slug: "2000gt", startYear: null, endYear: null },
  { id: 7, brandId: 1, model: "4Runner", slug: "4runner", startYear: null, endYear: null },
  { id: 8, brandId: 1, model: "Allex", slug: "allex", startYear: null, endYear: null },
  { id: 9, brandId: 1, model: "Allion", slug: "allion", startYear: null, endYear: null },
  { id: 10, brandId: 1, model: "Alphard", slug: "alphard", startYear: null, endYear: null },
  { id: 11, brandId: 1, model: "Altezza", slug: "altezza", startYear: null, endYear: null },
  { id: 12, brandId: 1, model: "Aqua", slug: "aqua", startYear: null, endYear: null },
  { id: 13, brandId: 1, model: "Aristo", slug: "aristo", startYear: null, endYear: null },
  { id: 14, brandId: 1, model: "Aurion", slug: "aurion", startYear: null, endYear: null },
  { id: 15, brandId: 1, model: "Auris", slug: "auris", startYear: null, endYear: null },
  { id: 16, brandId: 1, model: "Avalon", slug: "avalon", startYear: null, endYear: null },
  { id: 17, brandId: 1, model: "Avanza", slug: "avanza", startYear: null, endYear: null },
  { id: 18, brandId: 1, model: "Avensis", slug: "avensis", startYear: null, endYear: null },
  { id: 19, brandId: 1, model: "Avensis Verso", slug: "avensis-verso", startYear: null, endYear: null },
  { id: 20, brandId: 1, model: "Aygo", slug: "aygo", startYear: null, endYear: null },
  { id: 21, brandId: 1, model: "Aygo X", slug: "aygo-x", startYear: null, endYear: null },
  { id: 22, brandId: 1, model: "bB", slug: "bb", startYear: null, endYear: null },
  { id: 23, brandId: 1, model: "Belta", slug: "belta", startYear: null, endYear: null },
  { id: 24, brandId: 1, model: "Blade", slug: "blade", startYear: null, endYear: null },
  { id: 25, brandId: 1, model: "Blizzard", slug: "blizzard", startYear: null, endYear: null },
  { id: 26, brandId: 1, model: "Brevis", slug: "brevis", startYear: null, endYear: null },
  { id: 27, brandId: 1, model: "bZ", slug: "bz", startYear: null, endYear: null },
  { id: 28, brandId: 1, model: "bZ Woodland", slug: "bz-woodland", startYear: null, endYear: null },

  // Infiniti (4)
  { id: 100, brandId: 4, model: "Q50", slug: "q50", startYear: null, endYear: null },
  { id: 101, brandId: 4, model: "Q60", slug: "q60", startYear: null, endYear: null },
  { id: 102, brandId: 4, model: "QX50", slug: "qx50", startYear: null, endYear: null },
  { id: 103, brandId: 4, model: "QX80", slug: "qx80", startYear: null, endYear: null },
  { id: 104, brandId: 4, model: "FX35", slug: "fx35", startYear: null, endYear: null },

  // Mitsubishi (9)
  { id: 200, brandId: 9, model: "Outlander", slug: "outlander", startYear: null, endYear: null },
  { id: 201, brandId: 9, model: "Pajero", slug: "pajero", startYear: null, endYear: null },
  { id: 202, brandId: 9, model: "Eclipse Cross", slug: "eclipse-cross", startYear: null, endYear: null },
  { id: 203, brandId: 9, model: "ASX", slug: "asx", startYear: null, endYear: null },
  { id: 204, brandId: 9, model: "Lancer", slug: "lancer", startYear: null, endYear: null },

  // Chevrolet (17)
  { id: 300, brandId: 17, model: "Camaro", slug: "camaro", startYear: null, endYear: null },
  { id: 301, brandId: 17, model: "Tahoe", slug: "tahoe", startYear: null, endYear: null },
  { id: 302, brandId: 17, model: "Cruze", slug: "cruze", startYear: null, endYear: null },
  { id: 303, brandId: 17, model: "Malibu", slug: "malibu", startYear: null, endYear: null },

  // Tesla (23)
  { id: 2833, brandId: 23, model: "Cybertruck", slug: "cybertruck", startYear: null, endYear: null },
  { id: 2834, brandId: 23, model: "Model 3", slug: "model-3", startYear: null, endYear: null },
  { id: 2835, brandId: 23, model: "Model S", slug: "model-s", startYear: null, endYear: null },
  { id: 2836, brandId: 23, model: "Model X", slug: "model-x", startYear: null, endYear: null },
  { id: 2837, brandId: 23, model: "Model Y", slug: "model-y", startYear: null, endYear: null },
  { id: 2838, brandId: 23, model: "Roadster", slug: "roadster", startYear: null, endYear: null },
  { id: 2839, brandId: 23, model: "Semi", slug: "semi", startYear: null, endYear: null },

  // Hyundai (24)
  { id: 400, brandId: 24, model: "Tucson", slug: "tucson", startYear: null, endYear: null },
  { id: 401, brandId: 24, model: "Santa Fe", slug: "santa-fe", startYear: null, endYear: null },
  { id: 402, brandId: 24, model: "Solaris", slug: "solaris", startYear: null, endYear: null },
  { id: 403, brandId: 24, model: "Creta", slug: "creta", startYear: null, endYear: null },
  { id: 404, brandId: 24, model: "Sonata", slug: "sonata", startYear: null, endYear: null },

  // Kia (25)
  { id: 500, brandId: 25, model: "Sportage", slug: "sportage", startYear: null, endYear: null },
  { id: 501, brandId: 25, model: "Rio", slug: "rio", startYear: null, endYear: null },
  { id: 502, brandId: 25, model: "Ceed", slug: "ceed", startYear: null, endYear: null },
  { id: 503, brandId: 25, model: "K5", slug: "k5", startYear: null, endYear: null },
  { id: 504, brandId: 25, model: "Sorento", slug: "sorento", startYear: null, endYear: null },

  // Genesis (26)
  { id: 600, brandId: 26, model: "G70", slug: "g70", startYear: null, endYear: null },
  { id: 601, brandId: 26, model: "G80", slug: "g80", startYear: null, endYear: null },
  { id: 602, brandId: 26, model: "GV70", slug: "gv70", startYear: null, endYear: null },
  { id: 603, brandId: 26, model: "GV80", slug: "gv80", startYear: null, endYear: null },

  // BMW-like placeholders for other brands to keep the picker functional
  // Renault (27)
  { id: 700, brandId: 27, model: "Logan", slug: "logan", startYear: null, endYear: null },
  { id: 701, brandId: 27, model: "Duster", slug: "duster", startYear: null, endYear: null },
  { id: 702, brandId: 27, model: "Kaptur", slug: "kaptur", startYear: null, endYear: null },
  { id: 703, brandId: 27, model: "Arkana", slug: "arkana", startYear: null, endYear: null },

  // Ferrari (33)
  { id: 800, brandId: 33, model: "Roma", slug: "roma", startYear: null, endYear: null },
  { id: 801, brandId: 33, model: "SF90", slug: "sf90", startYear: null, endYear: null },
  { id: 802, brandId: 33, model: "296 GTB", slug: "296-gtb", startYear: null, endYear: null },
  { id: 803, brandId: 33, model: "Purosangue", slug: "purosangue", startYear: null, endYear: null },

  // Land Rover (39)
  { id: 900, brandId: 39, model: "Range Rover", slug: "range-rover", startYear: null, endYear: null },
  { id: 901, brandId: 39, model: "Defender", slug: "defender", startYear: null, endYear: null },
  { id: 902, brandId: 39, model: "Discovery", slug: "discovery", startYear: null, endYear: null },
  { id: 903, brandId: 39, model: "Velar", slug: "velar", startYear: null, endYear: null },
];

export function getModelsByBrandId(brandId: number): CarModel[] {
  return models.filter((m) => m.brandId === brandId);
}
