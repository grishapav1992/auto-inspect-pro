export interface CarReport {
  id: string;
  createdAt: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  color: string;
  vin: string;
  bodyCondition: number; // 1-10
  engineCondition: number;
  interiorCondition: number;
  paintThickness: string;
  notes: string;
  verdict: "recommended" | "not_recommended" | "with_reservations";
  photos: string[];
}

export const MOCK_REPORTS: CarReport[] = [
  {
    id: "1",
    createdAt: "2025-02-18",
    brand: "Toyota",
    model: "Camry",
    year: 2021,
    mileage: 45000,
    price: 2200000,
    color: "Белый",
    vin: "XW7BF4FK10S0*****",
    bodyCondition: 8,
    engineCondition: 9,
    interiorCondition: 8,
    paintThickness: "110-130 мкм",
    notes: "Один владелец, сервисная книжка. Мелкие сколы на капоте.",
    verdict: "recommended",
    photos: [],
  },
  {
    id: "2",
    createdAt: "2025-02-15",
    brand: "BMW",
    model: "3 Series",
    year: 2019,
    mileage: 78000,
    price: 2800000,
    color: "Чёрный",
    vin: "WBA8E1C50JA*****",
    bodyCondition: 6,
    engineCondition: 7,
    interiorCondition: 7,
    paintThickness: "90-280 мкм",
    notes: "Перекрашены два элемента. Подвеска требует внимания.",
    verdict: "with_reservations",
    photos: [],
  },
  {
    id: "3",
    createdAt: "2025-02-10",
    brand: "Hyundai",
    model: "Tucson",
    year: 2020,
    mileage: 92000,
    price: 1900000,
    color: "Серый",
    vin: "TMAJ3812ALJ*****",
    bodyCondition: 4,
    engineCondition: 5,
    interiorCondition: 6,
    paintThickness: "60-450 мкм",
    notes: "Скрытые повреждения кузова. Возможно участие в ДТП.",
    verdict: "not_recommended",
    photos: [],
  },
];
