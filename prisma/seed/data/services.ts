import { PrismaClient } from "@prisma/client";

export async function seedServices(prisma: PrismaClient) {
  const services = [
    {
      name: "Haircut",
      description: "Professional haircut service",
    },
    {
      name: "Hair Coloring",
      description: "Hair coloring and dyeing service",
    },
    {
      name: "Hair Styling",
      description: "Professional hair styling for special occasions",
    },
    {
      name: "Manicure",
      description: "Nail care and manicure service",
    },
    {
      name: "Pedicure",
      description: "Foot care and pedicure service",
    },
    {
      name: "Facial Treatment",
      description: "Professional facial care and treatment",
    },
    {
      name: "Massage",
      description: "Relaxing massage service",
    },
    {
      name: "Consultation",
      description: "Professional consultation service",
    },
    {
      name: "Hair Wash",
      description: "Professional hair washing service",
    },
    {
      name: "Hair Treatment",
      description: "Deep conditioning and hair treatment",
    },
    {
      name: "Eyebrow Shaping",
      description: "Professional eyebrow shaping and grooming",
    },
    {
      name: "Eyelash Extension",
      description: "Professional eyelash extension service",
    },
    {
      name: "Makeup Application",
      description: "Professional makeup application for events",
    },
    {
      name: "Skin Analysis",
      description: "Comprehensive skin analysis and consultation",
    },
    {
      name: "Acne Treatment",
      description: "Professional acne treatment and care",
    },
    {
      name: "Anti-Aging Treatment",
      description: "Advanced anti-aging facial treatments",
    },
    {
      name: "Body Scrub",
      description: "Exfoliating body scrub treatment",
    },
    {
      name: "Body Wrap",
      description: "Detoxifying body wrap treatment",
    },
    {
      name: "Hot Stone Massage",
      description: "Relaxing hot stone massage therapy",
    },
    {
      name: "Deep Tissue Massage",
      description: "Therapeutic deep tissue massage",
    },
    {
      name: "Swedish Massage",
      description: "Classic Swedish relaxation massage",
    },
    {
      name: "Aromatherapy",
      description: "Essential oil aromatherapy treatment",
    },
    {
      name: "Reflexology",
      description: "Foot and hand reflexology therapy",
    },
    {
      name: "Nail Art",
      description: "Creative nail art and design service",
    },
    {
      name: "Gel Manicure",
      description: "Long-lasting gel manicure service",
    },
    {
      name: "Acrylic Nails",
      description: "Acrylic nail extension service",
    },
    {
      name: "Nail Repair",
      description: "Professional nail repair and restoration",
    },
    {
      name: "Cuticle Care",
      description: "Professional cuticle care and maintenance",
    },
    {
      name: "Hair Extensions",
      description: "Professional hair extension service",
    },
    {
      name: "Hair Perm",
      description: "Professional hair perming service",
    },
    {
      name: "Hair Straightening",
      description: "Professional hair straightening treatment",
    },
    {
      name: "Hair Highlights",
      description: "Professional hair highlighting service",
    },
    {
      name: "Hair Lowlights",
      description: "Professional hair lowlighting service",
    },
    {
      name: "Hair Ombre",
      description: "Professional ombre hair coloring",
    },
    {
      name: "Hair Balayage",
      description: "Professional balayage hair coloring",
    },
    {
      name: "Hair Bleaching",
      description: "Professional hair bleaching service",
    },
    {
      name: "Hair Toning",
      description: "Professional hair toning service",
    },
    {
      name: "Hair Glossing",
      description: "Professional hair glossing treatment",
    },
    {
      name: "Hair Keratin Treatment",
      description: "Smoothing keratin hair treatment",
    },
    {
      name: "Hair Brazilian Blowout",
      description: "Brazilian blowout smoothing treatment",
    },
    {
      name: "Hair Scalp Treatment",
      description: "Therapeutic scalp treatment",
    },
    {
      name: "Hair Dandruff Treatment",
      description: "Professional dandruff treatment",
    },
    {
      name: "Hair Loss Treatment",
      description: "Hair loss prevention and treatment",
    },
    {
      name: "Hair Growth Treatment",
      description: "Stimulating hair growth treatment",
    },
    {
      name: "Hair Color Correction",
      description: "Professional hair color correction service",
    },
    {
      name: "Hair Consultation",
      description: "Comprehensive hair consultation service",
    },
    {
      name: "Hair Styling for Events",
      description: "Special event hair styling service",
    },
    {
      name: "Bridal Hair",
      description: "Professional bridal hair styling",
    },
    {
      name: "Hair Updo",
      description: "Elegant hair updo styling service",
    },
    {
      name: "Hair Braiding",
      description: "Professional hair braiding service",
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: service,
      create: service,
    });
  }

  console.log("✅ 48 services seeded successfully");
}
