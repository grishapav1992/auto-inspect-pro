export interface GenerationPhoto {
  id: number;
  size: "s" | "m";
  urlX1: string;
  urlX2: string;
}

export interface RestylingFrame {
  id: number;
  frame: string;
}

export interface Restyling {
  id: number;
  restyling: string;
  yearStart: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  yearEnd: {
    date: string;
    timezone_type: number;
    timezone: string;
  } | null;
  frames: RestylingFrame[];
  photos: GenerationPhoto[];
}

export interface GenerationFrame {
  id: number;
  frame: string;
}

export interface Generation {
  id: number;
  modelCarId: number;
  generation: number;
  frames: GenerationFrame[];
  restylings: Restyling[];
}

export interface GenerationApiResponse {
  id: number;
  response: string;
  fromMethod: string;
  result: Generation[];
  errors: string[];
}
