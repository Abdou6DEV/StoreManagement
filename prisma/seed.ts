import { PrismaClient } from "@prisma/client";
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
  "Scientific Equipment"
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
  "{product} {material} {size}"
];

// Brand names for variety
const brands = [
  "TechPro", "StyleMax", "HomeLife", "SportFlex", "BeautyGlow",
  "AutoTech", "ToyWorld", "FreshFood", "JewelCraft", "ToolMaster",
  "PetCare", "OfficePlus", "BabySafe", "FurniStyle", "ArtCraft",
  "MusicPro", "PharmaCare", "KitchenPro", "OutdoorMax", "FitLife",
  "GardenPro", "LightCraft", "StoragePro", "BathCare", "AutoParts",
  "CompTech", "MobilePro", "AudioMax", "GameZone", "PhotoPro",
  "MusicCraft", "PartyTime", "SchoolPro", "IndustrialMax", "MedCare",
  "BuildPro", "PlumbTech", "ElectroMax", "HVACPro", "SecureTech",
  "TeleCom", "PrintPro", "CleanMax", "SafePro", "AgriTech",
  "MarinePro", "AviationMax", "MilitaryPro", "ScienceLab"
];

// Product types for variety
const productTypes = [
  "Smartphone", "Laptop", "Headphones", "Watch", "Camera",
  "Shirt", "Pants", "Dress", "Shoes", "Jacket",
  "Chair", "Table", "Lamp", "Mirror", "Vase",
  "Ball", "Racket", "Bicycle", "Tent", "Backpack",
  "Book", "DVD", "CD", "Magazine", "Poster",
  "Shampoo", "Soap", "Cream", "Perfume", "Makeup",
  "Tire", "Battery", "Filter", "Brake Pad", "Oil",
  "Doll", "Car", "Puzzle", "Board Game", "Action Figure",
  "Bread", "Milk", "Juice", "Snack", "Cereal",
  "Ring", "Necklace", "Earrings", "Bracelet", "Watch",
  "Hammer", "Screwdriver", "Drill", "Saw", "Wrench",
  "Collar", "Leash", "Toy", "Food", "Bed",
  "Pen", "Paper", "Stapler", "Folder", "Calculator",
  "Diaper", "Bottle", "Toy", "Clothes", "Stroller",
  "Sofa", "Bed", "Wardrobe", "Desk", "Shelf",
  "Paint", "Brush", "Canvas", "Clay", "Marker",
  "Guitar", "Piano", "Drums", "Microphone", "Speaker",
  "Medicine", "Bandage", "Thermometer", "Pill", "Syringe",
  "Pan", "Pot", "Knife", "Fork", "Plate",
  "Sleeping Bag", "Flashlight", "Compass", "Map", "Water Bottle",
  "Dumbbell", "Yoga Mat", "Treadmill", "Bike", "Rope",
  "Plant", "Pot", "Fertilizer", "Seeds", "Watering Can",
  "Bulb", "Lamp", "Chandelier", "Sconce", "String Lights",
  "Box", "Container", "Shelf", "Drawer", "Cabinet",
  "Towel", "Soap", "Shampoo", "Toothbrush", "Razor",
  "Engine Part", "Transmission", "Suspension", "Exhaust", "Fuel Pump",
  "Mouse", "Keyboard", "Monitor", "Printer", "Scanner",
  "Case", "Charger", "Cable", "Screen Protector", "Stand",
  "Speaker", "Microphone", "Amplifier", "Mixer", "Recorder",
  "Console", "Controller", "Game", "Headset", "Mouse Pad",
  "Lens", "Tripod", "Flash", "Memory Card", "Bag",
  "Violin", "Trumpet", "Saxophone", "Flute", "Harmonica",
  "Balloon", "Cake", "Candle", "Gift Wrap", "Confetti",
  "Notebook", "Pencil", "Ruler", "Eraser", "Glue",
  "Motor", "Pump", "Valve", "Pipe", "Gear",
  "Syringe", "Bandage", "Gauze", "Tape", "Antiseptic",
  "Cement", "Brick", "Steel", "Wood", "Glass",
  "Pipe", "Fitting", "Valve", "Pump", "Tank",
  "Wire", "Switch", "Outlet", "Breaker", "Transformer",
  "Furnace", "AC Unit", "Thermostat", "Duct", "Filter",
  "Camera", "Sensor", "Alarm", "Lock", "Monitor",
  "Phone", "Router", "Modem", "Antenna", "Cable",
  "Toner", "Paper", "Ink", "Cartridge", "Ribbon",
  "Detergent", "Bleach", "Sponge", "Broom", "Mop",
  "Helmet", "Gloves", "Vest", "Goggles", "Mask",
  "Seeds", "Fertilizer", "Pesticide", "Irrigation", "Harvester",
  "Anchor", "Rope", "Life Jacket", "Compass", "Radio",
  "Propeller", "Wing", "Engine", "Landing Gear", "Cockpit",
  "Uniform", "Boots", "Helmet", "Vest", "Equipment",
  "Microscope", "Telescope", "Scale", "Thermometer", "Beaker"
];

// Variants for product names
const variants = [
  "Pro", "Max", "Plus", "Elite", "Premium",
  "Standard", "Basic", "Advanced", "Ultra", "Extreme",
  "Light", "Heavy", "Compact", "Large", "Small",
  "Wireless", "Bluetooth", "USB-C", "HDMI", "WiFi",
  "Waterproof", "Shockproof", "Dustproof", "Fireproof", "Antibacterial",
  "Organic", "Natural", "Synthetic", "Eco-friendly", "Biodegradable",
  "Rechargeable", "Solar-powered", "Battery-operated", "Electric", "Manual",
  "Foldable", "Collapsible", "Adjustable", "Removable", "Detachable",
  "Multi-color", "Single-color", "Patterned", "Solid", "Gradient",
  "Winter", "Summer", "Spring", "Fall", "All-season",
  "Indoor", "Outdoor", "Portable", "Stationary", "Mobile"
];

// Sizes for products
const sizes = [
  "XS", "S", "M", "L", "XL", "XXL",
  "Small", "Medium", "Large", "Extra Large",
  "Mini", "Standard", "Jumbo", "Giant",
  "1 inch", "2 inch", "5 inch", "10 inch", "20 inch",
  "100ml", "250ml", "500ml", "1L", "2L",
  "100g", "250g", "500g", "1kg", "2kg"
];

// Colors for products
const colors = [
  "Black", "White", "Red", "Blue", "Green",
  "Yellow", "Purple", "Orange", "Pink", "Brown",
  "Gray", "Silver", "Gold", "Bronze", "Copper",
  "Navy", "Maroon", "Olive", "Teal", "Coral",
  "Lavender", "Mint", "Cream", "Beige", "Charcoal"
];

// Materials for products
const materials = [
  "Plastic", "Metal", "Wood", "Glass", "Ceramic",
  "Fabric", "Leather", "Silicone", "Rubber", "Aluminum",
  "Steel", "Copper", "Brass", "Bronze", "Titanium",
  "Cotton", "Polyester", "Wool", "Silk", "Denim",
  "Carbon Fiber", "Kevlar", "Nylon", "PVC", "ABS"
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

function generateUniqueClientName(): string {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const suffix = faker.helpers.maybe(() => faker.helpers.arrayElement([
    "Jr.", "Sr.", "II", "III", "IV"
  ]), { probability: 0.2 });
  
  let name = `${firstName} ${lastName}`;
  if (suffix) name += ` ${suffix}`;
  
  // Add unique identifier to prevent conflicts
  name += ` ${faker.string.alphanumeric(4).toUpperCase()}`;
  
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

  console.log("📦 Generating products...");
  const usedProductNames = new Set<string>();
  
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
    
    await prisma.product.create({
      data: {
        name: productName,
        categoryName: category,
        quantity: faker.number.int({ min: 1, max: 150 }),
        bought: Number(boughtPrice),
        selling: sellingPrice,
        codebar: faker.string.numeric(12),
      },
    });
    
    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} products...`);
    }
  }

  console.log("👥 Creating sample clients...");
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
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
  const products = await prisma.product.findMany();
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
      const quantity = faker.number.int({ min: 1, max: 5 });
      await prisma.saleItem.create({
        data: {
          productId: product.id,
          saleId: sale.id,
          quantity,
          price: product.selling,
        },
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
    const paidAmount =
      saleTotal > 0 ? faker.number.int({ min: 0, max: saleTotal }) : 0;
    const type = faker.helpers.arrayElement(["CREDIT", "VERSEMENT"]);
    const dueDate = faker.date.soon({ days: 30 });
    let paidAt = null;
    if (faker.datatype.boolean()) {
      paidAt = faker.date.between({ from: new Date(), to: dueDate });
    }
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        clientId: sale.clientId,
        paidAmount,
        dueAt: dueDate,
        paidAt,
        type,
      },
    });
    paymentCount++;
  }
  console.log(`   - ${paymentCount} payments`);

  console.log("✅ Seed completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - ${predefinedCategories.length} categories`);
  console.log(`   - 1,000 products`);
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
