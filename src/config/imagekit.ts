// src/config/imagekit.ts
import ImageKit from "imagekit";

// Determine if we should use ImageKit based on environment/configuration
const shouldUseImageKit = (): boolean => {
  // Use ImageKit if NODE_ENV is production
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  // Use ImageKit if valid ImageKit keys are provided
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  return !!(IMAGEKIT_PUBLIC_KEY && IMAGEKIT_PRIVATE_KEY && IMAGEKIT_URL_ENDPOINT);
};

let imagekit: ImageKit | null = null;

if (shouldUseImageKit()) {
  const {
    IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_URL_ENDPOINT,
  } = process.env;

  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error(
      "❌ ImageKit is enabled but environment variables are missing"
    );
  }

  imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });

  console.log("📸 ImageKit storage enabled");
} else {
  console.log("💾 Local filesystem storage enabled");
}

// Export both the client and the decision function
export { shouldUseImageKit };
export default imagekit;
