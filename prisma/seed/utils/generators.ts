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
  // Algerian names in Latin alphabet
  const algerianFirstNames = [
    "Mohamed", "Ahmed", "Ali", "Youssef", "Khalid", "Omar", "Hassam", "Bachir", "Tarek", "Said",
    "Fatima", "Khadija", "Aicha", "Mariem", "Sarah", "Layla", "Nour", "Salma", "Zineb", "Amina",
    "Abdellah", "Abderrahmane", "Abdelaziz", "Abdelkrim", "Abdelhamid", "Abdelkader",
    "Mustapha", "Noureddine", "Salah", "Rami", "Karim", "Yacine", "Ibrahim", "Ismail",
    "Halima", "Roukia", "Hanan", "Rim", "Nadia", "Farida", "Samira", "Najat", "Naïma", "Djamila",
    "Mehdi", "Bilal", "Nassim", "Walid", "Sofiane", "Amine", "Reda", "Anis", "Fares", "Yanis",
    "Nour El Houda", "Meriem", "Ines", "Siham", "Nabila", "Soraya", "Nawel", "Dounia"
  ];

  const algerianLastNames = [
    "Benali", "Benahmed", "Benomar", "Benyoucef", "Benkhalid", "Bentaleb", "Bensaid", "Benslimane",
    "Zahrani", "Maliki", "Cherif", "Arabi", "Algerien", "Tounsi", "Marocain", "Libyen",
    "Tahar", "Salih", "Karim", "Hakim", "Rachid", "Hadi", "Mansour", "Nour",
    "Belkacem", "Bouazza", "Boumediene", "Bouteflika", "Boumaza", "Bouali", "Bouazza", "Boumaza",
    "Meziane", "Meziani", "Mazari", "Mazari", "Bouhafs", "Boukhalfa", "Boukhelifa", "Boukhalfa",
    "Boubekeur", "Bouabdallah", "Bouabdelli", "Bouabid", "Bouaziz", "Bouazza", "Bouazza", "Bouazza",
    "Hamdi", "Hamdani", "Hamidou", "Hamza", "Haddad", "Haddadi", "Hafsi", "Hafid"
  ];

  const firstName = faker.helpers.arrayElement(algerianFirstNames);
  const lastName = faker.helpers.arrayElement(algerianLastNames);

  let name = `${firstName} ${lastName}`;

  // Add unique identifier to prevent conflicts
  name += ` ${faker.string.alphanumeric(4).toUpperCase()}`;

  return name;
}

/**
 * Generate an Algerian phone number
 * Format: 0XX XXX XXXX or +213 XX XXX XXXX
 */
export function generateAlgerianPhoneNumber(): string {
  const prefixes = ["05", "06", "07"]; // Mobile prefixes
  const prefix = faker.helpers.arrayElement(prefixes);
  const number = faker.string.numeric(8); // 8 digits
  return `${prefix}${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`;
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

/**
 * Generate a price in DA (Algerian Dinar) format where the last digit is always 0
 * Prices are stored in centimes (multiply by 100)
 * @param min Minimum price in DA
 * @param max Maximum price in DA
 * @returns Price in centimes with last digit 0
 */
export function generateDAPrice(min: number, max: number): number {
  // Generate a random price and round to nearest 10, then multiply by 10 to ensure last digit is 0
  const priceInDA = Math.round(faker.number.int({ min, max }) / 10) * 10;
  // Convert to centimes (multiply by 100)
  return priceInDA * 100;
}
