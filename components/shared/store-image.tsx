import Image, { type ImageProps } from "next/image";
import { isSvg } from "@/lib/utils";

// next/image with one rule: vector demo illustrations are served as-is,
// uploaded photos go through the optimiser (AVIF/WebP, responsive sizes).
export function StoreImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  if (!src) {
    return <div className="size-full bg-sand" role="img" aria-label={alt} />;
  }
  return <Image src={src} alt={alt} unoptimized={isSvg(src)} {...props} />;
}
