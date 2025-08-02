import { PrismaClient, Product, Seller } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Predefined categories for better variety
const predefinedCategories = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports & Outdoors",
  "Books & Media",
  "Beauty & Health",
  "Automotive",
  "Toys & Games",
  "Food & Beverages",
  "Jewelry & Watches",
  "Tools & Hardware",
  "Pet Supplies",
  "Office Supplies",
  "Baby & Kids",
  "Furniture",
  "Art & Crafts",
  "Music & Instruments",
  "Pharmaceuticals",
  "Kitchen & Dining",
  "Outdoor & Camping",
  "Fitness & Exercise",
  "Garden & Plants",
  "Lighting & Decor",
  "Storage & Organization",
  "Bath & Personal Care",
  "Automotive Parts",
  "Computer Accessories",
  "Mobile Accessories",
  "Audio & Video",
  "Gaming & Entertainment",
  "Photography",
  "Musical Instruments",
  "Party Supplies",
  "School Supplies",
  "Industrial Supplies",
  "Medical Supplies",
  "Construction Materials",
  "Plumbing Supplies",
  "Electrical Supplies",
  "HVAC Equipment",
  "Security Systems",
  "Telecommunications",
  "Printing Supplies",
  "Cleaning Supplies",
  "Safety Equipment",
  "Agricultural Supplies",
  "Marine Supplies",
  "Aviation Supplies",
  "Military Supplies",
  "Scientific Equipment",
];

// Product name templates for variety
const productNameTemplates = [
  "{brand} {product}",
  "{product} by {brand}",
  "{brand} {product} {variant}",
  "{product} {variant}",
  "{brand} {product} {size}",
  "{product} {size} {color}",
  "{brand} {product} {color}",
  "{product} {color} {material}",
  "{brand} {product} {material}",
  "{product} {material} {size}",
];

// Brand names for variety
const brands = [
  "TechPro",
  "StyleMax",
  "HomeLife",
  "SportFlex",
  "BeautyGlow",
  "AutoTech",
  "ToyWorld",
  "FreshFood",
  "JewelCraft",
  "ToolMaster",
  "PetCare",
  "OfficePlus",
  "BabySafe",
  "FurniStyle",
  "ArtCraft",
  "MusicPro",
  "PharmaCare",
  "KitchenPro",
  "OutdoorMax",
  "FitLife",
  "GardenPro",
  "LightCraft",
  "StoragePro",
  "BathCare",
  "AutoParts",
  "CompTech",
  "MobilePro",
  "AudioMax",
  "GameZone",
  "PhotoPro",
  "MusicCraft",
  "PartyTime",
  "SchoolPro",
  "IndustrialMax",
  "MedCare",
  "BuildPro",
  "PlumbTech",
  "ElectroMax",
  "HVACPro",
  "SecureTech",
  "TeleCom",
  "PrintPro",
  "CleanMax",
  "SafePro",
  "AgriTech",
  "MarinePro",
  "AviationMax",
  "MilitaryPro",
  "ScienceLab",
];

// Product types for variety
const productTypes = [
  "Smartphone",
  "Laptop",
  "Headphones",
  "Watch",
  "Camera",
  "Shirt",
  "Pants",
  "Dress",
  "Shoes",
  "Jacket",
  "Chair",
  "Table",
  "Lamp",
  "Mirror",
  "Vase",
  "Ball",
  "Racket",
  "Bicycle",
  "Tent",
  "Backpack",
  "Book",
  "DVD",
  "CD",
  "Magazine",
  "Poster",
  "Shampoo",
  "Soap",
  "Cream",
  "Perfume",
  "Makeup",
  "Tire",
  "Battery",
  "Filter",
  "Brake Pad",
  "Oil",
  "Doll",
  "Car",
  "Puzzle",
  "Board Game",
  "Action Figure",
  "Bread",
  "Milk",
  "Juice",
  "Snack",
  "Cereal",
  "Ring",
  "Necklace",
  "Earrings",
  "Bracelet",
  "Watch",
  "Hammer",
  "Screwdriver",
  "Drill",
  "Saw",
  "Wrench",
  "Collar",
  "Leash",
  "Toy",
  "Food",
  "Bed",
  "Pen",
  "Paper",
  "Stapler",
  "Folder",
  "Calculator",
  "Diaper",
  "Bottle",
  "Toy",
  "Clothes",
  "Stroller",
  "Sofa",
  "Bed",
  "Wardrobe",
  "Desk",
  "Shelf",
  "Paint",
  "Brush",
  "Canvas",
  "Clay",
  "Marker",
  "Guitar",
  "Piano",
  "Drums",
  "Microphone",
  "Speaker",
  "Medicine",
  "Bandage",
  "Thermometer",
  "Pill",
  "Syringe",
  "Pan",
  "Pot",
  "Knife",
  "Fork",
  "Plate",
  "Sleeping Bag",
  "Flashlight",
  "Compass",
  "Map",
  "Water Bottle",
  "Dumbbell",
  "Yoga Mat",
  "Treadmill",
  "Bike",
  "Rope",
  "Plant",
  "Pot",
  "Fertilizer",
  "Seeds",
  "Watering Can",
  "Bulb",
  "Lamp",
  "Chandelier",
  "Sconce",
  "String Lights",
  "Box",
  "Container",
  "Shelf",
  "Drawer",
  "Cabinet",
  "Towel",
  "Soap",
  "Shampoo",
  "Toothbrush",
  "Razor",
  "Engine Part",
  "Transmission",
  "Suspension",
  "Exhaust",
  "Fuel Pump",
  "Mouse",
  "Keyboard",
  "Monitor",
  "Printer",
  "Scanner",
  "Case",
  "Charger",
  "Cable",
  "Screen Protector",
  "Stand",
  "Speaker",
  "Microphone",
  "Amplifier",
  "Mixer",
  "Recorder",
  "Console",
  "Controller",
  "Game",
  "Headset",
  "Mouse Pad",
  "Lens",
  "Tripod",
  "Flash",
  "Memory Card",
  "Bag",
  "Violin",
  "Trumpet",
  "Saxophone",
  "Flute",
  "Harmonica",
  "Balloon",
  "Cake",
  "Candle",
  "Gift Wrap",
  "Confetti",
  "Notebook",
  "Pencil",
  "Ruler",
  "Eraser",
  "Glue",
  "Motor",
  "Pump",
  "Valve",
  "Pipe",
  "Gear",
  "Syringe",
  "Bandage",
  "Gauze",
  "Tape",
  "Antiseptic",
  "Cement",
  "Brick",
  "Steel",
  "Wood",
  "Glass",
  "Pipe",
  "Fitting",
  "Valve",
  "Pump",
  "Tank",
  "Wire",
  "Switch",
  "Outlet",
  "Breaker",
  "Transformer",
  "Furnace",
  "AC Unit",
  "Thermostat",
  "Duct",
  "Filter",
  "Camera",
  "Sensor",
  "Alarm",
  "Lock",
  "Monitor",
  "Phone",
  "Router",
  "Modem",
  "Antenna",
  "Cable",
  "Toner",
  "Paper",
  "Ink",
  "Cartridge",
  "Ribbon",
  "Detergent",
  "Bleach",
  "Sponge",
  "Broom",
  "Mop",
  "Helmet",
  "Gloves",
  "Vest",
  "Goggles",
  "Mask",
  "Seeds",
  "Fertilizer",
  "Pesticide",
  "Irrigation",
  "Harvester",
  "Anchor",
  "Rope",
  "Life Jacket",
  "Compass",
  "Radio",
  "Propeller",
  "Wing",
  "Engine",
  "Landing Gear",
  "Cockpit",
  "Uniform",
  "Boots",
  "Helmet",
  "Vest",
  "Equipment",
  "Microscope",
  "Telescope",
  "Scale",
  "Thermometer",
  "Beaker",
];

// Variants for product names
const variants = [
  "Pro",
  "Max",
  "Plus",
  "Elite",
  "Premium",
  "Standard",
  "Basic",
  "Advanced",
  "Ultra",
  "Extreme",
  "Light",
  "Heavy",
  "Compact",
  "Large",
  "Small",
  "Wireless",
  "Bluetooth",
  "USB-C",
  "HDMI",
  "WiFi",
  "Waterproof",
  "Shockproof",
  "Dustproof",
  "Fireproof",
  "Antibacterial",
  "Organic",
  "Natural",
  "Synthetic",
  "Eco-friendly",
  "Biodegradable",
  "Rechargeable",
  "Solar-powered",
  "Battery-operated",
  "Electric",
  "Manual",
  "Foldable",
  "Collapsible",
  "Adjustable",
  "Removable",
  "Detachable",
  "Multi-color",
  "Single-color",
  "Patterned",
  "Solid",
  "Gradient",
  "Winter",
  "Summer",
  "Spring",
  "Fall",
  "All-season",
  "Indoor",
  "Outdoor",
  "Portable",
  "Stationary",
  "Mobile",
];

// Sizes for products
const sizes = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
  "Mini",
  "Standard",
  "Jumbo",
  "Giant",
  "1 inch",
  "2 inch",
  "5 inch",
  "10 inch",
  "20 inch",
  "100ml",
  "250ml",
  "500ml",
  "1L",
  "2L",
  "100g",
  "250g",
  "500g",
  "1kg",
  "2kg",
];

// Colors for products
const colors = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Purple",
  "Orange",
  "Pink",
  "Brown",
  "Gray",
  "Silver",
  "Gold",
  "Bronze",
  "Copper",
  "Navy",
  "Maroon",
  "Olive",
  "Teal",
  "Coral",
  "Lavender",
  "Mint",
  "Cream",
  "Beige",
  "Charcoal",
];

// Materials for products
const materials = [
  "Plastic",
  "Metal",
  "Wood",
  "Glass",
  "Ceramic",
  "Fabric",
  "Leather",
  "Silicone",
  "Rubber",
  "Aluminum",
  "Steel",
  "Copper",
  "Brass",
  "Bronze",
  "Titanium",
  "Cotton",
  "Polyester",
  "Wool",
  "Silk",
  "Denim",
  "Carbon Fiber",
  "Kevlar",
  "Nylon",
  "PVC",
  "ABS",
];

function generateUniqueProductName(): string {
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

function generateProductPhoto(): string | null {
  // 60% chance to have no photo, 40% chance to have a varied placeholder
  if (!faker.datatype.boolean({ probability: 0.4 })) {
    return null;
  }

  // Array of different colored placeholder images as base64
  const placeholderImages = [
    // Red gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmM0YzQ7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjY2NjY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+",
    
    // Blue gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Mjg1ZjQ7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2NjY2ZmY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2IpIi8+PC9zdmc+",
    
    // Green gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Y2FmNTQ7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2NmZmNjY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2MpIi8+PC9zdmc+",
    
    // Purple gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM5YzI3YjA7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNjY2M2ZmY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2QpIi8+PC9zdmc+",
    
    // Orange gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjgwMDA7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmJmNjY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2UpIi8+PC9zdmc+",
    
    // Teal gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMGRkYmI7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2NmZmZmY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2YpIi8+PC9zdmc+",
    
    // Pink gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlOTFlYjM7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmNjZmY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+",
    
    // Yellow gradient placeholder
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImgiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmZmMDA7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmZmNjY7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2gpIi8+PC9zdmc+"
  ];

  // Return a random placeholder image
  return faker.helpers.arrayElement(placeholderImages);
}

function generateUniqueClientName(): string {
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

function generateUniqueSellerName(): string {
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

async function main() {
  console.log("🌱 Starting seed...");

  console.log("📂 Creating categories...");
  for (const categoryName of predefinedCategories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
      },
    });
  }

  console.log("🏪 Creating sellers...");
  const usedSellerNames = new Set<string>();
  const sellers: Seller[] = [];

  for (let i = 0; i < 30; i++) {
    let sellerName: string;
    do {
      sellerName = generateUniqueSellerName();
    } while (usedSellerNames.has(sellerName));

    usedSellerNames.add(sellerName);

    const seller = await prisma.seller.create({
      data: {
        name: sellerName,
        phone: faker.helpers.maybe(() => faker.phone.number(), {
          probability: 0.8,
        }),
        email: faker.helpers.maybe(() => faker.internet.email(), {
          probability: 0.7,
        }),
        address: faker.helpers.maybe(
          () => faker.location.streetAddress({ useFullAddress: true }),
          { probability: 0.6 },
        ),
      },
    });

    sellers.push(seller);
  }

  console.log("📦 Generating products and purchases...");
  const usedProductNames = new Set<string>();
  let products: Product[] = [];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  for (let i = 0; i < 1000; i++) {
    let productName: string;
    do {
      productName = generateUniqueProductName();
    } while (usedProductNames.has(productName));

    usedProductNames.add(productName);

    const category = faker.helpers.arrayElement(predefinedCategories);
    const boughtPrice = faker.commerce.price({
      min: 50,
      max: 2000,
      dec: 0,
    });
    const markupPercentage = faker.number.float({ min: 1.1, max: 1.8 });
    const sellingPrice = Math.floor(Number(boughtPrice) * markupPercentage);

    // Wrap product creation, purchases, and quantity update in a transaction
    await prisma.$transaction(async (tx) => {
      // Create the product with initial quantity of 0
      const createdProduct = await tx.product.create({
        data: {
          name: productName,
          categoryName: category,
          quantity: 0,
          bought: Number(boughtPrice),
          selling: sellingPrice,
          codebar: faker.string.numeric(12),
          photo: generateProductPhoto(),
        },
      });

      // Create multiple purchases for the product
      const numPurchases = faker.number.int({ min: 1, max: 4 });
      let currentQuantity = 0;

      for (let j = 0; j < numPurchases; j++) {
        const seller = faker.helpers.maybe(
          () => faker.helpers.arrayElement(sellers),
          { probability: 0.85 }, // 85% chance to have a seller, 15% chance for no seller
        );

        const purchaseQuantity = faker.number.int({ min: 5, max: 50 });
        currentQuantity += purchaseQuantity;

        const purchaseDate = faker.date.between({
          from: twoYearsAgo,
          to: new Date(),
        });

        await tx.purchase.create({
          data: {
            productId: createdProduct.id,
            sellerId: seller?.id || null,
            quantity: purchaseQuantity,
            price: Number(boughtPrice),
            createdAt: purchaseDate,
            updatedAt: purchaseDate,
          },
        });

        // Update product quantity after each purchase
        await tx.product.update({
          where: { id: createdProduct.id },
          data: { quantity: currentQuantity },
        });
      }

      // Don't simulate sales here - let actual sale items handle quantity reduction
      return createdProduct;
    });

    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} products with purchases...`);
    }
  }

  console.log("👥 Creating sample clients...");
  const usedClientNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    let clientName: string;
    do {
      clientName = generateUniqueClientName();
    } while (usedClientNames.has(clientName));

    usedClientNames.add(clientName);

    await prisma.client.create({
      data: {
        name: clientName,
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
        createdAt: faker.date.between({ from: twoYearsAgo, to: new Date() }),
      },
    });
  }

  console.log("🛒 Creating sample sales...");
  const clients = await prisma.client.findMany();
  products = await prisma.product.findMany();
  const sales = [];

  for (let i = 0; i < 200; i++) {
    const client = faker.helpers.maybe(
      () => faker.helpers.arrayElement(clients),
      { probability: 0.7 },
    );
    const saleItemsCount = faker.number.int({ min: 1, max: 5 });
    const saleCreatedAt = faker.date.between({
      from: twoYearsAgo,
      to: new Date(),
    });
    const sale = await prisma.sale.create({
      data: {
        clientId: client?.id,
        discount: faker.number.int({ min: 0, max: 20 }),
        createdAt: saleCreatedAt,
      },
    });
    sales.push({ ...sale, clientId: client?.id });
    const saleProducts = faker.helpers.arrayElements(products, saleItemsCount);
    for (const product of saleProducts) {
      const maxQuantity = Math.min(5, product.quantity); // Don't sell more than available
      if (maxQuantity <= 0) continue; // Skip if no stock

      const quantity = faker.number.int({ min: 1, max: maxQuantity });

      // Use transaction to create sale item and update product quantity
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.create({
          data: {
            productId: product.id,
            saleId: sale.id,
            quantity,
            price: product.selling,
          },
        });

        // Update product quantity by reducing it
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        // Update local product object to reflect new quantity
        product.quantity -= quantity;
      });
    }
  }

  console.log("💳 Creating random payments...");
  let paymentCount = 0;
  for (const sale of sales) {
    if (!sale.clientId) continue;
    if (faker.datatype.boolean() && faker.datatype.boolean()) continue;
    const saleItems = await prisma.saleItem.findMany({
      where: { saleId: sale.id },
    });
    const saleTotal =
      saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) -
      sale.discount;
    const givenAmount =
      saleTotal > 0 ? faker.number.int({ min: 0, max: saleTotal }) : 0;
    const type = faker.helpers.arrayElement(["CREDIT", "VERSEMENT"]);
    const dueDate = faker.date.soon({ days: 30 });
    let paidDate = null;
    if (faker.datatype.boolean()) {
      paidDate = faker.date.between({ from: new Date(), to: dueDate });
    }
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        clientId: sale.clientId,
        givenAmount,
        dueDate: dueDate,
        paidDate,
        type,
      },
    });
    paymentCount++;
  }
  console.log(`   - ${paymentCount} payments`);

  console.log("✅ Seed completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - ${predefinedCategories.length} categories`);
  console.log(`   - 30 sellers`);
  console.log(`   - 1,000 products`);
  console.log(`   - Multiple purchases per product (1-4 purchases each)`);
  console.log(`   - 50 clients`);
  console.log(`   - 200 sales with items`);
  console.log(`   - ${paymentCount} payments`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
