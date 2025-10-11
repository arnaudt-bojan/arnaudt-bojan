import { storage } from "./storage";
import { homepageCtaOptions } from "@shared/schema";

const defaultCtaOptions = [
  {
    label: "Shop Now",
    variant: "default",
    icon: "ShoppingBag",
    description: "Direct customers to your main store",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 1
  },
  {
    label: "View Products",
    variant: "default",
    icon: "Package",
    description: "Show all your products",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 2
  },
  {
    label: "Explore Collection",
    variant: "default",
    icon: "Sparkles",
    description: "Highlight your product collection",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 3
  },
  {
    label: "Discover More",
    variant: "outline",
    icon: "ArrowRight",
    description: "Simple call to action",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 4
  },
  {
    label: "Get Started",
    variant: "default",
    icon: "Rocket",
    description: "Encourage customers to start shopping",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 5
  },
  {
    label: "Learn More",
    variant: "outline",
    icon: "Info",
    description: "For informational homepages",
    urlPath: "/s/:username",
    isActive: 1,
    sortOrder: 6
  }
];

async function seedCtaOptions() {
  try {
    console.log("Seeding CTA options...");
    
    const existing = await storage.getAllCtaOptions();
    
    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing CTA options. Skipping seed.`);
      return;
    }

    for (const cta of defaultCtaOptions) {
      await storage.db.insert(homepageCtaOptions).values(cta);
      console.log(`✓ Created CTA: ${cta.label}`);
    }

    console.log("\nSuccessfully seeded all CTA options!");
  } catch (error) {
    console.error("Error seeding CTA options:", error);
    throw error;
  }
}

seedCtaOptions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
