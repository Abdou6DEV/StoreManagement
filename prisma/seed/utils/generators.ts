import { faker } from "@faker-js/faker";
import {
  brands,
  productTypes,
  variants,
  sizes,
  colors,
  materials,
  productNameTemplates,
} from "../data/index";

export function generateUniqueProductName(): string {
  const template = faker.helpers.arrayElement(productNameTemplates);
  const brand = faker.helpers.arrayElement(brands);
  const product = faker.helpers.arrayElement(productTypes);
  const variant = faker.helpers.arrayElement(variants);
  const size = faker.helpers.arrayElement(sizes);
  const color = faker.helpers.arrayElement(colors);
  const material = faker.helpers.arrayElement(materials);

  let name = template
    .replace("{brand}", brand)
    .replace("{product}", product)
    .replace("{variant}", variant)
    .replace("{size}", size)
    .replace("{color}", color)
    .replace("{material}", material);

  // Add unique identifier to prevent conflicts
  name += ` ${faker.string.alphanumeric(6).toUpperCase()}`;

  return name;
}

export function generateProductPhoto(): string | null {
  // All products will have no photo
  return null;
}

export function generateUniqueClientName(): string {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const suffix = faker.helpers.maybe(
    () => faker.helpers.arrayElement(["Jr.", "Sr.", "II", "III", "IV"]),
    { probability: 0.2 },
  );

  let name = `${firstName} ${lastName}`;
  if (suffix) name += ` ${suffix}`;

  // Add unique identifier to prevent conflicts
  name += ` ${faker.string.alphanumeric(4).toUpperCase()}`;

  return name;
}

export function generateUniqueSellerName(): string {
  const companyTypes = [
    "Corp",
    "Inc",
    "LLC",
    "Ltd",
    "Group",
    "Industries",
    "Enterprise",
    "Solutions",
    "Supply Co",
    "Trading Co",
    "Imports",
    "Exports",
    "Wholesale",
    "Distribution",
    "Manufacturing",
  ];

  const businessNames = [
    "Global",
    "Prime",
    "Elite",
    "Supreme",
    "Universal",
    "Metro",
    "Central",
    "Advanced",
    "Professional",
    "Quality",
    "Reliable",
    "Trusted",
    "Premier",
    "Superior",
    "Excellence",
    "Innovation",
    "Precision",
    "Dynamic",
    "Strategic",
    "Optimal",
  ];

  const industryTerms = [
    "Tech",
    "Pro",
    "Max",
    "Plus",
    "Direct",
    "Source",
    "Market",
    "Trade",
    "Commerce",
    "Business",
    "Supply",
    "Systems",
    "Networks",
    "Partners",
    "Associates",
  ];

  const name1 = faker.helpers.arrayElement(businessNames);
  const name2 = faker.helpers.arrayElement(industryTerms);
  const type = faker.helpers.arrayElement(companyTypes);

  let name = `${name1} ${name2} ${type}`;

  // Add unique identifier to prevent conflicts
  name += ` ${faker.string.alphanumeric(3).toUpperCase()}`;

  return name;
}
