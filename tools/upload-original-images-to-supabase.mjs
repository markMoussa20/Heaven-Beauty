import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const workspace = process.cwd();
const desktopRoot = path.join(
  process.env.USERPROFILE ?? "",
  "Desktop",
  "Heaven Beauty Original Images",
);

function loadEnv() {
  const envPath = path.join(workspace, ".env.local");
  return Object.fromEntries(
    (awaitText(envPath) ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function awaitText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase URL or service role key in .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const bucket = "product-images";

const mimeByExtension = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const files = {
  homeHeroPrimary: ["01-home", "img_2385.jpg-scaled.jpeg"],
  homeHeroSecondary: ["02-our-story", "img_2407.jpg-scaled.jpeg"],
  homeShowcasePrimary: [
    "01-home",
    "heavenbeauty.lb_1760457592_3743312055324379350_65902285909.jpg",
  ],
  homeShowcaseSecondary: [
    "01-home",
    "heavenbeauty.lb_1762448458_3760012651565741825_65902285909.jpg",
  ],
  storyPrimary: ["02-our-story", "img_2407.jpg-scaled.jpeg"],
  storySecondary: [
    "02-our-story",
    "heavenbeauty.lb_1761588489_3752798711735670046_65902285909-e1773855610126.jpg",
  ],
};

const productMappings = [
  {
    match: /heavenly.*kind|kind.*heavenly/i,
    main: ["04-products", "heavenly-kind-01.jpg-scaled.jpeg"],
    gallery: [["04-products", "img_5188-scaled.jpeg"]],
  },
  {
    match: /heavenly.*pure|pure.*heavenly/i,
    main: ["04-products", "heavenly-pure-03.jpg-scaled.jpeg"],
    gallery: [["04-products", "img_5192-scaled.jpeg"]],
  },
  {
    match: /heavenly.*love|love.*heavenly/i,
    main: ["04-products", "heavenly-love-2-1-scaled.png"],
    gallery: [["04-products", "img_5199-1-scaled.jpeg"]],
  },
  {
    match: /sparkly.*kind|kind.*sparkly/i,
    main: ["04-products", "sparkly-kind-1-scaled.png"],
    gallery: [],
  },
  {
    match: /sparkly.*pure|pure.*sparkly/i,
    main: ["04-products", "sparkly-pure-04.jpg-scaled.jpeg"],
    gallery: [],
  },
  {
    match: /sparkly.*love|love.*sparkly/i,
    main: ["04-products", "sparkly-love-05.jpg-scaled.jpeg"],
    gallery: [],
  },
  {
    match: /devotion|sculpt|blush/i,
    main: ["04-products", "untitled-design-6-scaled.png"],
    gallery: [],
  },
];

function localPath(tuple) {
  return path.join(desktopRoot, tuple[0], tuple[1]);
}

function storagePath(scope, tuple) {
  const fileName = tuple[1].toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return `original-site/${scope}/${fileName}`;
}

async function upload(scope, tuple) {
  const source = localPath(tuple);
  const destination = storagePath(scope, tuple);
  const buffer = await fs.readFile(source);
  const ext = path.extname(source).toLowerCase();
  const contentType = mimeByExtension[ext] ?? "application/octet-stream";

  const { error } = await supabase.storage.from(bucket).upload(destination, buffer, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${source}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(destination);
  return { destination, publicUrl: data.publicUrl, source };
}

async function updateSiteContent(key, payload) {
  const { error } = await supabase
    .from("site_content")
    .update(payload)
    .eq("key", key);

  if (error) {
    throw new Error(`Failed to update site_content.${key}: ${error.message}`);
  }
}

async function updatePublicPage(slug, payload) {
  const { error } = await supabase
    .from("public_pages")
    .update(payload)
    .eq("slug", slug);

  if (error) {
    throw new Error(`Failed to update public_pages.${slug}: ${error.message}`);
  }
}

function productMatches(product, matcher) {
  return matcher.test(`${product.name ?? ""} ${product.slug ?? ""}`);
}

async function main() {
  const uploaded = {};

  for (const [key, tuple] of Object.entries(files)) {
    uploaded[key] = await upload("content", tuple);
  }

  await updateSiteContent("home_hero", {
    image_alt: "Heaven Beauty glow campaign image",
    image_url: uploaded.homeHeroPrimary.publicUrl,
    secondary_image_alt: "Heaven Beauty skin glow campaign image",
    secondary_image_url: uploaded.homeHeroSecondary.publicUrl,
  });

  await updateSiteContent("home_image_showcase", {
    image_alt: "Heaven Beauty product glow image",
    image_url: uploaded.homeShowcasePrimary.publicUrl,
    secondary_image_alt: "Heaven Beauty skin tint image",
    secondary_image_url: uploaded.homeShowcaseSecondary.publicUrl,
  });

  await updatePublicPage("our-story", {
    image_alt: "Heaven Beauty founder",
    image_url: uploaded.storyPrimary.publicUrl,
    secondary_image_alt: "Heaven Beauty product story image",
    secondary_image_url: uploaded.storySecondary.publicUrl,
  });

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,name,slug");

  if (productError) {
    throw new Error(`Failed to read products: ${productError.message}`);
  }

  const productReport = [];

  for (const mapping of productMappings) {
    const product = (products ?? []).find((item) =>
      productMatches(item, mapping.match),
    );

    if (!product) {
      productReport.push(`No product matched ${mapping.match}`);
      continue;
    }

    const mainImage = await upload(`products/${product.slug ?? product.id}`, mapping.main);
    const { error: updateError } = await supabase
      .from("products")
      .update({
        main_image_path: mainImage.destination,
        main_image_url: mainImage.publicUrl,
      })
      .eq("id", product.id);

    if (updateError) {
      throw new Error(`Failed to update product ${product.name}: ${updateError.message}`);
    }

    const imageRows = [
      {
        product_id: product.id,
        storage_path: mainImage.destination,
        alt_text: product.name,
        sort_order: 0,
        is_primary: true,
      },
    ];

    let index = 1;
    for (const galleryTuple of mapping.gallery) {
      const galleryImage = await upload(
        `products/${product.slug ?? product.id}`,
        galleryTuple,
      );
      imageRows.push({
        product_id: product.id,
        storage_path: galleryImage.destination,
        alt_text: product.name,
        sort_order: index,
        is_primary: false,
      });
      index += 1;
    }

    const { error: imageDeleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", product.id);

    if (imageDeleteError) {
      throw new Error(
        `Failed to clear product images for ${product.name}: ${imageDeleteError.message}`,
      );
    }

    const { error: imageInsertError } = await supabase
      .from("product_images")
      .insert(imageRows);

    if (imageInsertError) {
      throw new Error(
        `Failed to insert product images for ${product.name}: ${imageInsertError.message}`,
      );
    }

    productReport.push(`Updated ${product.name}: ${imageRows.length} image(s)`);
  }

  const report = [
    "# Supabase Image Upload Report",
    "",
    `Uploaded at ${new Date().toISOString()}.`,
    "",
    "## Content Rows",
    "",
    "- Updated `site_content.home_hero`",
    "- Updated `site_content.home_image_showcase`",
    "- Updated `public_pages.our-story`",
    "",
    "## Products",
    "",
    ...productReport.map((line) => `- ${line}`),
  ];

  await fs.writeFile(
    path.join(desktopRoot, "SUPABASE_UPLOAD_REPORT.md"),
    report.join("\n"),
    "utf8",
  );

  console.log(report.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
