export const countries = [
  { code: "GE", name: "საქართველო" },
  { code: "IT", name: "Italy" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "US", name: "United States" },
] as const;

export const getCountries = () => countries;
